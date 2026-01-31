import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { getPrismaClient } from '../lib/prisma.js';
import { updateProtocolRegistrationState } from '../services/protocol.service.js';
import { emitAgentTaskUpdate } from '../websocket/events.js';

const redisClient = getRedisClient();
const prisma = getPrismaClient();

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
export const protocolWorker = new Worker(
  'protocol-registration',
  async (job: Job<{ protocolId: string }>) => {
    const { protocolId } = job.data;
    
    console.log(`Processing protocol registration job ${job.id} for protocol ${protocolId}`);
    
    try {
      // Get protocol details
      const protocol = await prisma.protocol.findUnique({
        where: { id: protocolId },
      });

      if (!protocol) {
        throw new Error(`Protocol ${protocolId} not found`);
      }

      // Update registration state to PROCESSING
      await updateProtocolRegistrationState(protocolId, 'PROCESSING');
      
      // Emit task update
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Cloning repository',
        10
      );

      // Step 1: Clone repository (simulated)
      await job.updateProgress(20);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Emit task update
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Verifying contract path',
        40
      );

      // Step 2: Verify contract path (simulated)
      await job.updateProgress(40);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Emit task update
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Compiling contracts',
        60
      );

      // Step 3: Compile contracts (simulated)
      await job.updateProgress(60);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Emit task update
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Registering on-chain',
        80
      );

      // Step 4: On-chain registration (simulated for now)
      // In production, this would interact with ProtocolRegistry on Base Sepolia
      await job.updateProgress(80);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate successful registration
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

      // Update protocol to ACTIVE
      await updateProtocolRegistrationState(protocolId, 'ACTIVE', mockTxHash);

      // Emit task update
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Registration complete',
        100
      );

      await job.updateProgress(100);

      return {
        success: true,
        protocolId,
        txHash: mockTxHash,
      };
    } catch (error) {
      console.error(`Protocol registration job ${job.id} failed:`, error);
      
      // Update protocol to FAILED
      await updateProtocolRegistrationState(
        protocolId,
        'FAILED',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );

      // Emit task update with failure
      await emitAgentTaskUpdate(
        'protocol-agent',
        'Registration failed',
        0
      );

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

// Graceful shutdown
export async function closeProtocolQueue(): Promise<void> {
  await protocolWorker.close();
  await protocolQueue.close();
}
