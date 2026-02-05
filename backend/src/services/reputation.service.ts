import { PrismaClient, FeedbackType } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const AGENT_REPUTATION_REGISTRY_ABI = [
  'function recordFeedback(uint256 researcherAgentId, uint256 validatorAgentId, bytes32 validationId, uint8 feedbackType) external returns (bytes32 feedbackId)',
  'function getReputation(uint256 agentId) external view returns (tuple(uint256 agentId, address wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 inconclusiveCount, uint256 totalSubmissions, uint256 reputationScore, uint256 lastUpdated))',
  'function getScore(uint256 agentId) external view returns (uint256)',
  'function meetsMinimumScore(uint256 agentId, uint256 minScore) external view returns (bool)',
  'event FeedbackRecorded(bytes32 indexed feedbackId, uint256 indexed researcherAgentId, uint256 indexed validatorAgentId, bytes32 validationId, uint8 feedbackType, uint256 timestamp)',
  'event ReputationUpdated(uint256 indexed agentId, address indexed wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 reputationScore, uint256 timestamp)',
];

const FEEDBACK_TYPE_MAP: Record<FeedbackType, number> = {
  CONFIRMED_CRITICAL: 0,
  CONFIRMED_HIGH: 1,
  CONFIRMED_MEDIUM: 2,
  CONFIRMED_LOW: 3,
  CONFIRMED_INFORMATIONAL: 4,
  REJECTED: 5,
};

export class ReputationService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private registryAddress: string;

  constructor() {
    this.registryAddress = process.env.AGENT_REPUTATION_REGISTRY_ADDRESS || '';

    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );

    const privateKey = process.env.PLATFORM_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      this.signer = new ethers.Wallet(formattedKey, this.provider);
    }
  }

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

  async recordFeedbackOnChain(
    researcherWallet: string,
    validatorWallet: string,
    validationId: string,
    findingId: string,
    feedbackType: FeedbackType
  ) {
    if (!this.signer || !this.registryAddress) {
      throw new Error('Signer or registry address not configured');
    }

    const researcher = await prisma.agentIdentity.findUnique({
      where: { walletAddress: researcherWallet.toLowerCase() },
    });

    const validator = await prisma.agentIdentity.findUnique({
      where: { walletAddress: validatorWallet.toLowerCase() },
    });

    if (!researcher?.agentNftId || !validator?.agentNftId) {
      throw new Error('Agents must be registered on-chain first');
    }

    const contract = new ethers.Contract(
      this.registryAddress,
      AGENT_REPUTATION_REGISTRY_ABI,
      this.signer
    );

    const tx = await contract.recordFeedback(
      researcher.agentNftId,
      validator.agentNftId,
      validationId,
      FEEDBACK_TYPE_MAP[feedbackType]
    );

    const receipt = await tx.wait();

    const { feedback, reputation } = await this.recordFeedback(
      researcherWallet,
      validatorWallet,
      validationId,
      findingId,
      feedbackType
    );

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'FeedbackRecorded') {
          await prisma.agentFeedback.update({
            where: { id: feedback.id },
            data: { onChainFeedbackId: parsed.args.feedbackId },
          });
          break;
        }
      } catch {
        // Skip logs that don't match
      }
    }

    return { feedback, reputation, txHash: tx.hash };
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
    if (!this.registryAddress) return null;

    try {
      const contract = new ethers.Contract(
        this.registryAddress,
        AGENT_REPUTATION_REGISTRY_ABI,
        this.provider
      );
      return await contract.getReputation(agentNftId);
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

  async syncFromValidationRegistry() {
    console.log('Syncing reputation from ValidationRegistry...');
  }
}

export const reputationService = new ReputationService();
