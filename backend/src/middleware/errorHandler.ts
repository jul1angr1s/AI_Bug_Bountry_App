import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CustomError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/CustomError.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('error-handler');

// Sentry integration (optional - only if SENTRY_DSN is set)
interface SentryLike {
  init(options: Record<string, unknown>): void;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
}
let Sentry: SentryLike | null = null;
if (process.env.SENTRY_DSN) {
  try {
    // Dynamic import to avoid requiring @sentry/node if not configured
    Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    log.info('Sentry error tracking enabled');
  } catch (error) {
    log.warn({ err: error }, 'Sentry not available');
  }
}

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
  const isProduction = req.app.get('env') === 'production';

  // Log error details
  if (err instanceof Error) {
    log.error({
      requestId: req.id,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      err,
      status,
    }, 'Request error');

    // Report to Sentry if configured (only for 5xx errors in production)
    if (Sentry && isProduction && status >= 500) {
      Sentry.captureException(err, {
        tags: {
          requestId: req.id,
          path: req.path,
          method: req.method,
          status,
        },
        user: req.user ? { id: req.user.id } : undefined,
        extra: {
          body: req.body,
          query: req.query,
          params: req.params,
        },
      });
    }
  } else {
    log.error({ requestId: req.id, value: err }, 'Unknown error');

    if (Sentry && isProduction) {
      Sentry.captureMessage('Unknown error type encountered', {
        level: 'error',
        tags: { requestId: req.id },
        extra: { error: err },
      });
    }
  }

  // User-friendly error messages
  const userMessage = getUserFriendlyMessage(status, sanitized.message);

  res.status(status).json({
    error: {
      code: err instanceof Error ? err.name : 'Error',
      message: isProduction ? userMessage : sanitized.message,
      requestId: req.id,
      ...(sanitized.details && !isProduction ? { details: sanitized.details } : {}),
    },
  });
}

/**
 * Get user-friendly error messages based on status code
 */
function getUserFriendlyMessage(status: number, originalMessage: string): string {
  switch (status) {
    case 400:
      return 'The request contains invalid data. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in and try again.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'An unexpected error occurred. Our team has been notified.';
    case 503:
      return 'Service temporarily unavailable. Please try again in a few moments.';
    default:
      return originalMessage;
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('Route'));
}
