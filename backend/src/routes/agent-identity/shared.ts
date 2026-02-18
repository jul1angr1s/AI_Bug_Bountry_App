import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { agentIdentityService } from '../../services/agent-identity.service.js';
import { reputationService } from '../../services/reputation.service.js';
import { escrowService } from '../../services/escrow.service.js';
import { createLogger } from '../../lib/logger.js';

export const log = createLogger('AgentIdentityRoutes');
export const prisma = new PrismaClient();

export function serializeBigInts(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeBigInts(value);
    }
    return result;
  }
  return obj;
}

export function normalizeWallet(walletAddress: string): string {
  return walletAddress.toLowerCase();
}

export const RegisterAgentSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(['RESEARCHER', 'VALIDATOR']),
  registerOnChain: z.boolean().optional().default(false),
});

export const SyncRegistrationSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  agentType: z.enum(['RESEARCHER', 'VALIDATOR']),
});

export const DepositEscrowSchema = z.object({
  amount: z.string().regex(/^\d+$/),
  txHash: z.string().optional(),
});

export const QualificationSchema = z.object({
  targetAgentId: z.string().uuid(),
  feedbackType: z.enum([
    'CONFIRMED_CRITICAL',
    'CONFIRMED_HIGH',
    'CONFIRMED_MEDIUM',
    'CONFIRMED_LOW',
    'CONFIRMED_INFORMATIONAL',
    'REJECTED',
  ]),
  direction: z.enum(['VALIDATOR_RATES_RESEARCHER', 'RESEARCHER_RATES_VALIDATOR']),
  validationId: z.string().optional(),
  findingId: z.string().optional(),
  recordOnChain: z.boolean().optional().default(false),
});

export { agentIdentityService, reputationService, escrowService };
