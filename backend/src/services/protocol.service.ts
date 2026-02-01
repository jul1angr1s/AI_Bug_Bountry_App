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

export interface ProtocolOverview {
  id: string;
  githubUrl: string;
  branch: string;
  contractPath: string;
  contractName: string;
  status: string;
  registrationState: string | null;
  ownerAddress: string;
  totalBountyPool: number;
  availableBounty: number;
  paidBounty: number;
  createdAt: string;
  updatedAt: string;
  stats: {
    vulnerabilityCount: number;
    scanCount: number;
    lastScanAt: string | null;
  };
}

export async function getProtocolById(
  protocolId: string,
  userId?: string
): Promise<ProtocolOverview | null> {
  try {
    const whereClause: any = { id: protocolId };

    // If userId is provided, ensure user owns the protocol
    if (userId) {
      whereClause.authUserId = userId;
    }

    const protocol = await prisma.protocol.findFirst({
      where: whereClause,
      include: {
        vulnerabilities: {
          select: { id: true },
        },
        scans: {
          select: {
            id: true,
            startedAt: true,
          },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!protocol) {
      return null;
    }

    const overview: ProtocolOverview = {
      id: protocol.id,
      githubUrl: protocol.githubUrl,
      branch: protocol.branch,
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
      status: protocol.status,
      registrationState: protocol.registrationState,
      ownerAddress: protocol.ownerAddress,
      totalBountyPool: protocol.totalBountyPool,
      availableBounty: protocol.availableBounty,
      paidBounty: protocol.paidBounty,
      createdAt: protocol.createdAt.toISOString(),
      updatedAt: protocol.updatedAt.toISOString(),
      stats: {
        vulnerabilityCount: protocol.vulnerabilities.length,
        scanCount: protocol.scans.length,
        lastScanAt: protocol.scans[0]?.startedAt?.toISOString() || null,
      },
    };

    return overview;
  } catch (error) {
    console.error('Error fetching protocol:', error);
    return null;
  }
}

export interface ProtocolListItem {
  id: string;
  name: string;
  githubUrl: string;
  status: string;
  riskScore: number | null;
  scansCount: number;
  vulnerabilitiesCount: number;
  createdAt: string;
}

export interface ProtocolListResult {
  protocols: ProtocolListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listProtocols(params: {
  status?: string;
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<ProtocolListResult> {
  try {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (params.status) {
      whereClause.status = params.status;
    }

    if (params.userId) {
      whereClause.authUserId = params.userId;
    }

    // Get total count
    const total = await prisma.protocol.count({ where: whereClause });

    // Get protocols with aggregated data
    const protocols = await prisma.protocol.findMany({
      where: whereClause,
      select: {
        id: true,
        githubUrl: true,
        contractName: true,
        status: true,
        riskScore: true,
        createdAt: true,
        scans: {
          select: { id: true },
        },
        vulnerabilities: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const protocolList: ProtocolListItem[] = protocols.map((protocol) => ({
      id: protocol.id,
      name: protocol.contractName, // Use contract name as protocol name
      githubUrl: protocol.githubUrl,
      status: protocol.status,
      riskScore: protocol.riskScore,
      scansCount: protocol.scans.length,
      vulnerabilitiesCount: protocol.vulnerabilities.length,
      createdAt: protocol.createdAt.toISOString(),
    }));

    return {
      protocols: protocolList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error listing protocols:', error);
    return {
      protocols: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}
