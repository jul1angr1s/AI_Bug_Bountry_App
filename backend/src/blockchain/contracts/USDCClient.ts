import { ethers, Contract } from 'ethers';
import { provider, contractAddresses, usdcConfig, chainConfig } from '../config.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('USDCClient');

/**
 * Minimal ERC-20 ABI for USDC interactions
 * Includes only the functions needed for approval flow
 */
const ERC20_ABI = [
  // Read functions
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Write functions
  'function approve(address spender, uint256 amount) returns (bool)',
];

/**
 * Unsigned transaction object for frontend wallet signing
 */
export interface UnsignedTransaction {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: bigint;
}

/**
 * Client for interacting with USDC ERC-20 token contract
 * Supports approval flow for BountyPool deposits
 */
export class USDCClient {
  private contract: Contract;
  private readonly decimals: number;

  constructor() {
    // Use USDC address from config
    this.contract = new Contract(
      usdcConfig.address,
      ERC20_ABI,
      provider
    );
    this.decimals = usdcConfig.decimals;
  }

  /**
   * Get USDC allowance that owner has granted to spender
   * @param owner - Address that owns the USDC
   * @param spender - Address authorized to spend (typically BountyPool contract)
   * @returns Allowance amount in base units (6 decimals)
   */
  async getAllowance(owner: string, spender: string): Promise<bigint> {
    try {
      // Validate addresses
      if (!ethers.isAddress(owner)) {
        throw new Error('Invalid owner address');
      }
      if (!ethers.isAddress(spender)) {
        throw new Error('Invalid spender address');
      }

      const allowance = await this.contract.allowance(owner, spender);
      return allowance;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get USDC allowance: ${msg}`);
    }
  }

  /**
   * Get USDC balance for an address
   * @param address - Wallet address to check
   * @returns Balance amount in base units (6 decimals)
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      // Validate address
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address');
      }

      const balance = await this.contract.balanceOf(address);
      return balance;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get USDC balance: ${msg}`);
    }
  }

  /**
   * Generate unsigned approval transaction for frontend wallet signing
   * @param spender - Address to approve (typically BountyPool contract)
   * @param amount - Amount to approve in base units (6 decimals)
   * @returns Unsigned transaction object ready for wallet signing
   */
  async generateApprovalTxData(
    spender: string,
    amount: bigint
  ): Promise<UnsignedTransaction> {
    try {
      // Validate inputs
      if (!ethers.isAddress(spender)) {
        throw new Error('Invalid spender address');
      }
      if (amount <= BigInt(0)) {
        throw new Error('Amount must be greater than zero');
      }

      // Validate spender is BountyPool contract
      if (spender.toLowerCase() !== contractAddresses.bountyPool.toLowerCase()) {
        throw new Error('Invalid BountyPool address');
      }

      // Generate unsigned transaction data
      const txData = await this.contract.approve.populateTransaction(spender, amount);

      // Estimate gas for the approval transaction
      let gasLimit: bigint;
      try {
        gasLimit = await this.contract.approve.estimateGas(spender, amount);
        // Add 20% buffer to gas estimate
        gasLimit = (gasLimit * BigInt(120)) / BigInt(100);
      } catch (error) {
        // Use default gas limit if estimation fails
        const msg = error instanceof Error ? error.message : String(error);
        log.warn('Gas estimation failed, using default:', msg);
        gasLimit = BigInt(100000); // Standard ERC-20 approve gas limit
      }

      return {
        to: usdcConfig.address,
        data: txData.data as string,
        value: '0', // ERC-20 approve doesn't send ETH
        chainId: chainConfig.chainId,
        gasLimit,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate approval transaction: ${msg}`);
    }
  }

  /**
   * Format USDC amount from base units to human-readable string
   * @param amount - Amount in base units (6 decimals)
   * @returns Human-readable string (e.g., "1000.50")
   */
  formatUSDC(amount: bigint): string {
    return ethers.formatUnits(amount, this.decimals);
  }

  /**
   * Parse USDC amount from human-readable string to base units
   * @param amount - Human-readable amount string (e.g., "1000.50")
   * @returns Amount in base units (6 decimals)
   */
  parseUSDC(amount: string): bigint {
    try {
      return ethers.parseUnits(amount, this.decimals);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse USDC amount: ${msg}`);
    }
  }

  /**
   * Get the USDC contract address
   */
  getAddress(): string {
    return usdcConfig.address;
  }

  /**
   * Get USDC token decimals
   */
  getDecimals(): number {
    return this.decimals;
  }

  /**
   * Get USDC token symbol
   */
  getSymbol(): string {
    return usdcConfig.symbol;
  }

  /**
   * Get the contract instance (for advanced usage)
   */
  getContract(): Contract {
    return this.contract;
  }
}

export default USDCClient;
