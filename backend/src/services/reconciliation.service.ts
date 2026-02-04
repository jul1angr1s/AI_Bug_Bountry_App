import { Queue } from 'bullmq';
import { ethers } from 'ethers';
import { getPrismaClient } from '../lib/prisma.js';
import { getRedisClient } from '../lib/redis.js';
import BountyPoolClient from '../blockchain/contracts/BountyPoolClient.js';
import { contractAddresses, provider, usdcConfig } from '../blockchain/config.js';
import BountyPoolABI from '../blockchain/abis/BountyPool.json' with { type: 'json' };

const prisma = getPrismaClient();
const redisClient = await getRedisClient();

/**
 * Reconciliation Status Types
 */
export enum ReconciliationStatus {
  ORPHANED = 'ORPHANED', // Event exists, no database record
  MISSING_PAYMENT = 'MISSING_PAYMENT', // Event exists, no matching Payment
  UNCONFIRMED_PAYMENT = 'UNCONFIRMED_PAYMENT', // Database COMPLETED, no event
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH', // Amount differs between event and database
  DISCREPANCY = 'DISCREPANCY', // General discrepancy (e.g., txHash mismatch)
  RESOLVED = 'RESOLVED', // Manually or automatically resolved
}

/**
 * BountyReleased Event Data (from blockchain)
 */
interface BountyReleasedEvent {
  bountyId: string; // bytes32
  protocolId: string; // bytes32
  validationId: string; // bytes32 - MATCHING KEY
  researcher: string; // address
  severity: number; // uint8
  amount: bigint; // uint256
  timestamp: bigint; // uint256
  txHash: string; // transaction hash
  blockNumber: number; // block number
}

/**
 * Payment Record (from database)
 */
interface PaymentRecord {
  id: string;
  vulnerabilityId: string;
  amount: number; // USDC (float)
  currency: string;
  txHash: string | null;
  status: string;
  paidAt: Date | null;
  onChainBountyId: string | null; // validationId
  researcherAddress: string;
  reconciled: boolean;
  reconciledAt: Date | null;
}

/**
 * Reconciliation Report Metrics
 */
export interface ReconciliationReport {
  totalPayments: number;
  reconciledCount: number;
  pendingCount: number;
  discrepancyCount: number;
  lastReconciliation: Date | null;
  reconciliationRate: number; // percentage
  discrepanciesByStatus: {
    [status: string]: number;
  };
}

/**
 * Discrepancy Record
 */
export interface DiscrepancyRecord {
  id: string;
  paymentId: string | null;
  onChainBountyId: string;
  txHash: string;
  amount: number;
  status: string;
  discoveredAt: Date;
  resolvedAt: Date | null;
  notes: string | null;
}

/**
 * Reconciliation Service
 *
 * Handles periodic payment reconciliation by comparing on-chain BountyReleased events
 * with database Payment records, detecting and resolving discrepancies.
 */
export class ReconciliationService {
  private bountyPoolClient: BountyPoolClient;
  private reconciliationQueue: Queue;

  constructor() {
    this.bountyPoolClient = new BountyPoolClient();

    // Create BullMQ repeatable job queue for reconciliation
    this.reconciliationQueue = new Queue('payment-reconciliation', {
      connection: redisClient,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    });
  }

  /**
   * Initialize periodic reconciliation job
   * Cron expression: every 10 minutes
   */
  public async initializePeriodicReconciliation(): Promise<void> {
    try {
      console.log('[Reconciliation] Initializing periodic reconciliation job...');

      // Remove existing repeatable jobs to avoid duplicates
      const repeatableJobs = await this.reconciliationQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.reconciliationQueue.removeRepeatableByKey(job.key);
      }

      // Add repeatable job: every 10 minutes
      await this.reconciliationQueue.add(
        'payment-reconciliation',
        {},
        {
          repeat: {
            pattern: '*/10 * * * *', // Every 10 minutes
          },
          jobId: 'payment-reconciliation-periodic',
        }
      );

      console.log('[Reconciliation] Periodic reconciliation job scheduled (every 10 minutes)');
    } catch (error: any) {
      console.error('[Reconciliation] Failed to initialize periodic reconciliation:', error.message);
      throw new Error(`Failed to initialize periodic reconciliation: ${error.message}`);
    }
  }

  /**
   * Main reconciliation logic
   * Compares BountyReleased events from last 24 hours with Payment records
   */
  public async reconcile(): Promise<void> {
    try {
      console.log('[Reconciliation] Starting reconciliation process...');

      const startTime = Date.now();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Step 1: Query BountyReleased events from last 24 hours
      const events = await this.queryBountyReleasedEvents(twentyFourHoursAgo);
      console.log(`[Reconciliation] Found ${events.length} BountyReleased events in last 24 hours`);

      // Step 2: Query Payment records with status=COMPLETED from last 24 hours
      const payments = await prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          paidAt: {
            gte: twentyFourHoursAgo,
          },
        },
      });
      console.log(`[Reconciliation] Found ${payments.length} completed payments in last 24 hours`);

      // Step 3: Compare events vs database records
      await this.compareEventsAndPayments(events, payments);

      const duration = Date.now() - startTime;
      console.log(`[Reconciliation] Reconciliation completed in ${duration}ms`);

      // Step 4: Alert if unresolved discrepancy count > 10
      await this.checkDiscrepancyThreshold();
    } catch (error: any) {
      console.error('[Reconciliation] Reconciliation failed:', error.message);
      throw new Error(`Reconciliation failed: ${error.message}`);
    }
  }

  /**
   * Query BountyReleased events from blockchain
   */
  private async queryBountyReleasedEvents(since: Date): Promise<BountyReleasedEvent[]> {
    try {
      // Calculate block range (approximate)
      const currentBlock = await provider.getBlockNumber();
      const blocksPerDay = 43200; // Base: ~2 second blocks = 43,200 blocks/day
      const fromBlock = currentBlock - blocksPerDay;

      console.log(`[Reconciliation] Querying events from block ${fromBlock} to ${currentBlock}`);

      const contract = new ethers.Contract(
        contractAddresses.bountyPool,
        BountyPoolABI.abi,
        provider
      );

      // Query BountyReleased events
      const filter = contract.filters.BountyReleased();
      const logs = await contract.queryFilter(filter, fromBlock, currentBlock);

      const events: BountyReleasedEvent[] = [];

      for (const log of logs) {
        if (log instanceof ethers.EventLog) {
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (parsed && parsed.name === 'BountyReleased') {
            events.push({
              bountyId: parsed.args.bountyId,
              protocolId: parsed.args.protocolId,
              validationId: parsed.args.validationId,
              researcher: parsed.args.researcher,
              severity: Number(parsed.args.severity),
              amount: parsed.args.amount,
              timestamp: parsed.args.timestamp,
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
            });
          }
        }
      }

      return events;
    } catch (error: any) {
      console.error('[Reconciliation] Failed to query BountyReleased events:', error.message);
      throw new Error(`Failed to query events: ${error.message}`);
    }
  }

  /**
   * Compare events and payments to detect discrepancies
   */
  private async compareEventsAndPayments(
    events: BountyReleasedEvent[],
    payments: PaymentRecord[]
  ): Promise<void> {
    // Create lookup maps
    const eventsByValidationId = new Map<string, BountyReleasedEvent>();
    const paymentsByValidationId = new Map<string, PaymentRecord>();

    // Index events by validationId
    for (const event of events) {
      eventsByValidationId.set(event.validationId, event);
    }

    // Index payments by onChainBountyId (validationId)
    for (const payment of payments) {
      if (payment.onChainBountyId) {
        paymentsByValidationId.set(payment.onChainBountyId, payment);
      }
    }

    // Detect missing payments: Event exists, no database record
    for (const [validationId, event] of eventsByValidationId) {
      const payment = paymentsByValidationId.get(validationId);

      if (!payment) {
        await this.handleMissingPayment(event);
      } else {
        // Payment exists - check for auto-resolution or discrepancies
        await this.validatePaymentMatch(event, payment);
      }
    }

    // Detect unconfirmed payments: Database COMPLETED, no event
    for (const [validationId, payment] of paymentsByValidationId) {
      const event = eventsByValidationId.get(validationId);

      if (!event) {
        await this.handleUnconfirmedPayment(payment);
      }
    }
  }

  /**
   * Handle missing payment: Event exists, no database record
   */
  private async handleMissingPayment(event: BountyReleasedEvent): Promise<void> {
    try {
      // Check if discrepancy already exists
      const existing = await prisma.paymentReconciliation.findFirst({
        where: {
          onChainBountyId: event.validationId,
          status: {
            not: ReconciliationStatus.RESOLVED,
          },
        },
      });

      if (existing) {
        console.log(
          `[Reconciliation] Discrepancy already exists for validationId ${event.validationId}`
        );
        return;
      }

      // Create PaymentReconciliation record
      const amountUsdc = Number(ethers.formatUnits(event.amount, usdcConfig.decimals));

      await prisma.paymentReconciliation.create({
        data: {
          paymentId: null, // No payment record
          onChainBountyId: event.validationId,
          txHash: event.txHash,
          amount: amountUsdc,
          status: ReconciliationStatus.MISSING_PAYMENT,
          discoveredAt: new Date(),
        },
      });

      console.warn(
        `[Reconciliation] MISSING_PAYMENT detected: validationId=${event.validationId}, ` +
          `amount=${amountUsdc} USDC, txHash=${event.txHash}`
      );
    } catch (error: any) {
      console.error(`[Reconciliation] Failed to handle missing payment:`, error.message);
    }
  }

  /**
   * Handle unconfirmed payment: Database COMPLETED, no event
   */
  private async handleUnconfirmedPayment(payment: PaymentRecord): Promise<void> {
    try {
      // Check if discrepancy already exists
      const existing = await prisma.paymentReconciliation.findFirst({
        where: {
          paymentId: payment.id,
          status: {
            not: ReconciliationStatus.RESOLVED,
          },
        },
      });

      if (existing) {
        return;
      }

      // Create PaymentReconciliation record
      await prisma.paymentReconciliation.create({
        data: {
          paymentId: payment.id,
          onChainBountyId: payment.onChainBountyId || 'UNKNOWN',
          txHash: payment.txHash || 'UNKNOWN',
          amount: payment.amount,
          status: ReconciliationStatus.UNCONFIRMED_PAYMENT,
          discoveredAt: new Date(),
        },
      });

      console.warn(
        `[Reconciliation] UNCONFIRMED_PAYMENT detected: paymentId=${payment.id}, ` +
          `validationId=${payment.onChainBountyId}, amount=${payment.amount} USDC`
      );
    } catch (error: any) {
      console.error(`[Reconciliation] Failed to handle unconfirmed payment:`, error.message);
    }
  }

  /**
   * Validate payment matches event and detect discrepancies
   * Also handles auto-resolution of missing txHash
   */
  private async validatePaymentMatch(
    event: BountyReleasedEvent,
    payment: PaymentRecord
  ): Promise<void> {
    try {
      const amountUsdc = Number(ethers.formatUnits(event.amount, usdcConfig.decimals));

      // Auto-resolve: Payment missing txHash but event matches
      if (!payment.txHash) {
        const addressMatch = payment.researcherAddress.toLowerCase() === event.researcher.toLowerCase();
        const amountMatch = Math.abs(payment.amount - amountUsdc) < 0.01; // Allow 0.01 USDC tolerance

        if (addressMatch && amountMatch) {
          // Update Payment with txHash and mark reconciled
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              txHash: event.txHash,
              reconciled: true,
              reconciledAt: new Date(),
            },
          });

          console.log(
            `[Reconciliation] Auto-resolved missing txHash for payment ${payment.id}: ${event.txHash}`
          );
          return; // Skip creating PaymentReconciliation
        }
      }

      // Check for amount mismatch
      if (Math.abs(payment.amount - amountUsdc) >= 0.01) {
        // Create AMOUNT_MISMATCH discrepancy
        const existing = await prisma.paymentReconciliation.findFirst({
          where: {
            paymentId: payment.id,
            status: {
              not: ReconciliationStatus.RESOLVED,
            },
          },
        });

        if (!existing) {
          await prisma.paymentReconciliation.create({
            data: {
              paymentId: payment.id,
              onChainBountyId: event.validationId,
              txHash: event.txHash,
              amount: amountUsdc,
              status: ReconciliationStatus.AMOUNT_MISMATCH,
              discoveredAt: new Date(),
              notes: `Database amount: ${payment.amount} USDC, On-chain amount: ${amountUsdc} USDC`,
            },
          });

          console.error(
            `[Reconciliation] AMOUNT_MISMATCH detected: validationId=${event.validationId}, ` +
              `expected=${payment.amount}, actual=${amountUsdc}`
          );
        }
        return;
      }

      // Check for txHash mismatch
      if (payment.txHash && payment.txHash !== event.txHash) {
        const existing = await prisma.paymentReconciliation.findFirst({
          where: {
            paymentId: payment.id,
            status: {
              not: ReconciliationStatus.RESOLVED,
            },
          },
        });

        if (!existing) {
          await prisma.paymentReconciliation.create({
            data: {
              paymentId: payment.id,
              onChainBountyId: event.validationId,
              txHash: event.txHash,
              amount: amountUsdc,
              status: ReconciliationStatus.DISCREPANCY,
              discoveredAt: new Date(),
              notes: `TxHash mismatch: Database=${payment.txHash}, On-chain=${event.txHash}`,
            },
          });

          console.error(
            `[Reconciliation] TxHash mismatch: validationId=${event.validationId}, ` +
              `database=${payment.txHash}, onchain=${event.txHash}`
          );
        }
        return;
      }

      // All checks passed - mark payment as reconciled if not already
      if (!payment.reconciled) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            reconciled: true,
            reconciledAt: new Date(),
          },
        });

        console.log(`[Reconciliation] Payment ${payment.id} successfully reconciled`);
      }
    } catch (error: any) {
      console.error(`[Reconciliation] Failed to validate payment match:`, error.message);
    }
  }

  /**
   * Check if unresolved discrepancy count exceeds threshold
   */
  private async checkDiscrepancyThreshold(): Promise<void> {
    try {
      const unresolvedCount = await prisma.paymentReconciliation.count({
        where: {
          status: {
            not: ReconciliationStatus.RESOLVED,
          },
        },
      });

      if (unresolvedCount > 10) {
        console.error(
          `[Reconciliation] HIGH DISCREPANCY COUNT ALERT: ${unresolvedCount} unresolved discrepancies detected!`
        );
      }
    } catch (error: any) {
      console.error('[Reconciliation] Failed to check discrepancy threshold:', error.message);
    }
  }

  /**
   * Get reconciliation report with summary metrics
   */
  public async getReconciliationReport(since?: Date): Promise<ReconciliationReport> {
    try {
      const whereClause = since
        ? {
            paidAt: {
              gte: since,
            },
          }
        : {};

      // Total payments
      const totalPayments = await prisma.payment.count({
        where: whereClause,
      });

      // Reconciled count
      const reconciledCount = await prisma.payment.count({
        where: {
          ...whereClause,
          reconciled: true,
        },
      });

      // Pending count (not reconciled)
      const pendingCount = totalPayments - reconciledCount;

      // Discrepancy count
      const discrepancyCount = await prisma.paymentReconciliation.count({
        where: {
          status: {
            not: ReconciliationStatus.RESOLVED,
          },
        },
      });

      // Last reconciliation timestamp
      const lastReconciledPayment = await prisma.payment.findFirst({
        where: {
          reconciled: true,
        },
        orderBy: {
          reconciledAt: 'desc',
        },
        select: {
          reconciledAt: true,
        },
      });

      // Discrepancies by status
      const discrepancies = await prisma.paymentReconciliation.groupBy({
        by: ['status'],
        where: {
          status: {
            not: ReconciliationStatus.RESOLVED,
          },
        },
        _count: {
          status: true,
        },
      });

      const discrepanciesByStatus: { [status: string]: number } = {};
      for (const item of discrepancies) {
        discrepanciesByStatus[item.status] = item._count.status;
      }

      // Calculate reconciliation rate
      const reconciliationRate = totalPayments > 0 ? (reconciledCount / totalPayments) * 100 : 0;

      return {
        totalPayments,
        reconciledCount,
        pendingCount,
        discrepancyCount,
        lastReconciliation: lastReconciledPayment?.reconciledAt || null,
        reconciliationRate: Math.round(reconciliationRate * 100) / 100,
        discrepanciesByStatus,
      };
    } catch (error: any) {
      console.error('[Reconciliation] Failed to get reconciliation report:', error.message);
      throw new Error(`Failed to get reconciliation report: ${error.message}`);
    }
  }

  /**
   * Get list of discrepancies with optional filtering and sorting
   */
  public async getDiscrepancies(
    status?: string,
    sortBy: 'discoveredAt' | 'amount' = 'discoveredAt'
  ): Promise<DiscrepancyRecord[]> {
    try {
      const whereClause = status
        ? {
            status,
          }
        : {
            status: {
              not: ReconciliationStatus.RESOLVED,
            },
          };

      const discrepancies = await prisma.paymentReconciliation.findMany({
        where: whereClause,
        orderBy: {
          [sortBy]: 'desc',
        },
      });

      return discrepancies;
    } catch (error: any) {
      console.error('[Reconciliation] Failed to get discrepancies:', error.message);
      throw new Error(`Failed to get discrepancies: ${error.message}`);
    }
  }

  /**
   * Manually resolve a discrepancy
   */
  public async resolveDiscrepancy(discrepancyId: string, notes?: string): Promise<void> {
    try {
      // Check if discrepancy exists and is not already resolved
      const discrepancy = await prisma.paymentReconciliation.findUnique({
        where: { id: discrepancyId },
      });

      if (!discrepancy) {
        throw new Error('Discrepancy not found');
      }

      if (discrepancy.status === ReconciliationStatus.RESOLVED) {
        throw new Error('Discrepancy already resolved');
      }

      // Update discrepancy status
      await prisma.paymentReconciliation.update({
        where: { id: discrepancyId },
        data: {
          status: ReconciliationStatus.RESOLVED,
          resolvedAt: new Date(),
          notes: notes || discrepancy.notes,
        },
      });

      console.log(`[Reconciliation] Discrepancy ${discrepancyId} resolved`);
    } catch (error: any) {
      console.error('[Reconciliation] Failed to resolve discrepancy:', error.message);
      throw error;
    }
  }

  /**
   * Close reconciliation queue (for graceful shutdown)
   */
  public async close(): Promise<void> {
    try {
      await this.reconciliationQueue.close();
      console.log('[Reconciliation] Queue closed');
    } catch (error: any) {
      console.error('[Reconciliation] Failed to close queue:', error.message);
    }
  }
}

// Singleton instance
let reconciliationService: ReconciliationService | null = null;

/**
 * Get singleton instance of ReconciliationService
 */
export function getReconciliationService(): ReconciliationService {
  if (!reconciliationService) {
    reconciliationService = new ReconciliationService();
  }
  return reconciliationService;
}

export default ReconciliationService;
