import { ethers, Contract } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { researcherAgentWallet, usdcConfig } from '../blockchain/config.js';

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
      console.log('[AgentPayment] Researcher agent wallet (PRIVATE_KEY3) not configured, skipping exploit fee');
      return null;
    }

    if (!validatorAddress) {
      console.log('[AgentPayment] No validator address provided, skipping exploit fee');
      return null;
    }

    try {
      console.log('[AgentPayment] Paying exploit submission fee...');
      console.log(`  From: ${researcherAgentWallet.address}`);
      console.log(`  To: ${validatorAddress}`);
      console.log(`  Amount: 0.5 USDC`);
      console.log(`  Finding: ${findingId}`);

      const usdcContract = new Contract(
        usdcConfig.address,
        ERC20_ABI,
        researcherAgentWallet
      );

      // Check balance first
      const balance = await usdcContract.balanceOf(researcherAgentWallet.address);
      if (balance < EXPLOIT_FEE_AMOUNT) {
        console.error(`[AgentPayment] Insufficient USDC balance: ${ethers.formatUnits(balance, 6)} < 0.5`);
        return null;
      }

      // Execute transfer
      const tx = await usdcContract.transfer(validatorAddress, EXPLOIT_FEE_AMOUNT);
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        console.error('[AgentPayment] Transfer transaction failed');
        return null;
      }

      console.log(`[AgentPayment] Exploit fee paid: tx=${tx.hash}`);

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
      console.error('[AgentPayment] Failed to pay exploit fee:', error);

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
      }).catch(err => console.error('[AgentPayment] Failed to record failed payment:', err));

      return null;
    }
  }
}

export const agentPaymentService = new AgentPaymentService();
