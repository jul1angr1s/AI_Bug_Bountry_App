#!/usr/bin/env npx tsx
/**
 * Test Validation Event Streaming
 *
 * Enqueues a validation job for an existing proof to test
 * the new real-time progress + log streaming via Redis.
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Test Validation Event Streaming ===\n');

  // Find a proof that has a finding with scan + protocol
  const proof = await prisma.proof.findFirst({
    where: {
      findingId: { not: null },
    },
    include: {
      finding: {
        include: {
          scan: {
            include: { protocol: true },
          },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  if (!proof || !proof.finding || !proof.finding.scan) {
    console.log('No proofs with findings available. Run a scan first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  const finding = proof.finding;
  const scan = finding.scan;

  console.log('Using proof:');
  console.log(`  Proof ID: ${proof.id}`);
  console.log(`  Finding: ${finding.vulnerabilityType} (${finding.severity})`);
  console.log(`  Protocol: ${scan.protocol.githubUrl}`);
  console.log(`  Current status: ${proof.status}`);
  console.log();

  // Setup Redis subscriber to watch events
  const redisPassword = process.env.REDIS_PASSWORD;
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: redisPassword,
  });

  console.log('Subscribing to Redis channels...');
  await redis.subscribe(
    `validation:${proof.id}:progress`,
    `validation:${proof.id}:logs`
  );

  redis.on('message', (channel: string, message: string) => {
    const event = JSON.parse(message);
    const isLog = channel.endsWith(':logs');

    if (isLog) {
      const { level, message: msg } = event.data;
      console.log(`  [LOG] [${level}] ${msg}`);
    } else {
      const { currentStep, state, progress, message: msg, workerType } = event.data;
      console.log(`  [PROGRESS] ${workerType} | ${currentStep} | ${state} | ${progress}% | ${msg}`);
    }

    // Close when done
    if (event.data?.state === 'COMPLETED' || event.data?.state === 'FAILED') {
      console.log('\n=== Streaming complete ===');
      setTimeout(() => {
        redis.disconnect();
        prisma.$disconnect();
        process.exit(0);
      }, 1000);
    }
  });

  // Enqueue validation job
  const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: redisPassword,
    maxRetriesPerRequest: null,
  };

  const validationQueue = new Queue('validation-jobs', {
    connection: redisConnection,
  });

  const submissionMessage = {
    version: '1.0' as const,
    scanId: scan.id,
    protocolId: scan.protocolId,
    proofId: proof.id,
    findingId: finding.id,
    commitHash: 'latest',
    timestamp: new Date().toISOString(),
  };

  console.log('Enqueuing validation job...\n');
  await validationQueue.add(`validate:${proof.id}`, submissionMessage);
  console.log('Job enqueued. Waiting for events...\n');

  // Timeout after 120 seconds
  setTimeout(() => {
    console.log('\nTimeout reached (120s). Exiting.');
    redis.disconnect();
    prisma.$disconnect();
    process.exit(1);
  }, 120000);
}

main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
