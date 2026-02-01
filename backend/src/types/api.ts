/**
 * API Types
 *
 * TypeScript type definitions for API request and response payloads.
 * These types ensure consistency between frontend and backend.
 */

import type { Severity, FindingStatus, AnalysisMethod as PrismaAnalysisMethod } from '@prisma/client';

/**
 * Analysis method for findings
 */
export type AnalysisMethod = PrismaAnalysisMethod;

/**
 * Finding response with AI metadata
 */
export interface FindingResponse {
  id: string;
  vulnerabilityType: string;
  severity: Severity;
  status: FindingStatus;
  filePath: string;
  lineNumber: number | null;
  description: string;
  confidenceScore: number;
  createdAt: Date | string;

  // AI-enhanced fields
  analysisMethod?: AnalysisMethod | null;
  aiConfidenceScore?: number | null;
  remediationSuggestion?: string | null;
  codeSnippet?: string | null;

  // Related proofs
  proofs: Array<{
    id: string;
    status: string;
    submittedAt: Date | string;
  }>;
}

/**
 * Knowledge base rebuild response
 */
export interface KnowledgeBaseRebuildResponse {
  success: boolean;
  version: number;
  documentCount: number;
  message: string;
  rebuiltAt: string;
}

/**
 * Findings list response with optional filtering
 */
export interface FindingsListResponse {
  scanId: string;
  findings: FindingResponse[];
  total: number;
  filteredBy?: {
    analysisMethod?: AnalysisMethod;
  };
}
