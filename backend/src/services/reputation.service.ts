import { PrismaClient, FeedbackType } from '@prisma/client';
import {
  AgentReputationRegistryClient,
  FeedbackType as OnChainFeedbackType,
} from '../blockchain/contracts/AgentReputationRegistryClient.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ReputationService');

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
      include: { reputation: true },
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

    // Also update the validator's reputation stats
    await prisma.agentReputation.update({
      where: { agentIdentityId: validator.id },
      data: {
        validatorConfirmedCount: isConfirmed ? { increment: 1 } : undefined,
        validatorRejectedCount: !isConfirmed ? { increment: 1 } : undefined,
        validatorTotalSubmissions: { increment: 1 },
        validatorReputationScore: this.calculateScore(
          (validator.reputation?.validatorConfirmedCount || 0) + (isConfirmed ? 1 : 0),
          (validator.reputation?.validatorTotalSubmissions || 0) + 1
        ),
        validatorLastUpdated: new Date(),
      },
    });

    return { feedback, reputation: updatedReputation };
  }

  async initializeReputationOnChain(agentNftId: string, walletAddress: string) {
    const client = getReputationClient();
    return await client.initializeReputation(agentNftId, walletAddress);
  }

  /**
   * Idempotent: initialize on-chain reputation if not already done.
   * Checks via getScore first to avoid unnecessary transactions.
   */
  async initializeReputationOnChainIfNeeded(agentNftId: bigint, walletAddress: string): Promise<void> {
    const client = getReputationClient();
    const idStr = agentNftId.toString();

    try {
      // If getScore succeeds, reputation is already initialized
      await client.getScore(idStr);
      log.debug(`Agent ${idStr} already has on-chain reputation`);
      return;
    } catch {
      // Not initialized yet — proceed to initialize
    }

    try {
      log.info(`Initializing reputation on-chain for agent ${idStr}...`);
      await client.initializeReputation(idStr, walletAddress);
      log.info(`Initialized reputation on-chain for agent ${idStr}`);
    } catch (initError) {
      // Handle race condition: "already initialized" revert
      const msg = initError instanceof Error ? initError.message : String(initError);
      if (msg.toLowerCase().includes('already initialized') || msg.toLowerCase().includes('already exists')) {
        log.info(`Agent ${idStr} reputation was initialized concurrently, OK`);
        return;
      }
      throw initError;
    }
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

  async recordValidatorFeedback(
    researcherWallet: string,
    validatorWallet: string,
    validationId: string,
    findingId: string,
    feedbackType: FeedbackType
  ) {
    const researcher = await prisma.agentIdentity.findUnique({
      where: { walletAddress: researcherWallet.toLowerCase() },
    });

    if (!researcher) {
      throw new Error(`Researcher not found: ${researcherWallet}`);
    }

    const validator = await prisma.agentIdentity.findUnique({
      where: { walletAddress: validatorWallet.toLowerCase() },
      include: { reputation: true },
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
        feedbackDirection: 'RESEARCHER_RATES_VALIDATOR',
      },
    });

    const isConfirmed = feedbackType !== 'REJECTED';

    const updatedReputation = await prisma.agentReputation.update({
      where: { agentIdentityId: validator.id },
      data: {
        validatorConfirmedCount: isConfirmed ? { increment: 1 } : undefined,
        validatorRejectedCount: !isConfirmed ? { increment: 1 } : undefined,
        validatorTotalSubmissions: { increment: 1 },
        validatorReputationScore: this.calculateScore(
          (validator.reputation?.validatorConfirmedCount || 0) + (isConfirmed ? 1 : 0),
          (validator.reputation?.validatorTotalSubmissions || 0) + 1
        ),
        validatorLastUpdated: new Date(),
      },
    });

    return { feedback, reputation: updatedReputation };
  }

  async recordValidatorFeedbackOnChain(
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

    const result = await client.recordValidatorFeedback(
      validator.agentNftId.toString(),
      researcher.agentNftId.toString(),
      validationId,
      FEEDBACK_TYPE_MAP[feedbackType]
    );

    const { feedback, reputation } = await this.recordValidatorFeedback(
      researcherWallet,
      validatorWallet,
      validationId,
      findingId,
      feedbackType
    );

    await prisma.agentFeedback.update({
      where: { id: feedback.id },
      data: {
        onChainFeedbackId: result.feedbackId,
        txHash: result.txHash,
      },
    });

    return { feedback, reputation, txHash: result.txHash };
  }

  async getValidatorReputation(agentIdentityId: string) {
    const rep = await prisma.agentReputation.findUnique({
      where: { agentIdentityId },
    });
    if (!rep) return null;
    return {
      validatorConfirmedCount: rep.validatorConfirmedCount,
      validatorRejectedCount: rep.validatorRejectedCount,
      validatorTotalSubmissions: rep.validatorTotalSubmissions,
      validatorReputationScore: rep.validatorReputationScore,
      validatorLastUpdated: rep.validatorLastUpdated,
    };
  }

  async getFeedbackHistory(walletAddress: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${walletAddress}`);
    }

    return prisma.agentFeedback.findMany({
      where: {
        OR: [
          { researcherAgentId: agent.id },
          { validatorAgentId: agent.id },
        ],
      },
      include: {
        validatorAgent: true,
        researcherAgent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const reputationService = new ReputationService();
