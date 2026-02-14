import { Router } from 'express';
import { getPrismaClient } from '../lib/prisma.js';
import { pingRedis } from '../lib/redis.js';
import { metricsCollector } from '../monitoring/metrics.js';
import { getEventListenerService } from '../services/event-listener.service.js';
import { getReconciliationService } from '../services/reconciliation.service.js';

const router = Router();

/**
 * Middleware to require admin API key for sensitive endpoints.
 * Set ADMIN_API_KEY env var and pass it via X-Admin-Key header.
 */
function requireAdminKey(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return next(); // No key configured — allow access (dev mode)
  }
  const provided = req.headers['x-admin-key'];
  if (provided !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Basic health check
 */
router.get('/health', async (_req, res) => {
  const prisma = getPrismaClient();
  let database = 'ok';
  let redis = 'ok';
  let eventListener = 'ok';
  let status = 'ok';

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = 'unreachable';
    status = 'degraded';
  }

  // Check Redis
  try {
    const redisHealthy = await pingRedis();
    if (!redisHealthy) {
      redis = 'unreachable';
      status = 'degraded';
    }
  } catch (error) {
    redis = 'unreachable';
    status = 'degraded';
  }

  // Check Event Listener Service
  try {
    const eventListenerService = getEventListenerService();
    const isHealthy = await eventListenerService.healthCheck();
    const stats = eventListenerService.getStats();

    if (!isHealthy || !stats.isConnected) {
      eventListener = 'disconnected';
      status = 'degraded';
    }
  } catch (error) {
    eventListener = 'error';
    status = 'degraded';
  }

  const payload = {
    status,
    timestamp: new Date().toISOString(),
    services: {
      database,
      redis,
      eventListener,
    },
  };

  res.status(status === 'ok' ? 200 : 503).json(payload);
});

/**
 * Detailed health check with memory and queue info
 */
router.get('/health/detailed', requireAdminKey, async (_req, res) => {
  const prisma = getPrismaClient();
  const checks: Record<string, { status: string; message?: string; usedMB?: number; totalMB?: number; percentUsed?: number }> = {
    server: { status: 'ok' },
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    memory: { status: 'ok' },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Check Redis
  try {
    const redisHealthy = await pingRedis();
    checks.redis = { status: redisHealthy ? 'ok' : 'error' };
  } catch (error) {
    checks.redis = {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  // Check memory
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = (memUsageMB / memLimitMB) * 100;

  checks.memory = {
    status: memPercent > 90 ? 'warning' : 'ok',
    usedMB: memUsageMB,
    totalMB: memLimitMB,
    percentUsed: Math.round(memPercent),
  };

  // Overall status
  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const hasWarning = Object.values(checks).some((c) => c.status === 'warning');
  const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

  res.status(hasError ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

/**
 * Application metrics
 */
router.get('/metrics', requireAdminKey, (_req, res) => {
  const metrics = metricsCollector.getAllMetrics();

  res.json({
    timestamp: new Date().toISOString(),
    metrics,
  });
});

/**
 * Detailed health check endpoint for all services
 * GET /api/v1/health/services
 *
 * Returns detailed status for:
 * - ValidationListener
 * - BountyListener
 * - PaymentWorker
 * - ReconciliationService
 */
router.get('/health/services', requireAdminKey, async (_req, res) => {
  const prisma = getPrismaClient();

  let validationListener = 'unknown';
  let bountyListener = 'unknown';
  let paymentWorker = 'unknown';
  let reconciliationService = 'unknown';
  let overallStatus = 'ok';

  // Check ValidationListener status via EventListenerState
  try {
    const validationState = await prisma.eventListenerState.findFirst({
      where: {
        eventName: 'ValidationRecorded',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (validationState) {
      const timeSinceUpdate = Date.now() - validationState.updatedAt.getTime();
      const tenMinutes = 10 * 60 * 1000;

      if (timeSinceUpdate < tenMinutes) {
        validationListener = 'active';
      } else {
        validationListener = 'stale';
        overallStatus = 'degraded';
      }
    } else {
      validationListener = 'not_started';
    }
  } catch (error) {
    validationListener = 'error';
    overallStatus = 'degraded';
  }

  // Check BountyListener status via EventListenerState
  try {
    const bountyState = await prisma.eventListenerState.findFirst({
      where: {
        eventName: 'BountyReleased',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (bountyState) {
      const timeSinceUpdate = Date.now() - bountyState.updatedAt.getTime();
      const tenMinutes = 10 * 60 * 1000;

      if (timeSinceUpdate < tenMinutes) {
        bountyListener = 'active';
      } else {
        bountyListener = 'stale';
        overallStatus = 'degraded';
      }
    } else {
      bountyListener = 'not_started';
    }
  } catch (error) {
    bountyListener = 'error';
    overallStatus = 'degraded';
  }

  // Check PaymentWorker status via recent payment activity
  try {
    const recentPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { queuedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, // Queued in last 30 min
          { paidAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } }, // Paid in last 30 min
        ],
      },
      orderBy: {
        queuedAt: 'desc',
      },
    });

    if (recentPayment) {
      paymentWorker = 'active';
    } else {
      // No recent activity - check if there are pending payments
      const pendingCount = await prisma.payment.count({
        where: {
          status: 'PENDING',
        },
      });

      if (pendingCount > 0) {
        paymentWorker = 'idle_with_pending';
        overallStatus = 'degraded';
      } else {
        paymentWorker = 'idle';
      }
    }
  } catch (error) {
    paymentWorker = 'error';
    overallStatus = 'degraded';
  }

  // Check ReconciliationService status via recent reconciliation activity
  try {
    const recentReconciliation = await prisma.payment.findFirst({
      where: {
        reconciled: true,
        reconciledAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
      orderBy: {
        reconciledAt: 'desc',
      },
    });

    if (recentReconciliation) {
      reconciliationService = 'active';
    } else {
      reconciliationService = 'idle';
    }
  } catch (error) {
    reconciliationService = 'error';
    overallStatus = 'degraded';
  }

  const payload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      validationListener: {
        status: validationListener,
        description: validationListener === 'active' ? 'Listening for ValidationRecorded events' :
                     validationListener === 'stale' ? 'No recent events processed' :
                     validationListener === 'not_started' ? 'Listener not yet started' : 'Unknown status',
      },
      bountyListener: {
        status: bountyListener,
        description: bountyListener === 'active' ? 'Listening for BountyReleased events' :
                     bountyListener === 'stale' ? 'No recent events processed' :
                     bountyListener === 'not_started' ? 'Listener not yet started' : 'Unknown status',
      },
      paymentWorker: {
        status: paymentWorker,
        description: paymentWorker === 'active' ? 'Processing payments' :
                     paymentWorker === 'idle_with_pending' ? 'Worker idle but pending payments exist' :
                     paymentWorker === 'idle' ? 'No pending payments' : 'Unknown status',
      },
      reconciliationService: {
        status: reconciliationService,
        description: reconciliationService === 'active' ? 'Running periodic reconciliation' :
                     reconciliationService === 'idle' ? 'No recent reconciliation activity' : 'Unknown status',
      },
    },
  };

  res.status(overallStatus === 'ok' ? 200 : 503).json(payload);
});

export default router;
