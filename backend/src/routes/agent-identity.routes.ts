import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { agentIdentityService } from '../services/agent-identity.service.js';
import { reputationService } from '../services/reputation.service.js';
import { escrowService } from '../services/escrow.service.js';

const router = Router();

const RegisterAgentSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(['RESEARCHER', 'VALIDATOR']),
  registerOnChain: z.boolean().optional().default(false),
});

const DepositEscrowSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  txHash: z.string().optional(),
});

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
      data: {
        agentIdentity,
        onChain: onChainResult || null,
      },
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

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
      data: agent,
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agent',
    });
  }
});

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
      data: agent,
    });
  } catch (error) {
    console.error('Get agent error:', error);
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
      return res.status(400).json({
        success: false,
        error: 'Invalid agent type',
      });
    }

    const agents = await agentIdentityService.getAgentsByType(agentType);

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('Get agents by type error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get agents',
    });
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await agentIdentityService.getLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get leaderboard',
    });
  }
});

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
      data: reputation,
    });
  } catch (error) {
    console.error('Get reputation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reputation',
    });
  }
});

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
      data: feedbacks,
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feedback',
    });
  }
});

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
