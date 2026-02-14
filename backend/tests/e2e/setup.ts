/**
 * E2E Test Environment Setup
 *
 * Sets up the complete test environment for end-to-end demonstration tests:
 * - Initializes test database with Prisma
 * - Connects to Redis for queue management
 * - Configures mock blockchain and Kimi API
 * - Provides cleanup utilities
 */

import { getPrismaClient } from '../../src/lib/prisma.js';
import { getRedisClient } from '../../src/lib/redis.js';
import { Queue } from 'bullmq';

const prisma = getPrismaClient();
const redis = getRedisClient();

/**
 * Initialize test database - clear all data
 */
export async function setupDatabase(): Promise<void> {
  console.log('[E2E Setup] Clearing test database...');

  // Clear all data in reverse dependency order
  await prisma.paymentReconciliation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.vulnerability.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.scanStepRecord.deleteMany();
  await prisma.scan.deleteMany();
  await prisma.fundingEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.protocol.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.eventListenerState.deleteMany();

  console.log('[E2E Setup] Database cleared');
}

/**
 * Setup Redis and clear all queues
 */
export async function setupRedis(): Promise<void> {
  console.log('[E2E Setup] Clearing Redis queues...');

  try {
    // Clear all test queues
    const queueNames = [
      'protocol-registration',
      'scan-jobs',
      'payment-processing',
      'validation-queue',
    ];

    for (const queueName of queueNames) {
      try {
        const queue = new Queue(queueName, { connection: redis });
        await queue.obliterate({ force: true });
        await queue.close();
        console.log(`[E2E Setup] Cleared queue: ${queueName}`);
      } catch (error) {
        // Queue might not exist, which is fine
        console.log(`[E2E Setup] Queue ${queueName} not found or already empty`);
      }
    }

    // Clear Redis pub/sub channels (if needed)
    // Note: Pub/sub channels don't persist, but we can disconnect subscribers
    console.log('[E2E Setup] Redis queues cleared');
  } catch (error) {
    console.error('[E2E Setup] Error clearing Redis:', error);
    throw error;
  }
}

/**
 * Global setup - runs once before all E2E tests
 */
export async function globalSetup(): Promise<void> {
  console.log('[E2E Setup] Running global setup...');

  try {
    // Setup database
    await setupDatabase();

    // Setup Redis
    await setupRedis();

    console.log('[E2E Setup] Global setup completed');
  } catch (error) {
    console.error('[E2E Setup] Global setup failed:', error);
    await globalTeardown();
    throw error;
  }
}

/**
 * Global teardown - runs once after all E2E tests
 */
export async function globalTeardown(): Promise<void> {
  console.log('[E2E Setup] Running global teardown...');

  try {
    // Disconnect from database
    await prisma.$disconnect();

    // Disconnect from Redis
    await redis.disconnect();

    console.log('[E2E Setup] Global teardown completed');
  } catch (error) {
    console.error('[E2E Setup] Global teardown failed:', error);
  }
}

/**
 * Test-level setup - runs before each test
 */
export async function beforeEachTest(): Promise<void> {
  // Clear database for each test
  await setupDatabase();

  // Clear Redis queues
  await setupRedis();
}

/**
 * Test-level teardown - runs after each test
 */
export async function afterEachTest(): Promise<void> {
  // Optional: Add any test-level cleanup here
}

/**
 * Wait for condition to be true with polling
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 500
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Wait for queue job to complete
 */
export async function waitForQueueJob(
  queueName: string,
  jobId: string,
  timeout: number = 60000
): Promise<void> {
  const queue = new Queue(queueName, { connection: redis });

  await waitFor(
    async () => {
      const job = await queue.getJob(jobId);
      if (!job) return false;

      const state = await job.getState();
      return state === 'completed' || state === 'failed';
    },
    timeout,
    500
  );

  await queue.close();
}

/**
 * Get queue job status
 */
export async function getQueueJobStatus(
  queueName: string,
  jobId: string
): Promise<'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | null> {
  const queue = new Queue(queueName, { connection: redis });

  try {
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return state as 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  } finally {
    await queue.close();
  }
}

/**
 * Create test protocol in database
 */
export async function createTestProtocol(options: {
  ownerAddress?: string;
  onChainProtocolId?: string;
  totalBountyPool?: number;
  availableBounty?: number;
  githubUrl?: string;
  branch?: string;
} = {}) {
  return await prisma.protocol.create({
    data: {
      authUserId: 'test-user-e2e',
      ownerAddress: options.ownerAddress || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      githubUrl: options.githubUrl || 'https://github.com/Cyfrin/2023-11-Thunder-Loan',
      branch: options.branch || 'main',
      contractPath: 'contracts',
      contractName: 'ThunderLoan',
      bountyTerms: 'E2E Test Bounty Terms',
      status: 'PENDING',
      registrationState: 'PENDING',
      onChainProtocolId: options.onChainProtocolId || `test-protocol-${Date.now()}`,
      totalBountyPool: options.totalBountyPool ?? 10000,
      availableBounty: options.availableBounty ?? 10000,
      paidBounty: 0,
    },
  });
}
