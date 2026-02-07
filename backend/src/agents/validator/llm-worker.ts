import { Worker, Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { getKimiClient } from '../../lib/llm.js';
import { getValidationService } from '../../services/validation.service.js';
import { emitAgentTaskUpdate } from '../../websocket/events.js';
import { decryptProof } from './steps/decrypt.js';
import { validateMessage, ProofSubmissionSchema } from '../../messages/schemas.js';
import type { ProofSubmissionMessage } from '../../messages/schemas.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = getPrismaClient();

let validatorLLMWorker: Worker<ProofSubmissionMessage> | null = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

/**
 * Start Validator Agent with LLM-based Proof Analysis
 *
 * This validator uses Kimi 2.5 LLM to analyze exploit proofs instead of
 * executing them. The LLM evaluates:
 * - Technical correctness of the exploit logic
 * - Validity of the attack vector
 * - Severity and impact assessment
 * - Confidence score (0-100)
 *
 * Uses BullMQ Worker on 'validation-jobs' queue (replaces Redis Pub/Sub).
 */
export async function startValidatorAgentLLM(): Promise<void> {
  if (validatorLLMWorker) {
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

  validatorLLMWorker = new Worker<ProofSubmissionMessage>(
    'validation-jobs',
    async (job: Job<ProofSubmissionMessage>) => {
      const submission = validateMessage(
        ProofSubmissionSchema,
        job.data,
        `validation job ${job.id}`
      );

      console.log(
        `[Validator Agent LLM] Received proof submission: ${submission.proofId}`
      );

      await processValidationLLM(submission);
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  validatorLLMWorker.on('completed', (job) => {
    console.log(`[Validator Agent LLM] Job ${job.id} completed`);
  });

  validatorLLMWorker.on('failed', (job, error) => {
    console.error(`[Validator Agent LLM] Job ${job?.id} failed:`, error.message);
  });

  console.log('[Validator Agent LLM] Running and listening for validation jobs...');
}

/**
 * Stop Validator Agent
 */
export async function stopValidatorAgentLLM(): Promise<void> {
  if (!validatorLLMWorker) {
    return;
  }

  console.log('[Validator Agent LLM] Stopping...');
  await validatorLLMWorker.close();
  validatorLLMWorker = null;
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
    // Read from researcher agent's cloned repository
    let contractCode = '';

    try {
      // Researcher clones to /tmp/thunder-repos/{protocolId}/{scanId}
      const sanitizedProtocolId = protocol.id.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedScanId = proof.scanId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const cacheDir = `/tmp/thunder-repos/${sanitizedProtocolId}/${sanitizedScanId}`;
      const contractPath = join(cacheDir, protocol.contractPath);

      contractCode = readFileSync(contractPath, 'utf-8');
      console.log(
        `[Validator LLM] Read contract code from ${contractPath} (${contractCode.length} chars)`
      );
    } catch (error) {
      // Try alternative path with just the vulnerable file from the finding
      try {
        const sanitizedProtocolId = protocol.id.replace(/[^a-zA-Z0-9-_]/g, '_');
        const sanitizedScanId = proof.scanId.replace(/[^a-zA-Z0-9-_]/g, '_');
        const cacheDir = `/tmp/thunder-repos/${sanitizedProtocolId}/${sanitizedScanId}`;
        const findingPath = join(cacheDir, proof.location?.filePath || '');

        contractCode = readFileSync(findingPath, 'utf-8');
        console.log(
          `[Validator LLM] Read contract code from finding location ${findingPath} (${contractCode.length} chars)`
        );
      } catch (findingError) {
        console.warn(
          '[Validator LLM] Could not read cached contract code, providing context from proof description'
        );
        // Provide useful context instead of placeholder
        contractCode = `// Contract: ${protocol.contractName || 'Unknown'}
// GitHub: ${protocol.githubUrl}
// Vulnerable File: ${proof.location?.filePath || 'Unknown'}
// Line: ${proof.location?.lineNumber || 'Unknown'}
// Function: ${proof.location?.functionSelector || 'Unknown'}
//
// Description from scan:
// ${proof.description}
//
// This vulnerability was detected by automated scanning tools (Slither/AI).
// Contract code not available in cache - validating based on proof details.`;
      }
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

    // Re-throw so BullMQ can retry if attempts remain
    throw error;
  }
}
