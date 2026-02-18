import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { createLogger } from '../../lib/logger.js';
import { paymentIdSchema } from '../../schemas/payment.schema.js';
import { getPaymentById as getPaymentDetails } from '../../services/payment.service.js';
import { createPaymentRateLimiter } from './common.js';

const log = createLogger('PaymentDetailsRoutes');
const router = Router();
const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });

router.get('/:id', requireAuth, paymentRateLimit, validateRequest({ params: paymentIdSchema }), async (req: Request, res: Response) => {
  try {
    const payment = await getPaymentDetails(req.params.id);
    res.status(200).json({ data: payment });
  } catch (error) {
    log.error({ err: error }, 'Error fetching payment');

    const isNotFound = error instanceof Error && error.name === 'NotFoundError';
    const statusCode = isNotFound ? 404 : 500;
    const msg = error instanceof Error ? error.message : 'Failed to fetch payment';

    res.status(statusCode).json({
      error: {
        code: isNotFound ? 'PAYMENT_NOT_FOUND' : 'INTERNAL_ERROR',
        message: msg,
        requestId: req.id,
      },
    });
  }
});

export default router;
