import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/CustomError.js';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
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
