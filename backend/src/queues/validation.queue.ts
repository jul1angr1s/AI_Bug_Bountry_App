import { Queue, Job } from 'bullmq';
import type { ProofSubmissionMessage } from '../messages/schemas.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ValidationQueue');

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

/**
 * Validation Queue — replaces Redis Pub/Sub for proof submissions.
 *
 * Benefits over Pub/Sub:
 * - Guaranteed delivery (messages survive validator restarts)
 * - Automatic retries with exponential backoff
 * - Job inspection and monitoring via BullMQ dashboard
 * - Consistent with scan and payment queues
 */
export const validationQueue = new Queue<ProofSubmissionMessage>('validation-jobs', {
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

/**
 * Enqueue a proof for validation.
 * Replaces: redis.publish('PROOF_SUBMISSION', JSON.stringify(message))
 */
export async function enqueueValidation(
  message: ProofSubmissionMessage
): Promise<Job<ProofSubmissionMessage>> {
  return validationQueue.add(
    `validate:${message.proofId}`,
    message,
    {
      jobId: `proof-${message.proofId}`,
      priority: 1,
    }
  );
}

export async function getValidationQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    validationQueue.getWaitingCount(),
    validationQueue.getActiveCount(),
    validationQueue.getCompletedCount(),
    validationQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function closeValidationQueue(): Promise<void> {
  await validationQueue.close();
  log.info('Validation queue closed');
}
