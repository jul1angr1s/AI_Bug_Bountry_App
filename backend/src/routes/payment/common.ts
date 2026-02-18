import type { Request, Response } from 'express';

interface RateLimitOptions {
  points: number;
  duration: number;
}

export function createPaymentRateLimiter(options: RateLimitOptions) {
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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
    const limit = req.user ? 500 : 100;

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
