import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { payerWallet, contractAddresses, provider } from '../config.js';

const AGENT_REPUTATION_REGISTRY_ABI = [
  'function recordFeedback(uint256 researcherTokenId, uint256 validatorTokenId, uint8 feedbackType, bytes32 validationId, bytes32 findingId) external returns (uint256)',
  'function getScore(uint256 tokenId) external view returns (uint256 totalSubmissions, uint256 confirmedCount, uint256 rejectedCount, uint256 reputationScore)',
  'function getFeedback(uint256 feedbackId) external view returns (uint256 researcherTokenId, uint256 validatorTokenId, uint8 feedbackType, bytes32 validationId, bytes32 findingId, uint256 timestamp)',
  'event FeedbackRecorded(uint256 indexed feedbackId, uint256 indexed researcherTokenId, uint256 indexed validatorTokenId, uint8 feedbackType)',
];

export enum FeedbackType {
  CONFIRMED_CRITICAL = 0,
  CONFIRMED_HIGH = 1,
  CONFIRMED_MEDIUM = 2,
  CONFIRMED_LOW = 3,
  CONFIRMED_INFORMATIONAL = 4,
  REJECTED = 5,
}

export interface FeedbackRecordResult {
  feedbackId: string;
  txHash: string;
  blockNumber: number;
}

export interface OnChainReputationScore {
  totalSubmissions: bigint;
  confirmedCount: bigint;
  rejectedCount: bigint;
  reputationScore: bigint;
}

export class AgentReputationRegistryClient {
  private contract: Contract;
  private readOnlyContract: Contract;

  constructor() {
    if (!contractAddresses.agentReputationRegistry) {
      throw new Error('AGENT_REPUTATION_REGISTRY_ADDRESS not set in environment');
    }

    this.contract = new Contract(
      contractAddresses.agentReputationRegistry,
      AGENT_REPUTATION_REGISTRY_ABI,
      payerWallet
    );

    this.readOnlyContract = new Contract(
      contractAddresses.agentReputationRegistry,
      AGENT_REPUTATION_REGISTRY_ABI,
      provider
    );
  }

  async recordFeedback(
    researcherTokenId: string,
    validatorTokenId: string,
    feedbackType: FeedbackType,
    validationId: string,
    findingId: string
  ): Promise<FeedbackRecordResult> {
    console.log('[AgentReputationRegistry] Recording feedback on-chain...');
    console.log(`  Researcher NFT: ${researcherTokenId}`);
    console.log(`  Validator NFT: ${validatorTokenId}`);
    console.log(`  Feedback: ${FeedbackType[feedbackType]}`);

    // Convert string IDs to bytes32
    const validationIdBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(validationId.startsWith('0x') ? validationId : ethers.id(validationId)),
      32
    );
    const findingIdBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(findingId.startsWith('0x') ? findingId : ethers.id(findingId)),
      32
    );

    const tx: ContractTransactionResponse = await this.contract.recordFeedback(
      researcherTokenId,
      validatorTokenId,
      feedbackType,
      validationIdBytes32,
      findingIdBytes32
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    // Parse FeedbackRecorded event
    let feedbackId = '0';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'FeedbackRecorded') {
          feedbackId = parsed.args[0].toString();
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    console.log(`[AgentReputationRegistry] Feedback recorded: id=${feedbackId}, tx=${tx.hash}`);

    return {
      feedbackId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getScore(tokenId: string): Promise<OnChainReputationScore> {
    const result = await this.readOnlyContract.getScore(tokenId);
    return {
      totalSubmissions: result.totalSubmissions,
      confirmedCount: result.confirmedCount,
      rejectedCount: result.rejectedCount,
      reputationScore: result.reputationScore,
    };
  }

  getAddress(): string {
    return contractAddresses.agentReputationRegistry;
  }
}
