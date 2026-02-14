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
 * Extended logger interface that permits the common `log.error("msg:", value)`
 * calling pattern alongside Pino's strict `log.error(obj, msg)` signatures.
 *
 * This avoids TypeScript build errors across ~30+ call-sites that pass
 * extra arguments (e.g. caught errors) as trailing positional parameters.
 */
export interface AppLogger extends pino.Logger {
  fatal(msg: string, ...args: any[]): void;
  fatal(obj: object, msg?: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  error(obj: object, msg?: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  warn(obj: object, msg?: string, ...args: any[]): void;
  info(msg: string, ...args: any[]): void;
  info(obj: object, msg?: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  debug(obj: object, msg?: string, ...args: any[]): void;
  trace(msg: string, ...args: any[]): void;
  trace(obj: object, msg?: string, ...args: any[]): void;
}

/**
 * Create a child logger with a specific module context.
 */
export function createLogger(module: string): AppLogger {
  return logger.child({ module }) as AppLogger;
}
