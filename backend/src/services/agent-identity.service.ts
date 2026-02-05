import { PrismaClient, AgentIdentityType } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const AGENT_IDENTITY_REGISTRY_ABI = [
  'function selfRegister(uint8 agentType) external returns (uint256 agentId)',
  'function registerAgent(address wallet, uint8 agentType) external returns (uint256 agentId)',
  'function getAgent(uint256 agentId) external view returns (tuple(uint256 agentId, address wallet, uint8 agentType, uint256 registeredAt, bool active))',
  'function getAgentByWallet(address wallet) external view returns (tuple(uint256 agentId, address wallet, uint8 agentType, uint256 registeredAt, bool active))',
  'function isRegistered(address wallet) external view returns (bool)',
  'function isActive(uint256 agentId) external view returns (bool)',
  'event AgentRegistered(uint256 indexed agentId, address indexed wallet, uint8 agentType, uint256 registeredAt)',
];

export class AgentIdentityService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private registryAddress: string;

  constructor() {
    this.registryAddress = process.env.AGENT_IDENTITY_REGISTRY_ADDRESS || '';

    this.provider = new ethers.JsonRpcProvider(
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
    );

    const privateKey = process.env.PLATFORM_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      this.signer = new ethers.Wallet(formattedKey, this.provider);
    }
  }

  async registerAgent(walletAddress: string, agentType: AgentIdentityType) {
    const existing = await prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (existing) {
      throw new Error(`Agent already registered with wallet ${walletAddress}`);
    }

    const agentIdentity = await prisma.agentIdentity.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        agentType,
        isActive: true,
      },
    });

    await prisma.agentReputation.create({
      data: {
        agentIdentityId: agentIdentity.id,
        confirmedCount: 0,
        rejectedCount: 0,
        totalSubmissions: 0,
        reputationScore: 0,
      },
    });

    await prisma.agentEscrow.create({
      data: {
        agentIdentityId: agentIdentity.id,
        balance: BigInt(0),
        totalDeposited: BigInt(0),
        totalDeducted: BigInt(0),
      },
    });

    return agentIdentity;
  }

  async registerAgentOnChain(walletAddress: string, agentType: AgentIdentityType) {
    if (!this.signer || !this.registryAddress) {
      throw new Error('Signer or registry address not configured');
    }

    const agentTypeNum = agentType === 'RESEARCHER' ? 0 : 1;

    const contract = new ethers.Contract(
      this.registryAddress,
      AGENT_IDENTITY_REGISTRY_ABI,
      this.signer
    );

    const tx = await contract.registerAgent(walletAddress, agentTypeNum);
    const receipt = await tx.wait();

    let agentNftId: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'AgentRegistered') {
          agentNftId = parsed.args.agentId;
          break;
        }
      } catch {
        // Skip logs that don't match
      }
    }

    const agentIdentity = await prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: {
        agentNftId,
        onChainTxHash: tx.hash,
      },
    });

    return { agentIdentity, txHash: tx.hash, agentNftId };
  }

  async getAgentByWallet(walletAddress: string) {
    return prisma.agentIdentity.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        reputation: true,
        escrowBalance: true,
      },
    });
  }

  async getAgentById(id: string) {
    return prisma.agentIdentity.findUnique({
      where: { id },
      include: {
        reputation: true,
        escrowBalance: true,
      },
    });
  }

  async isRegisteredOnChain(walletAddress: string): Promise<boolean> {
    if (!this.registryAddress) return false;

    try {
      const contract = new ethers.Contract(
        this.registryAddress,
        AGENT_IDENTITY_REGISTRY_ABI,
        this.provider
      );
      return await contract.isRegistered(walletAddress);
    } catch {
      return false;
    }
  }

  async getAgentsByType(agentType: AgentIdentityType) {
    return prisma.agentIdentity.findMany({
      where: { agentType, isActive: true },
      include: {
        reputation: true,
      },
      orderBy: {
        reputation: {
          reputationScore: 'desc',
        },
      },
    });
  }

  async getLeaderboard(limit = 10) {
    return prisma.agentIdentity.findMany({
      where: {
        agentType: 'RESEARCHER',
        isActive: true,
        reputation: {
          totalSubmissions: { gt: 0 },
        },
      },
      include: {
        reputation: true,
      },
      orderBy: {
        reputation: {
          reputationScore: 'desc',
        },
      },
      take: limit,
    });
  }

  async deactivateAgent(walletAddress: string) {
    return prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { isActive: false },
    });
  }

  async reactivateAgent(walletAddress: string) {
    return prisma.agentIdentity.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: { isActive: true },
    });
  }
}

export const agentIdentityService = new AgentIdentityService();
