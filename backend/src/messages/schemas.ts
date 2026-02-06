import { z } from 'zod';

/**
 * Typed message schemas for inter-agent communication.
 *
 * All messages between agents use these Zod schemas for validation.
 * This replaces ad-hoc JSON blobs with typed, validated messages.
 */

// ============================================================
// Proof Submission: Researcher → Validator
// ============================================================

export const ProofSubmissionSchema = z.object({
  version: z.literal('1.0'),
  scanId: z.string().uuid(),
  protocolId: z.string().uuid(),
  proofId: z.string().uuid(),
  findingId: z.string().uuid(),
  commitHash: z.string(),
  signature: z.string().nullish(),
  encryptedPayload: z.string().nullish(),
  encryptionKeyId: z.string().nullish(),
  timestamp: z.string().datetime(),
});

export type ProofSubmissionMessage = z.infer<typeof ProofSubmissionSchema>;

// ============================================================
// Validation Result: Validator → Payment Pipeline
// ============================================================

export const ValidationResultSchema = z.object({
  version: z.literal('1.0'),
  validationId: z.string(),
  proofId: z.string().uuid(),
  scanId: z.string().uuid(),
  protocolId: z.string().uuid(),
  findingId: z.string().uuid(),
  outcome: z.enum(['CONFIRMED', 'REJECTED', 'INCONCLUSIVE']),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  researcherWallet: z.string(),
  validatorWallet: z.string(),
  txHash: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type ValidationResultMessage = z.infer<typeof ValidationResultSchema>;

// ============================================================
// Payment Job: Validation Listener → Payment Worker
// ============================================================

export const PaymentJobSchema = z.object({
  version: z.literal('1.0'),
  paymentId: z.string().uuid(),
  validationId: z.string(),
  protocolId: z.string().uuid(),
  findingId: z.string().uuid(),
  researcherAddress: z.string(),
  amount: z.number(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  timestamp: z.string().datetime(),
});

export type PaymentJobMessage = z.infer<typeof PaymentJobSchema>;

// ============================================================
// Scan Job: API → Researcher Agent
// ============================================================

export const ScanJobSchema = z.object({
  version: z.literal('1.0'),
  scanId: z.string().uuid(),
  protocolId: z.string().uuid(),
  targetBranch: z.string().optional(),
  targetCommitHash: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type ScanJobMessage = z.infer<typeof ScanJobSchema>;

// ============================================================
// Utility: validate any message against its schema
// ============================================================

export function validateMessage<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(
      `Invalid message${context ? ` (${context})` : ''}: ${errors}`
    );
  }
  return result.data;
}
