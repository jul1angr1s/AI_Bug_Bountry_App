import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  usdcAllowanceQuerySchema,
  usdcBalanceQuerySchema,
  usdcApprovalSchema,
  paymentListQuerySchema,
  paymentIdSchema,
  researcherAddressSchema,
  researcherEarningsQuerySchema,
  paymentStatsQuerySchema,
  leaderboardQuerySchema,
  protocolIdParamSchema,
  proposePaymentSchema,
} from '../schemas/payment.schema.js';
import {
  getUsdcAllowance,
  getUsdcBalance,
  generateApprovalTransaction,
  getPaymentList,
  getPaymentById as getPaymentDetails,
  getResearcherEarnings,
  getPaymentStats as fetchPaymentStats,
  getEarningsLeaderboard,
  getPoolStatus,
  proposeManualPayment,
} from '../services/payment.service.js';
import { getCache, setCache, CACHE_TTL } from '../lib/cache.js';

const router = Router();

/**
 * Rate limiters for payment endpoints
 * Per OpenSpec: 100 req/min unauthenticated, 500 req/min authenticated
 */
interface RateLimitOptions {
  points: number;
  duration: number;
}

function createPaymentRateLimiter(options: RateLimitOptions) {
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: Function): void => {
    const clientId = req.user?.id || req.ip || 'unknown';
    const key = `payment:${req.path}:${clientId}`;
    const now = Date.now();

    // Determine rate limit based on authentication
    const limit = req.user ? 500 : 100; // Authenticated: 500/min, Unauthenticated: 100/min

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + options.duration * 1000,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const resetTime = Math.ceil(entry.resetTime / 1000);

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());
      res.status(429).json({
        error: {
          code: 'RateLimitExceeded',
          message: `Rate limit exceeded. Try again after ${Math.ceil((entry.resetTime - now) / 1000)} seconds.`,
          requestId: req.id,
        },
      });
      return;
    }

    next();
  };
}

const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });
const leaderboardRateLimit = createPaymentRateLimiter({ points: 20, duration: 60 });

// ========================================
// USDC Endpoints (Tasks 8.2-8.4)
// ========================================

/**
 * GET /api/v1/payments/usdc/allowance
 * Check USDC allowance for owner and spender
 */
router.get(
  '/usdc/allowance',
  requireAuth,
  paymentRateLimit,
  validateRequest({ query: usdcAllowanceQuerySchema }),
  async (req: Request, res: Response) => {
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
      console.error('[PaymentRoutes] Error getting USDC allowance:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * GET /api/v1/payments/usdc/balance
 * Check USDC balance for address
 */
router.get(
  '/usdc/balance',
  requireAuth,
  paymentRateLimit,
  validateRequest({ query: usdcBalanceQuerySchema }),
  async (req: Request, res: Response) => {
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
      console.error('[PaymentRoutes] Error getting USDC balance:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * POST /api/v1/payments/approve
 * Generate unsigned USDC approval transaction for frontend wallet signing
 */
router.post(
  '/approve',
  requireAuth,
  paymentRateLimit,
  validateRequest({ body: usdcApprovalSchema }),
  async (req: Request, res: Response) => {
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

      res.status(200).json({
        data: result.transaction,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error generating approval transaction:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// ========================================
// Payment List/Details Endpoints (Tasks 8.5-8.7)
// ========================================

/**
 * GET /api/v1/payments
 * Get paginated payment list with filters
 */
router.get(
  '/',
  requireAuth,
  paymentRateLimit,
  validateRequest({ query: paymentListQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const filters = req.query;

      const result = await getPaymentList(filters);

      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'PAYMENT_LIST_ERROR',
            message: result.error?.message || 'Failed to fetch payment list',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        payments: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error fetching payment list:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * GET /api/v1/payments/researcher/:address
 * Get researcher earnings and payment history
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get(
  '/researcher/:address',
  requireAuth,
  paymentRateLimit,
  validateRequest({
    params: researcherAddressSchema,
    query: researcherEarningsQuerySchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const filters = req.query;

      const result = await getResearcherEarnings(address, filters);

      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'RESEARCHER_EARNINGS_ERROR',
            message: result.error?.message || 'Failed to fetch researcher earnings',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        data: result.data,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error fetching researcher earnings:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// ========================================
// Analytics Endpoints (Tasks 8.8-8.10)
// ========================================

/**
 * GET /api/v1/payments/stats
 * Get payment statistics with caching (60s TTL)
 */
router.get(
  '/stats',
  requireAuth,
  paymentRateLimit,
  validateRequest({ query: paymentStatsQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const filters = req.query;

      // Check cache
      const cacheKey = `payment:stats:${filters.protocolId || 'all'}:${filters.groupBy}:${filters.days}`;
      const cached = await getCache<any>(cacheKey);

      if (cached) {
        return res.status(200).json({
          data: cached,
          cached: true,
        });
      }

      const stats = await fetchPaymentStats(filters);

      // Cache result for 60 seconds
      await setCache(cacheKey, stats, CACHE_TTL.STATS * 2);

      res.status(200).json({
        data: stats,
        cached: false,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error fetching payment stats:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * GET /api/v1/payments/leaderboard
 * Get earnings leaderboard with caching (60s TTL)
 */
router.get(
  '/leaderboard',
  requireAuth,
  leaderboardRateLimit,
  validateRequest({ query: leaderboardQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const filters = req.query;

      // Check cache
      const cacheKey = `payment:leaderboard:${filters.limit}:${filters.startDate || 'all'}:${filters.endDate || 'all'}`;
      const cached = await getCache<any>(cacheKey);

      if (cached) {
        return res.status(200).json({
          data: cached,
          cached: true,
        });
      }

      const result = await getEarningsLeaderboard(filters);

      if (!result.success) {
        return res.status(500).json({
          error: {
            code: 'LEADERBOARD_ERROR',
            message: result.error?.message || 'Failed to fetch leaderboard',
            requestId: req.id,
          },
        });
      }

      // Cache result for 60 seconds
      await setCache(cacheKey, result.leaderboard, CACHE_TTL.STATS * 2);

      res.status(200).json({
        data: result.leaderboard,
        cached: false,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error fetching leaderboard:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * GET /api/v1/payments/pool/:protocolId
 * Get bounty pool status for protocol
 */
router.get(
  '/pool/:protocolId',
  requireAuth,
  paymentRateLimit,
  validateRequest({ params: protocolIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { protocolId } = req.params;

      const result = await getPoolStatus(protocolId);

      if (!result.success) {
        const statusCode = result.error?.code === 'PROTOCOL_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json({
          error: {
            code: result.error?.code || 'POOL_STATUS_ERROR',
            message: result.error?.message || 'Failed to fetch pool status',
            requestId: req.id,
          },
        });
      }

      res.status(200).json({
        data: result.poolStatus,
      });
    } catch (error) {
      console.error('[PaymentRoutes] Error fetching pool status:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// ========================================
// Payment Proposal Endpoint
// ========================================

/**
 * POST /api/v1/payments/propose
 * Propose manual payment (admin only)
 * Note: Currently simplified - in production this would check admin role
 */
router.post(
  '/propose',
  requireAuth,
  paymentRateLimit,
  validateRequest({ body: proposePaymentSchema }),
  async (req: Request, res: Response) => {
    try {
      const { protocolId, recipientAddress, severity, justification } = req.body;
      
      // TODO: Add admin role check here
      // For now, any authenticated user can propose
      // if (!req.user?.role || req.user.role !== 'ADMIN') {
      //   return res.status(403).json({
      //     error: {
      //       code: 'FORBIDDEN',
      //       message: 'Only admins can propose manual payments',
      //       requestId: req.id,
      //     },
      //   });
      // }

      const proposedBy = req.user?.id || 'unknown';

      const result = await proposeManualPayment({
        protocolId,
        recipientAddress,
        severity,
        justification,
        proposedBy,
      });

      if (!result.success) {
        const statusCode = result.error?.code === 'PROTOCOL_NOT_FOUND' ? 404 :
                          result.error?.code === 'INSUFFICIENT_BALANCE' ? 400 : 500;
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
      console.error('[PaymentRoutes] Error proposing payment:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }
  }
);

// ========================================
// Payment by ID (MUST BE LAST to avoid route conflicts)
// ========================================

/**
 * GET /api/v1/payments/:id
 * Get payment details by ID
 * NOTE: This route MUST be defined last to avoid catching /stats, /leaderboard, etc.
 */
router.get(
  '/:id',
  requireAuth,
  paymentRateLimit,
  validateRequest({ params: paymentIdSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const payment = await getPaymentDetails(id);

      res.status(200).json({
        data: payment,
      });
    } catch (error: any) {
      console.error('[PaymentRoutes] Error fetching payment:', error);

      const statusCode = error.name === 'NotFoundError' ? 404 : 500;

      res.status(statusCode).json({
        error: {
          code: error.name === 'NotFoundError' ? 'PAYMENT_NOT_FOUND' : 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch payment',
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
