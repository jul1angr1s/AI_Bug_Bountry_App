/**
 * Script to trigger a new scan on an existing protocol
 * This is useful for testing the payment flow without re-registering
 */
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TRIGGER NEW SCAN ===\n');

  // Find the existing protocol
  const protocol = await prisma.protocol.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!protocol) {
    console.error('No protocol found! Please register a protocol first.');
    process.exit(1);
  }

  console.log('Found protocol:', protocol.id);
  console.log('  GitHub URL:', protocol.githubUrl);
  console.log('  Contract:', protocol.contractName);

  // Create a new scan record
  const agent = await prisma.agent.findFirst({
    where: { type: 'RESEARCHER' }
  });

  if (!agent) {
    console.error('No researcher agent found!');
    process.exit(1);
  }

  const scan = await prisma.scan.create({
    data: {
      protocolId: protocol.id,
      agentId: agent.id,
      state: 'QUEUED',
      currentStep: 'CLONE',
      targetBranch: protocol.branch || 'main',
    },
  });

  console.log('\nCreated new scan:', scan.id);

  // Add job to Redis queue
  const redis = createClient({
    url: process.env.REDIS_URL || 'redis://:redis_dev_2024@localhost:6379',
  });

  await redis.connect();

  const jobData = {
    scanId: scan.id,
    protocolId: protocol.id,
    targetBranch: protocol.branch || 'main',
  };

  // BullMQ job format
  const jobId = `scan-${scan.id}`;
  
  // Push to BullMQ queue (simplified - in production use BullMQ client)
  await redis.xAdd('bull:scan-jobs:id', '*', {
    data: JSON.stringify(jobData),
    name: 'scan',
    id: jobId,
  });

  console.log('Added scan job to queue');
  console.log('\nScan will start shortly. Check the backend terminal for progress.');

  await redis.disconnect();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
