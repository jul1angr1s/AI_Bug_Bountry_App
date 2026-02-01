import { z } from 'zod';

/**
 * Reconciliation API Validation Schemas
 * Per OpenSpec tasks 11.1-11.6
 */

// GET /api/v1/reconciliation/report query parameters
export const reconciliationReportQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

// GET /api/v1/reconciliation/discrepancies query parameters
export const discrepanciesQuerySchema = z.object({
  status: z
    .enum([
      'ORPHANED',
      'MISSING_PAYMENT',
      'UNCONFIRMED_PAYMENT',
      'AMOUNT_MISMATCH',
      'DISCREPANCY',
      'RESOLVED',
    ])
    .optional(),
});

// POST /api/v1/reconciliation/resolve/:id parameters
export const resolveDiscrepancyParamSchema = z.object({
  id: z.string().uuid('Invalid discrepancy ID'),
});

// POST /api/v1/reconciliation/resolve/:id body
export const resolveDiscrepancyBodySchema = z.object({
  notes: z.string().min(1, 'Notes are required').max(1000, 'Notes must be less than 1000 characters'),
});
