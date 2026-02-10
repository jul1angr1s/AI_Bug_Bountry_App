import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { payerWallet, contractAddresses, provider } from '../config.js';

// ABI matches AgentReputationRegistry.sol exactly:
// - recordFeedback(uint256, uint256, bytes32, FeedbackType) returns (bytes32)
// - initializeReputation(uint256, address)
// - getReputation(uint256) returns ReputationRecord
// - getScore(uint256) returns uint256
const AGENT_REPUTATION_REGISTRY_ABI = [
  'function initializeReputation(uint256 agentId, address wallet) external',
  'function recordFeedback(uint256 researcherAgentId, uint256 validatorAgentId, bytes32 validationId, uint8 feedbackType) external returns (bytes32)',
  'function recordValidatorFeedback(uint256 validatorAgentId, uint256 researcherAgentId, bytes32 validationId, uint8 feedbackType) external returns (bytes32)',
  'function getReputation(uint256 agentId) external view returns (tuple(uint256 agentId, address wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 inconclusiveCount, uint256 totalSubmissions, uint256 reputationScore, uint256 lastUpdated))',
  'function getValidatorReputation(uint256 agentId) external view returns (tuple(uint256 agentId, address wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 inconclusiveCount, uint256 totalSubmissions, uint256 reputationScore, uint256 lastUpdated))',
  'function getScore(uint256 agentId) external view returns (uint256)',
  'function getAgentFeedbacks(uint256 agentId) external view returns (tuple(bytes32 feedbackId, uint256 researcherAgentId, uint256 validatorAgentId, bytes32 validationId, uint8 feedbackType, uint256 timestamp)[])',
  'function getValidatorFeedbacks(uint256 agentId) external view returns (tuple(bytes32 feedbackId, uint256 researcherAgentId, uint256 validatorAgentId, bytes32 validationId, uint8 feedbackType, uint256 timestamp)[])',
  'function meetsMinimumScore(uint256 agentId, uint256 minScore) external view returns (bool)',
  'event FeedbackRecorded(bytes32 indexed feedbackId, uint256 indexed researcherAgentId, uint256 indexed validatorAgentId, bytes32 validationId, uint8 feedbackType, uint256 timestamp)',
  'event ValidatorFeedbackRecorded(bytes32 indexed feedbackId, uint256 indexed validatorAgentId, uint256 indexed researcherAgentId, bytes32 validationId, uint8 feedbackType, uint256 timestamp)',
  'event ReputationUpdated(uint256 indexed agentId, address indexed wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 reputationScore, uint256 timestamp)',
  'event ValidatorReputationUpdated(uint256 indexed agentId, address indexed wallet, uint256 confirmedCount, uint256 rejectedCount, uint256 reputationScore, uint256 timestamp)',
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

export interface InitializeReputationResult {
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

  async initializeReputation(
    agentId: string,
    walletAddress: string
  ): Promise<InitializeReputationResult> {
    console.log('[AgentReputationRegistry] Initializing reputation on-chain...');
    console.log(`  Agent ID: ${agentId}`);
    console.log(`  Wallet: ${walletAddress}`);

    const tx: ContractTransactionResponse = await this.contract.initializeReputation(
      agentId,
      walletAddress
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    console.log(`[AgentReputationRegistry] Reputation initialized: tx=${tx.hash}`);

    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async recordFeedback(
    researcherAgentId: string,
    validatorAgentId: string,
    validationId: string,
    feedbackType: FeedbackType
  ): Promise<FeedbackRecordResult> {
    console.log('[AgentReputationRegistry] Recording feedback on-chain...');
    console.log(`  Researcher Agent ID: ${researcherAgentId}`);
    console.log(`  Validator Agent ID: ${validatorAgentId}`);
    console.log(`  Feedback: ${FeedbackType[feedbackType]}`);

    // Convert validationId to bytes32
    const validationIdBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(validationId.startsWith('0x') ? validationId : ethers.id(validationId)),
      32
    );

    const tx: ContractTransactionResponse = await this.contract.recordFeedback(
      researcherAgentId,
      validatorAgentId,
      validationIdBytes32,
      feedbackType
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    // Parse FeedbackRecorded event to get feedbackId (bytes32)
    let feedbackId = '0x0';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'FeedbackRecorded') {
          feedbackId = parsed.args[0];
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

  async recordValidatorFeedback(
    validatorAgentId: string,
    researcherAgentId: string,
    validationId: string,
    feedbackType: FeedbackType
  ): Promise<FeedbackRecordResult> {
    console.log('[AgentReputationRegistry] Recording validator feedback on-chain...');
    console.log(`  Validator Agent ID: ${validatorAgentId}`);
    console.log(`  Researcher Agent ID: ${researcherAgentId}`);
    console.log(`  Feedback: ${FeedbackType[feedbackType]}`);

    const validationIdBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(validationId.startsWith('0x') ? validationId : ethers.id(validationId)),
      32
    );

    const tx: ContractTransactionResponse = await this.contract.recordValidatorFeedback(
      validatorAgentId,
      researcherAgentId,
      validationIdBytes32,
      feedbackType
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    let feedbackId = '0x0';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'ValidatorFeedbackRecorded') {
          feedbackId = parsed.args[0];
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    console.log(`[AgentReputationRegistry] Validator feedback recorded: id=${feedbackId}, tx=${tx.hash}`);

    return {
      feedbackId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getValidatorReputation(tokenId: string): Promise<OnChainReputationScore> {
    const repRecord = await this.readOnlyContract.getValidatorReputation(tokenId);
    return {
      totalSubmissions: repRecord.totalSubmissions,
      confirmedCount: repRecord.confirmedCount,
      rejectedCount: repRecord.rejectedCount,
      reputationScore: repRecord.reputationScore,
    };
  }

  async getScore(tokenId: string): Promise<OnChainReputationScore> {
    const repRecord = await this.readOnlyContract.getReputation(tokenId);
    return {
      totalSubmissions: repRecord.totalSubmissions,
      confirmedCount: repRecord.confirmedCount,
      rejectedCount: repRecord.rejectedCount,
      reputationScore: repRecord.reputationScore,
    };
  }

  getAddress(): string {
    return contractAddresses.agentReputationRegistry;
  }
}
