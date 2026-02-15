import { EventLog } from 'ethers';
import { getEventListenerService } from '../../services/event-listener.service.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { addPaymentJob, type PaymentJobData } from '../../queues/payment.queue.js';
import { contractAddresses } from '../config.js';
import { createLogger } from '../../lib/logger.js';
import ValidationRegistryABI from '../abis/ValidationRegistry.json' with { type: 'json' };

const prisma = getPrismaClient();
const log = createLogger('ValidationListener');

/**
 * ValidationOutcome enum from ValidationRegistry contract
 * 0 = CONFIRMED
 * 1 = REJECTED
 * 2 = INCONCLUSIVE
 */
enum ValidationOutcome {
  CONFIRMED = 0,
  REJECTED = 1,
  INCONCLUSIVE = 2,
}

/**
 * Severity enum from ValidationRegistry contract
 * 0 = CRITICAL
 * 1 = HIGH
 * 2 = MEDIUM
 * 3 = LOW
 * 4 = INFORMATIONAL
 */
enum Severity {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  INFORMATIONAL = 4,
}

/**
 * Map severity to USDC payment amount
 */
const SEVERITY_TO_AMOUNT: Record<Severity, number> = {
  [Severity.CRITICAL]: 5,      // base=1 USDC × 5x multiplier
  [Severity.HIGH]: 3,          // base=1 USDC × 3x multiplier
  [Severity.MEDIUM]: 1.5,      // base=1 USDC × 1.5x multiplier
  [Severity.LOW]: 1,           // base=1 USDC × 1x multiplier
  [Severity.INFORMATIONAL]: 0, // No payment for informational findings
};

/**
 * ValidationRecorded Event Structure
 *
 * event ValidationRecorded(
 *   bytes32 indexed validationId,
 *   bytes32 indexed protocolId,
 *   bytes32 indexed findingId,
 *   address validatorAgent,
 *   ValidationOutcome outcome,
 *   Severity severity,
 *   uint256 timestamp
 * );
 */
interface ValidationRecordedEvent {
  validationId: string;
  protocolId: string;
  findingId: string;
  validatorAgent: string;
  outcome: number;
  severity: number;
  timestamp: bigint;
}

/**
 * Handle ValidationRecorded event from ValidationRegistry contract
 *
 * Requirements (from OpenSpec):
 * - Filter for outcome=CONFIRMED only
 * - Create Payment record: status=PENDING, researcherAddress from Finding, amount from severity tier, queuedAt=now()
 * - Call addPaymentJob(paymentId, validationId, protocolId)
 * - Update Proof.onChainValidationId with validationId from event
 * - Prevent duplicate Payment creation (check if Payment exists for validationId)
 */
async function handleValidationRecorded(event: EventLog): Promise<void> {
  try {
    // Parse event arguments
    const args = event.args as unknown as ValidationRecordedEvent;

    const {
      validationId,
      protocolId,
      findingId,
      validatorAgent,
      outcome,
      severity,
      timestamp,
    } = args;

    log.info({ blockNumber: event.blockNumber }, 'ValidationRecorded event received');
    log.debug({ validationId, protocolId, findingId, outcome: ValidationOutcome[outcome], severity: Severity[severity] }, 'Event data details');

    // =====================================
    // FILTER: Only process CONFIRMED validations
    // =====================================
    if (outcome !== ValidationOutcome.CONFIRMED) {
      log.info({ outcome: ValidationOutcome[outcome] }, 'Skipping non-CONFIRMED validation');
      return;
    }

    // =====================================
    // STEP 1: Find the Proof and Finding using validationId
    // =====================================
    // The proof should already have the onChainValidationId set by the validator
    // If not, we need to find it by the findingId from the event
    let proof = await prisma.proof.findFirst({
      where: {
        onChainValidationId: validationId,
      },
      include: {
        finding: {
          include: {
            scan: {
              include: {
                protocol: true,
              },
            },
          },
        },
      },
    });

    // If proof not found by validationId, try to find by findingId
    // The findingId from event is a bytes32 representation of the UUID
    if (!proof) {
      log.debug({ validationId, findingId }, 'Proof not found by validationId, searching by findingId');

      // The findingId might be stored as the database UUID
      // Try to match it directly (ethers converts string to bytes32)
      proof = await prisma.proof.findFirst({
        where: {
          finding: {
            id: findingId,
          },
        },
        include: {
          finding: {
            include: {
              scan: {
                include: {
                  protocol: true,
                },
              },
            },
          },
        },
      });
    }

    if (!proof || !proof.finding) {
      log.warn({ validationId }, 'Proof or Finding not found');
      return;
    }

    const finding = proof.finding;
    log.debug({ proofId: proof.id, findingId: finding.id }, 'Found proof and finding');

    // =====================================
    // STEP 2: Update Proof.onChainValidationId (if not already set)
    // =====================================
    if (!proof.onChainValidationId) {
      await prisma.proof.update({
        where: { id: proof.id },
        data: {
          onChainValidationId: validationId,
        },
      });

      log.debug({ proofId: proof.id, validationId }, 'Updated proof with onChainValidationId');
    } else {
      log.debug({ proofId: proof.id, onChainValidationId: proof.onChainValidationId }, 'Proof already has onChainValidationId');
    }

    // =====================================
    // STEP 3: Get researcher address
    // =====================================
    // For MVP: Use environment variable RESEARCHER_ADDRESS
    // In production: Extract from encrypted proof payload using decryptProof()
    //
    // See GitHub Issue #106
    // const { payload, isValid } = decryptProof(proof.encryptedPayload);
    // const researcherAddress = payload.researcherAddress;
    //
    // For now, we use a fallback address from environment
    let researcherAddress = process.env.RESEARCHER_ADDRESS;

    // If not set, try to derive from PRIVATE_KEY2 (test researcher wallet)
    if (!researcherAddress && process.env.PRIVATE_KEY2) {
      try {
        const { ethers } = await import('ethers');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY2);
        researcherAddress = wallet.address;
        log.debug({ researcherAddress }, 'Derived researcher address from PRIVATE_KEY2');
      } catch (error) {
        log.error({ err: error }, 'Failed to derive address from PRIVATE_KEY2');
      }
    }

    if (!researcherAddress) {
      log.error('RESEARCHER_ADDRESS not configured - set RESEARCHER_ADDRESS or PRIVATE_KEY2 environment variable');
      return;
    }

    log.debug({ researcherAddress }, 'Researcher address resolved');

    // =====================================
    // STEP 4: Check for duplicate Payment
    // =====================================
    // Check if a Payment already exists for this validationId
    // We check by looking for payments linked to the same vulnerability/finding
    const existingPayment = await prisma.payment.findFirst({
      where: {
        researcherAddress: researcherAddress,
        vulnerability: {
          vulnerabilityHash: finding.id,
        },
      },
    });

    if (existingPayment) {
      log.warn({ findingId, paymentId: existingPayment.id }, 'Payment already exists for finding');
      return;
    }

    // =====================================
    // STEP 5: Get or create Vulnerability record
    // =====================================
    const protocol = finding.scan.protocol;

    // Map severity to payment amount
    const amount = SEVERITY_TO_AMOUNT[severity as Severity] || 0;

    if (amount === 0) {
      log.info('No payment required for INFORMATIONAL severity');
      return;
    }

    // Find or create vulnerability record
    let vulnerability = await prisma.vulnerability.findFirst({
      where: {
        protocolId: protocol.id,
        vulnerabilityHash: finding.id,
      },
    });

    if (!vulnerability) {
      // Create vulnerability record
      vulnerability = await prisma.vulnerability.create({
        data: {
          protocolId: protocol.id,
          vulnerabilityHash: finding.id,
          severity: finding.severity,
          status: 'OPEN',
          bounty: amount,
          proof: proof.id,
        },
      });

      log.info({ vulnerabilityId: vulnerability.id }, 'Created vulnerability');
    }

    // =====================================
    // STEP 6: Create Payment record
    // =====================================
    const payment = await prisma.payment.create({
      data: {
        vulnerabilityId: vulnerability.id,
        researcherAddress: researcherAddress,
        amount: amount,
        currency: 'USDC',
        status: 'PENDING',
        queuedAt: new Date(),
        retryCount: 0,
      },
    });

    log.info({ paymentId: payment.id, amount, currency: 'USDC', researcherAddress, status: 'PENDING' }, 'Created payment');

    // =====================================
    // STEP 7: Queue payment job
    // =====================================
    const jobData: PaymentJobData = {
      paymentId: payment.id,
      validationId: validationId,
      protocolId: protocolId,
    };

    await addPaymentJob(jobData);

    log.info({ paymentId: payment.id }, 'Queued payment job');
    log.info('Event processing complete');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: error, errorMessage }, 'Failed to process ValidationRecorded event');

    // Don't throw - we want to continue processing other events
    // The event listener service will log the error and continue
  }
}

/**
 * Start listening for ValidationRecorded events
 *
 * This function sets up a persistent event listener that:
 * - Connects to ValidationRegistry contract on Base Sepolia
 * - Listens for ValidationRecorded events
 * - Replays missed events from last processed block
 * - Handles events in real-time as they are emitted
 */
export async function startValidationListener(): Promise<void> {
  const eventListenerService = getEventListenerService();

  log.info({ contract: contractAddresses.validationRegistry, network: 'Base Sepolia' }, 'Starting ValidationRecorded event listener');

  try {
    await eventListenerService.startListening({
      contractAddress: contractAddresses.validationRegistry,
      eventName: 'ValidationRecorded',
      abi: ValidationRegistryABI.abi,
      handler: handleValidationRecorded,
      // Start from block where ValidationRegistry was deployed
      // Or use 0 to replay all historical events
      fromBlock: parseInt(process.env.VALIDATION_REGISTRY_DEPLOY_BLOCK || '0'),
    });

    log.info('Successfully started listening for ValidationRecorded events');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: error, errorMessage }, 'Failed to start ValidationRecorded listener');
    throw error;
  }
}

/**
 * Stop the validation listener (for graceful shutdown)
 */
export async function stopValidationListener(): Promise<void> {
  const eventListenerService = getEventListenerService();
  await eventListenerService.shutdown();
  log.info('Stopped ValidationRecorded event listener');
}

export default {
  startValidationListener,
  stopValidationListener,
};
