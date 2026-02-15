import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { getRedisConnectionOptions } from '../lib/redis.js';

// Redis connection for BullMQ
const redisConnection = getRedisConnectionOptions();

// Scan Job Queue
export const scanQueue = new Queue('scan-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Queue event types
export interface ScanJobData {
  scanId: string;
  protocolId: string;
  targetBranch?: string;
  targetCommitHash?: string;
  queuedAt?: number;
}

export interface ScanStepData {
  scanId: string;
  step: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

// Add scan job to queue
export async function enqueueScan(jobData: ScanJobData): Promise<Job<ScanJobData>> {
  return scanQueue.add(`scan:${jobData.scanId}`, {
    ...jobData,
    queuedAt: jobData.queuedAt ?? Date.now(),
  }, {
    jobId: jobData.scanId,
    priority: 1,
  });
}

// Cancel scan job
export async function cancelScanJob(scanId: string): Promise<void> {
  const job = await scanQueue.getJob(scanId);
  if (job) {
    await job.remove();
  }
}

// Get queue metrics
export async function getQueueMetrics(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    scanQueue.getWaitingCount(),
    scanQueue.getActiveCount(),
    scanQueue.getCompletedCount(),
    scanQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
