import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { createLogger } from '../../lib/logger.js';
import { proposePaymentSchema } from '../../schemas/payment.schema.js';
import { proposeManualPayment } from '../../services/payment.service.js';
import { createPaymentRateLimiter } from './common.js';

const log = createLogger('PaymentProposalRoutes');
const router = Router();
const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });

router.post('/propose', requireAuth, paymentRateLimit, validateRequest({ body: proposePaymentSchema }), async (req: Request, res: Response) => {
  try {
    const { protocolId, recipientAddress, severity, justification } = req.body;
    const proposedBy = req.user?.id || 'unknown';

    const result = await proposeManualPayment({
      protocolId,
      recipientAddress,
      severity,
      justification,
      proposedBy,
    });

    if (!result.success) {
      const statusCode = result.error?.code === 'PROTOCOL_NOT_FOUND' ? 404
        : result.error?.code === 'INSUFFICIENT_BALANCE' ? 400
          : 500;

      return res.status(statusCode).json({
        error: {
          code: result.error?.code || 'PROPOSAL_ERROR',
          message: result.error?.message || 'Failed to create payment proposal',
          requestId: req.id,
        },
      });
    }

    res.status(201).json({
      data: result.proposal,
      message: 'Payment proposal submitted successfully',
    });
  } catch (error) {
    log.error({ err: error }, 'Error proposing payment');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

export default router;
