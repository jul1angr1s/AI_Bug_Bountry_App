import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { getSigner, contractAddresses, usdcConfig } from '../config.js';
import BountyPoolABI from '../abis/BountyPool.json' with { type: 'json' };

export interface BountyReleaseResult {
  bountyId: string;
  txHash: string;
  blockNumber: number;
  amount: bigint;
  timestamp: number;
}

export interface OnChainBounty {
  bountyId: string;
  protocolId: string;
  validationId: string;
  researcher: string;
  severity: number;
  amount: bigint;
  timestamp: bigint;
  paid: boolean;
}

export enum BountySeverity {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  INFORMATIONAL = 4,
}

/**
 * Client for interacting with the BountyPool smart contract
 */
export class BountyPoolClient {
  private contract: Contract;
  private signer: ethers.Wallet;

  constructor() {
    if (!contractAddresses.bountyPool) {
      throw new Error('BOUNTY_POOL_ADDRESS not set in environment');
    }

    this.signer = getSigner();
    this.contract = new Contract(
      contractAddresses.bountyPool,
      BountyPoolABI.abi,
      this.signer
    );
  }

  /**
   * Deposit USDC to protocol bounty pool
   * Note: Requires USDC approval first
   */
  async depositBounty(
    protocolId: string,
    amountUsdc: number
  ): Promise<string> {
    try {
      // Convert USDC amount to wei (6 decimals)
      const amount = BigInt(Math.floor(amountUsdc * 10 ** usdcConfig.decimals));

      console.log('[BountyPool] Depositing bounty...');
      console.log(`  Protocol ID: ${protocolId}`);
      console.log(`  Amount: ${amountUsdc} USDC`);

      const tx: ContractTransactionResponse = await this.contract.depositBounty(
        protocolId,
        amount
      );

      console.log(`[BountyPool] Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      console.log(`[BountyPool] Deposit confirmed in block ${receipt.blockNumber}`);

      return receipt.hash;
    } catch (error: any) {
      console.error('[BountyPool] Deposit failed:', error);
      throw new Error(`Failed to deposit bounty: ${error.message}`);
    }
  }

  /**
   * Release bounty payment to researcher (PAYOUT_ROLE required)
   */
  async releaseBounty(
    protocolId: string,
    validationId: string,
    researcherAddress: string,
    severity: BountySeverity
  ): Promise<BountyReleaseResult> {
    try {
      console.log('[BountyPool] Releasing bounty...');
      console.log(`  Protocol ID: ${protocolId}`);
      console.log(`  Validation ID: ${validationId}`);
      console.log(`  Researcher: ${researcherAddress}`);
      console.log(`  Severity: ${BountySeverity[severity]}`);

      // Call the contract
      const tx: ContractTransactionResponse = await this.contract.releaseBounty(
        protocolId,
        validationId,
        researcherAddress,
        severity
      );

      console.log(`[BountyPool] Transaction sent: ${tx.hash}`);
      console.log(`  Waiting for confirmation...`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      console.log(`[BountyPool] Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse the BountyReleased event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'BountyReleased';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('BountyReleased event not found in transaction receipt');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      if (!parsedEvent) {
        throw new Error('Failed to parse BountyReleased event');
      }

      const bountyId = parsedEvent.args.bountyId;
      const amount = parsedEvent.args.amount;

      console.log(`[BountyPool] Bounty released successfully!`);
      console.log(`  Bounty ID: ${bountyId}`);
      console.log(`  Amount: ${ethers.formatUnits(amount, usdcConfig.decimals)} USDC`);
      console.log(`  TX Hash: ${receipt.hash}`);

      // Get block timestamp
      const block = await this.signer.provider!.getBlock(receipt.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      return {
        bountyId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount,
        timestamp,
      };
    } catch (error: any) {
      console.error('[BountyPool] Bounty release failed:', error);

      // Parse revert reason if available
      if (error.data) {
        try {
          const decodedError = this.contract.interface.parseError(error.data);
          console.error(`  Revert reason: ${decodedError?.name}`);
        } catch {
          // Ignore parsing errors
        }
      }

      throw new Error(`Failed to release bounty: ${error.message}`);
    }
  }

  /**
   * Calculate bounty amount based on severity
   */
  async calculateBountyAmount(severity: BountySeverity): Promise<number> {
    try {
      const amount = await this.contract.calculateBountyAmount(severity);
      return Number(ethers.formatUnits(amount, usdcConfig.decimals));
    } catch (error: any) {
      throw new Error(`Failed to calculate bounty amount: ${error.message}`);
    }
  }

  /**
   * Get protocol bounty balance
   */
  async getProtocolBalance(protocolId: string): Promise<number> {
    try {
      const balance = await this.contract.getProtocolBalance(protocolId);
      return Number(ethers.formatUnits(balance, usdcConfig.decimals));
    } catch (error: any) {
      throw new Error(`Failed to get protocol balance: ${error.message}`);
    }
  }

  /**
   * Get bounty details
   */
  async getBounty(bountyId: string): Promise<OnChainBounty> {
    try {
      const bounty = await this.contract.getBounty(bountyId);

      return {
        bountyId: bounty.bountyId,
        protocolId: bounty.protocolId,
        validationId: bounty.validationId,
        researcher: bounty.researcher,
        severity: Number(bounty.severity),
        amount: bounty.amount,
        timestamp: bounty.timestamp,
        paid: bounty.paid,
      };
    } catch (error: any) {
      throw new Error(`Failed to get bounty: ${error.message}`);
    }
  }

  /**
   * Get all bounties for a protocol
   */
  async getProtocolBounties(protocolId: string): Promise<OnChainBounty[]> {
    try {
      const bounties = await this.contract.getProtocolBounties(protocolId);

      return bounties.map((b: any) => ({
        bountyId: b.bountyId,
        protocolId: b.protocolId,
        validationId: b.validationId,
        researcher: b.researcher,
        severity: Number(b.severity),
        amount: b.amount,
        timestamp: b.timestamp,
        paid: b.paid,
      }));
    } catch (error: any) {
      throw new Error(`Failed to get protocol bounties: ${error.message}`);
    }
  }

  /**
   * Get all bounties for a researcher
   */
  async getResearcherBounties(researcherAddress: string): Promise<OnChainBounty[]> {
    try {
      const bounties = await this.contract.getResearcherBounties(researcherAddress);

      return bounties.map((b: any) => ({
        bountyId: b.bountyId,
        protocolId: b.protocolId,
        validationId: b.validationId,
        researcher: b.researcher,
        severity: Number(b.severity),
        amount: b.amount,
        timestamp: b.timestamp,
        paid: b.paid,
      }));
    } catch (error: any) {
      throw new Error(`Failed to get researcher bounties: ${error.message}`);
    }
  }

  /**
   * Get total bounties paid for a protocol
   */
  async getTotalBountiesPaid(protocolId: string): Promise<number> {
    try {
      const total = await this.contract.getTotalBountiesPaid(protocolId);
      return Number(ethers.formatUnits(total, usdcConfig.decimals));
    } catch (error: any) {
      throw new Error(`Failed to get total bounties paid: ${error.message}`);
    }
  }

  /**
   * Get total earnings for a researcher
   */
  async getResearcherEarnings(researcherAddress: string): Promise<number> {
    try {
      const total = await this.contract.getResearcherEarnings(researcherAddress);
      return Number(ethers.formatUnits(total, usdcConfig.decimals));
    } catch (error: any) {
      throw new Error(`Failed to get researcher earnings: ${error.message}`);
    }
  }

  /**
   * Get base bounty amount
   */
  async getBaseBountyAmount(): Promise<number> {
    try {
      const amount = await this.contract.baseBountyAmount();
      return Number(ethers.formatUnits(amount, usdcConfig.decimals));
    } catch (error: any) {
      throw new Error(`Failed to get base bounty amount: ${error.message}`);
    }
  }

  /**
   * Check if an address has payout role
   */
  async isPayer(address: string): Promise<boolean> {
    try {
      return await this.contract.isPayer(address);
    } catch (error: any) {
      throw new Error(`Failed to check payout role: ${error.message}`);
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
    return contractAddresses.bountyPool;
  }
}

export default BountyPoolClient;
