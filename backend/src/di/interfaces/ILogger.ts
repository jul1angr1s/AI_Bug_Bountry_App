/**
 * Logger interface for dependency injection.
 */
export interface ILogger {
  info(msg: string, obj?: Record<string, unknown>): void;
  warn(msg: string, obj?: Record<string, unknown>): void;
  error(msg: string, obj?: Record<string, unknown>): void;
  debug(msg: string, obj?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): ILogger;
}
