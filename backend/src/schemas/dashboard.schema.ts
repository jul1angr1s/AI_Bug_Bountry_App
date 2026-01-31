import { z } from 'zod';
import type { Severity, VulnerabilityStatus } from '@prisma/client';

export const protocolIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid protocol ID format' }),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const sortSchema = z.object({
  sort: z.enum(['severity', 'date', 'status']).default('date'),
});

export const vulnerabilityFilterSchema = z.object({
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED']).optional(),
});

export const statsQuerySchema = z.object({
  protocolId: z.string().uuid().optional(),
});

export const agentQuerySchema = z.object({
  type: z.enum(['PROTOCOL', 'RESEARCHER', 'VALIDATOR']).optional(),
});

export type ProtocolIdParams = z.infer<typeof protocolIdSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type SortQuery = z.infer<typeof sortSchema>;
export type VulnerabilityFilterQuery = z.infer<typeof vulnerabilityFilterSchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type AgentQuery = z.infer<typeof agentQuerySchema>;
