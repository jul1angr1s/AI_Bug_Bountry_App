import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { payerWallet, contractAddresses, provider } from '../config.js';

const AGENT_IDENTITY_REGISTRY_ABI = [
  'function registerAgent(address agent, uint8 agentType) external returns (uint256)',
  'function getAgentByAddress(address agent) external view returns (uint256 tokenId, uint8 agentType, bool isActive, uint256 registeredAt)',
  'function isRegistered(address agent) external view returns (bool)',
  'function setAgentActive(address agent, bool active) external',
  'function totalAgents() external view returns (uint256)',
  'event AgentRegistered(uint256 indexed tokenId, address indexed agent, uint8 agentType)',
];

export enum AgentType {
  RESEARCHER = 0,
  VALIDATOR = 1,
}

export interface AgentRegistrationResult {
  tokenId: string;
  txHash: string;
  blockNumber: number;
}

export interface OnChainAgent {
  tokenId: string;
  agentType: AgentType;
  isActive: boolean;
  registeredAt: bigint;
}

export class AgentIdentityRegistryClient {
  private contract: Contract;
  private readOnlyContract: Contract;

  constructor() {
    if (!contractAddresses.agentIdentityRegistry) {
      throw new Error('AGENT_IDENTITY_REGISTRY_ADDRESS not set in environment');
    }

    this.contract = new Contract(
      contractAddresses.agentIdentityRegistry,
      AGENT_IDENTITY_REGISTRY_ABI,
      payerWallet
    );

    this.readOnlyContract = new Contract(
      contractAddresses.agentIdentityRegistry,
      AGENT_IDENTITY_REGISTRY_ABI,
      provider
    );
  }

  async registerAgent(
    walletAddress: string,
    agentType: AgentType
  ): Promise<AgentRegistrationResult> {
    console.log('[AgentIdentityRegistry] Registering agent on-chain...');
    console.log(`  Address: ${walletAddress}`);
    console.log(`  Type: ${AgentType[agentType]}`);

    const tx: ContractTransactionResponse = await this.contract.registerAgent(
      walletAddress,
      agentType
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction receipt is null');

    // Parse AgentRegistered event
    let tokenId = '0';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === 'AgentRegistered') {
          tokenId = parsed.args[0].toString();
          break;
        }
      } catch {
        // Not our event, skip
      }
    }

    console.log(`[AgentIdentityRegistry] Agent registered: tokenId=${tokenId}, tx=${tx.hash}`);

    return {
      tokenId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async isRegistered(walletAddress: string): Promise<boolean> {
    try {
      return await this.readOnlyContract.isRegistered(walletAddress);
    } catch {
      return false;
    }
  }

  async getAgent(walletAddress: string): Promise<OnChainAgent | null> {
    try {
      const result = await this.readOnlyContract.getAgentByAddress(walletAddress);
      return {
        tokenId: result.tokenId.toString(),
        agentType: Number(result.agentType) as AgentType,
        isActive: result.isActive,
        registeredAt: result.registeredAt,
      };
    } catch {
      return null;
    }
  }

  async setAgentActive(walletAddress: string, active: boolean): Promise<string> {
    const tx: ContractTransactionResponse = await this.contract.setAgentActive(
      walletAddress,
      active
    );
    await tx.wait();
    return tx.hash;
  }

  getAddress(): string {
    return contractAddresses.agentIdentityRegistry;
  }
}
