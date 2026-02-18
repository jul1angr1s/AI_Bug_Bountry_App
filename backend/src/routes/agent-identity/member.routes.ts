import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  agentIdentityService,
  DepositEscrowSchema,
  escrowService,
  log,
  prisma,
  QualificationSchema,
  reputationService,
  serializeBigInts,
} from './shared.js';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentById(req.params.id);

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

router.get('/:id/reputation', async (req: Request, res: Response) => {
  try {
    const reputation = await reputationService.getReputationById(req.params.id);

    if (!reputation) {
      return res.status(404).json({ success: false, error: 'Reputation not found' });
    }

    res.json({ success: true, data: serializeBigInts(reputation) });
  } catch (error) {
    log.error('Get reputation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reputation',
    });
  }
});

router.get('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const feedbacks = await reputationService.getFeedbackHistory(agent.walletAddress);
    res.json({ success: true, data: serializeBigInts(feedbacks) });
  } catch (error) {
    log.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feedback',
    });
  }
});

router.get('/:id/escrow', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
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

router.post('/:id/escrow/deposit', async (req: Request, res: Response) => {
  try {
    const { amount, txHash } = DepositEscrowSchema.parse(req.body);
    const agent = await agentIdentityService.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const escrowBalance = await escrowService.depositEscrow(agent.walletAddress, BigInt(amount), txHash);

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

router.get('/:id/escrow/transactions', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const transactions = await escrowService.getTransactionHistory(agent.walletAddress);
    res.json({
      success: true,
      data: transactions.map((tx) => ({ ...tx, amount: tx.amount.toString() })),
    });
  } catch (error) {
    log.error('Get escrow transactions error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get transactions',
    });
  }
});

router.get('/:id/x402-payments', async (req: Request, res: Response) => {
  try {
    const includeInternal = req.query.includeInternal === 'true';
    const agent = await agentIdentityService.getAgentById(req.params.id);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const payments = await prisma.x402PaymentRequest.findMany({
      where: {
        requesterAddress: agent.walletAddress.toLowerCase(),
        ...(includeInternal ? {} : { txHash: { not: null } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: payments.map((p) => ({ ...p, amount: p.amount.toString() })),
    });
  } catch (error) {
    log.error('Get agent x402 payments error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get x402 payments',
    });
  }
});

router.post('/:id/qualification', async (req: Request, res: Response) => {
  try {
    const { targetAgentId, feedbackType, direction, validationId, findingId, recordOnChain } =
      QualificationSchema.parse(req.body);

    const sourceAgent = await agentIdentityService.getAgentById(req.params.id);
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
      result = recordOnChain
        ? await reputationService.recordFeedbackOnChain(
            targetAgent.walletAddress,
            sourceAgent.walletAddress,
            validationId || `qual-${Date.now()}`,
            findingId || '',
            fbType
          )
        : await reputationService.recordFeedback(
            targetAgent.walletAddress,
            sourceAgent.walletAddress,
            validationId || `qual-${Date.now()}`,
            findingId || '',
            fbType
          );
    } else {
      result = recordOnChain
        ? await reputationService.recordValidatorFeedbackOnChain(
            sourceAgent.walletAddress,
            targetAgent.walletAddress,
            validationId || `qual-${Date.now()}`,
            findingId || '',
            fbType
          )
        : await reputationService.recordValidatorFeedback(
            sourceAgent.walletAddress,
            targetAgent.walletAddress,
            validationId || `qual-${Date.now()}`,
            findingId || '',
            fbType
          );
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

router.get('/:id/validator-reputation', async (req: Request, res: Response) => {
  try {
    const valRep = await reputationService.getValidatorReputation(req.params.id);
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

router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const agent = await agentIdentityService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    await agentIdentityService.deactivateAgent(agent.walletAddress);
    res.json({ success: true, message: 'Agent deactivated' });
  } catch (error) {
    log.error('Deactivate agent error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate agent',
    });
  }
});

export default router;
