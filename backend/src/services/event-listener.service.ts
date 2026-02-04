import { ethers, WebSocketProvider, Contract, EventLog } from 'ethers';
import { getPrismaClient } from '../lib/prisma.js';
import { chainConfig } from '../blockchain/config.js';

/**
 * Event listener state manager for tracking processed blocks
 */
interface EventListenerStateData {
  contractAddress: string;
  eventName: string;
  lastProcessedBlock: number;
}

/**
 * Event listener configuration
 */
interface EventListenerConfig {
  contractAddress: string;
  eventName: string;
  abi: any[];
  handler: (event: EventLog) => Promise<void>;
  fromBlock?: number;
}

/**
 * Retry configuration with exponential backoff
 */
interface RetryConfig {
  attempt: number;
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

/**
 * Event Listener Service Foundation
 *
 * Provides infrastructure for listening to blockchain events using ethers.js v6
 * with WebSocket provider, state management, block tracking, and error handling.
 */
export class EventListenerService {
  private wsProvider: WebSocketProvider | null = null;
  private listeners: Map<string, Contract> = new Map();
  private listenerConfigs: Map<string, EventListenerConfig> = new Map();
  private isShuttingDown = false;
  private retryConfig: RetryConfig = {
    attempt: 0,
    maxAttempts: 10,
    baseDelay: 1000, // 1 second
    maxDelay: 60000, // 60 seconds
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private prisma = getPrismaClient();

  constructor() {
    this.setupGracefulShutdown();
  }

  /**
   * Initialize WebSocket provider for Base Sepolia
   */
  private async initializeProvider(): Promise<void> {
    try {
      const wsUrl = this.getWebSocketUrl();

      console.log('[EventListener] Initializing WebSocket provider...');
      console.log(`  Network: ${chainConfig.name}`);
      console.log(`  Chain ID: ${chainConfig.chainId}`);
      console.log(`  WS URL: ${wsUrl}`);

      this.wsProvider = new ethers.WebSocketProvider(wsUrl, {
        chainId: chainConfig.chainId,
        name: chainConfig.name,
      });

      // Test connection by getting current block
      const currentBlock = await this.wsProvider.getBlockNumber();
      console.log(`[EventListener] Connected successfully! Current block: ${currentBlock}`);

      // Start provider health check polling
      this.startProviderHealthCheck();

      // Reset retry counter on successful connection
      this.retryConfig.attempt = 0;
    } catch (error: any) {
      console.error('[EventListener] Failed to initialize provider:', error.message);
      throw error;
    }
  }

  /**
   * Start provider health check polling
   */
  private startProviderHealthCheck(): void {
    // Clear any existing health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.wsProvider && !this.isShuttingDown) {
          await this.wsProvider.getBlockNumber();
          // If we reach here, provider is healthy
        }
      } catch (error: any) {
        console.error('[EventListener] Provider health check failed:', error.message);
        this.handleProviderError(error);
      }
    }, 30000); // Check every 30 seconds

    console.log('[EventListener] Provider health check started (30s interval)');
  }

  /**
   * Check if we should skip historical event replay (Alchemy free tier)
   */
  private shouldSkipHistoricalReplay(): boolean {
    const wsUrl = this.getWebSocketUrl();
    const isAlchemy = wsUrl.includes('alchemy.com') || wsUrl.includes('alchemyapi.io');
    const hasPaidKey = process.env.ALCHEMY_API_KEY_PAID === 'true';

    return isAlchemy && !hasPaidKey;
  }

  /**
   * Get the number of recent blocks to start from (instead of historical replay)
   * Note: For Alchemy free tier, we use 9 blocks because the range is inclusive on both ends
   */
  private getRecentBlockOffset(): number {
    const blocks = parseInt(process.env.EVENT_REPLAY_RECENT_BLOCKS || '1000', 10);
    // Alchemy counts inclusive, so if we want to replay N blocks, we need offset of N-1
    return this.shouldSkipHistoricalReplay() ? Math.max(blocks - 1, 0) : blocks;
  }

  /**
   * Get WebSocket URL from environment or fallback
   */
  private getWebSocketUrl(): string {
    // Try BASE_SEPOLIA_WS_URL first, then convert HTTP to WS
    const wsUrl = process.env.BASE_SEPOLIA_WS_URL;

    if (wsUrl) {
      return wsUrl;
    }

    // Fallback: convert HTTP RPC to WebSocket
    const httpUrl = chainConfig.rpcUrl;
    if (httpUrl.startsWith('https://')) {
      return httpUrl.replace('https://', 'wss://');
    } else if (httpUrl.startsWith('http://')) {
      return httpUrl.replace('http://', 'ws://');
    }

    // Default WebSocket URL for Base Sepolia
    return 'wss://sepolia.base.org';
  }

  /**
   * Get WebSocket provider instance
   */
  public getProvider(): WebSocketProvider {
    if (!this.wsProvider) {
      throw new Error('WebSocket provider not initialized. Call initialize() first.');
    }
    return this.wsProvider;
  }

  /**
   * EventListenerState Manager: Get last processed block
   */
  public async getLastProcessedBlock(
    contractAddress: string,
    eventName: string
  ): Promise<number | null> {
    try {
      const state = await this.prisma.eventListenerState.findUnique({
        where: {
          contractAddress_eventName: {
            contractAddress: contractAddress.toLowerCase(),
            eventName,
          },
        },
      });

      return state?.lastProcessedBlock ?? null;
    } catch (error: any) {
      console.error('[EventListener] Failed to get last processed block:', error.message);
      throw new Error(`Failed to get last processed block: ${error.message}`);
    }
  }

  /**
   * EventListenerState Manager: Update last processed block
   */
  public async updateLastProcessedBlock(
    contractAddress: string,
    eventName: string,
    blockNumber: number
  ): Promise<void> {
    try {
      await this.prisma.eventListenerState.upsert({
        where: {
          contractAddress_eventName: {
            contractAddress: contractAddress.toLowerCase(),
            eventName,
          },
        },
        update: {
          lastProcessedBlock: blockNumber,
          updatedAt: new Date(),
        },
        create: {
          contractAddress: contractAddress.toLowerCase(),
          eventName,
          lastProcessedBlock: blockNumber,
        },
      });

      console.log(
        `[EventListener] Updated last processed block for ${eventName} at ${contractAddress}: ${blockNumber}`
      );
    } catch (error: any) {
      console.error('[EventListener] Failed to update last processed block:', error.message);
      throw new Error(`Failed to update last processed block: ${error.message}`);
    }
  }

  /**
   * Replay historical events from a specific block range
   */
  public async replayEvents(
    config: EventListenerConfig,
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    if (!this.wsProvider) {
      throw new Error('Provider not initialized');
    }

    try {
      console.log('[EventListener] Replaying historical events...');
      console.log(`  Contract: ${config.contractAddress}`);
      console.log(`  Event: ${config.eventName}`);
      console.log(`  Block range: ${fromBlock} - ${toBlock}`);

      const contract = new Contract(
        config.contractAddress,
        config.abi,
        this.wsProvider
      );

      // Query historical events
      const filter = contract.filters[config.eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      console.log(`[EventListener] Found ${events.length} historical events`);

      // Process events sequentially
      for (const event of events) {
        if (event instanceof EventLog) {
          try {
            await config.handler(event);

            // Update last processed block after each event
            if (event.blockNumber) {
              await this.updateLastProcessedBlock(
                config.contractAddress,
                config.eventName,
                event.blockNumber
              );
            }
          } catch (error: any) {
            console.error(
              `[EventListener] Failed to process historical event at block ${event.blockNumber}:`,
              error.message
            );
            // Continue processing other events
          }
        }
      }

      console.log('[EventListener] Replay completed successfully');
    } catch (error: any) {
      console.error('[EventListener] Failed to replay events:', error.message);
      throw new Error(`Failed to replay events: ${error.message}`);
    }
  }

  /**
   * Start listening for events with automatic replay of missed events
   */
  public async startListening(config: EventListenerConfig): Promise<void> {
    try {
      // Store listener config for reconnection
      const key = `${config.contractAddress}:${config.eventName}`;
      this.listenerConfigs.set(key, config);

      // Initialize provider if not already done
      if (!this.wsProvider) {
        await this.initializeProvider();
      }

      if (!this.wsProvider) {
        throw new Error('Failed to initialize provider');
      }

      console.log('[EventListener] Starting event listener...');
      console.log(`  Contract: ${config.contractAddress}`);
      console.log(`  Event: ${config.eventName}`);

      // Get current block
      const currentBlock = await this.wsProvider.getBlockNumber();
      console.log(`  Current block: ${currentBlock}`);

      // Get last processed block from database
      let fromBlock = config.fromBlock;
      const lastProcessedBlock = await this.getLastProcessedBlock(
        config.contractAddress,
        config.eventName
      );

      if (lastProcessedBlock !== null) {
        // Resume from last processed block + 1
        fromBlock = lastProcessedBlock + 1;
        console.log(`  Resuming from block: ${fromBlock}`);

        // Replay missed events during downtime
        if (fromBlock < currentBlock) {
          console.log(`  Replaying ${currentBlock - fromBlock} missed blocks...`);
          await this.replayEvents(config, fromBlock, currentBlock);
        }
      } else if (fromBlock !== undefined) {
        // No state exists, check if we should skip historical replay
        if (this.shouldSkipHistoricalReplay()) {
          const offset = this.getRecentBlockOffset();
          fromBlock = currentBlock - offset;
          console.log(`[EventListener] Skipping historical replay (Alchemy free tier), starting from block ${fromBlock}`);
        } else {
          console.log(`  Starting from configured block: ${fromBlock}`);
        }

        // Replay events from configured start block
        if (fromBlock < currentBlock) {
          await this.replayEvents(config, fromBlock, currentBlock);
        }
      } else {
        // Start from recent block by default on free tier
        if (this.shouldSkipHistoricalReplay()) {
          const offset = this.getRecentBlockOffset();
          fromBlock = currentBlock - offset;
          console.log(`[EventListener] Starting from recent block: ${fromBlock} (Alchemy free tier)`);
        } else {
          fromBlock = currentBlock;
          console.log('  Starting from current block (no historical replay)');
        }
      }

      // Create contract instance for event listening
      const contract = new Contract(
        config.contractAddress,
        config.abi,
        this.wsProvider
      );

      // Set up real-time event listener
      const eventFilter = contract.filters[config.eventName]();

      contract.on(eventFilter, async (...args) => {
        // Last argument is the event object
        const event = args[args.length - 1] as EventLog;

        try {
          console.log(`[EventListener] Received ${config.eventName} event at block ${event.blockNumber}`);

          // Process event
          await config.handler(event);

          // Update last processed block
          if (event.blockNumber) {
            await this.updateLastProcessedBlock(
              config.contractAddress,
              config.eventName,
              event.blockNumber
            );
          }
        } catch (error: any) {
          console.error(
            `[EventListener] Failed to process ${config.eventName} event:`,
            error.message
          );
          // Don't throw - continue listening for other events
        }
      });

      // Store contract reference for cleanup
      const listenerKey = `${config.contractAddress}:${config.eventName}`;
      this.listeners.set(listenerKey, contract);

      console.log(`[EventListener] Successfully started listening for ${config.eventName} events`);
    } catch (error: any) {
      console.error('[EventListener] Failed to start listening:', error.message);
      throw error;
    }
  }

  /**
   * Handle provider errors with exponential backoff retry
   */
  private async handleProviderError(error: Error): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.retryConfig.attempt++;

    // Calculate delay with exponential backoff: 1s, 5s, 25s, max 60s
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(5, this.retryConfig.attempt - 1),
      this.retryConfig.maxDelay
    );

    console.error('[EventListener] Provider error occurred');
    console.error(`  Error: ${error.message}`);
    console.error(`  Retry attempt: ${this.retryConfig.attempt}/${this.retryConfig.maxAttempts}`);
    console.error(`  Retrying in ${delay / 1000}s...`);

    if (this.retryConfig.attempt >= this.retryConfig.maxAttempts) {
      console.error('[EventListener] Max retry attempts reached. Giving up.');
      // In production, you might want to alert/monitor this condition
      return;
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Schedule reconnection
    this.reconnectTimeout = setTimeout(async () => {
      try {
        console.log('[EventListener] Attempting to reconnect...');

        // Close existing provider
        if (this.wsProvider) {
          await this.wsProvider.destroy();
          this.wsProvider = null;
        }

        // Reinitialize provider
        await this.initializeProvider();

        // Restart all listeners
        console.log(`[EventListener] Restarting ${this.listenerConfigs.size} listeners...`);
        for (const [key, config] of this.listenerConfigs) {
          console.log(`[EventListener] Restarting listener: ${key}`);
          await this.startListening(config);
        }

        console.log('[EventListener] Reconnection successful');
      } catch (reconnectError: any) {
        console.error('[EventListener] Reconnection failed:', reconnectError.message);
        // handleProviderError will be called again by the error event
      }
    }, delay);
  }

  /**
   * Graceful shutdown: Save last processed blocks before exit
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('[EventListener] Shutting down gracefully...');

    try {
      // Clear reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Clear health check interval
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Remove all event listeners
      this.listeners.forEach((contract, key) => {
        console.log(`[EventListener] Removing listener: ${key}`);
        contract.removeAllListeners();
      });
      this.listeners.clear();

      // Close WebSocket provider
      if (this.wsProvider) {
        console.log('[EventListener] Closing WebSocket connection...');
        await this.wsProvider.destroy();
        this.wsProvider = null;
      }

      // Note: Last processed blocks are already saved after each event
      // No additional state saving needed here

      console.log('[EventListener] Shutdown completed successfully');
    } catch (error: any) {
      console.error('[EventListener] Error during shutdown:', error.message);
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`[EventListener] Received ${signal} signal`);

      try {
        await this.shutdown();
        process.exit(0);
      } catch (error: any) {
        console.error('[EventListener] Shutdown error:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
  }

  /**
   * Health check: Verify provider is connected
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.wsProvider) {
        return false;
      }

      // Try to get current block number as health check
      await this.wsProvider.getBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get listener statistics
   */
  public getStats(): {
    isConnected: boolean;
    activeListeners: number;
    retryAttempt: number;
  } {
    return {
      isConnected: this.wsProvider !== null && !this.isShuttingDown,
      activeListeners: this.listeners.size,
      retryAttempt: this.retryConfig.attempt,
    };
  }
}

// Singleton instance
let eventListenerService: EventListenerService | null = null;

/**
 * Get singleton instance of EventListenerService
 */
export function getEventListenerService(): EventListenerService {
  if (!eventListenerService) {
    eventListenerService = new EventListenerService();
  }
  return eventListenerService;
}

/**
 * Handler for BountyReleased events from BountyPool contract
 */
export async function handleBountyReleasedEvent(event: EventLog): Promise<void> {
  try {
    console.log('[EventListener] Processing BountyReleased event...');

    const prisma = getPrismaClient();

    // Parse event data
    const bountyId = event.args?.bountyId || '';
    const protocolId = event.args?.protocolId || '';
    const validationId = event.args?.validationId || '';
    const researcher = event.args?.researcher || '';
    const amount = event.args?.amount || 0n;
    const timestamp = event.args?.timestamp || 0n;

    console.log(`  Bounty ID: ${bountyId}`);
    console.log(`  Protocol ID: ${protocolId}`);
    console.log(`  Validation ID: ${validationId}`);
    console.log(`  Researcher: ${researcher}`);

    // Find the payment record by validationId (finding ID)
    const payment = await prisma.payment.findFirst({
      where: {
        vulnerability: {
          id: validationId,
        },
      },
    });

    if (!payment) {
      console.warn(
        `[EventListener] No payment record found for validation ${validationId} - creating reconciliation record`
      );

      // Create orphaned payment reconciliation record
      await prisma.paymentReconciliation.create({
        data: {
          onChainBountyId: bountyId,
          txHash: event.transactionHash,
          amount: Number(amount) / 1e6, // Convert from USDC wei to decimal
          status: 'ORPHANED',
          notes: `On-chain bounty released but no payment record found for validation ${validationId}`,
        },
      });

      return;
    }

    // Check if payment is already reconciled
    if (payment.reconciled) {
      console.log(`[EventListener] Payment ${payment.id} already reconciled`);
      return;
    }

    // Reconcile payment
    console.log(`[EventListener] Reconciling payment ${payment.id}...`);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        onChainBountyId: bountyId,
        reconciled: true,
        reconciledAt: new Date(),
      },
    });

    // Create successful reconciliation record
    await prisma.paymentReconciliation.create({
      data: {
        paymentId: payment.id,
        onChainBountyId: bountyId,
        txHash: event.transactionHash,
        amount: Number(amount) / 1e6,
        status: 'RESOLVED',
        resolvedAt: new Date(),
        notes: 'Payment successfully reconciled with on-chain event',
      },
    });

    console.log(`[EventListener] Payment ${payment.id} reconciled successfully`);
  } catch (error: any) {
    console.error('[EventListener] Failed to handle BountyReleased event:', error);
    throw error;
  }
}

export default EventListenerService;
