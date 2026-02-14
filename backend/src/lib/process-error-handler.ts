/**
 * Process-level error handlers for unhandled rejections and uncaught exceptions
 *
 * This module sets up global error handling to prevent process crashes
 * and ensure proper logging of unexpected errors.
 */

import { createLogger } from './logger.js';

const log = createLogger('ProcessErrorHandler');

interface SentryLike {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
  close(timeout?: number): Promise<boolean>;
}
let Sentry: SentryLike | null = null;

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  try {
    Sentry = await import('@sentry/node');
  } catch (error) {
    log.warn('Sentry not available');
  }
}

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    log.error({ err: reason, promise }, 'Unhandled Promise Rejection');

    // Report to Sentry if configured
    if (Sentry) {
      if (reason instanceof Error) {
        Sentry.captureException(reason, {
          tags: { type: 'unhandledRejection' },
        });
      } else {
        Sentry.captureMessage('Unhandled Promise Rejection', {
          level: 'error',
          extra: { reason, promise },
        });
      }
    }

    // In production, we log but don't crash the process
    // The error should be handled upstream
  });

  log.info('Unhandled rejection handler configured');
}

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    log.error({ err: error }, 'Uncaught Exception');

    // Report to Sentry if configured
    if (Sentry) {
      Sentry.captureException(error, {
        tags: { type: 'uncaughtException' },
      });

      // Flush Sentry before exiting
      Sentry.close(2000).then(() => {
        process.exit(1);
      });
    } else {
      // Exit process on uncaught exception
      process.exit(1);
    }
  });

  log.info('Uncaught exception handler configured');
}

/**
 * Setup all process-level error handlers
 */
export function setupProcessErrorHandlers(): void {
  setupUnhandledRejectionHandler();
  setupUncaughtExceptionHandler();

  log.info('All process error handlers configured');
}
