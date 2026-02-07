import { ChildProcess } from 'child_process';
import { proofRepository } from '../../../db/repositories.js';
import { killAnvil } from './deploy.js';
import { ProofData } from './proof-generation.js';
import { enqueueValidation } from '../../../queues/validation.queue.js';
import type { ProofSubmissionMessage } from '../../../messages/schemas.js';

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

  console.log(`[Submit] Submitting ${proofs.length} proofs for scan ${scanId}...`);

  const submissionTimestamp = new Date().toISOString();
  let proofsSubmitted = 0;

  try {
    // Get all proofs from database for this scan
    const dbProofs = await proofRepository.getProofsByScan(scanId);

    console.log(`[Submit] Found ${dbProofs.length} proofs in database`);

    // Submit each proof via BullMQ validation queue (guaranteed delivery + retries)
    for (const dbProof of dbProofs) {
      try {
        if (!dbProof.findingId) {
          console.warn(`[Submit] Proof ${dbProof.id} has no findingId, skipping`);
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

        console.log(`[Submit] Submitted proof ${dbProof.id} to validation queue`);
      } catch (error) {
        console.error(`[Submit] Failed to submit proof ${dbProof.id}:`, error);
        // Continue with other proofs
      }
    }

    console.log(`[Submit] Successfully submitted ${proofsSubmitted} proofs`);

  } catch (error) {
    console.error('[Submit] Error during proof submission:', error);
    throw new Error(`Proof submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Cleanup: Kill Anvil process if it exists
  let cleanupCompleted = false;

  if (anvilProcess) {
    try {
      console.log('[Submit] Cleaning up Anvil process...');
      await killAnvil(anvilProcess);
      cleanupCompleted = true;
      console.log('[Submit] Anvil cleanup completed');
    } catch (error) {
      console.error('[Submit] Failed to cleanup Anvil:', error);
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
      console.log('[Cleanup] Terminating Anvil process...');
      await killAnvil(anvilProcess);
      console.log('[Cleanup] Anvil terminated successfully');
    } catch (error) {
      console.error('[Cleanup] Failed to terminate Anvil:', error);
    }
  }
}
