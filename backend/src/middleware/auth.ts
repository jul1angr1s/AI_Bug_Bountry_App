import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { UnauthorizedError } from '../errors/CustomError.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return next();
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    // Development bypass: Allow testing without valid Supabase session
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
      console.warn('[AUTH] Development bypass enabled - creating mock user');
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
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  req.user = data.user;
  return next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  return next();
}
