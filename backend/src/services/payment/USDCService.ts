import { injectable, inject } from 'tsyringe';
import { TOKENS } from '../../di/tokens.js';
import type { ILogger } from '../../di/interfaces/ILogger.js';
import type { IUSDCClient } from '../../di/interfaces/IBlockchainClient.js';
import type {
  UsdcAllowanceResult,
  UsdcBalanceResult,
  ApprovalTransactionResult,
} from './types.js';

/**
 * USDC on-chain read and transaction-generation operations.
 */
@injectable()
export class USDCService {
  private logger: ILogger;

  constructor(
    @inject(TOKENS.Logger) logger: ILogger,
    @inject(TOKENS.USDCClient) private usdcClient: IUSDCClient,
  ) {
    this.logger = logger.child({ service: 'USDCService' });
  }

  /**
   * Get the current USDC allowance for an owner/spender pair.
   */
  async getUsdcAllowance(
    owner: string,
    spender: string,
  ): Promise<UsdcAllowanceResult> {
    try {
      const allowance = await this.usdcClient.getAllowance(owner, spender);
      const allowanceFormatted = this.usdcClient.formatUSDC(allowance);

      return {
        success: true,
        allowance: allowance.toString(),
        allowanceFormatted,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting USDC allowance', {
        owner,
        spender,
        error: msg,
      });
      return {
        success: false,
        error: {
          code: 'USDC_ALLOWANCE_ERROR',
          message: msg || 'Failed to get USDC allowance',
        },
      };
    }
  }

  /**
   * Get the USDC balance for a given address.
   */
  async getUsdcBalance(address: string): Promise<UsdcBalanceResult> {
    try {
      const balance = await this.usdcClient.getBalance(address);
      const balanceFormatted = this.usdcClient.formatUSDC(balance);

      return {
        success: true,
        balance: balance.toString(),
        balanceFormatted,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error getting USDC balance', {
        address,
        error: msg,
      });
      return {
        success: false,
        error: {
          code: 'USDC_BALANCE_ERROR',
          message: msg || 'Failed to get USDC balance',
        },
      };
    }
  }

  /**
   * Generate an unsigned ERC-20 approval transaction for USDC.
   */
  async generateApprovalTransaction(
    amount: string,
    spender: string,
  ): Promise<ApprovalTransactionResult> {
    try {
      const amountBigInt = this.usdcClient.parseUSDC(amount);

      if (amountBigInt <= BigInt(0)) {
        return {
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than zero',
          },
        };
      }

      const txData = await this.usdcClient.generateApprovalTxData(spender, amountBigInt);

      return {
        success: true,
        transaction: {
          to: txData.to,
          data: txData.data,
          value: '0',
          chainId: 84532,
          gasLimit: '100000',
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating approval transaction', {
        amount,
        spender,
        error: msg,
      });
      const code = msg.includes('Invalid BountyPool address')
        ? 'INVALID_BOUNTY_POOL'
        : 'APPROVAL_TX_ERROR';

      return {
        success: false,
        error: {
          code,
          message: msg || 'Failed to generate approval transaction',
        },
      };
    }
  }
}
