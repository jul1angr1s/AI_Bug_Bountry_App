import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { agentIdentityService } from '../services/agent-identity.service.js';
import { reputationService } from '../services/reputation.service.js';
import { escrowService } from '../services/escrow.service.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('AgentIdentityRoutes');

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

function normalizeWallet(walletAddress: string): string {
  return walletAddress.toLowerCase();
}

const DepositEscrowSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  txHash: z.string().optional(),
});

// =============================================
// SVG Generation Helpers
// =============================================

function generateAgentSvg(
  tokenId: number,
  agentType: 'RESEARCHER' | 'VALIDATOR',
  walletAddress: string,
  reputationScore: number,
) {
  const isResearcher = agentType === 'RESEARCHER';
  const accentColor = isResearcher ? '#3b82f6' : '#8b5cf6';
  const accentGlow = isResearcher ? '#3b82f680' : '#8b5cf680';
  const typeLabel = isResearcher ? 'RESEARCHER' : 'VALIDATOR';
  const truncWallet = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  // Reputation arc: full circle = 283 (circumference of r=45), score maps 0-100
  const circumference = 283;
  const arcOffset = circumference - (reputationScore / 100) * circumference;

  // Distinct agent type icons
  const icon = isResearcher
    // Shield icon for researcher
    ? `<path d="M200 105 L200 105" fill="none"/>
       <path d="M200 90 C210 90 225 95 230 100 L230 120 C230 140 218 155 200 162 C182 155 170 140 170 120 L170 100 C175 95 190 90 200 90Z" fill="none" stroke="${accentColor}" stroke-width="2.5"/>
       <path d="M190 125 L197 132 L212 117" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    // Checkmark-circle icon for validator
    : `<circle cx="200" cy="126" r="22" fill="none" stroke="${accentColor}" stroke-width="2.5"/>
       <path d="M190 126 L197 133 L212 118" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg-${tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="50%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="glow-${tokenId}" cx="50%" cy="35%" r="40%">
      <stop offset="0%" stop-color="${accentGlow}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <pattern id="grid-${tokenId}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.4"/>
    </pattern>
  </defs>

  <!-- Background layers -->
  <rect width="400" height="400" fill="url(#bg-${tokenId})" rx="16"/>
  <rect width="400" height="400" fill="url(#grid-${tokenId})" rx="16"/>
  <rect width="400" height="400" fill="url(#glow-${tokenId})" rx="16"/>

  <!-- Border -->
  <rect x="8" y="8" width="384" height="384" rx="12" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>
  <rect x="12" y="12" width="376" height="376" rx="10" fill="none" stroke="${accentColor}" stroke-width="0.5" opacity="0.15"/>

  <!-- Token ID badge (top-left) -->
  <rect x="24" y="24" width="72" height="28" rx="14" fill="${accentColor}" opacity="0.15"/>
  <text x="60" y="43" text-anchor="middle" fill="${accentColor}" font-family="monospace" font-size="13" font-weight="bold">#${tokenId}</text>

  <!-- Agent type icon (center) -->
  <circle cx="200" cy="126" r="42" fill="${accentColor}" opacity="0.08"/>
  ${icon}

  <!-- Agent type label -->
  <rect x="145" y="178" width="110" height="24" rx="12" fill="${accentColor}" opacity="0.12"/>
  <text x="200" y="195" text-anchor="middle" fill="${accentColor}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">${typeLabel}</text>

  <!-- Name -->
  <text x="200" y="232" text-anchor="middle" fill="white" font-family="monospace" font-size="20" font-weight="bold">BBAGENT #${tokenId}</text>

  <!-- Wallet address -->
  <text x="200" y="258" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">${truncWallet}</text>

  <!-- Reputation meter -->
  <circle cx="200" cy="310" r="45" fill="none" stroke="#1e293b" stroke-width="5"/>
  <circle cx="200" cy="310" r="45" fill="none" stroke="${accentColor}" stroke-width="5"
    stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}"
    stroke-linecap="round" transform="rotate(-90 200 310)" opacity="0.8"/>
  <text x="200" y="306" text-anchor="middle" fill="white" font-family="monospace" font-size="18" font-weight="bold">${reputationScore}</text>
  <text x="200" y="322" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9">REPUTATION</text>

  <!-- Branding -->
  <text x="200" y="385" text-anchor="middle" fill="#334155" font-family="monospace" font-size="9" letter-spacing="2">THUNDER SECURITY</text>
</svg>`;
}

function generateUnregisteredSvg(tokenId: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="ubg-${tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <pattern id="ugrid-${tokenId}" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>

  <rect width="400" height="400" fill="url(#ubg-${tokenId})" rx="16"/>
  <rect width="400" height="400" fill="url(#ugrid-${tokenId})" rx="16"/>
  <rect x="8" y="8" width="384" height="384" rx="12" fill="none" stroke="#475569" stroke-width="1" opacity="0.3"/>

  <!-- Token ID -->
  <rect x="24" y="24" width="72" height="28" rx="14" fill="#475569" opacity="0.15"/>
  <text x="60" y="43" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="13" font-weight="bold">#${tokenId}</text>

  <!-- Placeholder icon -->
  <circle cx="200" cy="140" r="36" fill="#475569" opacity="0.1"/>
  <circle cx="200" cy="140" r="36" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
  <text x="200" y="147" text-anchor="middle" fill="#475569" font-family="monospace" font-size="28">?</text>

  <!-- Title -->
  <text x="200" y="215" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="18" font-weight="bold">BBAGENT #${tokenId}</text>
  <text x="200" y="242" text-anchor="middle" fill="#475569" font-family="monospace" font-size="12">Unregistered Agent</text>

  <!-- Info text -->
  <text x="200" y="290" text-anchor="middle" fill="#334155" font-family="monospace" font-size="10">This token has been minted but</text>
  <text x="200" y="305" text-anchor="middle" fill="#334155" font-family="monospace" font-size="10">not yet linked to an agent profile.</text>

  <!-- Branding -->
  <text x="200" y="385" text-anchor="middle" fill="#334155" font-family="monospace" font-size="9" letter-spacing="2">THUNDER SECURITY</text>
</svg>`;
}

// =============================================
// STATIC ROUTES (must be before /:id param)
// =============================================

// GET /api/v1/agent-identities/metadata/:tokenId - ERC-721 metadata (public, no auth)
router.get('/metadata/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);
    if (isNaN(tokenId) || tokenId < 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const agent = await prisma.agentIdentity.findFirst({
      where: { agentNftId: BigInt(tokenId) },
      include: { reputation: true },
    });

    // Fallback metadata for minted tokens not yet linked to a DB agent
    if (!agent) {
      const fallbackSvg = generateUnregisteredSvg(tokenId);
      const svgBase64 = Buffer.from(fallbackSvg).toString('base64');

      const metadata = {
        name: `BugBounty Agent #${tokenId}`,
        description: 'Unregistered agent on the Thunder Security Bug Bounty Platform. This soulbound NFT (ERC-8004) has been minted but not yet linked to an agent profile.',
        image: `data:image/svg+xml;base64,${svgBase64}`,
        external_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/agents`,
        attributes: [
          { trait_type: 'Agent Type', value: 'Unregistered' },
          { trait_type: 'Active', value: 'No' },
        ],
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(metadata);
    }

    const agentTypeLabel = agent.agentType === 'RESEARCHER' ? 'Security Researcher' : 'Validation Agent';
    const reputationScore = agent.reputation?.reputationScore ?? 0;
    const svg = generateAgentSvg(tokenId, agent.agentType as 'RESEARCHER' | 'VALIDATOR', agent.walletAddress, reputationScore);
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
        { trait_type: 'Reputation Score', display_type: 'number', value: reputationScore },
        { trait_type: 'Active', value: agent.isActive ? 'Yes' : 'No' },
      ],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(metadata);
  } catch (error) {
    log.error('Metadata endpoint error:', error);
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
    log.error('List agents error:', error);
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
    const normalizedWallet = normalizeWallet(walletAddress);

    const existing = await prisma.agentIdentity.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (!registerOnChain) {
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Agent already registered with wallet ${walletAddress}`,
        });
      }

      const agentIdentity = await agentIdentityService.registerAgent(walletAddress, agentType);
      return res.status(201).json({
        success: true,
        data: serializeBigInts({
          agentIdentity,
          onChain: null,
        }),
      });
    }

    // Strict on-chain flow (works for new wallet, existing DB-only, and already-on-chain wallets)
    try {
      await agentIdentityService.ensureAgentRegisteredOnChain(walletAddress, agentType);

      const synced = await prisma.agentIdentity.findUnique({
        where: { walletAddress: normalizedWallet },
      });

      if (!synced?.agentNftId) {
        throw new Error('On-chain registration completed but agent NFT was not persisted');
      }

      // txHash may be missing if agent was already minted previously; still treat as successful sync.
      const statusCode = existing ? 200 : 201;
      return res.status(statusCode).json({
        success: true,
        data: serializeBigInts({
          agentIdentity: synced,
          onChain: {
            agentNftId: synced.agentNftId,
            txHash: synced.onChainTxHash || null,
          },
        }),
      });
    } catch (error) {
      log.error({ walletAddress, agentType, err: error }, 'On-chain registration failed');

      // Compensating action: remove DB-only agent created for strict on-chain flow.
      try {
        if (!existing) {
          await prisma.agentIdentity.delete({ where: { walletAddress: normalizedWallet } });
        }
      } catch (cleanupError) {
        log.error({ walletAddress, err: cleanupError }, 'Failed to cleanup DB-only agent after on-chain failure');
      }

      return res.status(502).json({
        success: false,
        error: 'On-chain registration failed',
        code: 'ONCHAIN_REGISTRATION_FAILED',
      });
    }
  } catch (error) {
    log.error({ err: error }, 'Agent registration error');
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
    log.error('Get x402 payments error:', error);
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
    log.error('Get leaderboard error:', error);
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
    log.error('Get agent error:', error);
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
    log.error('Get agents by type error:', error);
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
    log.error('Get agent error:', error);
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
    log.error('Get reputation error:', error);
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
    log.error('Get feedback error:', error);
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
    log.error('Get escrow balance error:', error);
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
    log.error('Deposit escrow error:', error);
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
    log.error('Get escrow transactions error:', error);
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
    log.error('Get agent x402 payments error:', error);
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
    log.error('Qualification error:', error);
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
    log.error('Get validator reputation error:', error);
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
    log.error('Deactivate agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate agent',
    });
  }
});

export default router;
