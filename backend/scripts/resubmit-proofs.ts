/**
 * Script to resubmit existing proofs for validation
 * This is useful for testing validation flow without re-running the full scan
 */
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();

async function main() {
  console.log('=== RESUBMIT PROOFS ===\n');

  // Find proofs that exist but may not have been validated
  const proofs = await prisma.proof.findMany({
    include: {
      finding: {
        include: {
          scan: true
        }
      }
    },
    take: 10,
  });

  if (proofs.length === 0) {
    console.log('No proofs found to resubmit.');
    process.exit(0);
  }

  console.log(`Found ${proofs.length} proofs to resubmit`);

  // Connect to Redis using ioredis
  const redisUrl = process.env.REDIS_URL || 'redis://:redis_dev_2024@localhost:6379';
  const redis = new Redis(redisUrl);

  for (const proof of proofs) {
    if (!proof.finding || !proof.finding.scan) {
      console.log(`Skipping proof ${proof.id} - missing finding or scan`);
      continue;
    }

    console.log(`\nResubmitting proof ${proof.id}...`);
    console.log(`  Finding: ${proof.findingId}`);
    console.log(`  Status: ${proof.status}`);

    // Build submission message matching ProofSubmissionMessage interface
    const submissionMessage = {
      scanId: proof.finding.scanId,
      protocolId: proof.finding.scan.protocolId,
      proofId: proof.id,
      findingId: proof.findingId,
      commitHash: proof.finding.scan.targetCommitHash || 'unknown',
      signature: proof.researcherSignature,
      encryptedPayload: proof.encryptedPayload,
      encryptionKeyId: proof.encryptionKeyId,
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis channel
    await redis.publish('PROOF_SUBMISSION', JSON.stringify(submissionMessage));
    console.log(`  Published to PROOF_SUBMISSION channel`);

    // Small delay between submissions
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== RESUBMISSION COMPLETE ===');
  console.log('Check the backend terminal and debug logs for validation progress.');

  await redis.quit();
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
