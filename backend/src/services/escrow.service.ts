import { PrismaClient } from '@prisma/client';
import { PlatformEscrowClient } from '../blockchain/contracts/PlatformEscrowClient.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('EscrowService');

const prisma = new PrismaClient();

// Lazy-initialized contract client (avoids crash if env vars not set)
let _escrowClient: PlatformEscrowClient | null = null;
function getEscrowClient(): PlatformEscrowClient {
  if (!_escrowClient) {
    _escrowClient = new PlatformEscrowClient();
  }
  return _escrowClient;
}

export class EscrowService {
  /**
   * Deposit escrow — verifies on-chain USDC transfer before crediting balance.
   * If txHash is provided, verifies the USDC transfer on-chain.
   * If no txHash, credits balance directly (for backend-initiated deposits).
   */
  async depositEscrow(walletAddress: string, amount: bigint, txHash?: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${walletAddress}`);
    }

    // Verify on-chain transfer if txHash provided
    if (txHash) {
      const client = getEscrowClient();
      const verification = await client.verifyUsdcTransfer(
        txHash,
        client.getAddress(),
        amount
      );

      if (!verification.valid) {
        throw new Error(
          `On-chain USDC transfer verification failed for tx ${txHash}. ` +
          `Expected ${amount} USDC to ${client.getAddress()}.`
        );
      }

      // Verify sender matches depositor
      if (verification.sender.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error(
          `Sender mismatch: tx sender ${verification.sender} does not match depositor ${walletAddress}`
        );
      }
    }

    // Check for replay: has this tx hash already been used?
    if (txHash) {
      const existingTx = await prisma.escrowTransaction.findFirst({
        where: { txHash },
      });
      if (existingTx) {
        throw new Error(`Transaction ${txHash} already used for a deposit (replay detected)`);
      }
    }

    if (!agent.escrowBalance) {
      await prisma.agentEscrow.create({
        data: {
          agentIdentityId: agent.id,
          balance: amount,
          totalDeposited: amount,
        },
      });
    } else {
      await prisma.agentEscrow.update({
        where: { agentIdentityId: agent.id },
        data: {
          balance: { increment: amount },
          totalDeposited: { increment: amount },
        },
      });
    }

    await prisma.escrowTransaction.create({
      data: {
        agentEscrowId: agent.escrowBalance?.id || (await prisma.agentEscrow.findUnique({
          where: { agentIdentityId: agent.id },
        }))!.id,
        transactionType: 'DEPOSIT',
        amount,
        txHash,
      },
    });

    return this.getEscrowBalance(walletAddress);
  }

  /**
   * Deduct submission fee — atomically checks balance and deducts.
   * Returns the updated balance.
   */
  async deductSubmissionFee(walletAddress: string, findingId: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent || !agent.escrowBalance) {
      throw new Error(`Agent escrow not found: ${walletAddress}`);
    }

    const submissionFee = BigInt(500000); // 0.5 USDC

    if (agent.escrowBalance.balance < submissionFee) {
      throw new Error(
        `Insufficient escrow balance. Required: ${submissionFee}, Available: ${agent.escrowBalance.balance}`
      );
    }

    // Use transaction to make deduction atomic
    await prisma.$transaction([
      prisma.agentEscrow.update({
        where: { agentIdentityId: agent.id },
        data: {
          balance: { decrement: submissionFee },
          totalDeducted: { increment: submissionFee },
        },
      }),
      prisma.escrowTransaction.create({
        data: {
          agentEscrowId: agent.escrowBalance.id,
          transactionType: 'SUBMISSION_FEE',
          amount: submissionFee,
          findingId,
        },
      }),
    ]);

    return this.getEscrowBalance(walletAddress);
  }

  /**
   * Deduct submission fee on-chain AND in database (dual-write).
   */
  async deductSubmissionFeeOnChain(walletAddress: string, findingId: string) {
    const client = getEscrowClient();
    const result = await client.deductSubmissionFee(walletAddress, findingId);

    // Also update local database balance and ledger
    await this.deductSubmissionFee(walletAddress, findingId);

    // Record as x402 payment with real on-chain txHash
    await prisma.x402PaymentRequest.create({
      data: {
        requestType: 'FINDING_SUBMISSION',
        requesterAddress: walletAddress.toLowerCase(),
        amount: BigInt(500000),
        status: 'COMPLETED',
        txHash: result.txHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        completedAt: new Date(),
      },
    }).catch(err => log.error('Failed to record on-chain x402 payment:', err));

    return {
      ...await this.getEscrowBalance(walletAddress),
      txHash: result.txHash,
    };
  }

  async getEscrowBalance(walletAddress: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent || !agent.escrowBalance) {
      return {
        balance: BigInt(0),
        totalDeposited: BigInt(0),
        totalDeducted: BigInt(0),
        remainingSubmissions: 0,
      };
    }

    const submissionFee = BigInt(500000);
    const remainingSubmissions = submissionFee > 0
      ? Number(agent.escrowBalance.balance / submissionFee)
      : 0;

    return {
      balance: agent.escrowBalance.balance,
      totalDeposited: agent.escrowBalance.totalDeposited,
      totalDeducted: agent.escrowBalance.totalDeducted,
      remainingSubmissions,
    };
  }

  /**
   * Get on-chain escrow balance (reads directly from contract).
   */
  async getEscrowBalanceOnChain(walletAddress: string): Promise<bigint> {
    try {
      const client = getEscrowClient();
      return await client.getBalance(walletAddress);
    } catch {
      return BigInt(0);
    }
  }

  async canSubmitFinding(walletAddress: string): Promise<boolean> {
    const balance = await this.getEscrowBalance(walletAddress);
    return balance.remainingSubmissions > 0;
  }

  async getTransactionHistory(walletAddress: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent?.escrowBalance) {
      return [];
    }

    return prisma.escrowTransaction.findMany({
      where: { agentEscrowId: agent.escrowBalance.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubmissionFee(): Promise<bigint> {
    try {
      const client = getEscrowClient();
      return await client.getSubmissionFee();
    } catch {
      return BigInt(500000);
    }
  }

  async getProtocolRegistrationFee(): Promise<bigint> {
    try {
      const client = getEscrowClient();
      return await client.getProtocolRegistrationFee();
    } catch {
      return BigInt(1000000);
    }
  }
}

export const escrowService = new EscrowService();
