import { PrismaClient, AgentIdentityType } from '@prisma/client';
import { AgentIdentityRegistryClient, AgentType } from '../blockchain/contracts/AgentIdentityRegistryClient.js';

const prisma = new PrismaClient();

// Lazy-initialized contract client
let _registryClient: AgentIdentityRegistryClient | null = null;
function getRegistryClient(): AgentIdentityRegistryClient {
  if (!_registryClient) {
    _registryClient = new AgentIdentityRegistryClient();
  }
  return _registryClient;
}

export class AgentIdentityService {
  async registerAgent(walletAddress: string, agentType: AgentIdentityType) {
    const existing = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (existing) {
      throw new Error(`Agent already registered with wallet ${walletAddress}`);
    }

    const agentIdentity = await prisma.agentIdentity.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        agentType,
        isActive: true,
      },
    });

    await prisma.agentReputation.create({
      data: {
        agentIdentityId: agentIdentity.id,
        confirmedCount: 0,
        rejectedCount: 0,
        totalSubmissions: 0,
        reputationScore: 0,
      },
    });

    await prisma.agentEscrow.create({
      data: {
        agentIdentityId: agentIdentity.id,
        balance: BigInt(0),
        totalDeposited: BigInt(0),
        totalDeducted: BigInt(0),
      },
    });

    return agentIdentity;
  }

  async registerAgentOnChain(walletAddress: string, agentType: AgentIdentityType) {
    const client = getRegistryClient();
    const agentTypeEnum = agentType === 'RESEARCHER' ? AgentType.RESEARCHER : AgentType.VALIDATOR;

    const result = await client.registerAgent(walletAddress, agentTypeEnum);

    const agentIdentity = await prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: {
        agentNftId: BigInt(result.tokenId),
        onChainTxHash: result.txHash,
      },
    });

    return { agentIdentity, txHash: result.txHash, agentNftId: BigInt(result.tokenId) };
  }

  async getAgentByWallet(walletAddress: string) {
    return prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        reputation: true,
        escrowBalance: true,
      },
    });
  }

  async getAgentById(id: string) {
    return prisma.agentIdentity.findUnique({
      where: { id },
      include: {
        reputation: true,
        escrowBalance: true,
      },
    });
  }

  async isRegisteredOnChain(walletAddress: string): Promise<boolean> {
    try {
      const client = getRegistryClient();
      return await client.isRegistered(walletAddress);
    } catch {
      return false;
    }
  }

  async getAgentsByType(agentType: AgentIdentityType) {
    return prisma.agentIdentity.findMany({
      where: { agentType, isActive: true },
      include: {
        reputation: true,
      },
      orderBy: {
        reputation: {
          reputationScore: 'desc',
        },
      },
    });
  }

  async getLeaderboard(limit = 10) {
    return prisma.agentIdentity.findMany({
      where: {
        agentType: 'RESEARCHER',
        isActive: true,
        reputation: {
          totalSubmissions: { gt: 0 },
        },
      },
      include: {
        reputation: true,
      },
      orderBy: {
        reputation: {
          reputationScore: 'desc',
        },
      },
      take: limit,
    });
  }

  async associateAgentsWithProtocol(
    protocolId: string,
    researcherAgentId: string,
    validatorAgentId: string
  ) {
    return prisma.$transaction([
      prisma.protocolAgentAssociation.upsert({
        where: { protocolId_role: { protocolId, role: 'RESEARCHER' } },
        update: { agentIdentityId: researcherAgentId },
        create: {
          protocolId,
          agentIdentityId: researcherAgentId,
          role: 'RESEARCHER',
        },
      }),
      prisma.protocolAgentAssociation.upsert({
        where: { protocolId_role: { protocolId, role: 'VALIDATOR' } },
        update: { agentIdentityId: validatorAgentId },
        create: {
          protocolId,
          agentIdentityId: validatorAgentId,
          role: 'VALIDATOR',
        },
      }),
    ]);
  }

  async getProtocolAgents(protocolId: string) {
    return prisma.protocolAgentAssociation.findMany({
      where: { protocolId },
      include: {
        agentIdentity: {
          include: { reputation: true },
        },
      },
    });
  }

  async deactivateAgent(walletAddress: string) {
    return prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { isActive: false },
    });
  }

  async reactivateAgent(walletAddress: string) {
    return prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { isActive: true },
    });
  }
}

export const agentIdentityService = new AgentIdentityService();
