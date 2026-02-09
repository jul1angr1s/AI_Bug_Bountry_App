import type { Server } from 'socket.io';
import { invalidateCache, invalidateCachePattern, CACHE_KEYS } from '../lib/cache.js';

let ioInstance: Server | null = null;

export function setSocketIO(io: Server): void {
  ioInstance = io;
}

export function getSocketIO(): Server | null {
  return ioInstance;
}

// Dashboard WebSocket Event Types
export interface AgentTaskUpdateEvent {
  eventType: 'agent:task_update';
  timestamp: string;
  data: {
    agentId: string;
    task: string;
    progress: number;
    estimatedCompletion?: string;
  };
}

export interface BountyPoolUpdatedEvent {
  eventType: 'bounty_pool:updated';
  timestamp: string;
  protocolId: string;
  data: {
    total: number;
    available: number;
    paid: number;
    changeType: 'DEPOSIT' | 'PAYMENT_RELEASED' | 'RESERVATION';
    amount: number;
  };
}

export interface VulnerabilityStatusChangedEvent {
  eventType: 'vuln:status_changed';
  timestamp: string;
  protocolId: string;
  data: {
    vulnerabilityId: string;
    oldStatus: string;
    newStatus: string;
    severity: string;
    paymentAmount?: number;
    rejectionReason?: string;
  };
}

export interface ProtocolStatusChangedEvent {
  eventType: 'protocol:status_changed';
  timestamp: string;
  protocolId: string;
  data: {
    status: string;
    registrationState: string;
    registrationTxHash?: string;
    riskScore?: number;
    failureReason?: string;
  };
}

export interface ProtocolRegistrationProgressEvent {
  eventType: 'protocol:registration_progress';
  timestamp: string;
  protocolId: string;
  data: {
    currentStep: string;
    state: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    progress: number;
    message: string;
  };
}

// Event emitter functions
export async function emitAgentTaskUpdate(
  agentId: string,
  task: string,
  progress: number,
  estimatedCompletion?: Date
): Promise<void> {
  if (!ioInstance) return;

  const event: AgentTaskUpdateEvent = {
    eventType: 'agent:task_update',
    timestamp: new Date().toISOString(),
    data: {
      agentId,
      task,
      progress,
      estimatedCompletion: estimatedCompletion?.toISOString(),
    },
  };

  ioInstance.to('agents').emit('agent:task_update', event);
  
  // Invalidate agent status cache
  await invalidateCachePattern('agent:status:*');
}

export async function emitBountyPoolUpdated(
  protocolId: string,
  total: number,
  available: number,
  paid: number,
  changeType: 'DEPOSIT' | 'PAYMENT_RELEASED' | 'RESERVATION',
  amount: number
): Promise<void> {
  if (!ioInstance) return;

  const event: BountyPoolUpdatedEvent = {
    eventType: 'bounty_pool:updated',
    timestamp: new Date().toISOString(),
    protocolId,
    data: {
      total,
      available,
      paid,
      changeType,
      amount,
    },
  };

  ioInstance.to(`protocol:${protocolId}`).emit('bounty_pool:updated', event);
  
  // Invalidate dashboard stats cache
  await invalidateCachePattern(`dashboard:stats:*`);
}

export async function emitVulnerabilityStatusChanged(
  protocolId: string,
  vulnerabilityId: string,
  oldStatus: string,
  newStatus: string,
  severity: string,
  options?: {
    paymentAmount?: number;
    rejectionReason?: string;
  }
): Promise<void> {
  if (!ioInstance) return;

  const event: VulnerabilityStatusChangedEvent = {
    eventType: 'vuln:status_changed',
    timestamp: new Date().toISOString(),
    protocolId,
    data: {
      vulnerabilityId,
      oldStatus,
      newStatus,
      severity,
      paymentAmount: options?.paymentAmount,
      rejectionReason: options?.rejectionReason,
    },
  };

  ioInstance.to(`protocol:${protocolId}`).emit('vuln:status_changed', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCachePattern(`protocol:vulnerabilities:${protocolId}:*`);
}

export async function emitProtocolStatusChange(
  protocolId: string,
  data: {
    status: string;
    registrationState: string;
    registrationTxHash?: string;
    riskScore?: number;
    failureReason?: string;
  }
): Promise<void> {
  if (!ioInstance) return;

  const event: ProtocolStatusChangedEvent = {
    eventType: 'protocol:status_changed',
    timestamp: new Date().toISOString(),
    protocolId,
    data,
  };

  // Emit to both protocols room and specific protocol room
  ioInstance.to('protocols').emit('protocol:status_changed', event);
  ioInstance.to(`protocol:${protocolId}`).emit('protocol:status_changed', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCache(`protocol:${protocolId}`);
}

export async function emitProtocolRegistrationProgress(
  protocolId: string,
  currentStep: string,
  state: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
  progress: number,
  message: string
): Promise<void> {
  if (!ioInstance) return;

  const event: ProtocolRegistrationProgressEvent = {
    eventType: 'protocol:registration_progress',
    timestamp: new Date().toISOString(),
    protocolId,
    data: {
      currentStep,
      state,
      progress,
      message,
    },
  };

  // Emit to protocol room
  ioInstance.to(`protocol:${protocolId}`).emit('protocol:registration_progress', event);
  ioInstance.to('protocols').emit('protocol:registration_progress', event);

  // Also publish to Redis for SSE subscribers
  const { getRedisClient } = await import('../lib/redis.js');
  const redis = await getRedisClient();
  await redis.publish(`protocol:${protocolId}:registration`, JSON.stringify(event));
}

// Task 2.5: Scan WebSocket Event Types
export interface ScanStartedEvent {
  eventType: 'scan:started';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    agentId: string;
    targetBranch?: string;
    targetCommitHash?: string;
  };
}

export interface ScanProgressEvent {
  eventType: 'scan:progress';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    currentStep: string;
    state: string;
    progress?: number;
    message?: string;
  };
}

export interface ScanCompletedEvent {
  eventType: 'scan:completed';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    state: string;
    findingsCount: number;
    duration: number; // milliseconds
    errorCode?: string;
    errorMessage?: string;
  };
}

// Phase 4: Payment WebSocket Event Types
export interface PaymentReleasedEvent {
  eventType: 'payment:released';
  timestamp: string;
  protocolId: string;
  data: {
    id: string;
    amount: number;
    txHash: string;
    researcherAddress: string;
    paidAt: string;
    validationId: string;
    severity: string;
  };
}

export interface PaymentFailedEvent {
  eventType: 'payment:failed';
  timestamp: string;
  protocolId: string;
  data: {
    paymentId: string;
    failureReason: string;
    retryCount: number;
    validationId: string;
  };
}

// Payment event emitters
export async function emitPaymentReleased(
  protocolId: string,
  paymentId: string,
  amount: number,
  txHash: string,
  researcherAddress: string,
  paidAt: Date,
  validationId: string,
  severity: string
): Promise<void> {
  if (!ioInstance) return;

  const event: PaymentReleasedEvent = {
    eventType: 'payment:released',
    timestamp: new Date().toISOString(),
    protocolId,
    data: {
      id: paymentId,
      amount,
      txHash,
      researcherAddress,
      paidAt: paidAt.toISOString(),
      validationId,
      severity,
    },
  };

  ioInstance.to(`protocol:${protocolId}`).emit('payment:released', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCachePattern(`protocol:payments:${protocolId}:*`);
}

export async function emitPaymentFailed(
  protocolId: string,
  paymentId: string,
  failureReason: string,
  retryCount: number,
  validationId: string
): Promise<void> {
  if (!ioInstance) return;

  const event: PaymentFailedEvent = {
    eventType: 'payment:failed',
    timestamp: new Date().toISOString(),
    protocolId,
    data: {
      paymentId,
      failureReason,
      retryCount,
      validationId,
    },
  };

  ioInstance.to(`protocol:${protocolId}`).emit('payment:failed', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCachePattern(`protocol:payments:${protocolId}:*`);
}

// Scan event emitters
export async function emitScanStarted(
  scanId: string,
  protocolId: string,
  agentId: string,
  targetBranch?: string,
  targetCommitHash?: string
): Promise<void> {
  if (!ioInstance) return;

  const event: ScanStartedEvent = {
    eventType: 'scan:started',
    timestamp: new Date().toISOString(),
    scanId,
    protocolId,
    data: {
      agentId,
      targetBranch,
      targetCommitHash,
    },
  };

  // Emit to protocol room and scans room
  ioInstance.to(`protocol:${protocolId}`).emit('scan:started', event);
  ioInstance.to('scans').emit('scan:started', event);
  
  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCache(`protocol:scans:${protocolId}`);
}

export async function emitScanProgress(
  scanId: string,
  protocolId: string,
  currentStep: string,
  state: string,
  progress?: number,
  message?: string
): Promise<void> {
  if (!ioInstance) return;

  const event: ScanProgressEvent = {
    eventType: 'scan:progress',
    timestamp: new Date().toISOString(),
    scanId,
    protocolId,
    data: {
      currentStep,
      state,
      progress,
      message,
    },
  };

  // Emit to protocol room and scans room
  ioInstance.to(`protocol:${protocolId}`).emit('scan:progress', event);
  ioInstance.to('scans').emit('scan:progress', event);
  
  // Also publish to Redis for SSE subscribers
  const { getRedisClient } = await import('../lib/redis.js');
  const redis = await getRedisClient();
  await redis.publish(`scan:${scanId}:progress`, JSON.stringify(event));
}

export async function emitScanCompleted(
  scanId: string,
  protocolId: string,
  state: string,
  findingsCount: number,
  startedAt: Date,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  if (!ioInstance) return;

  const duration = Date.now() - startedAt.getTime();

  const event: ScanCompletedEvent = {
    eventType: 'scan:completed',
    timestamp: new Date().toISOString(),
    scanId,
    protocolId,
    data: {
      state,
      findingsCount,
      duration,
      errorCode,
      errorMessage,
    },
  };

  // Emit to protocol room and scans room
  ioInstance.to(`protocol:${protocolId}`).emit('scan:completed', event);
  ioInstance.to('scans').emit('scan:completed', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCache(`protocol:scans:${protocolId}`);
  await invalidateCache(`scan:${scanId}`);
}

// Scan Log Event Types
export type ScanLogLevel = 'INFO' | 'ANALYSIS' | 'ALERT' | 'WARN' | 'DEFAULT';

export interface ScanLogEvent {
  eventType: 'scan:log';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    level: ScanLogLevel;
    message: string;
  };
}

export async function emitScanLog(
  scanId: string,
  protocolId: string,
  level: ScanLogLevel,
  message: string
): Promise<void> {
  const event: ScanLogEvent = {
    eventType: 'scan:log',
    timestamp: new Date().toISOString(),
    scanId,
    protocolId,
    data: {
      level,
      message,
    },
  };

  // Publish to Redis for SSE subscribers
  const { getRedisClient } = await import('../lib/redis.js');
  const redis = await getRedisClient();
  await redis.publish(`scan:${scanId}:logs`, JSON.stringify(event));
}

// Funding Gate WebSocket Event Types
export interface ProtocolFundingStateChangedEvent {
  eventType: 'protocol:funding_state_changed';
  timestamp: string;
  protocolId: string;
  data: {
    fundingState: string;
    onChainBalance: number;
    canRequestScan: boolean;
  };
}

export interface ProtocolScanRequestedEvent {
  eventType: 'protocol:scan_requested';
  timestamp: string;
  protocolId: string;
  data: {
    scanId: string;
    branch: string;
  };
}

// Funding event emitters
export async function emitProtocolFundingStateChange(
  protocolId: string,
  data: {
    fundingState: string;
    onChainBalance: number;
    canRequestScan: boolean;
  }
): Promise<void> {
  if (!ioInstance) return;

  const event: ProtocolFundingStateChangedEvent = {
    eventType: 'protocol:funding_state_changed',
    timestamp: new Date().toISOString(),
    protocolId,
    data,
  };

  // Emit to protocol room
  ioInstance.to(`protocol:${protocolId}`).emit('protocol:funding_state_changed', event);
  ioInstance.to('protocols').emit('protocol:funding_state_changed', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCache(`protocol:${protocolId}`);
}

export async function emitProtocolScanRequested(
  protocolId: string,
  data: {
    scanId: string;
    branch: string;
  }
): Promise<void> {
  if (!ioInstance) return;

  const event: ProtocolScanRequestedEvent = {
    eventType: 'protocol:scan_requested',
    timestamp: new Date().toISOString(),
    protocolId,
    data,
  };

  // Emit to protocol room
  ioInstance.to(`protocol:${protocolId}`).emit('protocol:scan_requested', event);
  ioInstance.to('protocols').emit('protocol:scan_requested', event);

  // Invalidate caches
  await invalidateCachePattern(`dashboard:stats:*`);
  await invalidateCache(`protocol:scans:${protocolId}`);
}
