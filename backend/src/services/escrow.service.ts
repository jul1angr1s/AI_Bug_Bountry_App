import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const PLATFORM_ESCROW_ABI = [
  'function depositEscrow(uint256 amount) external',
  'function depositEscrowFor(address agent, uint256 amount) external',
  'function deductSubmissionFee(address agent, bytes32 findingId) external',
  'function collectProtocolFee(address protocol, bytes32 protocolId) external',
  'function withdrawEscrow(uint256 amount) external',
  'function getEscrowBalance(address agent) external view returns (uint256)',
  'function canSubmitFinding(address agent) external view returns (bool)',
  'function getRemainingSubmissions(address agent) external view returns (uint256)',
  'function submissionFee() external view returns (uint256)',
  'function protocolRegistrationFee() external view returns (uint256)',
  'event EscrowDeposited(address indexed agent, uint256 amount, uint256 newBalance)',
  'event SubmissionFeeDeducted(address indexed agent, bytes32 indexed findingId, uint256 feeAmount, uint256 remainingBalance)',
  'event ProtocolFeeCollected(address indexed protocol, bytes32 indexed protocolId, uint256 feeAmount)',
];

export class EscrowService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private escrowAddress: string;
  private usdcAddress: string;

  constructor() {
    this.escrowAddress = process.env.PLATFORM_ESCROW_ADDRESS || '';
    this.usdcAddress = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );

    const privateKey = process.env.PLATFORM_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      this.signer = new ethers.Wallet(formattedKey, this.provider);
    }
  }

  async depositEscrow(walletAddress: string, amount: bigint, txHash?: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${walletAddress}`);
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

  async deductSubmissionFee(walletAddress: string, findingId: string) {
    const agent = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { escrowBalance: true },
    });

    if (!agent || !agent.escrowBalance) {
      throw new Error(`Agent escrow not found: ${walletAddress}`);
    }

    const submissionFee = BigInt(500000);

    if (agent.escrowBalance.balance < submissionFee) {
      throw new Error(
        `Insufficient escrow balance. Required: ${submissionFee}, Available: ${agent.escrowBalance.balance}`
      );
    }

    await prisma.agentEscrow.update({
      where: { agentIdentityId: agent.id },
      data: {
        balance: { decrement: submissionFee },
        totalDeducted: { increment: submissionFee },
      },
    });

    await prisma.escrowTransaction.create({
      data: {
        agentEscrowId: agent.escrowBalance.id,
        transactionType: 'SUBMISSION_FEE',
        amount: submissionFee,
        findingId,
      },
    });

    return this.getEscrowBalance(walletAddress);
  }

  async deductSubmissionFeeOnChain(walletAddress: string, findingId: string) {
    if (!this.signer || !this.escrowAddress) {
      throw new Error('Signer or escrow address not configured');
    }

    const contract = new ethers.Contract(
      this.escrowAddress,
      PLATFORM_ESCROW_ABI,
      this.signer
    );

    const tx = await contract.deductSubmissionFee(walletAddress, findingId);
    await tx.wait();

    return this.deductSubmissionFee(walletAddress, findingId);
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

  async getEscrowBalanceOnChain(walletAddress: string): Promise<bigint> {
    if (!this.escrowAddress) return BigInt(0);

    try {
      const contract = new ethers.Contract(
        this.escrowAddress,
        PLATFORM_ESCROW_ABI,
        this.provider
      );
      const balance = await contract.getEscrowBalance(walletAddress);
      return BigInt(balance.toString());
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
    if (!this.escrowAddress) return BigInt(500000);

    try {
      const contract = new ethers.Contract(
        this.escrowAddress,
        PLATFORM_ESCROW_ABI,
        this.provider
      );
      const fee = await contract.submissionFee();
      return BigInt(fee.toString());
    } catch {
      return BigInt(500000);
    }
  }

  async getProtocolRegistrationFee(): Promise<bigint> {
    if (!this.escrowAddress) return BigInt(1000000);

    try {
      const contract = new ethers.Contract(
        this.escrowAddress,
        PLATFORM_ESCROW_ABI,
        this.provider
      );
      const fee = await contract.protocolRegistrationFee();
      return BigInt(fee.toString());
    } catch {
      return BigInt(1000000);
    }
  }
}

export const escrowService = new EscrowService();
