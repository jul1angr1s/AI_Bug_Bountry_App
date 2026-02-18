import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { createLogger } from '../../lib/logger.js';
import {
  paymentStatsQuerySchema,
  leaderboardQuerySchema,
  protocolIdParamSchema,
} from '../../schemas/payment.schema.js';
import {
  getPaymentStats as fetchPaymentStats,
  getEarningsLeaderboard,
  getPoolStatus,
} from '../../services/payment.service.js';
import { getCache, setCache, CACHE_TTL } from '../../lib/cache.js';
import { createPaymentRateLimiter } from './common.js';

const log = createLogger('PaymentAnalyticsRoutes');
const router = Router();
const paymentRateLimit = createPaymentRateLimiter({ points: 100, duration: 60 });
const leaderboardRateLimit = createPaymentRateLimiter({ points: 20, duration: 60 });

router.get('/stats', requireAuth, paymentRateLimit, validateRequest({ query: paymentStatsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const filters = req.query;
    const cacheKey = `payment:stats:${filters.protocolId || 'all'}:${filters.groupBy}:${filters.days}`;
    const cached = await getCache<any>(cacheKey);

    if (cached) {
      return res.status(200).json({ data: cached, cached: true });
    }

    const stats = await fetchPaymentStats(filters);
    await setCache(cacheKey, stats, CACHE_TTL.STATS * 2);

    res.status(200).json({ data: stats, cached: false });
  } catch (error) {
    log.error({ err: error }, 'Error fetching payment stats');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

router.get('/leaderboard', requireAuth, leaderboardRateLimit, validateRequest({ query: leaderboardQuerySchema }), async (req: Request, res: Response) => {
  try {
    const filters = req.query;
    const cacheKey = `payment:leaderboard:${filters.limit}:${filters.startDate || 'all'}:${filters.endDate || 'all'}`;
    const cached = await getCache<any>(cacheKey);

    if (cached) {
      return res.status(200).json({ data: cached, cached: true });
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

    await setCache(cacheKey, result.leaderboard, CACHE_TTL.STATS * 2);

    res.status(200).json({ data: result.leaderboard, cached: false });
  } catch (error) {
    log.error({ err: error }, 'Error fetching leaderboard');
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: req.id,
      },
    });
  }
});

router.get('/pool/:protocolId', requireAuth, paymentRateLimit, validateRequest({ params: protocolIdParamSchema }), async (req: Request, res: Response) => {
  try {
    const result = await getPoolStatus(req.params.protocolId);

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

    res.status(200).json({ data: result.poolStatus });
  } catch (error) {
    log.error({ err: error }, 'Error fetching pool status');
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
