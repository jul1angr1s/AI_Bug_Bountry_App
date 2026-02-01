/**
 * Process-level error handlers for unhandled rejections and uncaught exceptions
 *
 * This module sets up global error handling to prevent process crashes
 * and ensure proper logging of unexpected errors.
 */

let Sentry: any = null;

// Initialize Sentry if configured
if (process.env.SENTRY_DSN) {
  try {
    Sentry = await import('@sentry/node');
  } catch (error) {
    console.warn('[ProcessErrorHandler] Sentry not available');
  }
}

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);

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

  console.log('[ProcessErrorHandler] Unhandled rejection handler configured');
}

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);

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

  console.log('[ProcessErrorHandler] Uncaught exception handler configured');
}

/**
 * Setup all process-level error handlers
 */
export function setupProcessErrorHandlers(): void {
  setupUnhandledRejectionHandler();
  setupUncaughtExceptionHandler();

  console.log('[ProcessErrorHandler] All process error handlers configured');
}
