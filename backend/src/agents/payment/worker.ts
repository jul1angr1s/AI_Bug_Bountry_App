import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../../lib/redis.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { BountyPoolClient, BountySeverity } from '../../blockchain/contracts/BountyPoolClient.js';
import { Severity, PaymentStatus } from '@prisma/client';
import type { PaymentJobData } from '../../queues/payment.queue.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('PaymentAgent');

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
    log.info('Worker already running');
    return;
  }

  log.info('Starting worker...');

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
    log.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, err: error.message }, 'Job failed');
  });

  worker.on('error', (error) => {
    log.error({ err: error }, 'Worker error');
  });

  log.info('Running and processing payment jobs');
}

/**
 * Stop Payment Worker
 */
export async function stopPaymentWorker(): Promise<void> {
  if (!worker) {
    return;
  }

  log.info('Stopping worker...');
  await worker.close();
  worker = null;
  log.info('Worker stopped');
}

/**
 * Process a single payment job
 */
async function processPayment(job: Job<PaymentJobData>): Promise<void> {
  const { paymentId, validationId, protocolId } = job.data;

  log.info({ paymentId, validationId, protocolId }, 'Processing payment');

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
      log.info({ paymentId }, 'Payment already claimed or not pending, skipping');
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
    // STEP 3: Check bounty pool balance using contract's calculated amount
    // =================
    const bountyPoolClient = new BountyPoolClient();
    const severity = SEVERITY_MAP[finding.severity] ?? BountySeverity.INFORMATIONAL;
    const requiredAmount = await bountyPoolClient.calculateBountyAmount(severity);
    const protocolBalance = await bountyPoolClient.getProtocolBalance(
      protocol.onChainProtocolId
    );

    log.debug({ protocolBalance, severity: finding.severity, requiredAmount }, 'Balance check');

    if (protocolBalance < requiredAmount) {
      throw new Error(
        `Insufficient bounty pool balance: ${protocolBalance} < ${requiredAmount} USDC`
      );
    }

    // =================
    // STEP 4: Submit transaction to BountyPool contract
    // =================
    log.info({ paymentId }, 'Submitting transaction to blockchain');

    const result = await bountyPoolClient.releaseBounty(
      protocol.onChainProtocolId,
      validationId,
      payment.researcherAddress,
      severity
    );

    log.debug({ txHash: result.txHash, bountyId: result.bountyId, block: result.blockNumber }, 'Transaction confirmed');

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

    log.info({ paymentId }, 'Payment completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ paymentId, err: errorMessage }, 'Payment failed');

    // Only mark as FAILED on the final attempt.
    // On intermediate attempts, reset to PENDING so BullMQ retries can re-claim it.
    const maxAttempts = job.opts.attempts || 3;
    const isFinalAttempt = job.attemptsMade >= maxAttempts - 1;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: (isFinalAttempt ? 'FAILED' : 'PENDING') as PaymentStatus,
        failureReason: errorMessage,
        retryCount: {
          increment: 1,
        },
      },
    });

    log.info({ paymentId, attempt: job.attemptsMade + 1, maxAttempts, isFinalAttempt }, isFinalAttempt ? 'Final attempt, marked FAILED' : 'Reset to PENDING for retry');

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
