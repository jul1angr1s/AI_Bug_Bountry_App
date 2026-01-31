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
  await invalidateCache(CACHE_KEYS.AGENT_STATUS);
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
  await invalidateCache(CACHE_KEYS.DASHBOARD_STATS(protocolId));
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
  await invalidateCache(CACHE_KEYS.DASHBOARD_STATS(protocolId));
  await invalidateCachePattern(`protocol:vulnerabilities:${protocolId}:*`);
}
