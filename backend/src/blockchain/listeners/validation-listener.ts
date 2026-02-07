import { EventLog } from 'ethers';
import { getEventListenerService } from '../../services/event-listener.service.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { addPaymentJob, type PaymentJobData } from '../../queues/payment.queue.js';
import { contractAddresses } from '../config.js';
import ValidationRegistryABI from '../../../contracts/out/ValidationRegistry.sol/ValidationRegistry.json' with { type: 'json' };

const prisma = getPrismaClient();

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
  [Severity.CRITICAL]: 500,
  [Severity.HIGH]: 250,
  [Severity.MEDIUM]: 100,
  [Severity.LOW]: 50,
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

    console.log('[ValidationListener] ValidationRecorded event received');
    console.log(`  Validation ID: ${validationId}`);
    console.log(`  Protocol ID: ${protocolId}`);
    console.log(`  Finding ID: ${findingId}`);
    console.log(`  Outcome: ${ValidationOutcome[outcome]} (${outcome})`);
    console.log(`  Severity: ${Severity[severity]} (${severity})`);
    console.log(`  Block: ${event.blockNumber}`);

    // =====================================
    // FILTER: Only process CONFIRMED validations
    // =====================================
    if (outcome !== ValidationOutcome.CONFIRMED) {
      console.log(`[ValidationListener] Skipping non-CONFIRMED validation (outcome: ${ValidationOutcome[outcome]})`);
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
      console.log(`[ValidationListener] Proof not found by validationId, searching by findingId...`);

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
      console.warn(`[ValidationListener] Proof or Finding not found for validationId ${validationId}`);
      return;
    }

    const finding = proof.finding;
    console.log(`[ValidationListener] Found proof: ${proof.id}`);
    console.log(`[ValidationListener] Found finding: ${finding.id}`);

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

      console.log(`[ValidationListener] Updated proof ${proof.id} with onChainValidationId: ${validationId}`);
    } else {
      console.log(`[ValidationListener] Proof already has onChainValidationId: ${proof.onChainValidationId}`);
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
        console.log(`[ValidationListener] Derived researcher address from PRIVATE_KEY2: ${researcherAddress}`);
      } catch (error) {
        console.error('[ValidationListener] Failed to derive address from PRIVATE_KEY2:', error);
      }
    }

    if (!researcherAddress) {
      console.error('[ValidationListener] RESEARCHER_ADDRESS not configured in environment');
      console.error('  Please set RESEARCHER_ADDRESS or PRIVATE_KEY2 environment variable');
      return;
    }

    console.log(`[ValidationListener] Researcher address: ${researcherAddress}`);

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
      console.warn(`[ValidationListener] Payment already exists for finding ${findingId} (Payment ID: ${existingPayment.id})`);
      return;
    }

    // =====================================
    // STEP 5: Get or create Vulnerability record
    // =====================================
    const protocol = finding.scan.protocol;

    // Map severity to payment amount
    const amount = SEVERITY_TO_AMOUNT[severity as Severity] || 0;

    if (amount === 0) {
      console.log('[ValidationListener] No payment required for INFORMATIONAL severity');
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

      console.log(`[ValidationListener] Created vulnerability: ${vulnerability.id}`);
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

    console.log(`[ValidationListener] Created payment: ${payment.id}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Researcher: ${researcherAddress}`);
    console.log(`  Status: PENDING`);

    // =====================================
    // STEP 7: Queue payment job
    // =====================================
    const jobData: PaymentJobData = {
      paymentId: payment.id,
      validationId: validationId,
      protocolId: protocolId,
    };

    await addPaymentJob(jobData);

    console.log(`[ValidationListener] Queued payment job for payment ${payment.id}`);
    console.log('[ValidationListener] Event processing complete');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ValidationListener] Failed to process ValidationRecorded event:', errorMessage);
    console.error(error);

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

  console.log('[ValidationListener] Starting ValidationRecorded event listener...');
  console.log(`  Contract: ${contractAddresses.validationRegistry}`);
  console.log(`  Network: Base Sepolia`);

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

    console.log('[ValidationListener] Successfully started listening for ValidationRecorded events');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ValidationListener] Failed to start ValidationRecorded listener:', errorMessage);
    throw error;
  }
}

/**
 * Stop the validation listener (for graceful shutdown)
 */
export async function stopValidationListener(): Promise<void> {
  const eventListenerService = getEventListenerService();
  await eventListenerService.shutdown();
  console.log('[ValidationListener] Stopped ValidationRecorded event listener');
}

export default {
  startValidationListener,
  stopValidationListener,
};
