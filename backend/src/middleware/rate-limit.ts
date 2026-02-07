import type { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('rate-limit');

interface RateLimitOptions {
  points: number;
  duration: number; // in seconds
}

function getClientId(req: Request): string {
  return req.user?.id || req.ip || 'unknown';
}

/**
 * Redis-backed rate limiter.
 * State persists across server restarts and scales across instances.
 */
function createRateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientId = getClientId(req);
    const key = `rate:${req.path}:${clientId}`;

    try {
      const redis = getRedisClient();
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, options.duration);
      }

      const ttl = await redis.ttl(key);
      const remaining = Math.max(0, options.points - current);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', options.points.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + ttl).toString());

      if (current > options.points) {
        res.setHeader('Retry-After', ttl.toString());
        log.warn({ clientId, path: req.path, count: current }, 'Rate limit exceeded');
        res.status(429).json({
          error: {
            code: 'RateLimitExceeded',
            message: `Rate limit exceeded. Try again after ${ttl} seconds.`,
            requestId: req.id,
          },
        });
        return;
      }

      next();
    } catch (err) {
      // If Redis is unavailable, allow the request (fail open) but log warning
      log.warn({ err }, 'Rate limit check failed, allowing request');
      next();
    }
  };
}

// Dashboard endpoint rate limits per OpenSpec requirements
export const dashboardRateLimits = {
  stats: createRateLimiter({ points: 60, duration: 60 }),      // 60 req/min
  agents: createRateLimiter({ points: 120, duration: 60 }),    // 120 req/min (admin)
  protocols: createRateLimiter({ points: 60, duration: 60 }),  // 60 req/min
  vulnerabilities: createRateLimiter({ points: 60, duration: 60 }), // 60 req/min
};

// General API rate limit (fallback)
export const generalRateLimit = createRateLimiter({ points: 300, duration: 60 }); // 300 req/min
