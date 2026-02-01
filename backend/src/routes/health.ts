import { Router } from 'express';
import { getPrismaClient } from '../lib/prisma.js';
import { pingRedis } from '../lib/redis.js';
import { getEventListenerService } from '../services/event-listener.service.js';
import { getReconciliationService } from '../services/reconciliation.service.js';

const router = Router();

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
 * Detailed health check endpoint for all services
 * GET /api/v1/health/services
 *
 * Returns detailed status for:
 * - ValidationListener
 * - BountyListener
 * - PaymentWorker
 * - ReconciliationService
 */
router.get('/health/services', async (_req, res) => {
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
