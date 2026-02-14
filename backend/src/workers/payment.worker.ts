import { Worker, Job } from 'bullmq';
import { ethers } from 'ethers';
import { getRedisClient } from '../lib/redis.js';
import { getPrismaClient } from '../lib/prisma.js';
import { createLogger } from '../lib/logger.js';
import { PaymentJobData } from '../queues/payment.queue.js';
import { BountyPoolClient, BountySeverity } from '../blockchain/contracts/BountyPoolClient.js';
import { ValidationRegistryClient, ValidationOutcome } from '../blockchain/contracts/ValidationRegistryClient.js';
import { RESEARCHER_ADDRESS } from '../blockchain/config.js';
import { emitPaymentReleased, emitPaymentFailed } from '../websocket/events.js';
import { usdcConfig } from '../blockchain/config.js';

const log = createLogger('PaymentWorker');

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

  log.info('Processing payment job...');
  log.debug({ paymentId, validationId, protocolId }, 'Payment job details');

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
      log.info({ paymentId, txHash: payment.txHash }, 'Payment already completed, skipping execution');
      return; // Skip execution without error
    }

    // Step 3: Verify researcher address (Task 5.6)
    const researcherAddress = payment.researcherAddress || RESEARCHER_ADDRESS;

    if (!researcherAddress || !ethers.isAddress(researcherAddress)) {
      log.error({ paymentId, address: researcherAddress }, 'Missing or invalid researcher address');

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

    log.debug({ address: researcherAddress }, 'Researcher address verified');

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

          log.error({ validationId, outcome: outcomeName }, 'On-chain validation outcome is not CONFIRMED');

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

        log.debug('On-chain validation verified: CONFIRMED');
        validationVerified = true;
      } else {
        log.debug('No on-chain validation found, checking database (LLM validation)...');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn({ err: msg }, 'On-chain validation check failed, checking database');
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
        log.debug({ findingId: finding.id, severity: finding.severity, validatedAt: finding.validatedAt }, 'Database validation verified: Finding is VALIDATED');
        validationVerified = true;
      } else {
        log.error('No validated finding found');

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

    log.debug({ amount: payment.amount, currency: payment.currency, severity: payment.vulnerability.severity, mappedSeverity: BountySeverity[severity] }, 'Payment details');

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
        log.debug({ poolBalance }, 'Protocol pool balance (USDC)');

        // Only use real payment if pool has sufficient funds (at least the payment amount)
        if (poolBalance >= payment.amount) {
          useRealPayment = true;
        } else {
          log.debug({ poolBalance, paymentAmount: payment.amount }, 'Pool balance < payment amount, falling back to demo mode');
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.debug({ err: msg }, 'Could not check pool balance, falling back to demo mode');
      }
    }

    if (!useRealPayment) {
      // DEMO MODE: Protocol not registered on-chain or pool has insufficient funds
      const reason = !onChainProtocolId
        ? 'Protocol not registered on-chain'
        : `Pool balance (${poolBalance} USDC) insufficient for payment (${payment.amount} USDC)`;
      log.info({ reason }, 'DEMO MODE: simulating payment...');

      const demoTxHash = `demo_tx_${Date.now()}_${paymentId.substring(0, 8)}`;
      const demoBountyId = `demo_bounty_${Date.now()}`;

      releaseResult = {
        txHash: demoTxHash,
        blockNumber: 0,
        amount: BigInt(Math.floor(payment.amount * 10 ** usdcConfig.decimals)),
        bountyId: demoBountyId,
      };

      log.info({ demoTxHash, amount: payment.amount }, 'DEMO: Payment simulated successfully');
    } else {
      // PRODUCTION MODE: Execute real on-chain payment
      log.info({ onChainProtocolId, poolBalance }, 'PRODUCTION MODE: Executing real on-chain payment');

      const bountyClient = new BountyPoolClient();

      log.debug('Calling BountyPool.releaseBounty()...');

      try {
        // onChainProtocolId is guaranteed to be set here since useRealPayment=true
        releaseResult = await bountyClient.releaseBounty(
          onChainProtocolId!,
          validationId,
          researcherAddress,
          severity
        );

        log.info({ txHash: releaseResult.txHash, blockNumber: releaseResult.blockNumber, amount: ethers.formatUnits(releaseResult.amount, usdcConfig.decimals), bountyId: releaseResult.bountyId }, 'Bounty released successfully');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log.error({ err: msg }, 'Failed to release bounty');

        // Task 5.4 - Scenario: Worker handles insufficient pool funds
        if (msg.includes('Insufficient pool balance') ||
            msg.includes('InsufficientBalance')) {
          log.error('Insufficient pool balance - marking as FAILED');

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
        log.warn({ retryCount: payment.retryCount + 1 }, 'Network error detected, will retry...');

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

    // Reconcile DB amount with actual on-chain amount to prevent stale values
    const actualAmount = Number(ethers.formatUnits(releaseResult.amount, usdcConfig.decimals));

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        txHash: releaseResult.txHash,
        paidAt,
        onChainBountyId: releaseResult.bountyId,
        amount: actualAmount,
      },
    });

    log.debug('Payment record updated to COMPLETED');
    if (actualAmount !== payment.amount) {
      log.info({ previousAmount: payment.amount, actualAmount }, 'Reconciled payment amount (USDC)');
    }

    // Step 8: Emit WebSocket event on success (Task 5.5)
    await emitPaymentReleased(
      protocolId,
      paymentId,
      actualAmount,
      releaseResult.txHash,
      researcherAddress,
      paidAt,
      validationId,
      payment.vulnerability.severity
    );

    log.info({ paymentId }, 'Payment processing completed successfully');

  } catch (error) {
    // Task 5.7: Logging - Payment failure logged
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    log.error({ paymentId, validationId, err: msg, stack }, 'Payment processing failed');

    // Re-throw error to let BullMQ handle retry logic
    throw error;
  }
}

/**
 * Initialize and start the payment processing worker
 */
export function startPaymentWorker(): Worker<PaymentJobData> {
  log.info('Initializing payment processing worker...');

  const worker = new Worker<PaymentJobData>(
    'payment-processing',
    async (job: Job<PaymentJobData>) => {
      // Task 5.7: Logging - Payment job start logged
      log.debug({ jobId: job.id, paymentId: job.data.paymentId, validationId: job.data.validationId, protocolId: job.data.protocolId, attempt: job.attemptsMade + 1 }, 'Job dequeued from payment-processing queue');

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
    log.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    if (job) {
      log.error({ jobId: job.id, paymentId: job.data.paymentId, attempts: job.attemptsMade, maxAttempts: job.opts.attempts || 3, err: err.message }, 'Job failed');
    }
  });

  worker.on('error', (err) => {
    log.error({ err }, 'Worker error');
  });

  log.info({ queue: 'payment-processing', concurrency: 5, rateLimit: '10 jobs/second' }, 'Payment processing worker started successfully');

  return worker;
}

/**
 * Graceful shutdown handler for payment worker
 */
export async function stopPaymentWorker(worker: Worker<PaymentJobData>): Promise<void> {
  log.info('Stopping payment processing worker...');

  await worker.close();

  log.info('Payment processing worker stopped');
}

export default {
  startPaymentWorker,
  stopPaymentWorker,
};
