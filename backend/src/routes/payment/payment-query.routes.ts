import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { createLogger } from '../../lib/logger.js';
import {
  paymentListQuerySchema,
  researcherAddressSchema,
  researcherEarningsQuerySchema,
} from '../../schemas/payment.schema.js';
import { getPaymentList, getResearcherEarnings } from '../../services/payment.service.js';
import { createPaymentRateLimiter } from './common.js';

const log = createLogger('PaymentQueryRoutes');
const router = Router();
const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });

router.get('/', requireAuth, paymentRateLimit, validateRequest({ query: paymentListQuerySchema }), async (req: Request, res: Response) => {
  try {
    const result = await getPaymentList(req.query);

    if (!result.success) {
      return res.status(500).json({
        error: {
          code: 'PAYMENT_LIST_ERROR',
          message: result.error?.message || 'Failed to fetch payment list',
          requestId: req.id,
        },
      });
    }

    res.status(200).json({ payments: result.payments, pagination: result.pagination });
  } catch (error) {
    log.error({ err: error }, 'Error fetching payment list');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

router.get('/researcher/:address', requireAuth, paymentRateLimit, validateRequest({ params: researcherAddressSchema, query: researcherEarningsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const result = await getResearcherEarnings(req.params.address, req.query);

    if (!result.success) {
      return res.status(500).json({
        error: {
          code: 'RESEARCHER_EARNINGS_ERROR',
          message: result.error?.message || 'Failed to fetch researcher earnings',
          requestId: req.id,
        },
      });
    }

    res.status(200).json({ data: result.data });
  } catch (error) {
    log.error({ err: error }, 'Error fetching researcher earnings');
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
