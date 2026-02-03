import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * SSE-specific authentication middleware
 *
 * Supports multiple authentication methods for SSE connections:
 * 1. Cookie-based authentication (production, preferred)
 * 2. Query parameter authentication (development only)
 * 3. Development bypass (local testing only)
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

    // Method 3: Development bypass (local testing only)
    if (
      process.env.DEV_AUTH_BYPASS === 'true' &&
      process.env.NODE_ENV === 'development'
    ) {
      console.warn('[SSE-AUTH] Development bypass enabled - creating mock user');
      req.user = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;
      return next();
    }

    // Get token from cookie or query param
    const token = cookieToken || queryToken;

    if (!token) {
      console.error('[SSE-AUTH] No authentication token found');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for SSE connection'
      });
    }

    // Log token source for debugging
    if (cookieToken) {
      console.log('[SSE-AUTH] Authenticating with cookie token');
    } else if (queryToken) {
      console.log('[SSE-AUTH] Authenticating with query parameter token (dev mode)');
    }

    // Validate token with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      console.error('[SSE-AUTH] Token validation failed:', error?.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token'
      });
    }

    console.log('[SSE-AUTH] User authenticated:', data.user.email);
    req.user = data.user;
    return next();

  } catch (err) {
    console.error('[SSE-AUTH] Authentication error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication processing failed'
    });
  }
}
