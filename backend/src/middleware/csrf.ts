import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Middleware to set CSRF cookie on every request if not already present.
 */
export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  let token = req.cookies[CSRF_COOKIE_NAME];
  if (!token) {
    token = generateCsrfToken();
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Frontend needs to read the cookie
      secure: isProduction,
      // Railway frontend/backend are on different subdomains in production.
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  // Store the token in res.locals so the endpoint can access it
  res.locals.csrfToken = token;
  next();
}

/**
 * Middleware to verify CSRF token on state-changing requests (POST, PUT, DELETE, PATCH).
 * Skips verification for GET, HEAD, OPTIONS, test environments, or when SKIP_CSRF=true.
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (process.env.NODE_ENV === 'test') return next();
  if (process.env.SKIP_CSRF === 'true') return next();

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  const authHeader = req.headers.authorization;
  const hasBearerAuth = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
  const isProduction = process.env.NODE_ENV === 'production';

  if (!cookieToken || !headerToken) {
    // For bearer-authenticated API calls, CSRF protection via cookie offers limited value.
    // Allow header-only flow to avoid cross-site cookie edge cases on different Railway subdomains.
    if (hasBearerAuth && headerToken) {
      res.cookie(CSRF_COOKIE_NAME, headerToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
      return next();
    }

    res.status(403).json({
      error: { code: 'CSRF_MISSING', message: 'CSRF token required' },
    });
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    // If bearer auth is present, trust header token and resync cookie to recover from stale cookie drift.
    if (hasBearerAuth) {
      res.cookie(CSRF_COOKIE_NAME, headerToken, {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
      return next();
    }

    res.status(403).json({
      error: { code: 'CSRF_MISMATCH', message: 'CSRF token invalid' },
    });
    return;
  }

  next();
}

/**
 * Endpoint handler to return a CSRF token to the frontend.
 * GET /api/v1/csrf-token
 *
 * The setCsrfCookie middleware has already ensured a token is set and stored in res.locals.csrfToken.
 * We just need to return it to the frontend.
 */
export function getCsrfTokenEndpoint(req: Request, res: Response): void {
  const token = res.locals.csrfToken;
  res.json({ csrfToken: token });
}
