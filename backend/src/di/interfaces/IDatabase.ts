import type { PrismaClient } from '@prisma/client';

/**
 * Database interface - wraps PrismaClient for DI.
 * Using the PrismaClient type directly since it has a large surface area.
 */
export type IDatabase = PrismaClient;
