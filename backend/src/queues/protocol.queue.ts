import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { processProtocolRegistration } from '../agents/protocol/index.js';
import type { ProtocolRegistrationJobData } from '../agents/protocol/worker.js';

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
    console.log(`Processing protocol registration job ${job.id} for protocol ${job.data.protocolId}`);

    try {
      const result = await processProtocolRegistration(job);

      if (!result.success) {
        throw new Error(result.error || 'Protocol registration failed');
      }

      return result;
    } catch (error) {
      console.error(`Protocol registration job ${job.id} failed:`, error);
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
  console.log(`Protocol registration job ${job.id} completed successfully`);
});

protocolWorker.on('failed', (job, err) => {
  console.error(`Protocol registration job ${job?.id} failed:`, err.message);
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
  console.log('Protocol registration queue paused');
}

export async function resumeProtocolQueue(): Promise<void> {
  await protocolQueue.resume();
  console.log('Protocol registration queue resumed');
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
  console.log('[ProtocolWorker] Initializing protocol registration worker...');
  return protocolWorker;
}

// Stop protocol worker
export async function stopProtocolWorker(): Promise<void> {
  await protocolWorker.close();
  console.log('[ProtocolWorker] Protocol registration worker stopped');
}

// Graceful shutdown
export async function closeProtocolQueue(): Promise<void> {
  await protocolWorker.close();
  await protocolQueue.close();
}
