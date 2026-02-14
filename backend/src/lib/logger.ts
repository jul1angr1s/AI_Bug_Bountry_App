import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Correlation ID storage for request tracing.
 * Each request gets a unique ID that propagates through all log messages.
 */
export const correlationStorage = new AsyncLocalStorage<string>();

/**
 * Structured logger with PII redaction.
 *
 * Redacts sensitive fields:
 * - Private keys, API keys, tokens
 * - Researcher addresses (partially)
 * - Transaction hashes in debug logs
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      '*.privateKey',
      '*.apiKey',
      '*.secret',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.serviceRoleKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  mixin() {
    const correlationId = correlationStorage.getStore();
    return correlationId ? { correlationId } : {};
  },
});

export default logger;

/**
 * Create a child logger with a specific module context.
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module });
}
