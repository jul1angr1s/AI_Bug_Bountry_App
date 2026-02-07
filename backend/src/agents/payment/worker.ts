import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../../lib/redis.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { BountyPoolClient, BountySeverity } from '../../blockchain/contracts/BountyPoolClient.js';
import { Severity, PaymentStatus } from '@prisma/client';
import type { PaymentJobData } from '../../queues/payment.queue.js';

const redis = getRedisClient();
const prisma = getPrismaClient();

let worker: Worker | null = null;

/**
 * Severity mapping from database to blockchain
 */
const SEVERITY_MAP: Record<Severity, BountySeverity> = {
  CRITICAL: BountySeverity.CRITICAL,
  HIGH: BountySeverity.HIGH,
  MEDIUM: BountySeverity.MEDIUM,
  LOW: BountySeverity.LOW,
  INFO: BountySeverity.INFORMATIONAL,
};

/**
 * Start Payment Worker
 *
 * Processes payment jobs from BullMQ queue:
 * - Validates payment eligibility
 * - Checks bounty pool balance
 * - Submits transactions to BountyPool contract
 * - Monitors transaction confirmations
 * - Updates Payment records
 */
export async function startPaymentWorker(): Promise<void> {
  if (worker) {
    console.log('[Payment Worker] Already running');
    return;
  }

  console.log('[Payment Worker] Starting...');

  worker = new Worker<PaymentJobData>(
    'payment-processing',
    async (job: Job<PaymentJobData>) => {
      return await processPayment(job);
    },
    {
      connection: redis,
      concurrency: 1, // Process one payment at a time to avoid nonce issues
      limiter: {
        max: 10, // Max 10 payments per minute
        duration: 60000,
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[Payment Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Payment Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Payment Worker] Worker error:', error);
  });

  console.log('[Payment Worker] Running and processing payment jobs...');
}

/**
 * Stop Payment Worker
 */
export async function stopPaymentWorker(): Promise<void> {
  if (!worker) {
    return;
  }

  console.log('[Payment Worker] Stopping...');
  await worker.close();
  worker = null;
  console.log('[Payment Worker] Stopped');
}

/**
 * Process a single payment job
 */
async function processPayment(job: Job<PaymentJobData>): Promise<void> {
  const { paymentId, validationId, protocolId } = job.data;

  console.log(`[Payment Worker] Processing payment ${paymentId}`);
  console.log(`  Validation ID: ${validationId}`);
  console.log(`  Protocol ID: ${protocolId}`);

  try {
    // =================
    // STEP 1: Atomic status transition - prevents race condition
    // Only one worker can claim a PENDING payment
    // =================
    const claimResult = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: 'PENDING' as PaymentStatus,
      },
      data: {
        status: 'PROCESSING' as PaymentStatus,
        processedAt: new Date(),
      },
    });

    if (claimResult.count === 0) {
      console.log(`[Payment Worker] Payment ${paymentId} already claimed or not pending, skipping`);
      return;
    }

    // Fetch full payment details after claiming
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        vulnerability: {
          include: {
            protocol: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found after claiming`);
    }

    // =================
    // STEP 2: Get finding and protocol details
    // =================
    const finding = await prisma.finding.findFirst({
      where: {
        id: validationId,
        status: 'VALIDATED',
      },
      include: {
        scan: {
          include: {
            protocol: true,
          },
        },
      },
    });

    if (!finding) {
      throw new Error(`Validated finding ${validationId} not found`);
    }

    if (!finding.scan || !finding.scan.protocol) {
      throw new Error(`Protocol not found for finding ${validationId}`);
    }

    const protocol = finding.scan.protocol;

    if (!protocol.onChainProtocolId) {
      throw new Error(
        `Protocol ${protocol.id} is not registered on-chain (missing onChainProtocolId)`
      );
    }

    // =================
    // STEP 3: Check bounty pool balance
    // =================
    const bountyPoolClient = new BountyPoolClient();
    const protocolBalance = await bountyPoolClient.getProtocolBalance(
      protocol.onChainProtocolId
    );

    console.log(`[Payment Worker] Protocol balance: ${protocolBalance} USDC`);

    if (protocolBalance < payment.amount) {
      throw new Error(
        `Insufficient bounty pool balance: ${protocolBalance} < ${payment.amount} USDC`
      );
    }

    // =================
    // STEP 4: Submit transaction to BountyPool contract
    // =================
    console.log('[Payment Worker] Submitting transaction to blockchain...');

    const severity = SEVERITY_MAP[finding.severity] ?? BountySeverity.INFORMATIONAL;

    const result = await bountyPoolClient.releaseBounty(
      protocol.onChainProtocolId,
      validationId,
      payment.researcherAddress,
      severity
    );

    console.log(`[Payment Worker] Transaction confirmed!`);
    console.log(`  TX Hash: ${result.txHash}`);
    console.log(`  Bounty ID: ${result.bountyId}`);
    console.log(`  Block: ${result.blockNumber}`);

    // =================
    // STEP 5: Update Payment record
    // =================
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED' as PaymentStatus,
        txHash: result.txHash,
        onChainBountyId: result.bountyId,
        paidAt: new Date(result.timestamp * 1000),
        reconciled: true,
        reconciledAt: new Date(),
      },
    });

    console.log(`[Payment Worker] Payment ${paymentId} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Payment Worker] Payment ${paymentId} failed:`, errorMessage);

    // Update payment status to FAILED
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED' as PaymentStatus,
        failureReason: errorMessage,
        retryCount: {
          increment: 1,
        },
      },
    });

    // Re-throw error to trigger job retry
    throw error;
  }
}

/**
 * Check for duplicate payment using idempotency key.
 * Returns true if a payment with this key already exists.
 */
async function checkIdempotencyKey(idempotencyKey: string | null | undefined): Promise<boolean> {
  if (!idempotencyKey) return false;

  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey },
  });

  return existing !== null;
}

/**
 * Get payment worker status
 */
export function getPaymentWorkerStatus(): {
  isRunning: boolean;
  concurrency: number;
} {
  return {
    isRunning: worker !== null,
    concurrency: worker?.opts.concurrency || 0,
  };
}
