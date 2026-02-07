import { getPrismaClient } from '../lib/prisma.js';
import { BountyPoolClient } from '../blockchain/contracts/BountyPoolClient.js';
import { scanRepository } from '../db/repositories.js';
import { enqueueScan } from '../queues/scanQueue.js';
import { invalidateCache, CACHE_KEYS } from '../lib/cache.js';
import {
  emitProtocolFundingStateChange,
  emitProtocolScanRequested,
} from '../websocket/events.js';

const prisma = getPrismaClient();

// Funding states
export const FUNDING_STATES = {
  AWAITING_FUNDING: 'AWAITING_FUNDING',
  FUNDED: 'FUNDED',
  UNDERFUNDED: 'UNDERFUNDED',
} as const;

export type FundingState = typeof FUNDING_STATES[keyof typeof FUNDING_STATES];

export interface VerifyFundingResult {
  success: boolean;
  fundingState: FundingState;
  onChainBalance: number;
  requestedAmount: number;
  message: string;
  canRequestScan: boolean;
}

export interface RequestScanResult {
  success: boolean;
  scanId?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Verify protocol funding by checking on-chain balance against requested amount
 */
export async function verifyProtocolFunding(
  protocolId: string,
  userId: string
): Promise<VerifyFundingResult> {
  // Fetch protocol
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      authUserId: userId,
    },
  });

  if (!protocol) {
    return {
      success: false,
      fundingState: FUNDING_STATES.AWAITING_FUNDING,
      onChainBalance: 0,
      requestedAmount: 0,
      message: 'Protocol not found or access denied',
      canRequestScan: false,
    };
  }

  // Check if protocol has on-chain ID
  if (!protocol.onChainProtocolId) {
    return {
      success: false,
      fundingState: FUNDING_STATES.AWAITING_FUNDING,
      onChainBalance: 0,
      requestedAmount: protocol.bountyPoolAmount || 0,
      message: 'Protocol not registered on-chain yet',
      canRequestScan: false,
    };
  }

  // Get on-chain balance
  let onChainBalance = 0;
  try {
    const bountyPoolClient = new BountyPoolClient();
    onChainBalance = await bountyPoolClient.getProtocolBalance(protocol.onChainProtocolId);
  } catch (error) {
    console.error('[FundingService] Failed to fetch on-chain balance:', error);
    return {
      success: false,
      fundingState: protocol.fundingState as FundingState || FUNDING_STATES.AWAITING_FUNDING,
      onChainBalance: 0,
      requestedAmount: protocol.bountyPoolAmount || 0,
      message: 'Failed to verify on-chain balance',
      canRequestScan: false,
    };
  }

  const requestedAmount = protocol.bountyPoolAmount || protocol.minimumBountyRequired;
  const minimumRequired = protocol.minimumBountyRequired;

  // Determine funding state based on on-chain balance
  let fundingState: FundingState;
  let message: string;
  let canRequestScan: boolean;

  if (onChainBalance >= requestedAmount) {
    fundingState = FUNDING_STATES.FUNDED;
    message = `Protocol funded with ${onChainBalance} USDC (requested: ${requestedAmount} USDC)`;
    canRequestScan = true;
  } else if (onChainBalance >= minimumRequired && onChainBalance > 0) {
    // Has some funding but less than requested - still allow scanning
    fundingState = FUNDING_STATES.FUNDED;
    message = `Protocol partially funded with ${onChainBalance} USDC (requested: ${requestedAmount} USDC)`;
    canRequestScan = true;
  } else if (onChainBalance > 0) {
    fundingState = FUNDING_STATES.UNDERFUNDED;
    message = `Insufficient funding: ${onChainBalance} USDC (minimum required: ${minimumRequired} USDC)`;
    canRequestScan = false;
  } else {
    fundingState = FUNDING_STATES.AWAITING_FUNDING;
    message = 'Protocol not funded yet';
    canRequestScan = false;
  }

  // Update database with verified funding state
  await prisma.protocol.update({
    where: { id: protocolId },
    data: {
      fundingState,
      fundingVerifiedAt: new Date(),
      totalBountyPool: onChainBalance,
      availableBounty: onChainBalance,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      protocolId,
      action: 'FUNDING_VERIFIED',
      metadata: {
        onChainBalance,
        requestedAmount,
        fundingState,
        canRequestScan,
      },
    },
  });

  // Emit WebSocket event
  try {
    await emitProtocolFundingStateChange(protocolId, {
      fundingState,
      onChainBalance,
      canRequestScan,
    });
  } catch (error) {
    console.error('[FundingService] Failed to emit WebSocket event:', error);
  }

  // Invalidate cache
  await invalidateCache(CACHE_KEYS.DASHBOARD_STATS(protocolId));

  return {
    success: true,
    fundingState,
    onChainBalance,
    requestedAmount,
    message,
    canRequestScan,
  };
}

/**
 * Request a scan for a protocol (only allowed if funded)
 */
export async function requestScan(
  protocolId: string,
  userId: string,
  branch?: string
): Promise<RequestScanResult> {
  // Fetch protocol with funding state
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      authUserId: userId,
    },
  });

  if (!protocol) {
    return {
      success: false,
      error: {
        code: 'PROTOCOL_NOT_FOUND',
        message: 'Protocol not found or access denied',
      },
    };
  }

  // Check protocol status
  if (protocol.status !== 'ACTIVE') {
    return {
      success: false,
      error: {
        code: 'PROTOCOL_NOT_ACTIVE',
        message: `Protocol is not active (current status: ${protocol.status})`,
      },
    };
  }

  // Check funding state
  if (protocol.fundingState !== FUNDING_STATES.FUNDED) {
    return {
      success: false,
      error: {
        code: 'PROTOCOL_NOT_FUNDED',
        message: `Protocol is not funded (current state: ${protocol.fundingState || 'AWAITING_FUNDING'})`,
      },
    };
  }

  // Verify on-chain funding before starting scan
  const verifyResult = await verifyProtocolFunding(protocolId, userId);
  if (!verifyResult.canRequestScan) {
    return {
      success: false,
      error: {
        code: 'FUNDING_VERIFICATION_FAILED',
        message: verifyResult.message,
      },
    };
  }

  try {
    // Create scan in database
    const scan = await scanRepository.createScan({
      protocolId,
      targetBranch: branch || protocol.branch,
    });

    console.log(`[FundingService] Created scan ${scan.id} for protocol ${protocolId}`);

    // Enqueue scan job
    await enqueueScan({
      scanId: scan.id,
      protocolId,
      targetBranch: branch || protocol.branch,
    });

    console.log(`[FundingService] Enqueued scan ${scan.id} for processing`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        protocolId,
        action: 'SCAN_REQUESTED',
        metadata: {
          scanId: scan.id,
          branch: branch || protocol.branch,
          fundingState: protocol.fundingState,
          onChainBalance: verifyResult.onChainBalance,
        },
      },
    });

    // Emit WebSocket event
    try {
      await emitProtocolScanRequested(protocolId, {
        scanId: scan.id,
        branch: branch || protocol.branch,
      });
    } catch (error) {
      console.error('[FundingService] Failed to emit WebSocket event:', error);
    }

    return {
      success: true,
      scanId: scan.id,
    };
  } catch (error) {
    console.error('[FundingService] Failed to create scan:', error);
    return {
      success: false,
      error: {
        code: 'SCAN_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create scan',
      },
    };
  }
}

/**
 * Update protocol to AWAITING_FUNDING state after registration completes
 * Called from protocol worker after Step 6 (status update)
 */
export async function setAwaitingFunding(protocolId: string): Promise<void> {
  await prisma.protocol.update({
    where: { id: protocolId },
    data: {
      fundingState: FUNDING_STATES.AWAITING_FUNDING,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      protocolId,
      action: 'FUNDING_STATE_SET',
      metadata: {
        fundingState: FUNDING_STATES.AWAITING_FUNDING,
        reason: 'Protocol registration completed',
      },
    },
  });

  console.log(`[FundingService] Protocol ${protocolId} set to AWAITING_FUNDING`);
}

/**
 * Record funding transaction hash from frontend
 */
export async function recordFundingTransaction(
  protocolId: string,
  userId: string,
  txHash: string
): Promise<{ success: boolean; error?: string }> {
  const protocol = await prisma.protocol.findFirst({
    where: {
      id: protocolId,
      authUserId: userId,
    },
  });

  if (!protocol) {
    return { success: false, error: 'Protocol not found or access denied' };
  }

  await prisma.protocol.update({
    where: { id: protocolId },
    data: {
      fundingTxHash: txHash,
    },
  });

  // Create funding event
  await prisma.fundingEvent.create({
    data: {
      protocolId,
      amount: 0, // Will be updated when verified
      txHash,
      status: 'PENDING',
      changeType: 'DEPOSIT',
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      protocolId,
      action: 'FUNDING_TX_RECORDED',
      txHash,
      metadata: {
        source: 'frontend',
      },
    },
  });

  return { success: true };
}

/**
 * Get protocol funding status
 */
export async function getProtocolFundingStatus(
  protocolId: string,
  userId?: string
): Promise<{
  fundingState: FundingState | null;
  bountyPoolAmount: number | null;
  minimumBountyRequired: number;
  fundingTxHash: string | null;
  fundingVerifiedAt: Date | null;
  onChainBalance: number;
  canRequestScan: boolean;
} | null> {
  const whereClause: { id: string; authUserId?: string } = { id: protocolId };
  if (userId) {
    whereClause.authUserId = userId;
  }

  const protocol = await prisma.protocol.findFirst({
    where: whereClause,
  });

  if (!protocol) {
    return null;
  }

  // Try to get current on-chain balance
  let onChainBalance = protocol.totalBountyPool;
  if (protocol.onChainProtocolId) {
    try {
      const bountyPoolClient = new BountyPoolClient();
      onChainBalance = await bountyPoolClient.getProtocolBalance(protocol.onChainProtocolId);
    } catch (error) {
      console.error('[FundingService] Failed to fetch on-chain balance:', error);
    }
  }

  const canRequestScan =
    protocol.fundingState === FUNDING_STATES.FUNDED &&
    protocol.status === 'ACTIVE' &&
    onChainBalance >= protocol.minimumBountyRequired;

  return {
    fundingState: protocol.fundingState as FundingState | null,
    bountyPoolAmount: protocol.bountyPoolAmount,
    minimumBountyRequired: protocol.minimumBountyRequired,
    fundingTxHash: protocol.fundingTxHash,
    fundingVerifiedAt: protocol.fundingVerifiedAt,
    onChainBalance,
    canRequestScan,
  };
}
