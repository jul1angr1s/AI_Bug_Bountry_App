import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { agentIdentityService } from '../services/agent-identity.service.js';
import { reputationService } from '../services/reputation.service.js';
import { escrowService } from '../services/escrow.service.js';

const prisma = new PrismaClient();

const router = Router();

// Helper to convert BigInt values to strings for JSON serialization
function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

const RegisterAgentSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(['RESEARCHER', 'VALIDATOR']),
  registerOnChain: z.boolean().optional().default(false),
});

const DepositEscrowSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  txHash: z.string().optional(),
});

// =============================================
// STATIC ROUTES (must be before /:id param)
// =============================================

// GET /api/v1/agent-identities/metadata/:tokenId - ERC-721 metadata (public, no auth)
router.get('/metadata/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    if (isNaN(tokenId) || tokenId <= 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const agent = await prisma.agentIdentity.findFirst({
      where: { agentNftId: BigInt(tokenId) },
      include: { reputation: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const agentTypeLabel = agent.agentType === 'RESEARCHER' ? 'Security Researcher' : 'Validation Agent';
    const badgeColor = agent.agentType === 'RESEARCHER' ? '#3b82f6' : '#8b5cf6';
    const iconPath = agent.agentType === 'RESEARCHER'
      ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
      : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)" rx="20"/>
  <rect x="20" y="20" width="360" height="360" rx="12" fill="none" stroke="${badgeColor}" stroke-width="2" opacity="0.5"/>
  <circle cx="200" cy="120" r="50" fill="${badgeColor}" opacity="0.2"/>
  <svg x="176" y="96" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${badgeColor}" stroke-width="1.5">
    <path d="${iconPath}"/>
  </svg>
  <text x="200" y="210" text-anchor="middle" fill="white" font-family="monospace" font-size="18" font-weight="bold">BBAGENT #${tokenId}</text>
  <text x="200" y="240" text-anchor="middle" fill="${badgeColor}" font-family="monospace" font-size="14">${agentTypeLabel}</text>
  <text x="200" y="280" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">${agent.walletAddress.slice(0, 6)}...${agent.walletAddress.slice(-4)}</text>
  <text x="200" y="310" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">Score: ${agent.reputation?.reputationScore ?? 0}/100</text>
  <text x="200" y="370" text-anchor="middle" fill="#475569" font-family="monospace" font-size="9">Thunder Security Platform</text>
</svg>`;

    const svgBase64 = Buffer.from(svg).toString('base64');

    const metadata = {
      name: `BugBounty Agent #${tokenId}`,
      description: `${agentTypeLabel} on the Thunder Security Bug Bounty Platform. This soulbound NFT represents a verified agent identity (ERC-8004).`,
      image: `data:image/svg+xml;base64,${svgBase64}`,
      external_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/agents/${agent.id}`,
      attributes: [
        { trait_type: 'Agent Type', value: agent.agentType },
        { trait_type: 'Wallet', value: agent.walletAddress },
        { trait_type: 'Registration Date', value: agent.registeredAt.toISOString() },
        { trait_type: 'Reputation Score', display_type: 'number', value: agent.reputation?.reputationScore ?? 0 },
        { trait_type: 'Active', value: agent.isActive ? 'Yes' : 'No' },
      ],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(metadata);
  } catch (error) {
    console.error('Metadata endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// GET /api/v1/agent-identities - List all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agentIdentity.findMany({
      include: { reputation: true },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({
      success: true,
      data: serializeBigInts(agents),
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list agents',
    });
  }
});

// POST /api/v1/agent-identities/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { walletAddress, agentType, registerOnChain } = RegisterAgentSchema.parse(req.body);

    const agentIdentity = await agentIdentityService.registerAgent(walletAddress, agentType);

    let onChainResult;
    if (registerOnChain) {
      try {
        onChainResult = await agentIdentityService.registerAgentOnChain(walletAddress, agentType);
      } catch (error) {
        console.error('On-chain registration failed:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: serializeBigInts({
        agentIdentity,
        onChain: onChainResult || null,
      }),
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

// GET /api/v1/agent-identities/x402-payments - List all x.402 payment requests
router.get('/x402-payments', async (req: Request, res: Response) => {
  try {
    const payments = await prisma.x402PaymentRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: payments.map(p => ({
        ...p,
        amount: p.amount.toString(),
      })),
    });
  } catch (error) {
    console.error('Get x402 payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get x402 payments',
    });
  }
});

// GET /api/v1/agent-identities/leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await agentIdentityService.getLeaderboard(limit);

    res.json({
      success: true,
      data: serializeBigInts(leaderboard),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get leaderboard',
    });
  }
});

// GET /api/v1/agent-identities/wallet/:walletAddress
router.get('/wallet/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const agent = await agentIdentityService.getAgentByWallet(walletAddress);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: serializeBigInts(agent),
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agent',
    });
  }
});

// GET /api/v1/agent-identities/type/:agentType
router.get('/type/:agentType', async (req: Request, res: Response) => {
  try {
    const agentType = req.params.agentType.toUpperCase() as 'RESEARCHER' | 'VALIDATOR';

    if (agentType !== 'RESEARCHER' && agentType !== 'VALIDATOR') {
      return res.status(400).json({
        success: false,
        error: 'Invalid agent type',
      });
    }

    const agents = await agentIdentityService.getAgentsByType(agentType);

    res.json({
      success: true,
      data: serializeBigInts(agents),
    });
  } catch (error) {
    console.error('Get agents by type error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agents',
    });
  }
});

// =============================================
// PARAMETERIZED ROUTES (/:id and sub-routes)
// =============================================

// GET /api/v1/agent-identities/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      data: serializeBigInts(agent),
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agent',
    });
  }
});

// GET /api/v1/agent-identities/:id/reputation
router.get('/:id/reputation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reputation = await reputationService.getReputationById(id);

    if (!reputation) {
      return res.status(404).json({
        success: false,
        error: 'Reputation not found',
      });
    }

    res.json({
      success: true,
      data: serializeBigInts(reputation),
    });
  } catch (error) {
    console.error('Get reputation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reputation',
    });
  }
});

// GET /api/v1/agent-identities/:id/feedback
router.get('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const feedbacks = await reputationService.getFeedbackHistory(agent.walletAddress);

    res.json({
      success: true,
      data: serializeBigInts(feedbacks),
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feedback',
    });
  }
});

// GET /api/v1/agent-identities/:id/escrow
router.get('/:id/escrow', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const escrowBalance = await escrowService.getEscrowBalance(agent.walletAddress);

    res.json({
      success: true,
      data: {
        balance: escrowBalance.balance.toString(),
        totalDeposited: escrowBalance.totalDeposited.toString(),
        totalDeducted: escrowBalance.totalDeducted.toString(),
        remainingSubmissions: escrowBalance.remainingSubmissions,
        submissionFee: '500000',
      },
    });
  } catch (error) {
    console.error('Get escrow balance error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get escrow balance',
    });
  }
});

// POST /api/v1/agent-identities/:id/escrow/deposit
router.post('/:id/escrow/deposit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, txHash } = DepositEscrowSchema.parse(req.body);

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const escrowBalance = await escrowService.depositEscrow(
      agent.walletAddress,
      BigInt(amount),
      txHash
    );

    res.json({
      success: true,
      data: {
        balance: escrowBalance.balance.toString(),
        totalDeposited: escrowBalance.totalDeposited.toString(),
        remainingSubmissions: escrowBalance.remainingSubmissions,
      },
    });
  } catch (error) {
    console.error('Deposit escrow error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deposit',
    });
  }
});

// GET /api/v1/agent-identities/:id/escrow/transactions
router.get('/:id/escrow/transactions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const transactions = await escrowService.getTransactionHistory(agent.walletAddress);

    res.json({
      success: true,
      data: transactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
      })),
    });
  } catch (error) {
    console.error('Get escrow transactions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transactions',
    });
  }
});

// GET /api/v1/agent-identities/:id/x402-payments
router.get('/:id/x402-payments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const payments = await prisma.x402PaymentRequest.findMany({
      where: { requesterAddress: agent.walletAddress.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: payments.map(p => ({
        ...p,
        amount: p.amount.toString(),
      })),
    });
  } catch (error) {
    console.error('Get agent x402 payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get x402 payments',
    });
  }
});

// POST /api/v1/agent-identities/:id/qualification - Record mutual qualification
const QualificationSchema = z.object({
  targetAgentId: z.string().uuid(),
  feedbackType: z.enum([
    'CONFIRMED_CRITICAL',
    'CONFIRMED_HIGH',
    'CONFIRMED_MEDIUM',
    'CONFIRMED_LOW',
    'CONFIRMED_INFORMATIONAL',
    'REJECTED',
  ]),
  direction: z.enum(['VALIDATOR_RATES_RESEARCHER', 'RESEARCHER_RATES_VALIDATOR']),
  validationId: z.string().optional(),
  findingId: z.string().optional(),
  recordOnChain: z.boolean().optional().default(false),
});

router.post('/:id/qualification', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetAgentId, feedbackType, direction, validationId, findingId, recordOnChain } =
      QualificationSchema.parse(req.body);

    const sourceAgent = await agentIdentityService.getAgentById(id);
    if (!sourceAgent) {
      return res.status(404).json({ success: false, error: 'Source agent not found' });
    }

    const targetAgent = await agentIdentityService.getAgentById(targetAgentId);
    if (!targetAgent) {
      return res.status(404).json({ success: false, error: 'Target agent not found' });
    }

    let result;
    const fbType = feedbackType as any;

    if (direction === 'VALIDATOR_RATES_RESEARCHER') {
      if (recordOnChain) {
        result = await reputationService.recordFeedbackOnChain(
          targetAgent.walletAddress,
          sourceAgent.walletAddress,
          validationId || `qual-${Date.now()}`,
          findingId || '',
          fbType
        );
      } else {
        result = await reputationService.recordFeedback(
          targetAgent.walletAddress,
          sourceAgent.walletAddress,
          validationId || `qual-${Date.now()}`,
          findingId || '',
          fbType
        );
      }
    } else {
      if (recordOnChain) {
        result = await reputationService.recordValidatorFeedbackOnChain(
          sourceAgent.walletAddress,
          targetAgent.walletAddress,
          validationId || `qual-${Date.now()}`,
          findingId || '',
          fbType
        );
      } else {
        result = await reputationService.recordValidatorFeedback(
          sourceAgent.walletAddress,
          targetAgent.walletAddress,
          validationId || `qual-${Date.now()}`,
          findingId || '',
          fbType
        );
      }
    }

    res.json({ success: true, data: serializeBigInts(result) });
  } catch (error) {
    console.error('Qualification error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Qualification failed',
    });
  }
});

// GET /api/v1/agent-identities/:id/validator-reputation
router.get('/:id/validator-reputation', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const valRep = await reputationService.getValidatorReputation(id);
    if (!valRep) {
      return res.status(404).json({ success: false, error: 'Validator reputation not found' });
    }
    res.json({ success: true, data: valRep });
  } catch (error) {
    console.error('Get validator reputation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get validator reputation',
    });
  }
});

// POST /api/v1/agent-identities/:id/deactivate
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await agentIdentityService.getAgentById(id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    await agentIdentityService.deactivateAgent(agent.walletAddress);

    res.json({
      success: true,
      message: 'Agent deactivated',
    });
  } catch (error) {
    console.error('Deactivate agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate agent',
    });
  }
});

export default router;
