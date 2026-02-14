import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { getSigner, contractAddresses } from '../config.js';
import ProtocolRegistryABI from '../abis/ProtocolRegistry.json' with { type: 'json' };
import { createLogger } from '../../lib/logger.js';

const log = createLogger('ProtocolRegistry');

export interface ProtocolRegistrationResult {
  protocolId: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  version: number;
}

export interface OnChainProtocol {
  protocolId: string;
  owner: string;
  githubUrl: string;
  contractPath: string;
  contractName: string;
  bountyTermsHash: string;
  status: number;
  registeredAt: bigint;
  totalBountyPool: bigint;
}

export enum ProtocolStatus {
  PENDING = 0,
  ACTIVE = 1,
  PAUSED = 2,
  DEACTIVATED = 3,
}

/**
 * Client for interacting with the ProtocolRegistry smart contract
 */
export class ProtocolRegistryClient {
  private contract: Contract;
  private signer: ethers.Wallet;

  constructor() {
    if (!contractAddresses.protocolRegistry) {
      throw new Error('PROTOCOL_REGISTRY_ADDRESS not set in environment');
    }

    this.signer = getSigner();
    this.contract = new Contract(
      contractAddresses.protocolRegistry,
      ProtocolRegistryABI.abi,
      this.signer
    );
  }

  /**
   * Register a new protocol on-chain
   */
  async registerProtocol(
    githubUrl: string,
    contractPath: string,
    contractName: string,
    bountyTerms: string
  ): Promise<ProtocolRegistrationResult> {
    try {
      log.info('Registering protocol...');
      log.debug(`GitHub URL: ${githubUrl}`);
      log.debug(`Contract: ${contractPath}/${contractName}`);

      // Call the contract
      const tx: ContractTransactionResponse = await this.contract.registerProtocol(
        githubUrl,
        contractPath,
        contractName,
        bountyTerms
      );

      log.info(`Transaction sent: ${tx.hash}`);
      log.debug('Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      log.info(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse the ProtocolRegistered event to get protocolId
      const event = receipt.logs.find((log) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'ProtocolRegistered';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('ProtocolRegistered event not found in transaction receipt');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      if (!parsedEvent) {
        throw new Error('Failed to parse ProtocolRegistered event');
      }

      const protocolId = parsedEvent.args.protocolId;
      const version = Number(parsedEvent.args.version || 1);

      log.info('Registration successful!');
      log.debug(`Protocol ID: ${protocolId}`);
      log.debug(`Version: ${version}`);
      log.debug(`TX Hash: ${receipt.hash}`);
      log.debug(`Block: ${receipt.blockNumber}`);

      // Get block timestamp
      const block = await this.signer.provider!.getBlock(receipt.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      return {
        protocolId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp,
        version,
      };
    } catch (error) {
      log.error('Registration failed:', error);

      // Parse revert reason if available
      const errObj = error as { data?: string; message?: string };
      if (errObj.data) {
        try {
          const decodedError = this.contract.interface.parseError(errObj.data);
          log.error(`Revert reason: ${decodedError?.name}`);
        } catch {
          // Ignore parsing errors
        }
      }

      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to register protocol: ${msg}`);
    }
  }

  /**
   * Get protocol details from on-chain
   */
  async getProtocol(protocolId: string): Promise<OnChainProtocol> {
    try {
      const protocol = await this.contract.getProtocol(protocolId);

      return {
        protocolId: protocol.protocolId,
        owner: protocol.owner,
        githubUrl: protocol.githubUrl,
        contractPath: protocol.contractPath,
        contractName: protocol.contractName,
        bountyTermsHash: protocol.bountyTermsHash,
        status: Number(protocol.status),
        registeredAt: protocol.registeredAt,
        totalBountyPool: protocol.totalBountyPool,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocol: ${msg}`);
    }
  }

  /**
   * Check if a GitHub URL is already registered
   */
  async isGithubUrlRegistered(githubUrl: string): Promise<boolean> {
    try {
      return await this.contract.isGithubUrlRegistered(githubUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check GitHub URL: ${msg}`);
    }
  }

  /**
   * Get protocol ID by GitHub URL
   */
  async getProtocolIdByGithubUrl(githubUrl: string): Promise<string | null> {
    try {
      const protocolId = await this.contract.getProtocolIdByGithubUrl(githubUrl);

      // Return null if protocolId is bytes32(0)
      if (protocolId === ethers.ZeroHash) {
        return null;
      }

      return protocolId;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocol ID: ${msg}`);
    }
  }

  /**
   * Update protocol status (admin only)
   */
  async updateProtocolStatus(
    protocolId: string,
    newStatus: ProtocolStatus
  ): Promise<string> {
    try {
      const tx: ContractTransactionResponse = await this.contract.updateProtocolStatus(
        protocolId,
        newStatus
      );

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      return receipt.hash;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update protocol status: ${msg}`);
    }
  }

  /**
   * Get total number of registered protocols
   */
  async getProtocolCount(): Promise<number> {
    try {
      const count = await this.contract.getProtocolCount();
      return Number(count);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocol count: ${msg}`);
    }
  }

  /**
   * Get all protocols owned by an address
   */
  async getProtocolsByOwner(ownerAddress: string): Promise<string[]> {
    try {
      return await this.contract.getProtocolsByOwner(ownerAddress);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocols by owner: ${msg}`);
    }
  }

  /**
   * Get all protocol IDs for a GitHub URL
   */
  async getProtocolIdsByGithubUrl(githubUrl: string): Promise<string[]> {
    try {
      return await this.contract.getProtocolIdsByGithubUrl(githubUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocol IDs: ${msg}`);
    }
  }

  /**
   * Get version count for a GitHub URL
   */
  async getVersionCount(githubUrl: string): Promise<number> {
    try {
      const count = await this.contract.getVersionCount(githubUrl);
      return Number(count);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get version count: ${msg}`);
    }
  }

  /**
   * Get the contract instance (for advanced usage)
   */
  getContract(): Contract {
    return this.contract;
  }

  /**
   * Get the contract address
   */
  getAddress(): string {
    return contractAddresses.protocolRegistry;
  }
}

export default ProtocolRegistryClient;
