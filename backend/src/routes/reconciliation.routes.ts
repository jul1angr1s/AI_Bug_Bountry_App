import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { validateRequest } from '../middleware/validation.js';
import {
  reconciliationReportQuerySchema,
  discrepanciesQuerySchema,
  resolveDiscrepancyParamSchema,
  resolveDiscrepancyBodySchema,
} from '../schemas/reconciliation.schema.js';
import { getReconciliationService } from '../services/reconciliation.service.js';

const router = Router();
const reconciliationService = getReconciliationService();

/**
 * Rate limiter for reconciliation endpoints
 * Admin-only endpoints with moderate limits: 50 req/min
 */
interface RateLimitOptions {
  points: number;
  duration: number;
}

function createReconciliationRateLimiter(options: RateLimitOptions) {
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
    const key = `reconciliation:${req.path}:${clientId}`;
    const now = Date.now();

    const limit = 50; // Admin rate limit: 50/min

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

const reconciliationRateLimit = createReconciliationRateLimiter({ points: 50, duration: 60 });

// ========================================
// Reconciliation Dashboard API (Tasks 11.1-11.6)
// ========================================

/**
 * GET /api/v1/reconciliation/report
 * Get reconciliation summary metrics
 * OpenSpec Task 11.1-11.3
 */
router.get(
  '/report',
  authenticate,
  requireAuth,
  requireAdmin,
  reconciliationRateLimit,
  validateRequest({ query: reconciliationReportQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { since } = req.query;

      // Parse since timestamp if provided
      const sinceDate = since ? new Date(since as string) : undefined;

      const report = await reconciliationService.getReconciliationReport(sinceDate);

      res.status(200).json({
        data: {
          totalPayments: report.totalPayments,
          reconciledCount: report.reconciledCount,
          pendingCount: report.pendingCount,
          discrepancyCount: report.discrepancyCount,
          lastReconciliation: report.lastReconciliation,
          reconciliationRate: report.reconciliationRate,
          discrepanciesByStatus: report.discrepanciesByStatus,
        },
      });
    } catch (error) {
      console.error('[ReconciliationRoutes] Error fetching reconciliation report:', error);
      const msg = error instanceof Error ? error.message : 'Failed to fetch reconciliation report';
      res.status(500).json({
        error: {
          code: 'RECONCILIATION_REPORT_ERROR',
          message: msg,
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * GET /api/v1/reconciliation/discrepancies
 * Get list of payment discrepancies with optional status filter
 * OpenSpec Task 11.4-11.5
 */
router.get(
  '/discrepancies',
  authenticate,
  requireAuth,
  requireAdmin,
  reconciliationRateLimit,
  validateRequest({ query: discrepanciesQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      const discrepancies = await reconciliationService.getDiscrepancies(
        status as string | undefined,
        'discoveredAt' // Sort by discoveredAt DESC per OpenSpec
      );

      res.status(200).json({
        data: discrepancies.map((d) => ({
          id: d.id,
          paymentId: d.paymentId,
          onChainBountyId: d.onChainBountyId,
          txHash: d.txHash,
          amount: d.amount,
          status: d.status,
          discoveredAt: d.discoveredAt,
          resolvedAt: d.resolvedAt,
          notes: d.notes,
        })),
      });
    } catch (error) {
      console.error('[ReconciliationRoutes] Error fetching discrepancies:', error);
      const msg = error instanceof Error ? error.message : 'Failed to fetch discrepancies';
      res.status(500).json({
        error: {
          code: 'DISCREPANCIES_ERROR',
          message: msg,
          requestId: req.id,
        },
      });
    }
  }
);

/**
 * POST /api/v1/reconciliation/resolve/:id
 * Manually resolve a payment discrepancy
 * OpenSpec Task 11.6
 */
router.post(
  '/resolve/:id',
  authenticate,
  requireAuth,
  requireAdmin,
  reconciliationRateLimit,
  validateRequest({
    params: resolveDiscrepancyParamSchema,
    body: resolveDiscrepancyBodySchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      await reconciliationService.resolveDiscrepancy(id, notes);

      res.status(200).json({
        data: {
          id,
          status: 'RESOLVED',
          notes,
          resolvedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[ReconciliationRoutes] Error resolving discrepancy:', error);
      const msg = error instanceof Error ? error.message : 'Failed to resolve discrepancy';

      // Handle specific error cases per OpenSpec
      if (msg === 'Discrepancy not found') {
        return res.status(404).json({
          error: {
            code: 'DISCREPANCY_NOT_FOUND',
            message: 'Discrepancy not found',
            requestId: req.id,
          },
        });
      }

      if (msg === 'Discrepancy already resolved') {
        return res.status(409).json({
          error: {
            code: 'DISCREPANCY_ALREADY_RESOLVED',
            message: 'Discrepancy already resolved',
            requestId: req.id,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'RESOLVE_DISCREPANCY_ERROR',
          message: msg,
          requestId: req.id,
        },
      });
    }
  }
);

export default router;
