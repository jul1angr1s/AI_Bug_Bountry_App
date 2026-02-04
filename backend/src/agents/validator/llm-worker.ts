import { getRedisClient } from '../../lib/redis.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { getKimiClient } from '../../lib/llm.js';
import { getValidationService } from '../../services/validation.service.js';
import { emitAgentTaskUpdate } from '../../websocket/events.js';
import { decryptProof, type ProofSubmissionMessage } from './steps/decrypt.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const redis = await getRedisClient();
const prisma = getPrismaClient();

let isRunning = false;
let subscriber: any = null;

/**
 * Start Validator Agent with LLM-based Proof Analysis
 *
 * This validator uses Kimi 2.5 LLM to analyze exploit proofs instead of
 * executing them. The LLM evaluates:
 * - Technical correctness of the exploit logic
 * - Validity of the attack vector
 * - Severity and impact assessment
 * - Confidence score (0-100)
 */
export async function startValidatorAgentLLM(): Promise<void> {
  if (isRunning) {
    console.log('[Validator Agent LLM] Already running');
    return;
  }

  console.log('[Validator Agent LLM] Starting...');

  // Verify LLM client is configured
  try {
    const kimiClient = getKimiClient();
    const healthy = await kimiClient.healthCheck();

    if (!healthy) {
      console.warn(
        '[Validator Agent LLM] Kimi API health check failed - validation may not work'
      );
    } else {
      console.log('[Validator Agent LLM] Kimi API ready');
    }
  } catch (error) {
    console.error('[Validator Agent LLM] Failed to initialize Kimi client:', error);
    throw error;
  }

  // Create Redis subscriber (use a new client instance for pub/sub)
  // Note: duplicate() creates a new connection, no need to call connect() manually
  subscriber = redis.duplicate();

  // Set up message handler BEFORE subscribing (ioredis pattern)
  // In ioredis, subscribe() doesn't take a message callback - messages come via 'message' event
  subscriber.on('message', async (channel: string, message: string) => {
    if (channel !== 'PROOF_SUBMISSION') {
      return;
    }

    try {
      const submission: ProofSubmissionMessage = JSON.parse(message);
      console.log(
        `[Validator Agent LLM] Received proof submission: ${submission.proofId}`
      );

      // Process validation asynchronously
      processValidationLLM(submission).catch((error) => {
        console.error('[Validator Agent LLM] Validation processing error:', error);
      });
    } catch (error) {
      console.error('[Validator Agent LLM] Failed to parse proof submission:', error);
    }
  });

  // Now subscribe to the channel
  await subscriber.subscribe('PROOF_SUBMISSION');
  console.log('[Validator Agent LLM] Subscribed to PROOF_SUBMISSION channel');

  isRunning = true;
  console.log('[Validator Agent LLM] Running and listening for proofs...');
}

/**
 * Stop Validator Agent
 */
export async function stopValidatorAgentLLM(): Promise<void> {
  if (!isRunning) {
    return;
  }

  console.log('[Validator Agent LLM] Stopping...');

  if (subscriber) {
    await subscriber.unsubscribe('PROOF_SUBMISSION');
    await subscriber.quit();
    subscriber = null;
  }

  isRunning = false;
  console.log('[Validator Agent LLM] Stopped');
}

/**
 * Process a single validation request with LLM analysis
 */
async function processValidationLLM(submission: ProofSubmissionMessage): Promise<void> {
  try {
    console.log(`[Validator LLM] Processing validation for proof ${submission.proofId}`);

    const validationService = getValidationService();
    const kimiClient = getKimiClient();

    await emitAgentTaskUpdate('validator-agent', 'Decrypting proof', 10);

    // =================
    // STEP 1: Decrypt and parse proof
    // =================
    const decryptResult = await decryptProof(submission);

    if (!decryptResult.success || !decryptResult.proof) {
      throw new Error(decryptResult.error || 'Proof decryption failed');
    }

    const proof = decryptResult.proof;
    console.log(`[Validator LLM] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitAgentTaskUpdate('validator-agent', 'Fetching finding details', 20);

    // =================
    // STEP 2: Fetch finding and protocol details
    // =================
    const finding = await validationService.getFinding(proof.findingId);

    if (!finding || !finding.scan || !finding.scan.protocol) {
      throw new Error(`Finding ${proof.findingId} or associated protocol not found`);
    }

    const protocol = finding.scan.protocol;
    console.log(`[Validator LLM] Protocol: ${protocol.githubUrl}`);

    await emitAgentTaskUpdate('validator-agent', 'Reading contract code', 30);

    // =================
    // STEP 3: Read contract code for context
    // =================
    // In production, we would clone the repo and read the contract
    // For now, we'll use a placeholder or read from a cached location
    let contractCode = '';

    try {
      // Try to read from researcher agent's cache if available
      const cacheDir = `/tmp/researcher-${proof.scanId}`;
      const contractPath = join(cacheDir, protocol.contractPath);

      contractCode = readFileSync(contractPath, 'utf-8');
      console.log(
        `[Validator LLM] Read contract code (${contractCode.length} chars)`
      );
    } catch (error) {
      console.warn(
        '[Validator LLM] Could not read cached contract code, using proof only'
      );
      contractCode = '// Contract code not available - analyzing proof standalone';
    }

    await emitAgentTaskUpdate('validator-agent', 'Analyzing proof with Kimi 2.5 LLM', 50);

    // =================
    // STEP 4: Analyze proof with Kimi 2.5 LLM
    // =================
    // Build proof details from exploitDetails (the correct field in DecryptedProof)
    const proofDetails = proof.exploitDetails
      ? `Reproduction Steps:\n${proof.exploitDetails.reproductionSteps?.join('\n') || 'N/A'}\n\nExpected Outcome: ${proof.exploitDetails.expectedOutcome || 'N/A'}\n\nActual Outcome: ${proof.exploitDetails.actualOutcome || 'N/A'}`
      : `Description: ${proof.description}\nLocation: ${proof.location?.filePath || 'unknown'}:${proof.location?.lineNumber || 'N/A'}`;

    const analysis = await kimiClient.analyzeProof(
      proof.vulnerabilityType,
      proofDetails,
      contractCode,
      finding.description
    );

    console.log(`[Validator LLM] Analysis complete:`, {
      isValid: analysis.isValid,
      confidence: analysis.confidence,
      severity: analysis.severity,
    });

    await emitAgentTaskUpdate('validator-agent', 'Updating validation result', 80);

    // =================
    // STEP 5: Update finding with validation result
    // =================
    await validationService.validateFinding(proof.findingId, {
      isValid: analysis.isValid,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      severity: analysis.severity as any,
      exploitability: analysis.exploitability,
    });

    // =================
    // STEP 6: Update proof status
    // =================
    await prisma.proof.update({
      where: { id: submission.proofId },
      data: {
        status: analysis.isValid ? 'VALIDATED' : 'REJECTED',
        validatedAt: new Date(),
      },
    });

    console.log(
      `[Validator LLM] Validation complete: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'}`
    );

    await emitAgentTaskUpdate(
      'validator-agent',
      `Validation ${analysis.isValid ? 'complete' : 'rejected'} (${analysis.confidence}% confidence)`,
      100
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator LLM] Validation failed:`, errorMessage);

    // Update proof status to FAILED
    try {
      await prisma.proof.update({
        where: { id: submission.proofId },
        data: {
          status: 'REJECTED',
        },
      });

      // Update finding to REJECTED
      const decryptResult = await decryptProof(submission);
      if (decryptResult.success && decryptResult.proof) {
        await prisma.finding.update({
          where: { id: decryptResult.proof.findingId },
          data: {
            status: 'REJECTED',
            validatedAt: new Date(),
            description: `Validation failed: ${errorMessage}`,
          },
        });
      }
    } catch (dbError) {
      console.error('[Validator LLM] Failed to update database:', dbError);
    }

    await emitAgentTaskUpdate(
      'validator-agent',
      `Validation error: ${errorMessage}`,
      0
    );
  }
}
