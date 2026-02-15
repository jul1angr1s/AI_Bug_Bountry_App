import type { NextFunction, Request, Response } from 'express';
import { resolveUserFromToken } from '../lib/auth-token.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('sse-auth');

/**
 * SSE-specific authentication middleware
 *
 * Supports multiple authentication methods for SSE connections:
 * 1. Cookie-based authentication (production, preferred)
 * 2. Query parameter authentication (development only)
 *
 * The EventSource API cannot send custom headers (like Authorization),
 * so we use cookies which are automatically sent with requests.
 */
export async function sseAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Method 1: Cookie-based authentication (production)
    const cookieToken = req.cookies?.auth_token;

    // Method 2: Query parameter authentication (development only)
    const queryToken = process.env.NODE_ENV === 'development'
      ? (req.query.token as string | undefined)
      : undefined;

    // Get token from cookie or query param
    const token = cookieToken || queryToken;

    if (!token) {
      log.warn('No authentication token found');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for SSE connection'
      });
      return;
    }

    log.debug({ source: cookieToken ? 'cookie' : 'query' }, 'Authenticating SSE connection');

    const user = await resolveUserFromToken(token);
    if (!user) {
      log.warn('Token validation failed');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token'
      });
      return;
    }

    log.debug({ userId: user.id }, 'User authenticated');
    req.user = user;
    return next();

  } catch (err) {
    log.error({ err }, 'Authentication error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
}
