import { PrismaClient, FeedbackType } from '@prisma/client';
import {
  AgentReputationRegistryClient,
  FeedbackType as OnChainFeedbackType,
} from '../blockchain/contracts/AgentReputationRegistryClient.js';

const prisma = new PrismaClient();

const FEEDBACK_TYPE_MAP: Record<FeedbackType, OnChainFeedbackType> = {
  CONFIRMED_CRITICAL: OnChainFeedbackType.CONFIRMED_CRITICAL,
  CONFIRMED_HIGH: OnChainFeedbackType.CONFIRMED_HIGH,
  CONFIRMED_MEDIUM: OnChainFeedbackType.CONFIRMED_MEDIUM,
  CONFIRMED_LOW: OnChainFeedbackType.CONFIRMED_LOW,
  CONFIRMED_INFORMATIONAL: OnChainFeedbackType.CONFIRMED_INFORMATIONAL,
  REJECTED: OnChainFeedbackType.REJECTED,
};

// Lazy-initialized contract client
let _reputationClient: AgentReputationRegistryClient | null = null;
function getReputationClient(): AgentReputationRegistryClient {
  if (!_reputationClient) {
    _reputationClient = new AgentReputationRegistryClient();
  }
  return _reputationClient;
}

export class ReputationService {
  async recordFeedback(
    researcherWallet: string,
    validatorWallet: string,
    validationId: string,
    findingId: string,
    feedbackType: FeedbackType
  ) {
    const researcher = await prisma.agentIdentity.findUnique({
      where: { walletAddress: researcherWallet.toLowerCase() },
      include: { reputation: true },
    });

    if (!researcher) {
      throw new Error(`Researcher not found: ${researcherWallet}`);
    }

    const validator = await prisma.agentIdentity.findUnique({
      where: { walletAddress: validatorWallet.toLowerCase() },
    });

    if (!validator) {
      throw new Error(`Validator not found: ${validatorWallet}`);
    }

    const feedback = await prisma.agentFeedback.create({
      data: {
        researcherAgentId: researcher.id,
        validatorAgentId: validator.id,
        validationId,
        findingId,
        feedbackType,
      },
    });

    const isConfirmed = feedbackType !== 'REJECTED';

    const updatedReputation = await prisma.agentReputation.update({
      where: { agentIdentityId: researcher.id },
      data: {
        confirmedCount: isConfirmed
          ? { increment: 1 }
          : undefined,
        rejectedCount: !isConfirmed
          ? { increment: 1 }
          : undefined,
        totalSubmissions: { increment: 1 },
        reputationScore: this.calculateScore(
          (researcher.reputation?.confirmedCount || 0) + (isConfirmed ? 1 : 0),
          (researcher.reputation?.totalSubmissions || 0) + 1
        ),
        lastUpdated: new Date(),
      },
    });

    return { feedback, reputation: updatedReputation };
  }

  async initializeReputationOnChain(agentNftId: string, walletAddress: string) {
    const client = getReputationClient();
    return await client.initializeReputation(agentNftId, walletAddress);
  }

  async recordFeedbackOnChain(
    researcherWallet: string,
    validatorWallet: string,
    validationId: string,
    findingId: string,
    feedbackType: FeedbackType
  ) {
    const researcher = await prisma.agentIdentity.findUnique({
      where: { walletAddress: researcherWallet.toLowerCase() },
    });

    const validator = await prisma.agentIdentity.findUnique({
      where: { walletAddress: validatorWallet.toLowerCase() },
    });

    if (!researcher?.agentNftId || !validator?.agentNftId) {
      throw new Error('Agents must be registered on-chain first');
    }

    const client = getReputationClient();

    // Corrected call: 4 params matching Solidity signature
    // recordFeedback(researcherAgentId, validatorAgentId, validationId, feedbackType)
    const result = await client.recordFeedback(
      researcher.agentNftId.toString(),
      validator.agentNftId.toString(),
      validationId,
      FEEDBACK_TYPE_MAP[feedbackType]
    );

    // Record in database as well
    const { feedback, reputation } = await this.recordFeedback(
      researcherWallet,
      validatorWallet,
      validationId,
      findingId,
      feedbackType
    );

    // Update with on-chain feedback ID and txHash
    await prisma.agentFeedback.update({
      where: { id: feedback.id },
      data: {
        onChainFeedbackId: result.feedbackId,
        txHash: result.txHash,
      },
    });

    return { feedback, reputation, txHash: result.txHash };
  }

  calculateScore(confirmed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((confirmed * 100) / total);
  }

  async getReputation(walletAddress: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { reputation: true },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${walletAddress}`);
    }

    return agent.reputation;
  }

  async getReputationById(agentIdentityId: string) {
    return prisma.agentReputation.findUnique({
      where: { agentIdentityId },
    });
  }

  async getReputationOnChain(agentNftId: bigint) {
    try {
      const client = getReputationClient();
      return await client.getScore(agentNftId.toString());
    } catch {
      return null;
    }
  }

  async meetsMinimumScore(walletAddress: string, minScore: number): Promise<boolean> {
    const reputation = await this.getReputation(walletAddress);
    return (reputation?.reputationScore || 0) >= minScore;
  }

  async getFeedbackHistory(walletAddress: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${walletAddress}`);
    }

    return prisma.agentFeedback.findMany({
      where: { researcherAgentId: agent.id },
      include: {
        validatorAgent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const reputationService = new ReputationService();
