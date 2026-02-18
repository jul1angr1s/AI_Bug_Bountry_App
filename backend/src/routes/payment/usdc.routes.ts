import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { createLogger } from '../../lib/logger.js';
import {
  usdcAllowanceQuerySchema,
  usdcBalanceQuerySchema,
  usdcApprovalSchema,
} from '../../schemas/payment.schema.js';
import {
  getUsdcAllowance,
  getUsdcBalance,
  generateApprovalTransaction,
} from '../../services/payment.service.js';
import { createPaymentRateLimiter } from './common.js';

const log = createLogger('PaymentUsdCRoutes');
const router = Router();
const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });

router.get('/usdc/allowance', requireAuth, paymentRateLimit, validateRequest({ query: usdcAllowanceQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { owner, spender } = req.query;
    const result = await getUsdcAllowance(owner as string, spender as string);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'USDC_ALLOWANCE_ERROR',
          message: result.error?.message || 'Failed to get USDC allowance',
          requestId: req.id,
        },
      });
    }

    res.status(200).json({
      data: {
        owner,
        spender,
        allowance: result.allowance,
        allowanceFormatted: result.allowanceFormatted,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Error getting USDC allowance');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

router.get('/usdc/balance', requireAuth, paymentRateLimit, validateRequest({ query: usdcBalanceQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { address } = req.query;
    const result = await getUsdcBalance(address as string);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'USDC_BALANCE_ERROR',
          message: result.error?.message || 'Failed to get USDC balance',
          requestId: req.id,
        },
      });
    }

    res.status(200).json({
      data: {
        address,
        balance: result.balance,
        balanceFormatted: result.balanceFormatted,
      },
    });
  } catch (error) {
    log.error({ err: error }, 'Error getting USDC balance');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

router.post('/approve', requireAuth, paymentRateLimit, validateRequest({ body: usdcApprovalSchema }), async (req: Request, res: Response) => {
  try {
    const { amount, spender } = req.body;
    const result = await generateApprovalTransaction(amount, spender);

    if (!result.success) {
      const statusCode = result.error?.code === 'INVALID_BOUNTY_POOL' ? 400 : 500;
      return res.status(statusCode).json({
        error: {
          code: result.error?.code || 'APPROVAL_TX_ERROR',
          message: result.error?.message || 'Failed to generate approval transaction',
          requestId: req.id,
        },
      });
    }

    res.status(200).json({ data: result.transaction });
  } catch (error) {
    log.error({ err: error }, 'Error generating approval transaction');
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
