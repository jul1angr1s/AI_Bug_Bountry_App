import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.PRISMA_QUERY_LOG === 'true' ? ['query', 'error'] : ['error'],
    });
  }

  return prisma;
}
