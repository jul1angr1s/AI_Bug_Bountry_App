import { EventLog } from 'ethers';
import { getEventListenerService } from '../../services/event-listener.service.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { contractAddresses } from '../config.js';
import BountyPoolABI from '../../../contracts/out/BountyPool.sol/BountyPool.json' assert { type: 'json' };
import type { PaymentStatus } from '@prisma/client';

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
    console.log('[BountyListener] Processing BountyReleased event...');
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  Transaction: ${event.transactionHash}`);

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

    console.log('  Event data:');
    console.log(`    bountyId: ${bountyId}`);
    console.log(`    protocolId: ${protocolId}`);
    console.log(`    validationId: ${validationId}`);
    console.log(`    researcher: ${researcher}`);
    console.log(`    severity: ${severity}`);
    console.log(`    amount: ${amountInUsdc} USDC`);
    console.log(`    timestamp: ${timestamp}`);

    // Get block timestamp for paidAt field
    const block = await event.getBlock();
    const paidAt = new Date(Number(block.timestamp) * 1000);

    // Match event.validationId with Payment record in database
    const payment = await prisma.payment.findFirst({
      where: {
        onChainBountyId: validationId,
      },
    });

    if (!payment) {
      // ORPHANED PAYMENT DETECTED
      console.warn('[BountyListener] ORPHANED PAYMENT: No matching Payment record found');
      console.warn(`  validationId: ${validationId}`);
      console.warn(`  txHash: ${event.transactionHash}`);
      console.warn(`  amount: ${amountInUsdc} USDC`);

      // Create PaymentReconciliation record with status=ORPHANED
      await prisma.paymentReconciliation.create({
        data: {
          paymentId: null, // No matching payment
          onChainBountyId: validationId,
          txHash: event.transactionHash,
          amount: amountInUsdc,
          status: 'ORPHANED',
          discoveredAt: new Date(),
          notes: `Orphaned payment detected: on-chain bounty release found without corresponding Payment record. Researcher: ${researcher}, Amount: ${amountInUsdc} USDC`,
        },
      });

      // Log warning-level alert per OpenSpec requirement
      console.warn(
        `[ALERT] Orphaned payment detected: validationId=${validationId}, amount=${amountInUsdc}, txHash=${event.transactionHash}`
      );

      return;
    }

    console.log(`[BountyListener] Matched Payment record: ${payment.id}`);

    // Verify Payment.txHash matches event transaction hash
    let hasDiscrepancy = false;
    let discrepancyNotes = '';

    if (payment.txHash && payment.txHash !== event.transactionHash) {
      // TXHASH MISMATCH DETECTED
      hasDiscrepancy = true;
      discrepancyNotes = `Transaction hash mismatch: Payment.txHash=${payment.txHash}, Event.txHash=${event.transactionHash}`;
      console.error('[BountyListener] DISCREPANCY: Transaction hash mismatch');
      console.error(`  Payment.txHash: ${payment.txHash}`);
      console.error(`  Event.txHash: ${event.transactionHash}`);
    }

    // Verify amount matches
    const amountDifference = Math.abs(payment.amount - amountInUsdc);
    const amountThreshold = 0.01; // Allow 1 cent tolerance for floating point precision

    if (amountDifference > amountThreshold) {
      // AMOUNT MISMATCH DETECTED
      hasDiscrepancy = true;
      const amountNote = `Amount mismatch: Payment.amount=${payment.amount} USDC, Event.amount=${amountInUsdc} USDC (difference: ${amountDifference})`;
      discrepancyNotes = discrepancyNotes ? `${discrepancyNotes}; ${amountNote}` : amountNote;

      console.error('[BountyListener] DISCREPANCY: Amount mismatch');
      console.error(`  Payment.amount: ${payment.amount} USDC`);
      console.error(`  Event.amount: ${amountInUsdc} USDC`);
      console.error(`  Difference: ${amountDifference} USDC`);

      // Log error-level alert per OpenSpec requirement
      console.error(
        `[ALERT] Payment amount mismatch: validationId=${validationId}, expected=${payment.amount}, actual=${amountInUsdc}`
      );
    }

    // Verify researcher address matches
    if (payment.researcherAddress.toLowerCase() !== researcher.toLowerCase()) {
      hasDiscrepancy = true;
      const addressNote = `Researcher address mismatch: Payment.researcherAddress=${payment.researcherAddress}, Event.researcher=${researcher}`;
      discrepancyNotes = discrepancyNotes ? `${discrepancyNotes}; ${addressNote}` : addressNote;

      console.error('[BountyListener] DISCREPANCY: Researcher address mismatch');
      console.error(`  Payment.researcherAddress: ${payment.researcherAddress}`);
      console.error(`  Event.researcher: ${researcher}`);
    }

    if (hasDiscrepancy) {
      // Create PaymentReconciliation record with status=DISCREPANCY
      await prisma.paymentReconciliation.create({
        data: {
          paymentId: payment.id,
          onChainBountyId: validationId,
          txHash: event.transactionHash,
          amount: amountInUsdc,
          status: amountDifference > amountThreshold ? 'AMOUNT_MISMATCH' : 'DISCREPANCY',
          discoveredAt: new Date(),
          notes: discrepancyNotes,
        },
      });

      console.warn('[BountyListener] Created PaymentReconciliation record for discrepancy');
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

    // Auto-resolve missing txHash if no other discrepancies
    if (!payment.txHash && !hasDiscrepancy) {
      updateData.txHash = event.transactionHash;
      console.log('[BountyListener] Auto-resolved missing txHash');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: updateData,
    });

    console.log('[BountyListener] Successfully reconciled payment:');
    console.log(`  Payment ID: ${payment.id}`);
    console.log(`  Status: ${updateData.status}`);
    console.log(`  Paid At: ${updateData.paidAt.toISOString()}`);
    console.log(`  Reconciled: ${updateData.reconciled}`);
    console.log(`  Has Discrepancy: ${hasDiscrepancy}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[BountyListener] Failed to process BountyReleased event:', msg);
    console.error('  Error details:', error);
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

  console.log('[BountyListener] Starting BountyReleased event listener...');
  console.log(`  Contract: ${contractAddresses.bountyPool}`);
  console.log('  Event: BountyReleased');
  console.log('  Network: Base Sepolia');

  await eventListenerService.startListening({
    contractAddress: contractAddresses.bountyPool,
    eventName: 'BountyReleased',
    abi: BountyPoolABI.abi,
    handler: handleBountyReleasedEvent,
    // Start from a recent block to avoid processing ancient history
    // Adjust this value based on when the contract was deployed or when payments started
    fromBlock: undefined, // Will use current block if no state exists
  });

  console.log('[BountyListener] BountyReleased listener started successfully');
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
  console.log('[BountyListener] BountyReleased listener stopped');
}

export default {
  startBountyListener,
  stopBountyListener,
  handleBountyReleasedEvent,
};
