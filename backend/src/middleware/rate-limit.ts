import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  points: number;
  duration: number; // in seconds
}

function getClientId(req: Request): string {
  // Use user ID if authenticated, otherwise use IP
  return req.user?.id || req.ip || 'unknown';
}

function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = getClientId(req);
    const key = `${req.path}:${clientId}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + (options.duration * 1000),
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment count
      entry.count++;
    }
    
    const remaining = Math.max(0, options.points - entry.count);
    const resetTime = Math.ceil(entry.resetTime / 1000);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.points.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());
    
    if (entry.count > options.points) {
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

// Dashboard endpoint rate limits per OpenSpec requirements
export const dashboardRateLimits = {
  stats: createRateLimiter({ points: 60, duration: 60 }),      // 60 req/min
  agents: createRateLimiter({ points: 120, duration: 60 }),    // 120 req/min (admin)
  protocols: createRateLimiter({ points: 60, duration: 60 }),  // 60 req/min
  vulnerabilities: createRateLimiter({ points: 60, duration: 60 }), // 60 req/min
};

// General API rate limit (fallback)
export const generalRateLimit = createRateLimiter({ points: 300, duration: 60 }); // 300 req/min
