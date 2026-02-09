import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { payerWallet, contractAddresses, provider } from '../config.js';

const AGENT_IDENTITY_REGISTRY_ABI = [
  'function registerAgent(address wallet, uint8 agentType) external returns (uint256)',
  'function selfRegister(uint8 agentType) external returns (uint256)',
  'function getAgent(uint256 agentId) external view returns (tuple(uint256 agentId, address wallet, uint8 agentType, uint256 registeredAt, bool active))',
  'function getAgentByWallet(address wallet) external view returns (tuple(uint256 agentId, address wallet, uint8 agentType, uint256 registeredAt, bool active))',
  'function isRegistered(address wallet) external view returns (bool)',
  'function isActive(uint256 agentId) external view returns (bool)',
  'function getTotalAgentCount() external view returns (uint256)',
  'function walletToAgentId(address wallet) external view returns (uint256)',
  'event AgentRegistered(uint256 indexed agentId, address indexed wallet, uint8 agentType, uint256 registeredAt)',
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
      const result = await this.readOnlyContract.getAgentByWallet(walletAddress);
      return {
        tokenId: result.agentId.toString(),
        agentType: Number(result.agentType) as AgentType,
        isActive: result.active,
        registeredAt: result.registeredAt,
      };
    } catch {
      return null;
    }
  }

  async getAgentIdByWallet(walletAddress: string): Promise<string> {
    const id = await this.readOnlyContract.walletToAgentId(walletAddress);
    return id.toString();
  }

  getAddress(): string {
    return contractAddresses.agentIdentityRegistry;
  }
}
