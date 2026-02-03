import { z } from 'zod';

// USDC API schemas
export const usdcAllowanceQuerySchema = z.object({
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  spender: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export const usdcBalanceQuerySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export const usdcApprovalSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  spender: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

// Payment list schemas
export const paymentListQuerySchema = z.object({
  protocolId: z.string().uuid(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const paymentIdSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

// Researcher earnings schemas
export const researcherAddressSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export const researcherEarningsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Payment stats schemas
export const paymentStatsQuerySchema = z.object({
  protocolId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  days: z.coerce.number().int().positive().max(365).default(30),
});

// Leaderboard schemas
export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Pool status schemas
export const protocolIdParamSchema = z.object({
  protocolId: z.string().uuid('Invalid protocol ID'),
});

// Type exports
export type UsdcAllowanceQuery = z.infer<typeof usdcAllowanceQuerySchema>;
export type UsdcBalanceQuery = z.infer<typeof usdcBalanceQuerySchema>;
export type UsdcApprovalInput = z.infer<typeof usdcApprovalSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type PaymentIdParams = z.infer<typeof paymentIdSchema>;
export type ResearcherAddressParams = z.infer<typeof researcherAddressSchema>;
export type ResearcherEarningsQuery = z.infer<typeof researcherEarningsQuerySchema>;
export type PaymentStatsQuery = z.infer<typeof paymentStatsQuerySchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type ProtocolIdParams = z.infer<typeof protocolIdParamSchema>;
