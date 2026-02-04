import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';

// Initialize Redis client
const redisClient = await getRedisClient();

// Payment Job Data Interface (Task 2.1)
export interface PaymentJobData {
  paymentId: string;
  validationId: string;
  protocolId: string;
}

// Payment Processing Queue (Task 2.2 & 2.3)
export const paymentQueue = new Queue<PaymentJobData>('payment-processing', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // First retry: 1s, second: 5s, third: 25s
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

// Queue Control Functions (Task 2.4)

/**
 * Add a payment job to the processing queue
 * @param data Payment job data containing paymentId, validationId, and protocolId
 */
export async function addPaymentJob(data: PaymentJobData): Promise<void> {
  await paymentQueue.add(
    'process-payment',
    data,
    {
      jobId: `payment-${data.paymentId}`,
      removeOnComplete: true,
    }
  );
  console.log(`Added payment job ${data.paymentId} to queue for validation ${data.validationId}`);
}

/**
 * Pause the payment processing queue
 */
export async function pauseQueue(): Promise<void> {
  await paymentQueue.pause();
  console.log('Payment processing queue paused');
}

/**
 * Resume the payment processing queue
 */
export async function resumeQueue(): Promise<void> {
  await paymentQueue.resume();
  console.log('Payment processing queue resumed');
}

/**
 * Get current queue status and metrics (Task 2.5)
 * @returns Queue status including pause state, job counts, and processing metrics
 */
export async function getQueueStatus(): Promise<{
  isPaused: boolean;
  jobCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  processingRate?: {
    processed: number;
    failed: number;
  };
}> {
  const isPaused = await paymentQueue.isPaused();
  const jobCounts = await paymentQueue.getJobCounts();

  // Calculate processing rate from job counts
  const processingRate = {
    processed: jobCounts.completed,
    failed: jobCounts.failed,
  };

  return {
    isPaused,
    jobCounts: {
      waiting: jobCounts.waiting,
      active: jobCounts.active,
      completed: jobCounts.completed,
      failed: jobCounts.failed,
    },
    processingRate,
  };
}

// Graceful shutdown
export async function closePaymentQueue(): Promise<void> {
  await paymentQueue.close();
  console.log('Payment processing queue closed');
}
