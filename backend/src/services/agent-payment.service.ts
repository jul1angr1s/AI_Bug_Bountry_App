import { ethers, Contract } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { researcherAgentWallet, usdcConfig } from '../blockchain/config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('AgentPaymentService');

const prisma = new PrismaClient();

// Minimal ERC-20 ABI for transfer
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
];

// Exploit submission fee: 0.5 USDC (500000 in 6-decimal base units)
const EXPLOIT_FEE_AMOUNT = BigInt(500000);

export class AgentPaymentService {
  /**
   * Pay exploit submission fee from researcher wallet to validator wallet.
   *
   * This is a server-side automatic payment — no MetaMask interaction needed.
   * The researcher agent wallet (PRIVATE_KEY3) sends 0.5 USDC to the validator's
   * wallet address for each exploit submission.
   */
  async payExploitSubmissionFee(
    researcherAddress: string,
    validatorAddress: string,
    findingId: string,
    protocolId?: string
  ): Promise<{ txHash: string } | null> {
    if (!researcherAgentWallet) {
      log.info('Researcher agent wallet (PRIVATE_KEY3) not configured, skipping exploit fee');
      return null;
    }

    if (!validatorAddress) {
      log.info('No validator address provided, skipping exploit fee');
      return null;
    }

    try {
      log.info({
        from: researcherAgentWallet.address,
        to: validatorAddress,
        amount: '0.5 USDC',
        findingId,
      }, 'Paying exploit submission fee...');

      const usdcContract = new Contract(
        usdcConfig.address,
        ERC20_ABI,
        researcherAgentWallet
      );

      // Check balance first
      const balance = await usdcContract.balanceOf(researcherAgentWallet.address);
      if (balance < EXPLOIT_FEE_AMOUNT) {
        log.error({ balance: ethers.formatUnits(balance, 6), required: '0.5' }, 'Insufficient USDC balance');
        return null;
      }

      // Execute transfer
      const tx = await usdcContract.transfer(validatorAddress, EXPLOIT_FEE_AMOUNT);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        log.error('Transfer transaction failed');
        return null;
      }

      log.info({ txHash: tx.hash }, 'Exploit fee paid');

      // Record payment in database
      await prisma.x402PaymentRequest.create({
        data: {
          requestType: 'EXPLOIT_SUBMISSION_FEE',
          requesterAddress: researcherAddress.toLowerCase(),
          amount: EXPLOIT_FEE_AMOUNT,
          status: 'COMPLETED',
          txHash: tx.hash,
          recipientAddress: validatorAddress.toLowerCase(),
          protocolId: protocolId || null,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          completedAt: new Date(),
        },
      });

      return { txHash: tx.hash };
    } catch (error) {
      log.error({ err: error }, 'Failed to pay exploit fee');

      // Record failed payment attempt
      await prisma.x402PaymentRequest.create({
        data: {
          requestType: 'EXPLOIT_SUBMISSION_FEE',
          requesterAddress: researcherAddress.toLowerCase(),
          amount: EXPLOIT_FEE_AMOUNT,
          status: 'FAILED',
          recipientAddress: validatorAddress.toLowerCase(),
          protocolId: protocolId || null,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      }).catch(err => log.error({ err }, 'Failed to record failed payment'));

      return null;
    }
  }
}

export const agentPaymentService = new AgentPaymentService();
