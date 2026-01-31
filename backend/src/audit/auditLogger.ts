import { getPrismaClient } from '../../../lib/prisma.js';

/**
 * Audit Logging Module (Task 4.2)
 * 
 * Records agent actions for compliance and security monitoring.
 * All significant scan lifecycle events are logged.
 */

export type AuditAction = 
  | 'SCAN_CREATED'
  | 'SCAN_STARTED'
  | 'SCAN_STEP_STARTED'
  | 'SCAN_STEP_COMPLETED'
  | 'SCAN_STEP_FAILED'
  | 'SCAN_COMPLETED'
  | 'SCAN_CANCELED'
  | 'FINDING_DISCOVERED'
  | 'PROOF_GENERATED'
  | 'PROOF_SUBMITTED'
  | 'VALIDATOR_NOTIFIED';

export interface AuditLogEntry {
  action: AuditAction;
  scanId?: string;
  protocolId?: string;
  agentId?: string;
  findingId?: string;
  proofId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  const prisma = getPrismaClient();

  try {
    await prisma.auditLog.create({
      data: {
        protocolId: entry.protocolId || '',
        action: entry.action,
        metadata: {
          ...entry.metadata,
          scanId: entry.scanId,
          agentId: entry.agentId,
          findingId: entry.findingId,
          proofId: entry.proofId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Also log to console for immediate visibility
    console.log(`[Audit] ${entry.action}`, {
      scanId: entry.scanId,
      protocolId: entry.protocolId,
      agentId: entry.agentId,
    });
  } catch (error) {
    // Audit logging should not break the flow, but we should know about it
    console.error('[Audit] Failed to log audit entry:', error);
  }
}

/**
 * Log scan creation
 */
export async function logScanCreated(
  scanId: string,
  protocolId: string,
  createdBy?: string
): Promise<void> {
  await logAudit({
    action: 'SCAN_CREATED',
    scanId,
    protocolId,
    metadata: { createdBy },
  });
}

/**
 * Log scan started
 */
export async function logScanStarted(
  scanId: string,
  protocolId: string,
  agentId: string
): Promise<void> {
  await logAudit({
    action: 'SCAN_STARTED',
    scanId,
    protocolId,
    agentId,
  });
}

/**
 * Log scan step transition
 */
export async function logScanStep(
  action: 'SCAN_STEP_STARTED' | 'SCAN_STEP_COMPLETED' | 'SCAN_STEP_FAILED',
  scanId: string,
  protocolId: string,
  agentId: string,
  step: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    action,
    scanId,
    protocolId,
    agentId,
    metadata: { step, ...metadata },
  });
}

/**
 * Log scan completion
 */
export async function logScanCompleted(
  scanId: string,
  protocolId: string,
  agentId: string,
  findingsCount: number,
  duration: number
): Promise<void> {
  await logAudit({
    action: 'SCAN_COMPLETED',
    scanId,
    protocolId,
    agentId,
    metadata: { findingsCount, duration },
  });
}

/**
 * Log proof submission
 */
export async function logProofSubmitted(
  scanId: string,
  protocolId: string,
  proofId: string,
  findingId: string
): Promise<void> {
  await logAudit({
    action: 'PROOF_SUBMITTED',
    scanId,
    protocolId,
    proofId,
    findingId,
  });
}
