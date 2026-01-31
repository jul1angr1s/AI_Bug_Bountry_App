import { Router } from 'express';
import { getPrismaClient } from '../lib/prisma.js';
import { pingRedis } from '../lib/redis.js';

const router = Router();

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

export default router;
//hello hiiii