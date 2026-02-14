import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { processProtocolRegistration } from '../agents/protocol/index.js';
import type { ProtocolRegistrationJobData } from '../agents/protocol/worker.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ProtocolQueue');
const redisClient = getRedisClient();

// Protocol Registration Queue
export const protocolQueue = new Queue('protocol-registration', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

// Protocol Registration Worker
export const protocolWorker = new Worker<ProtocolRegistrationJobData>(
  'protocol-registration',
  async (job: Job<ProtocolRegistrationJobData>) => {
    log.info({ jobId: job.id, protocolId: job.data.protocolId }, 'Processing protocol registration job');

    try {
      const result = await processProtocolRegistration(job);

      if (!result.success) {
        throw new Error(result.error || 'Protocol registration failed');
      }

      return result;
    } catch (error) {
      log.error({ jobId: job.id, err: error }, 'Protocol registration job failed');
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 2,
  }
);

// Worker event handlers
protocolWorker.on('completed', (job) => {
  log.info({ jobId: job.id }, 'Protocol registration job completed successfully');
});

protocolWorker.on('failed', (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, 'Protocol registration job failed');
});

// Queue control functions
export async function addProtocolRegistrationJob(protocolId: string): Promise<void> {
  await protocolQueue.add(
    'register-protocol',
    { protocolId },
    {
      jobId: `protocol-${protocolId}`,
      removeOnComplete: true,
    }
  );
}

export async function pauseProtocolQueue(): Promise<void> {
  await protocolQueue.pause();
  log.info('Protocol registration queue paused');
}

export async function resumeProtocolQueue(): Promise<void> {
  await protocolQueue.resume();
  log.info('Protocol registration queue resumed');
}

export async function getProtocolQueueStatus(): Promise<{
  isPaused: boolean;
  jobCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}> {
  const isPaused = await protocolQueue.isPaused();
  const jobCounts = await protocolQueue.getJobCounts();
  
  return {
    isPaused,
    jobCounts: {
      waiting: jobCounts.waiting,
      active: jobCounts.active,
      completed: jobCounts.completed,
      failed: jobCounts.failed,
    },
  };
}

// Start protocol worker
export function startProtocolWorker(): Worker<ProtocolRegistrationJobData> {
  log.info('Initializing protocol registration worker...');
  return protocolWorker;
}

// Stop protocol worker
export async function stopProtocolWorker(): Promise<void> {
  await protocolWorker.close();
  log.info('Protocol registration worker stopped');
}

// Graceful shutdown
export async function closeProtocolQueue(): Promise<void> {
  await protocolWorker.close();
  await protocolQueue.close();
}
