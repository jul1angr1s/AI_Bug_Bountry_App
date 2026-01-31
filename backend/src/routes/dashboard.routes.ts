import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validateRequest } from '../middleware/validation.js';
import { dashboardRateLimits } from '../middleware/rate-limit.js';
import {
  getDashboardStats,
  getAgentStatus,
  getProtocolVulnerabilities,
} from '../services/dashboard.service.js';
import {
  statsQuerySchema,
  agentQuerySchema,
  protocolIdSchema,
  paginationSchema,
  sortSchema,
  vulnerabilityFilterSchema,
} from '../schemas/dashboard.schema.js';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache.js';
import type { Request, Response } from 'express';

const router = Router();

// GET /api/v1/stats - Dashboard statistics
router.get('/stats', requireAuth, dashboardRateLimits.stats, validateRequest({ query: statsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { protocolId } = req.query as { protocolId?: string };
    const userId = req.user?.id;

    const stats = await getDashboardStats(protocolId, userId);

    if (!stats) {
      return res.status(404).json({
        error: {
          code: 'STATS_UNAVAILABLE',
          message: 'Statistics not available',
          requestId: req.id,
        },
      });
    }

    const cacheKey = CACHE_KEYS.DASHBOARD_STATS(protocolId);
    const cached = await getCache(cacheKey);

    res.setHeader('Cache-Control', 'private, max-age=30');
    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
    
    res.json({ data: stats });
  } catch (error) {
    console.error('Error in stats endpoint:', error);
    res.status(503).json({
      error: {
        code: 'STATS_UNAVAILABLE',
        message: 'Unable to retrieve statistics',
        requestId: req.id,
      },
    });
  }
});

// GET /api/v1/agents - Agent status (admin only)
router.get('/agents', requireAuth, requireAdmin, dashboardRateLimits.agents, validateRequest({ query: agentQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { type } = req.query as { type?: 'PROTOCOL' | 'RESEARCHER' | 'VALIDATOR' };

    const agents = await getAgentStatus(type);

    const cacheKey = CACHE_KEYS.AGENT_STATUS;
    const cached = await getCache(cacheKey);

    res.setHeader('Cache-Control', 'private, max-age=10');
    res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
    
    res.json({ data: agents });
  } catch (error) {
    console.error('Error in agents endpoint:', error);
    res.status(503).json({
      error: {
        code: 'AGENT_UNREACHABLE',
        message: 'Unable to retrieve agent status',
        requestId: req.id,
      },
    });
  }
});

// GET /api/v1/protocols/:id - Protocol overview with dashboard fields
router.get('/protocols/:id', requireAuth, dashboardRateLimits.protocols, validateRequest({ params: protocolIdSchema }), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // This will be implemented when we create the protocol service
    // For now, return 501
    res.status(501).json({
      error: {
        code: 'NotImplemented',
        message: 'Protocol overview endpoint not yet implemented',
        requestId: req.id,
      },
    });
  } catch (error) {
    console.error('Error in protocol endpoint:', error);
    res.status(503).json({
      error: {
        code: 'STATS_UNAVAILABLE',
        message: 'Unable to retrieve protocol data',
        requestId: req.id,
      },
    });
  }
});

// GET /api/v1/protocols/:id/vulnerabilities - Vulnerability list with pagination
router.get(
  '/protocols/:id/vulnerabilities',
  requireAuth,
  dashboardRateLimits.vulnerabilities,
  validateRequest({
    params: protocolIdSchema,
    query: paginationSchema.merge(sortSchema).merge(vulnerabilityFilterSchema),
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page, limit, sort, severity, status } = req.query as {
        page: string;
        limit: string;
        sort: string;
        severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
        status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
      };

      const vulnerabilities = await getProtocolVulnerabilities(
        id,
        parseInt(page, 10),
        parseInt(limit, 10),
        sort,
        severity,
        status
      );

      if (!vulnerabilities) {
        return res.status(404).json({
          error: {
            code: 'PROTOCOL_NOT_FOUND',
            message: 'Protocol not found',
            requestId: req.id,
          },
        });
      }

      const cacheKey = CACHE_KEYS.PROTOCOL_VULNERABILITIES(
        id,
        parseInt(page, 10),
        parseInt(limit, 10),
        sort
      );
      const cached = await getCache(cacheKey);

      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
      
      res.json({ data: vulnerabilities });
    } catch (error) {
      console.error('Error in vulnerabilities endpoint:', error);
      res.status(503).json({
        error: {
          code: 'STATS_UNAVAILABLE',
          message: 'Unable to retrieve vulnerabilities',
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
