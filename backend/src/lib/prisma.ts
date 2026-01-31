import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });
  }

  return prisma;
}
