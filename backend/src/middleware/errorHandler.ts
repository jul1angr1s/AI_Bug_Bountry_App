import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CustomError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/CustomError.js';

type SanitizedError = {
  message: string;
  details?: unknown;
};

export function mapErrorToStatus(error: unknown): number {
  if (error instanceof ValidationError || error instanceof ZodError) {
    return 400;
  }
  if (error instanceof UnauthorizedError) {
    return 401;
  }
  if (error instanceof ForbiddenError) {
    return 403;
  }
  if (error instanceof NotFoundError) {
    return 404;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('prisma') && message.includes('connection')) {
    return 503;
  }
  if (message.includes('prisma') && message.includes('permission')) {
    return 403;
  }
  if (message.includes('prisma') && message.includes('access denied')) {
    return 403;
  }
  if (message.includes('not allowed by cors')) {
    return 403;
  }

  return 500;
}

export function sanitizeError(error: unknown, isProduction: boolean): SanitizedError {
  if (error instanceof ValidationError) {
    return { message: error.message, details: error.details };
  }

  if (error instanceof ZodError) {
    return { message: 'Validation error', details: error.flatten() };
  }

  if (error instanceof CustomError) {
    return { message: error.message };
  }

  if (error instanceof Error) {
    return { message: isProduction ? 'Internal server error' : error.message };
  }

  return { message: 'Internal server error' };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const status = mapErrorToStatus(err);
  const sanitized = sanitizeError(err, req.app.get('env') === 'production');

  if (err instanceof Error) {
    console.error('Request error', {
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error('Unknown error', { requestId: req.id, value: err });
  }

  res.status(status).json({
    error: {
      code: err instanceof Error ? err.name : 'Error',
      message: sanitized.message,
      requestId: req.id,
      ...(sanitized.details ? { details: sanitized.details } : {}),
    },
  });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route'));
}
