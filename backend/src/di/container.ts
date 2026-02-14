import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from './tokens.js';
import { getPrismaClient } from '../lib/prisma.js';
import { createLogger } from '../lib/logger.js';
import { BountyPoolClient } from '../blockchain/contracts/BountyPoolClient.js';
import { USDCClient } from '../blockchain/contracts/USDCClient.js';
import type { ILogger } from './interfaces/ILogger.js';

/**
 * Pino logger adapter that implements ILogger interface.
 */
class PinoLoggerAdapter implements ILogger {
  private logger = createLogger('app');

  info(msg: string, obj?: Record<string, unknown>): void {
    obj ? this.logger.info(obj, msg) : this.logger.info(msg);
  }
  warn(msg: string, obj?: Record<string, unknown>): void {
    obj ? this.logger.warn(obj, msg) : this.logger.warn(msg);
  }
  error(msg: string, obj?: Record<string, unknown>): void {
    obj ? this.logger.error(obj, msg) : this.logger.error(msg);
  }
  debug(msg: string, obj?: Record<string, unknown>): void {
    obj ? this.logger.debug(obj, msg) : this.logger.debug(msg);
  }
  child(bindings: Record<string, unknown>): ILogger {
    const childLogger = this.logger.child(bindings);
    const adapter = new PinoLoggerAdapter();
    (adapter as unknown as { logger: typeof childLogger }).logger = childLogger;
    return adapter;
  }
}

/**
 * Initialize the DI container with all production registrations.
 */
export function initializeContainer(): void {
  // Logger
  container.registerSingleton(TOKENS.Logger, PinoLoggerAdapter);

  // Database
  container.registerInstance(TOKENS.Database, getPrismaClient());

  // Blockchain clients
  container.registerInstance(TOKENS.BountyPoolClient, new BountyPoolClient());
  container.registerInstance(TOKENS.USDCClient, new USDCClient());
}

export { container };
