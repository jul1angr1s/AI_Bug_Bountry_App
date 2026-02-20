/**
 * Resubmit Stuck Validations
 *
 * Finds proofs stuck in VALIDATING or SUBMITTED status (indicating a failed
 * validation job that didn't finalize) and re-enqueues them for processing.
 *
 * Usage: npx tsx backend/scripts/resubmit-stuck-validations.ts
 *   --dry-run   Show what would be resubmitted without making changes
 */

import { PrismaClient } from '@prisma/client';
import { validationQueue, enqueueValidation } from '../src/queues/validation.queue.js';
import type { ProofSubmissionMessage } from '../src/messages/schemas.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(dryRun ? '[DRY RUN] Scanning for stuck proofs...\n' : 'Scanning for stuck proofs...\n');

  const stuckProofs = await prisma.proof.findMany({
    where: {
      status: { in: ['VALIDATING', 'SUBMITTED'] },
    },
    include: {
      scan: { select: { protocolId: true, targetCommitHash: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  if (stuckProofs.length === 0) {
    console.log('No stuck proofs found.');
    return;
  }

  console.log(`Found ${stuckProofs.length} stuck proof(s):\n`);

  for (const proof of stuckProofs) {
    const age = Date.now() - proof.submittedAt.getTime();
    const ageMin = Math.round(age / 60_000);

    console.log(`  Proof ${proof.id}`);
    console.log(`    Status:    ${proof.status}`);
    console.log(`    Scan:      ${proof.scanId}`);
    console.log(`    Finding:   ${proof.findingId ?? '(none)'}`);
    console.log(`    Submitted: ${proof.submittedAt.toISOString()} (${ageMin} min ago)`);
    console.log(`    On-chain:  ${proof.onChainValidationId ?? '(none)'}`);

    if (!proof.findingId || !proof.scan) {
      console.log(`    SKIP — missing findingId or scan relation\n`);
      continue;
    }

    if (dryRun) {
      console.log(`    Would resubmit\n`);
      continue;
    }

    const message: ProofSubmissionMessage = {
      version: '1.0',
      scanId: proof.scanId,
      protocolId: proof.scan.protocolId,
      proofId: proof.id,
      findingId: proof.findingId,
      commitHash: proof.scan.targetCommitHash || 'unknown',
      signature: proof.researcherSignature,
      encryptedPayload: proof.encryptedPayload,
      encryptionKeyId: proof.encryptionKeyId,
      timestamp: proof.submittedAt.toISOString(),
    };

    // Remove the old failed job so we can re-enqueue with the same jobId
    const oldJobId = `proof-${proof.id}`;
    try {
      const oldJob = await validationQueue.getJob(oldJobId);
      if (oldJob) {
        await oldJob.remove();
        console.log(`    Removed old job ${oldJobId}`);
      }
    } catch (err) {
      console.log(`    Could not remove old job: ${err}`);
    }

    // Reset proof status to SUBMITTED so the worker picks it up cleanly
    await prisma.proof.update({
      where: { id: proof.id },
      data: { status: 'SUBMITTED' },
    });

    await enqueueValidation(message);
    console.log(`    Re-enqueued successfully\n`);
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await validationQueue.close();
  });
