import { ChildProcess } from 'child_process';
import { proofRepository } from '../../../db/repositories.js';
import { killAnvil } from './deploy.js';
import { ProofData } from './proof-generation.js';
import { enqueueValidation } from '../../../queues/validation.queue.js';
import type { ProofSubmissionMessage } from '../../../messages/schemas.js';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ResearcherSubmit');

export interface SubmitStepParams {
  scanId: string;
  protocolId: string;
  proofs: ProofData[];
  targetCommitHash?: string;
  anvilProcess?: ChildProcess;
}

export interface SubmitStepResult {
  proofsSubmitted: number;
  submissionTimestamp: string;
  cleanupCompleted: boolean;
}

/**
 * SUBMIT Step - Submit proofs to Validator Agent
 *
 * This step:
 * 1. Publishes proofs to Redis channel for Validator Agent
 * 2. Updates proof status to SUBMITTED in database
 * 3. Cleans up Anvil process
 * 4. Emits WebSocket events for UI updates
 * 5. Returns submission confirmation
 */
export async function executeSubmitStep(params: SubmitStepParams): Promise<SubmitStepResult> {
  const { scanId, protocolId, proofs, targetCommitHash, anvilProcess } = params;

  log.info({ proofCount: proofs.length, scanId }, 'Submitting proofs...');

  const submissionTimestamp = new Date().toISOString();
  let proofsSubmitted = 0;

  try {
    // Get all proofs from database for this scan
    const dbProofs = await proofRepository.getProofsByScan(scanId);

    log.info({ count: dbProofs.length }, 'Found proofs in database');

    // Submit each proof via BullMQ validation queue (guaranteed delivery + retries)
    for (const dbProof of dbProofs) {
      try {
        if (!dbProof.findingId) {
          log.warn({ proofId: dbProof.id }, 'Proof has no findingId, skipping');
          continue;
        }

        const submissionMessage: ProofSubmissionMessage = {
          version: '1.0',
          scanId,
          protocolId,
          proofId: dbProof.id,
          findingId: dbProof.findingId,
          commitHash: targetCommitHash || 'latest',
          signature: dbProof.researcherSignature,
          encryptedPayload: dbProof.encryptedPayload,
          encryptionKeyId: dbProof.encryptionKeyId,
          timestamp: submissionTimestamp,
        };

        // Enqueue to BullMQ validation queue (replaces Redis Pub/Sub)
        await enqueueValidation(submissionMessage);

        // Update proof status in database
        await proofRepository.updateProofStatus(dbProof.id, 'SUBMITTED');

        proofsSubmitted++;

        log.info({ proofId: dbProof.id }, 'Submitted proof to validation queue');
      } catch (error) {
        log.error({ err: error, proofId: dbProof.id }, 'Failed to submit proof');
        // Continue with other proofs
      }
    }

    log.info({ proofsSubmitted }, 'Successfully submitted proofs');

  } catch (error) {
    log.error({ err: error }, 'Error during proof submission');
    throw new Error(`Proof submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Cleanup: Kill Anvil process if it exists
  let cleanupCompleted = false;

  if (anvilProcess) {
    try {
      log.info('Cleaning up Anvil process...');
      await killAnvil(anvilProcess);
      cleanupCompleted = true;
      log.info('Anvil cleanup completed');
    } catch (error) {
      log.error({ err: error }, 'Failed to cleanup Anvil');
      // Don't throw - cleanup is best-effort
    }
  } else {
    // No Anvil to cleanup
    cleanupCompleted = true;
  }

  // Emit WebSocket event for UI updates
  // This is handled by the worker's emitScanProgress calls

  return {
    proofsSubmitted,
    submissionTimestamp,
    cleanupCompleted,
  };
}

/**
 * Cleanup function to be called on scan failure or cancellation
 */
export async function cleanupResources(anvilProcess?: ChildProcess): Promise<void> {
  if (anvilProcess) {
    try {
      log.info('Terminating Anvil process...');
      await killAnvil(anvilProcess);
      log.info('Anvil terminated successfully');
    } catch (error) {
      log.error({ err: error }, 'Failed to terminate Anvil');
    }
  }
}
