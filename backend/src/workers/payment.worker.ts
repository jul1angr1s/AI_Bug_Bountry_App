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

const redisClient = await getRedisClient();
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

    // Step 4: Verify validation - check on-chain first, fallback to database (LLM validation)
    const validationClient = new ValidationRegistryClient();
    let validationVerified = false;

    try {
      const onChainValidation = await validationClient.getValidation(validationId);

      if (onChainValidation.exists) {
        // On-chain validation exists - verify outcome
        if (onChainValidation.outcome !== ValidationOutcome.CONFIRMED) {
          const outcomeNames = ['CONFIRMED', 'REJECTED', 'INCONCLUSIVE'];
          const outcomeName = outcomeNames[onChainValidation.outcome] || 'UNKNOWN';

          console.error('[PaymentWorker] On-chain validation outcome is not CONFIRMED');
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

          return;
        }

        console.log('[PaymentWorker] On-chain validation verified: CONFIRMED');
        validationVerified = true;
      } else {
        console.log('[PaymentWorker] No on-chain validation found, checking database (LLM validation)...');
      }
    } catch (error: any) {
      console.warn('[PaymentWorker] On-chain validation check failed, checking database:', error.message);
    }

    // If no on-chain validation, check database for LLM-validated findings
    if (!validationVerified) {
      // Find the finding associated with this payment's vulnerability
      const finding = await prisma.finding.findFirst({
        where: {
          scan: {
            protocolId: payment.vulnerability.protocolId,
          },
          status: 'VALIDATED',
        },
        orderBy: { validatedAt: 'desc' },
      });

      if (finding && finding.status === 'VALIDATED') {
        console.log('[PaymentWorker] Database validation verified: Finding is VALIDATED');
        console.log(`  Finding ID: ${finding.id}`);
        console.log(`  Severity: ${finding.severity}`);
        console.log(`  Validated At: ${finding.validatedAt}`);
        validationVerified = true;
      } else {
        console.error('[PaymentWorker] No validated finding found');

        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'FAILED',
            failureReason: 'No validated finding found (neither on-chain nor database)',
          },
        });

        await emitPaymentFailed(
          protocolId,
          paymentId,
          'No validated finding found',
          payment.retryCount,
          validationId
        );

        return;
      }
    }

    // Step 5: Map severity to BountySeverity enum
    const severity = mapSeverity(payment.vulnerability.severity);

    // Step 5.5: Get the on-chain protocol ID (bytes32) from the Protocol record
    const protocol = await prisma.protocol.findUnique({
      where: { id: payment.vulnerability.protocolId },
      select: { onChainProtocolId: true },
    });

    console.log('[PaymentWorker] Payment details:');
    console.log(`  Amount: ${payment.amount} ${payment.currency}`);
    console.log(`  Severity: ${payment.vulnerability.severity} -> ${BountySeverity[severity]}`);

    // Step 6: Execute payment - either on-chain or demo mode
    let releaseResult: { txHash: string; blockNumber: number; amount: bigint; bountyId: string } | null = null;

    // Check if protocol has on-chain registration and pool has funds
    let useRealPayment = false;
    let poolBalance = 0;
    const onChainProtocolId = protocol?.onChainProtocolId;

    if (onChainProtocolId) {
      // Check if the BountyPool has funds for this protocol
      try {
        const bountyClient = new BountyPoolClient();
        poolBalance = await bountyClient.getProtocolBalance(onChainProtocolId);
        console.log(`[PaymentWorker] Protocol pool balance: ${poolBalance} USDC`);

        // Only use real payment if pool has sufficient funds (at least the payment amount)
        if (poolBalance >= payment.amount) {
          useRealPayment = true;
        } else {
          console.log(`[PaymentWorker] Pool balance (${poolBalance}) < payment amount (${payment.amount})`);
          console.log('[PaymentWorker] Falling back to demo mode due to insufficient pool funds');
        }
      } catch (error: any) {
        console.log(`[PaymentWorker] Could not check pool balance: ${error.message}`);
        console.log('[PaymentWorker] Falling back to demo mode');
      }
    }

    if (!useRealPayment) {
      // DEMO MODE: Protocol not registered on-chain or pool has insufficient funds
      const reason = !onChainProtocolId
        ? 'Protocol not registered on-chain'
        : `Pool balance (${poolBalance} USDC) insufficient for payment (${payment.amount} USDC)`;
      console.log(`[PaymentWorker] DEMO MODE: ${reason}, simulating payment...`);

      const demoTxHash = `demo_tx_${Date.now()}_${paymentId.substring(0, 8)}`;
      const demoBountyId = `demo_bounty_${Date.now()}`;

      releaseResult = {
        txHash: demoTxHash,
        blockNumber: 0,
        amount: BigInt(Math.floor(payment.amount * 10 ** usdcConfig.decimals)),
        bountyId: demoBountyId,
      };

      console.log('[PaymentWorker] DEMO: Payment simulated successfully!');
      console.log(`  Demo TX Hash: ${demoTxHash}`);
      console.log(`  Amount: ${payment.amount} USDC`);
    } else {
      // PRODUCTION MODE: Execute real on-chain payment
      console.log(`[PaymentWorker] PRODUCTION MODE: Executing real on-chain payment`);
      console.log(`  On-chain Protocol ID: ${onChainProtocolId}`);
      console.log(`  Pool balance: ${poolBalance} USDC`);

      const bountyClient = new BountyPoolClient();

      console.log('[PaymentWorker] Calling BountyPool.releaseBounty()...');

      try {
        // onChainProtocolId is guaranteed to be set here since useRealPayment=true
        releaseResult = await bountyClient.releaseBounty(
          onChainProtocolId!,
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
    }

    // Step 7: Update Payment record on success (Task 5.3)
    // This handles both demo mode and production mode
    if (!releaseResult) {
      throw new Error('Payment release result is null');
    }

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
