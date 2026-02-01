import { Router } from 'express';
import { getPrismaClient } from '../lib/prisma.js';
import { pingRedis } from '../lib/redis.js';
import { metricsCollector } from '../monitoring/metrics.js';

const router = Router();

/**
 * Basic health check
 */
router.get('/health', async (_req, res) => {
  const prisma = getPrismaClient();
  let database = 'ok';
  let redis = 'ok';
  let status = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = 'unreachable';
    status = 'degraded';
  }

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

  const payload = {
    status,
    timestamp: new Date().toISOString(),
    database,
    redis,
  };

  res.status(status === 'ok' ? 200 : 503).json(payload);
});

/**
 * Detailed health check with memory and queue info
 */
router.get('/health/detailed', async (_req, res) => {
  const prisma = getPrismaClient();
  const checks: Record<string, any> = {
    server: { status: 'ok' },
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    memory: { status: 'ok' },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error: any) {
    checks.database = {
      status: 'error',
      message: error.message,
    };
  }

  // Check Redis
  try {
    const redisHealthy = await pingRedis();
    checks.redis = { status: redisHealthy ? 'ok' : 'error' };
  } catch (error: any) {
    checks.redis = {
      status: 'error',
      message: error.message,
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
  const hasError = Object.values(checks).some((c: any) => c.status === 'error');
  const hasWarning = Object.values(checks).some((c: any) => c.status === 'warning');
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
router.get('/metrics', (_req, res) => {
  const metrics = metricsCollector.getAllMetrics();

  res.json({
    timestamp: new Date().toISOString(),
    metrics,
  });
});

export default router;
