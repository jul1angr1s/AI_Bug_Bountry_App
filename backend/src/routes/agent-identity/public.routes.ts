import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  agentIdentityService,
  log,
  normalizeWallet,
  prisma,
  RegisterAgentSchema,
  serializeBigInts,
} from './shared.js';

const router = Router();

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
  const circumference = 283;
  const arcOffset = circumference - (reputationScore / 100) * circumference;

  const icon = isResearcher
    ? `<path d="M200 105 L200 105" fill="none"/>
       <path d="M200 90 C210 90 225 95 230 100 L230 120 C230 140 218 155 200 162 C182 155 170 140 170 120 L170 100 C175 95 190 90 200 90Z" fill="none" stroke="${accentColor}" stroke-width="2.5"/>
       <path d="M190 125 L197 132 L212 117" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
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

  <rect width="400" height="400" fill="url(#bg-${tokenId})" rx="16"/>
  <rect width="400" height="400" fill="url(#grid-${tokenId})" rx="16"/>
  <rect width="400" height="400" fill="url(#glow-${tokenId})" rx="16"/>
  <rect x="8" y="8" width="384" height="384" rx="12" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>
  <rect x="12" y="12" width="376" height="376" rx="10" fill="none" stroke="${accentColor}" stroke-width="0.5" opacity="0.15"/>
  <rect x="24" y="24" width="72" height="28" rx="14" fill="${accentColor}" opacity="0.15"/>
  <text x="60" y="43" text-anchor="middle" fill="${accentColor}" font-family="monospace" font-size="13" font-weight="bold">#${tokenId}</text>
  <circle cx="200" cy="126" r="42" fill="${accentColor}" opacity="0.08"/>
  ${icon}
  <rect x="145" y="178" width="110" height="24" rx="12" fill="${accentColor}" opacity="0.12"/>
  <text x="200" y="195" text-anchor="middle" fill="${accentColor}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="1.5">${typeLabel}</text>
  <text x="200" y="232" text-anchor="middle" fill="white" font-family="monospace" font-size="20" font-weight="bold">BBAGENT #${tokenId}</text>
  <text x="200" y="258" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11">${truncWallet}</text>
  <circle cx="200" cy="310" r="45" fill="none" stroke="#1e293b" stroke-width="5"/>
  <circle cx="200" cy="310" r="45" fill="none" stroke="${accentColor}" stroke-width="5" stroke-dasharray="${circumference}" stroke-dashoffset="${arcOffset}" stroke-linecap="round" transform="rotate(-90 200 310)" opacity="0.8"/>
  <text x="200" y="306" text-anchor="middle" fill="white" font-family="monospace" font-size="18" font-weight="bold">${reputationScore}</text>
  <text x="200" y="322" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="9">REPUTATION</text>
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
  <rect x="24" y="24" width="72" height="28" rx="14" fill="#475569" opacity="0.15"/>
  <text x="60" y="43" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="13" font-weight="bold">#${tokenId}</text>
  <circle cx="200" cy="140" r="36" fill="#475569" opacity="0.1"/>
  <circle cx="200" cy="140" r="36" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
  <text x="200" y="147" text-anchor="middle" fill="#475569" font-family="monospace" font-size="28">?</text>
  <text x="200" y="215" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="18" font-weight="bold">BBAGENT #${tokenId}</text>
  <text x="200" y="242" text-anchor="middle" fill="#475569" font-family="monospace" font-size="12">Unregistered Agent</text>
  <text x="200" y="290" text-anchor="middle" fill="#334155" font-family="monospace" font-size="10">This token has been minted but</text>
  <text x="200" y="305" text-anchor="middle" fill="#334155" font-family="monospace" font-size="10">not yet linked to an agent profile.</text>
  <text x="200" y="385" text-anchor="middle" fill="#334155" font-family="monospace" font-size="9" letter-spacing="2">THUNDER SECURITY</text>
</svg>`;
}

router.get('/metadata/:tokenId', async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    if (Number.isNaN(tokenId) || tokenId < 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const agent = await prisma.agentIdentity.findFirst({
      where: { agentNftId: BigInt(tokenId) },
      include: { reputation: true },
    });

    if (!agent) {
      const svgBase64 = Buffer.from(generateUnregisteredSvg(tokenId)).toString('base64');
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

router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await prisma.agentIdentity.findMany({
      include: { reputation: true },
      orderBy: { registeredAt: 'desc' },
    });

    res.json({ success: true, data: serializeBigInts(agents) });
  } catch (error) {
    log.error('List agents error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list agents',
    });
  }
});

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
        data: serializeBigInts({ agentIdentity, onChain: null }),
      });
    }

    try {
      await agentIdentityService.ensureAgentRegisteredOnChain(walletAddress, agentType);

      const synced = await prisma.agentIdentity.findUnique({ where: { walletAddress: normalizedWallet } });

      if (!synced?.agentNftId) {
        throw new Error('On-chain registration completed but agent NFT was not persisted');
      }

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

router.get('/x402-payments', async (req: Request, res: Response) => {
  try {
    const includeInternal = req.query.includeInternal === 'true';
    const payments = await prisma.x402PaymentRequest.findMany({
      where: includeInternal ? undefined : { txHash: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: payments.map((p) => ({ ...p, amount: p.amount.toString() })),
    });
  } catch (error) {
    log.error('Get x402 payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get x402 payments',
    });
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const leaderboard = await agentIdentityService.getLeaderboard(limit);
    res.json({ success: true, data: serializeBigInts(leaderboard) });
  } catch (error) {
    log.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get leaderboard',
    });
  }
});

router.get('/wallet/:walletAddress', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentByWallet(req.params.walletAddress);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: serializeBigInts(agent) });
  } catch (error) {
    log.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agent',
    });
  }
});

router.get('/type/:agentType', async (req: Request, res: Response) => {
  try {
    const agentType = req.params.agentType.toUpperCase() as 'RESEARCHER' | 'VALIDATOR';

    if (agentType !== 'RESEARCHER' && agentType !== 'VALIDATOR') {
      return res.status(400).json({ success: false, error: 'Invalid agent type' });
    }

    const agents = await agentIdentityService.getAgentsByType(agentType);
    res.json({ success: true, data: serializeBigInts(agents) });
  } catch (error) {
    log.error('Get agents by type error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agents',
    });
  }
});

export default router;
