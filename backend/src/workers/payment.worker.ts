import { Worker, Job } from 'bullmq';
import { ethers } from 'ethers';
import { getRedisClient } from '../lib/redis.js';
import { getPrismaClient } from '../lib/prisma.js';
import { PaymentJobData } from '../queues/payment.queue.js';
import { BountyPoolClient, BountySeverity } from '../blockchain/contracts/BountyPoolClient.js';
import { ValidationRegistryClient, ValidationOutcome } from '../blockchain/contracts/ValidationRegistryClient.js';
import { RESEARCHER_ADDRESS } from '../blockchain/config.js';
import { emitPaymentReleased, emitPaymentFailed } from '../websocket/events.js';
import { usdcConfig } from '../blockchain/config.js';

const redisClient = getRedisClient();
const prisma = getPrismaClient();

/**
 * Map database Severity enum to BountySeverity enum
 */
function mapSeverity(severity: string): BountySeverity {
  const severityMap: Record<string, BountySeverity> = {
    CRITICAL: BountySeverity.CRITICAL,
    HIGH: BountySeverity.HIGH,
    MEDIUM: BountySeverity.MEDIUM,
    LOW: BountySeverity.LOW,
    INFO: BountySeverity.INFORMATIONAL,
  };
  return severityMap[severity] ?? BountySeverity.INFORMATIONAL;
}

/**
 * Process a payment job
 * Implements OpenSpec requirements for automatic payment trigger (Tasks 5.1-5.10)
 */
async function processPayment(job: Job<PaymentJobData>): Promise<void> {
  const { paymentId, validationId, protocolId } = job.data;

  console.log('[PaymentWorker] Processing payment job...');
  console.log(`  Payment ID: ${paymentId}`);
  console.log(`  Validation ID: ${validationId}`);
  console.log(`  Protocol ID: ${protocolId}`);

  try {
    // Step 1: Fetch Payment record by paymentId
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        vulnerability: {
          select: {
            severity: true,
            protocolId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error(`Payment record not found: ${paymentId}`);
    }

    // Step 2: Check for duplicate payment (Task 5.5 - Scenario: Worker prevents duplicate payments)
    if (payment.status === 'COMPLETED') {
      console.log('[PaymentWorker] Payment already completed, skipping execution');
      console.log(`  Payment ID: ${paymentId}`);
      console.log(`  TX Hash: ${payment.txHash}`);
      return; // Skip execution without error
    }

    // Step 3: Verify researcher address (Task 5.6)
    const researcherAddress = payment.researcherAddress || RESEARCHER_ADDRESS;

    if (!researcherAddress || !ethers.isAddress(researcherAddress)) {
      console.error('[PaymentWorker] Missing or invalid researcher address');
      console.error(`  Payment ID: ${paymentId}`);
      console.error(`  Address: ${researcherAddress}`);

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          failureReason: 'Missing or invalid researcher address',
        },
      });

      // Emit failure event
      await emitPaymentFailed(
        protocolId,
        paymentId,
        'Missing or invalid researcher address',
        payment.retryCount,
        validationId
      );

      // Don't retry - this is a permanent failure
      return;
    }

    console.log('[PaymentWorker] Researcher address verified');
    console.log(`  Address: ${researcherAddress}`);

    // Step 4: Verify validation outcome is CONFIRMED (Task 5.2)
    const offchainValidation = process.env.PAYMENT_OFFCHAIN_VALIDATION === 'true';

    if (!offchainValidation) {
      const validationClient = new ValidationRegistryClient();
      let onChainValidation;

      try {
        onChainValidation = await validationClient.getValidation(validationId);

        if (!onChainValidation.exists) {
          throw new Error(`Validation not found on-chain: ${validationId}`);
        }

        if (onChainValidation.outcome !== ValidationOutcome.CONFIRMED) {
          const outcomeNames = ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE'];
          const outcomeName = outcomeNames[onChainValidation.outcome] || 'UNKNOWN';

          console.error('[PaymentWorker] Validation outcome is not CONFIRMED');
          console.error(`  Validation ID: ${validationId}`);
          console.error(`  Outcome: ${outcomeName}`);

          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: 'FAILED',
              failureReason: `Validation outcome is ${outcomeName}, expected CONFIRMED`,
            },
          });

          await emitPaymentFailed(
            protocolId,
            paymentId,
            `Validation outcome is ${outcomeName}`,
            payment.retryCount,
            validationId
          );

          // Don't retry - this is a permanent failure
          return;
        }

        console.log('[PaymentWorker] Validation outcome verified: CONFIRMED');
      } catch (error: any) {
        console.error('[PaymentWorker] Failed to verify validation:', error.message);

        // Increment retry count and re-throw for BullMQ retry
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            retryCount: payment.retryCount + 1,
          },
        });

        throw new Error(`Failed to verify validation: ${error.message}`);
      }
    } else {
      console.warn('[PaymentWorker] Off-chain validation enabled - skipping on-chain validation check');
    }

    // Step 5: Map severity to BountySeverity enum
    const severity = mapSeverity(payment.vulnerability.severity);

    console.log('[PaymentWorker] Payment details:');
    console.log(`  Amount: ${payment.amount} ${payment.currency}`);
    console.log(`  Severity: ${payment.vulnerability.severity} -> ${BountySeverity[severity]}`);

    // Step 6: Call BountyPool.releaseBounty() (Task 5.3)
    const bountyClient = new BountyPoolClient();

    console.log('[PaymentWorker] Calling BountyPool.releaseBounty()...');

    let releaseResult;
    try {
      releaseResult = await bountyClient.releaseBounty(
        protocolId,
        validationId,
        researcherAddress,
        severity
      );

      console.log('[PaymentWorker] Bounty released successfully!');
      console.log(`  TX Hash: ${releaseResult.txHash}`);
      console.log(`  Block: ${releaseResult.blockNumber}`);
      console.log(`  Amount: ${ethers.formatUnits(releaseResult.amount, usdcConfig.decimals)} USDC`);
      console.log(`  Bounty ID: ${releaseResult.bountyId}`);
    } catch (error: any) {
      console.error('[PaymentWorker] Failed to release bounty:', error.message);

      // Task 5.4 - Scenario: Worker handles insufficient pool funds
      if (error.message.includes('Insufficient pool balance') ||
          error.message.includes('InsufficientBalance')) {
        console.error('[PaymentWorker] Insufficient pool balance - marking as FAILED');

        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            failureReason: 'Insufficient pool balance',
          },
        });

        await emitPaymentFailed(
          protocolId,
          paymentId,
          'Insufficient pool balance',
          payment.retryCount,
          validationId
        );

        // Don't retry - insufficient funds is a permanent failure until pool is refunded
        return;
      }

      // Task 5.4 - Scenario: Worker retries on network errors
      // Network errors, timeouts, etc. - increment retry and re-throw for BullMQ retry
      console.log('[PaymentWorker] Network error detected, will retry...');
      console.log(`  Retry count: ${payment.retryCount + 1}`);

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          retryCount: payment.retryCount + 1,
        },
      });

      throw error; // Re-throw to trigger BullMQ retry
    }

    // Step 7: Update Payment record on success (Task 5.3)
    const paidAt = new Date();

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        txHash: releaseResult.txHash,
        paidAt,
        onChainBountyId: releaseResult.bountyId,
      },
    });

    console.log('[PaymentWorker] Payment record updated to COMPLETED');

    // Step 8: Emit WebSocket event on success (Task 5.5)
    await emitPaymentReleased(
      protocolId,
      paymentId,
      payment.amount,
      releaseResult.txHash,
      researcherAddress,
      paidAt,
      validationId,
      payment.vulnerability.severity
    );

    console.log('[PaymentWorker] Payment processing completed successfully!');

  } catch (error: any) {
    // Task 5.7: Logging - Payment failure logged
    console.error('[PaymentWorker] Payment processing failed:', error.message);
    console.error(`  Payment ID: ${paymentId}`);
    console.error(`  Validation ID: ${validationId}`);
    console.error(`  Error: ${error.stack || error.message}`);

    // Re-throw error to let BullMQ handle retry logic
    throw error;
  }
}

/**
 * Initialize and start the payment processing worker
 */
export function startPaymentWorker(): Worker<PaymentJobData> {
  console.log('[PaymentWorker] Initializing payment processing worker...');

  const worker = new Worker<PaymentJobData>(
    'payment-processing',
    async (job: Job<PaymentJobData>) => {
      // Task 5.7: Logging - Payment job start logged
      console.log('[PaymentWorker] Job dequeued from payment-processing queue');
      console.log(`  Job ID: ${job.id}`);
      console.log(`  Payment ID: ${job.data.paymentId}`);
      console.log(`  Validation ID: ${job.data.validationId}`);
      console.log(`  Protocol ID: ${job.data.protocolId}`);
      console.log(`  Attempt: ${job.attemptsMade + 1}`);

      await processPayment(job);
    },
    {
      connection: redisClient,
      concurrency: 5, // Process up to 5 payments concurrently
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per second
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[PaymentWorker] Job completed successfully: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      console.error(`[PaymentWorker] Job failed: ${job.id}`);
      console.error(`  Payment ID: ${job.data.paymentId}`);
      console.error(`  Attempts: ${job.attemptsMade}/${job.opts.attempts || 3}`);
      console.error(`  Error: ${err.message}`);
    }
  });

  worker.on('error', (err) => {
    console.error('[PaymentWorker] Worker error:', err);
  });

  console.log('[PaymentWorker] Payment processing worker started successfully');
  console.log('  Queue: payment-processing');
  console.log('  Concurrency: 5');
  console.log('  Rate limit: 10 jobs/second');

  return worker;
}

/**
 * Graceful shutdown handler for payment worker
 */
export async function stopPaymentWorker(worker: Worker<PaymentJobData>): Promise<void> {
  console.log('[PaymentWorker] Stopping payment processing worker...');

  await worker.close();

  console.log('[PaymentWorker] Payment processing worker stopped');
}

export default {
  startPaymentWorker,
  stopPaymentWorker,
};
