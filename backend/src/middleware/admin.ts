import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/CustomError.js';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // Development bypass for testing
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    console.log('[Admin Middleware] DEV_AUTH_BYPASS enabled - skipping admin check');
    return next();
  }

  const user = req.user;

  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  // Check if user has admin role in metadata
  const userRole = user.app_metadata?.role || user.user_metadata?.role || user.role;

  if (userRole !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  next();
}
