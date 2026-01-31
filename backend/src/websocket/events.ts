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
  const redis = getRedisClient();
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
