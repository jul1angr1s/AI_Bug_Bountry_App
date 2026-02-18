import { EventLog } from 'ethers';
import { getEventListenerService } from '../../services/event-listener.service.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { contractAddresses } from '../config.js';
import BountyPoolABI from '../abis/BountyPool.json' with { type: 'json' };
import type { PaymentStatus } from '@prisma/client';
import { createLogger } from '../../lib/logger.js';
import { toMoneyNumber, toUSDCMicro, fromUSDCMicro } from '../../lib/money.js';

const log = createLogger('BountyListener');
const prisma = getPrismaClient();

/**
 * BountyReleased event structure from BountyPool contract
 *
 * Event signature:
 * event BountyReleased(
 *   bytes32 indexed bountyId,
 *   bytes32 indexed protocolId,
 *   bytes32 indexed validationId,
 *   address researcher,
 *   uint8 severity,
 *   uint256 amount,
 *   uint256 timestamp
 * )
 */
interface BountyReleasedEvent {
  bountyId: string;
  protocolId: string;
  validationId: string;
  researcher: string;
  severity: number;
  amount: bigint;
  timestamp: bigint;
}

/**
 * BountyReleased Event Handler
 *
 * Handles payment reconciliation by matching on-chain BountyReleased events
 * with database Payment records using validationId as the matching key.
 *
 * Implements requirements from OpenSpec Phase 4 tasks 9.1-9.7:
 * - Match events to Payment records via validationId
 * - Update Payment status to COMPLETED and mark as reconciled
 * - Verify txHash matches between database and blockchain
 * - Create PaymentReconciliation records for discrepancies
 * - Detect orphaned payments (events without matching Payment records)
 * - Track last processed block for replay on restart
 *
 * @param event - EventLog from ethers.js containing BountyReleased event data
 */
async function handleBountyReleasedEvent(event: EventLog): Promise<void> {
  try {
    log.info({ blockNumber: event.blockNumber, txHash: event.transactionHash }, 'Processing BountyReleased event');

    // Parse event arguments
    const eventData = event.args as unknown as BountyReleasedEvent;
    const {
      bountyId,
      protocolId,
      validationId,
      researcher,
      severity,
      amount,
      timestamp,
    } = eventData;

    // Convert amount from USDC (6 decimals) to float
    const amountInUsdc = Number(amount) / 1_000_000;

    log.debug({
      bountyId,
      protocolId,
      validationId,
      researcher,
      severity,
      amountUsdc: amountInUsdc,
      timestamp: String(timestamp),
    }, 'Parsed event data');

    // Get block timestamp for paidAt field
    // Use event's timestamp from contract as fallback if block info unavailable
    let paidAt: Date;
    try {
      const block = await event.getBlock();
      paidAt = new Date(Number(block.timestamp) * 1000);
    } catch {
      // Fallback to event timestamp from contract (already in seconds)
      paidAt = new Date(Number(timestamp) * 1000);
      log.warn('Using event timestamp as fallback for paidAt');
    }

    // Match event.validationId with Payment record in database
    const payment = await prisma.payment.findFirst({
      where: {
        onChainBountyId: validationId,
      },
    });

    if (!payment) {
      // ORPHANED PAYMENT DETECTED
      log.warn({
        validationId,
        txHash: event.transactionHash,
        amountUsdc: amountInUsdc,
      }, 'ORPHANED PAYMENT: No matching Payment record found');

      // Create PaymentReconciliation record with status=ORPHANED
      // Use bountyId as fallback if transactionHash is not available (e.g., WebSocket events)
      const txHashForOrphan = event.transactionHash ?? `orphan-${bountyId}`;
      await prisma.paymentReconciliation.create({
        data: {
          paymentId: null, // No matching payment
          onChainBountyId: validationId,
          txHash: txHashForOrphan,
          amount: amountInUsdc,
          status: 'ORPHANED',
          discoveredAt: new Date(),
          notes: `Orphaned payment detected: on-chain bounty release found without corresponding Payment record. Researcher: ${researcher}, Amount: ${amountInUsdc} USDC${!event.transactionHash ? ' (txHash unavailable at detection time)' : ''}`,
        },
      });

      // Log warning-level alert per OpenSpec requirement
      log.warn({
        validationId,
        amountUsdc: amountInUsdc,
        txHash: event.transactionHash,
      }, 'ALERT: Orphaned payment detected');

      return;
    }

    log.info({ paymentId: payment.id }, 'Matched Payment record');

    // Verify Payment.txHash matches event transaction hash
    let hasDiscrepancy = false;
    let discrepancyNotes = '';

    // Only check txHash mismatch if both are available
    if (payment.txHash && event.transactionHash && payment.txHash !== event.transactionHash) {
      // TXHASH MISMATCH DETECTED
      hasDiscrepancy = true;
      discrepancyNotes = `Transaction hash mismatch: Payment.txHash=${payment.txHash}, Event.txHash=${event.transactionHash}`;
      log.error({
        paymentTxHash: payment.txHash,
        eventTxHash: event.transactionHash,
      }, 'DISCREPANCY: Transaction hash mismatch');
    }

    // Verify amount matches
    const paymentAmount = toMoneyNumber(payment.amount);
    const amountDifference = Math.abs(
      fromUSDCMicro(toUSDCMicro(paymentAmount) - toUSDCMicro(amountInUsdc))
    );
    const amountThreshold = 0.01; // Allow 1 cent tolerance for floating point precision

    if (amountDifference > amountThreshold) {
      // AMOUNT MISMATCH DETECTED
      hasDiscrepancy = true;
      const amountNote = `Amount mismatch: Payment.amount=${paymentAmount} USDC, Event.amount=${amountInUsdc} USDC (difference: ${amountDifference})`;
      discrepancyNotes = discrepancyNotes ? `${discrepancyNotes}; ${amountNote}` : amountNote;

      log.error({
        paymentAmount,
        eventAmount: amountInUsdc,
        difference: amountDifference,
        validationId,
      }, 'DISCREPANCY: Amount mismatch');

      // Log error-level alert per OpenSpec requirement
      log.error({
        validationId,
        expected: paymentAmount,
        actual: amountInUsdc,
      }, 'ALERT: Payment amount mismatch');
    }

    // Verify researcher address matches
    if (payment.researcherAddress.toLowerCase() !== researcher.toLowerCase()) {
      hasDiscrepancy = true;
      const addressNote = `Researcher address mismatch: Payment.researcherAddress=${payment.researcherAddress}, Event.researcher=${researcher}`;
      discrepancyNotes = discrepancyNotes ? `${discrepancyNotes}; ${addressNote}` : addressNote;

      log.error({
        paymentResearcher: payment.researcherAddress,
        eventResearcher: researcher,
      }, 'DISCREPANCY: Researcher address mismatch');
    }

    if (hasDiscrepancy) {
      // Create PaymentReconciliation record with status=DISCREPANCY
      // Use bountyId as fallback if transactionHash is not available (e.g., WebSocket events)
      const txHashForDiscrepancy = event.transactionHash ?? `discrepancy-${bountyId}`;
      await prisma.paymentReconciliation.create({
        data: {
          paymentId: payment.id,
          onChainBountyId: validationId,
          txHash: txHashForDiscrepancy,
          amount: amountInUsdc,
          status: amountDifference > amountThreshold ? 'AMOUNT_MISMATCH' : 'DISCREPANCY',
          discoveredAt: new Date(),
          notes: `${discrepancyNotes}${!event.transactionHash ? ' (txHash unavailable at detection time)' : ''}`,
        },
      });

      log.warn('Created PaymentReconciliation record for discrepancy');
    }

    // Update Payment record: status=COMPLETED, paidAt=event.timestamp, reconciled=true, reconciledAt=now()
    const updateData: {
      status: PaymentStatus;
      paidAt: Date;
      reconciled: boolean;
      reconciledAt: Date;
      txHash?: string;
    } = {
      status: 'COMPLETED',
      paidAt,
      reconciled: true,
      reconciledAt: new Date(),
    };

    // Auto-resolve missing txHash if no other discrepancies and event has txHash
    if (!payment.txHash && !hasDiscrepancy && event.transactionHash) {
      updateData.txHash = event.transactionHash;
      log.info('Auto-resolved missing txHash');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData,
    });

    log.info({
      paymentId: payment.id,
      status: updateData.status,
      paidAt: updateData.paidAt.toISOString(),
      reconciled: updateData.reconciled,
      hasDiscrepancy,
    }, 'Successfully reconciled payment');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error({ err: error, message: msg }, 'Failed to process BountyReleased event');
    throw error;
  }
}

/**
 * Start BountyReleased Event Listener
 *
 * Initializes and starts the event listener for BountyReleased events from the
 * BountyPool contract on Base Sepolia. Uses EventListenerService foundation for:
 * - WebSocket connection to Base Sepolia
 * - Automatic replay of missed events during downtime
 * - Block tracking via EventListenerState
 * - Graceful shutdown and error handling
 *
 * Contract: BountyPool at 0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
 * Network: Base Sepolia (chainId: 84532)
 */
export async function startBountyListener(): Promise<void> {
  const eventListenerService = getEventListenerService();

  log.info({
    contract: contractAddresses.bountyPool,
    event: 'BountyReleased',
    network: 'Base Sepolia',
  }, 'Starting BountyReleased event listener');

  await eventListenerService.startListening({
    contractAddress: contractAddresses.bountyPool,
    eventName: 'BountyReleased',
    abi: BountyPoolABI.abi,
    handler: handleBountyReleasedEvent,
    // Start from a recent block to avoid processing ancient history
    // Adjust this value based on when the contract was deployed or when payments started
    fromBlock: undefined, // Will use current block if no state exists
  });

  log.info('BountyReleased listener started successfully');
}

/**
 * Stop BountyReleased Event Listener
 *
 * Gracefully shuts down the event listener, ensuring last processed block
 * is saved to EventListenerState for replay on restart.
 */
export async function stopBountyListener(): Promise<void> {
  const eventListenerService = getEventListenerService();
  await eventListenerService.shutdown();
  log.info('BountyReleased listener stopped');
}

export default {
  startBountyListener,
  stopBountyListener,
  handleBountyReleasedEvent,
};
