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

  /**
   * Idempotent: ensure an agent is registered on-chain and has an agentNftId in the DB.
   * Fast path: returns immediately if agentNftId already exists in DB.
   */
  async ensureAgentRegisteredOnChain(
    walletAddress: string,
    agentType: AgentIdentityType
  ): Promise<bigint> {
    const wallet = walletAddress.toLowerCase();

    // Fast path — already in DB
    let agent = await prisma.agentIdentity.findUnique({ where: { walletAddress: wallet } });
    if (agent?.agentNftId) {
      console.log(`[AgentIdentity] Agent ${wallet} already has agentNftId=${agent.agentNftId}`);
      return agent.agentNftId;
    }

    const client = getRegistryClient();

    // Check on-chain — maybe registered outside this process
    const alreadyOnChain = await client.isRegistered(walletAddress);
    if (alreadyOnChain) {
      const tokenId = await client.getAgentIdByWallet(walletAddress);
      console.log(`[AgentIdentity] Agent ${wallet} found on-chain with tokenId=${tokenId}, syncing to DB`);
      if (!agent) {
        agent = await this.createFullAgentRecord(wallet, agentType);
      }
      await prisma.agentIdentity.update({
        where: { walletAddress: wallet },
        data: { agentNftId: BigInt(tokenId) },
      });
      return BigInt(tokenId);
    }

    // Not on-chain — register now
    console.log(`[AgentIdentity] Registering ${wallet} (${agentType}) on-chain...`);
    try {
      if (!agent) {
        agent = await this.createFullAgentRecord(wallet, agentType);
      }
      const result = await client.registerAgent(
        walletAddress,
        agentType === 'RESEARCHER' ? AgentType.RESEARCHER : AgentType.VALIDATOR
      );
      const nftId = BigInt(result.tokenId);
      await prisma.agentIdentity.update({
        where: { walletAddress: wallet },
        data: { agentNftId: nftId, onChainTxHash: result.txHash },
      });
      console.log(`[AgentIdentity] Registered on-chain: agentNftId=${nftId}, tx=${result.txHash}`);
      return nftId;
    } catch (regError) {
      // Race condition: another process may have registered concurrently
      console.warn(`[AgentIdentity] Registration tx failed, retrying on-chain check...`, regError);
      const retryOnChain = await client.isRegistered(walletAddress);
      if (retryOnChain) {
        const tokenId = await client.getAgentIdByWallet(walletAddress);
        await prisma.agentIdentity.update({
          where: { walletAddress: wallet },
          data: { agentNftId: BigInt(tokenId) },
        });
        console.log(`[AgentIdentity] Race resolved: agentNftId=${tokenId}`);
        return BigInt(tokenId);
      }
      throw regError;
    }
  }

  /**
   * Create a full DB record set (AgentIdentity + AgentReputation + AgentEscrow)
   * for an agent that doesn't exist in the database yet.
   */
  private async createFullAgentRecord(walletAddress: string, agentType: AgentIdentityType) {
    const agentIdentity = await prisma.agentIdentity.create({
      data: {
        walletAddress,
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
    // Get top researchers by reputationScore
    const researchers = await prisma.agentIdentity.findMany({
      where: {
        agentType: 'RESEARCHER',
        isActive: true,
        reputation: {
          totalSubmissions: { gt: 0 },
        },
      },
      include: { reputation: true },
      orderBy: { reputation: { reputationScore: 'desc' } },
      take: limit,
    });

    // Get top validators by validatorReputationScore
    const validators = await prisma.agentIdentity.findMany({
      where: {
        agentType: 'VALIDATOR',
        isActive: true,
        reputation: {
          validatorTotalSubmissions: { gt: 0 },
        },
      },
      include: { reputation: true },
      orderBy: { reputation: { validatorReputationScore: 'desc' } },
      take: limit,
    });

    // Merge, sort by effective score, and take top N
    const all = [...researchers, ...validators].sort((a, b) => {
      const scoreA = a.agentType === 'VALIDATOR'
        ? (a.reputation?.validatorReputationScore ?? 0)
        : (a.reputation?.reputationScore ?? 0);
      const scoreB = b.agentType === 'VALIDATOR'
        ? (b.reputation?.validatorReputationScore ?? 0)
        : (b.reputation?.reputationScore ?? 0);
      return scoreB - scoreA;
    });

    return all.slice(0, limit);
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
