import { ethers, WebSocketProvider, Contract, EventLog } from 'ethers';
import { getPrismaClient } from '../lib/prisma.js';
import { chainConfig } from '../blockchain/config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('EventListener');

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
  abi: ethers.InterfaceAbi;
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
  private isShuttingDown = false;
  private retryConfig: RetryConfig = {
    attempt: 0,
    maxAttempts: 10,
    baseDelay: 1000, // 1 second
    maxDelay: 60000, // 60 seconds
  };
  private reconnectTimeout: NodeJS.Timeout | null = null;
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

      log.info('Initializing WebSocket provider...');
      log.debug({ network: chainConfig.name, chainId: chainConfig.chainId, wsUrl }, 'WebSocket connection details');

      this.wsProvider = new ethers.WebSocketProvider(wsUrl, {
        chainId: chainConfig.chainId,
        name: chainConfig.name,
      });

      // Set up provider event handlers
      this.wsProvider.on('error', (error) => {
        log.error({ err: error }, 'WebSocket provider error');
        this.handleProviderError(error);
      });

      this.wsProvider.on('close', () => {
        log.warn('WebSocket connection closed');
        if (!this.isShuttingDown) {
          this.handleProviderError(new Error('WebSocket connection closed'));
        }
      });

      // Test connection by getting current block
      const currentBlock = await this.wsProvider.getBlockNumber();
      log.info({ currentBlock }, 'Connected successfully');

      // Reset retry counter on successful connection
      this.retryConfig.attempt = 0;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Failed to initialize provider');
      throw error;
    }
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Failed to get last processed block');
      throw new Error(`Failed to get last processed block: ${msg}`);
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

      log.debug({ eventName, contractAddress, blockNumber }, 'Updated last processed block');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Failed to update last processed block');
      throw new Error(`Failed to update last processed block: ${msg}`);
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
      log.info({ contract: config.contractAddress, event: config.eventName, fromBlock, toBlock }, 'Replaying historical events');

      const contract = new Contract(
        config.contractAddress,
        config.abi,
        this.wsProvider
      );

      // Query historical events
      const filter = contract.filters[config.eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      log.debug({ count: events.length }, 'Found historical events');

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
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            log.error({ err: msg, blockNumber: event.blockNumber }, 'Failed to process historical event');
            // Continue processing other events
          }
        }
      }

      log.info('Replay completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Failed to replay events');
      throw new Error(`Failed to replay events: ${msg}`);
    }
  }

  /**
   * Start listening for events with automatic replay of missed events
   */
  public async startListening(config: EventListenerConfig): Promise<void> {
    try {
      // Initialize provider if not already done
      if (!this.wsProvider) {
        await this.initializeProvider();
      }

      if (!this.wsProvider) {
        throw new Error('Failed to initialize provider');
      }

      log.info({ contract: config.contractAddress, event: config.eventName }, 'Starting event listener');

      // Get current block
      const currentBlock = await this.wsProvider.getBlockNumber();
      log.debug({ currentBlock }, 'Current block');

      // Get last processed block from database
      let fromBlock = config.fromBlock;
      const lastProcessedBlock = await this.getLastProcessedBlock(
        config.contractAddress,
        config.eventName
      );

      if (lastProcessedBlock !== null) {
        // Resume from last processed block + 1
        fromBlock = lastProcessedBlock + 1;
        log.debug({ fromBlock }, 'Resuming from block');

        // Replay missed events during downtime
        if (fromBlock < currentBlock) {
          log.debug({ missedBlocks: currentBlock - fromBlock }, 'Replaying missed blocks');
          await this.replayEvents(config, fromBlock, currentBlock);
        }
      } else if (fromBlock !== undefined) {
        log.debug({ fromBlock }, 'Starting from configured block');

        // Replay events from configured start block
        if (fromBlock < currentBlock) {
          await this.replayEvents(config, fromBlock, currentBlock);
        }
      } else {
        log.debug('Starting from current block (no historical replay)');
        fromBlock = currentBlock;
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
          log.debug({ event: config.eventName, blockNumber: event.blockNumber }, 'Received event');

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
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          log.error({ err: msg, event: config.eventName }, 'Failed to process event');
          // Don't throw - continue listening for other events
        }
      });

      // Store contract reference for cleanup
      const listenerKey = `${config.contractAddress}:${config.eventName}`;
      this.listeners.set(listenerKey, contract);

      log.info({ event: config.eventName }, 'Successfully started listening for events');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Failed to start listening');
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

    log.error({
      err: error.message,
      attempt: this.retryConfig.attempt,
      maxAttempts: this.retryConfig.maxAttempts,
      retryInSeconds: delay / 1000,
    }, 'Provider error occurred, scheduling retry');

    if (this.retryConfig.attempt >= this.retryConfig.maxAttempts) {
      log.error('Max retry attempts reached. Giving up.');
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
        log.info('Attempting to reconnect...');

        // Close existing provider
        if (this.wsProvider) {
          await this.wsProvider.destroy();
          this.wsProvider = null;
        }

        // Reinitialize provider
        await this.initializeProvider();

        // See GitHub Issue #105
        // This would require storing listener configs and restarting them
        // For now, the server restart will handle this

        log.info('Reconnection successful');
      } catch (reconnectError) {
        const msg = reconnectError instanceof Error ? reconnectError.message : String(reconnectError);
        log.error({ err: msg }, 'Reconnection failed');
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
    log.info('Shutting down gracefully...');

    try {
      // Clear reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Remove all event listeners
      this.listeners.forEach((contract, key) => {
        log.debug({ listener: key }, 'Removing listener');
        contract.removeAllListeners();
      });
      this.listeners.clear();

      // Close WebSocket provider
      if (this.wsProvider) {
        log.debug('Closing WebSocket connection');
        await this.wsProvider.destroy();
        this.wsProvider = null;
      }

      // Note: Last processed blocks are already saved after each event
      // No additional state saving needed here

      log.info('Shutdown completed successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error({ err: msg }, 'Error during shutdown');
      throw error;
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      log.info({ signal }, 'Received shutdown signal');

      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error({ err: msg }, 'Shutdown error');
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
    log.info('Processing BountyReleased event');

    const prisma = getPrismaClient();

    // Parse event data
    const bountyId = event.args?.bountyId || '';
    const protocolId = event.args?.protocolId || '';
    const validationId = event.args?.validationId || '';
    const researcher = event.args?.researcher || '';
    const amount = event.args?.amount || 0n;
    const timestamp = event.args?.timestamp || 0n;

    log.debug({ bountyId, protocolId, validationId, researcher }, 'BountyReleased event data');

    // Find the payment record by validationId (finding ID)
    const payment = await prisma.payment.findFirst({
      where: {
        vulnerability: {
          id: validationId,
        },
      },
    });

    if (!payment) {
      log.warn({ validationId }, 'No payment record found for validation - creating reconciliation record');

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
      log.debug({ paymentId: payment.id }, 'Payment already reconciled');
      return;
    }

    // Reconcile payment
    log.info({ paymentId: payment.id }, 'Reconciling payment');

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

    log.info({ paymentId: payment.id }, 'Payment reconciled successfully');
  } catch (error) {
    log.error({ err: error }, 'Failed to handle BountyReleased event');
    throw error;
  }
}

export default EventListenerService;
