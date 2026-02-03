import { Queue } from 'bullmq';
import { getRedisClient } from '../src/lib/redis.js';

async function retryProtocol() {
  const protocolId = '0acf0492-6607-45c9-9ac0-2cb900b8b723';

  console.log('\n=== Retrying Protocol Registration ===\n');

  const redisClient = getRedisClient();

  const protocolQueue = new Queue('protocol-registration', {
    connection: redisClient,
  });

  // Add job to queue
  const job = await protocolQueue.add(
    'register-protocol',
    { protocolId },
    {
      jobId: `protocol-${protocolId}-retry`,
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );

  console.log(`✓ Protocol registration job added to queue`);
  console.log(`  Job ID: ${job.id}`);
  console.log(`  Protocol ID: ${protocolId}`);
  console.log(`\nThe protocol worker will process this job shortly...`);

  await protocolQueue.close();
  await redisClient.quit();
}

retryProtocol().catch(console.error);
