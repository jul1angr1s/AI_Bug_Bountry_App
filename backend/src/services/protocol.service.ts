import { getPrismaClient } from '../lib/prisma.js';
import type { ProtocolRegistrationInput, ProtocolFundingInput } from '../schemas/protocol.schema.js';
import { invalidateCache, CACHE_KEYS } from '../lib/cache.js';

const prisma = getPrismaClient();

export interface ProtocolRegistrationResult {
  success: boolean;
  protocol?: {
    id: string;
    githubUrl: string;
    status: string;
    registrationState: string | null;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function registerProtocol(
  userId: string,
  input: ProtocolRegistrationInput
): Promise<ProtocolRegistrationResult> {
  try {
    // Check for duplicate GitHub URL
    const existing = await prisma.protocol.findUnique({
      where: { githubUrl: input.githubUrl },
    });

    if (existing) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_GITHUB_URL',
          message: 'A protocol with this GitHub URL already exists',
        },
      };
    }

    // Create protocol with PENDING registration state
    const protocol = await prisma.protocol.create({
      data: {
        authUserId: userId,
        ownerAddress: input.ownerAddress,
        githubUrl: input.githubUrl,
        branch: input.branch,
        contractPath: input.contractPath,
        contractName: input.contractName,
        bountyTerms: input.bountyTerms,
        status: 'PENDING',
        registrationState: 'PENDING',
        totalBountyPool: 0,
        availableBounty: 0,
        paidBounty: 0,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        protocolId: protocol.id,
        action: 'REGISTRATION_ATTEMPT',
        metadata: {
          githubUrl: input.githubUrl,
          branch: input.branch,
          contractPath: input.contractPath,
          contractName: input.contractName,
        },
      },
    });

    return {
      success: true,
      protocol: {
        id: protocol.id,
        githubUrl: protocol.githubUrl,
        status: protocol.status,
        registrationState: protocol.registrationState,
      },
    };
  } catch (error) {
    console.error('Error registering protocol:', error);
    return {
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register protocol',
      },
    };
  }
}

export interface FundingResult {
  success: boolean;
  funding?: {
    id: string;
    amount: number;
    txHash: string;
    status: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function fundProtocol(
  protocolId: string,
  userId: string,
  input: ProtocolFundingInput
): Promise<FundingResult> {
  try {
    // Verify protocol ownership
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

    // Create funding event
    const funding = await prisma.fundingEvent.create({
      data: {
        protocolId,
        amount: input.amount,
        txHash: input.txHash,
        status: 'PENDING',
        changeType: 'DEPOSIT',
      },
    });

    // Update protocol bounty pool
    await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        totalBountyPool: { increment: input.amount },
        availableBounty: { increment: input.amount },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        protocolId,
        action: 'FUNDING_SUBMISSION',
        txHash: input.txHash,
        metadata: {
          amount: input.amount,
          currency: input.currency,
          fundingEventId: funding.id,
        },
      },
    });

    // Invalidate cache
    await invalidateCache(CACHE_KEYS.DASHBOARD_STATS(protocolId));

    return {
      success: true,
      funding: {
        id: funding.id,
        amount: funding.amount,
        txHash: funding.txHash,
        status: funding.status,
      },
    };
  } catch (error) {
    console.error('Error funding protocol:', error);
    return {
      success: false,
      error: {
        code: 'FUNDING_FAILED',
        message: 'Failed to process funding',
      },
    };
  }
}

export async function updateProtocolRegistrationState(
  protocolId: string,
  state: string,
  txHash?: string,
  failureReason?: string
): Promise<void> {
  try {
    await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        registrationState: state,
        registrationTxHash: txHash,
        failureReason: failureReason,
        status: state === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        protocolId,
        action: state === 'ACTIVE' ? 'REGISTRATION_SUCCESS' : 'REGISTRATION_FAILED',
        txHash,
        metadata: {
          state,
          failureReason,
        },
      },
    });

    // Invalidate cache
    await invalidateCache(CACHE_KEYS.DASHBOARD_STATS(protocolId));
  } catch (error) {
    console.error('Error updating protocol registration state:', error);
  }
}

export async function confirmFundingEvent(
  fundingEventId: string,
  txReceipt: string
): Promise<void> {
  try {
    await prisma.fundingEvent.update({
      where: { id: fundingEventId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        protocolId: (await prisma.fundingEvent.findUnique({ where: { id: fundingEventId } }))?.protocolId || '',
        action: 'FUNDING_CONFIRMED',
        txHash: txReceipt,
        metadata: {
          fundingEventId,
        },
      },
    });
  } catch (error) {
    console.error('Error confirming funding event:', error);
  }
}
