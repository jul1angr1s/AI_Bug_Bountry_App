import { Worker, Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { getKimiClient, isLLMUnavailableError } from '../../lib/llm.js';
import { getValidationService } from '../../services/validation.service.js';
import { emitValidationProgress, emitValidationLog } from '../../websocket/events.js';
import { decryptProof } from './steps/decrypt.js';
import { validateMessage, ProofSubmissionSchema } from '../../messages/schemas.js';
import type { ProofSubmissionMessage } from '../../messages/schemas.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationRegistryClient, ValidationOutcome, Severity as OnChainSeverity } from '../../blockchain/index.js';
import { ethers } from 'ethers';
import { reputationService } from '../../services/reputation.service.js';
import { agentIdentityService } from '../../services/agent-identity.service.js';
import { createLogger } from '../../lib/logger.js';
import type { FeedbackType, AgentIdentityType } from '@prisma/client';
import { getRedisConnectionOptions } from '../../lib/redis.js';

const prisma = getPrismaClient();
const log = createLogger('ValidatorLLM');

let validatorLLMWorker: Worker<ProofSubmissionMessage> | null = null;

const redisConnection = getRedisConnectionOptions();

class ValidationStepTimeoutError extends Error {
  constructor(
    public readonly step: string,
    public readonly timeoutMs: number
  ) {
    super(`Validation step ${step} timed out after ${timeoutMs}ms`);
    this.name = 'ValidationStepTimeoutError';
  }
}

const VALIDATION_STEP_TIMEOUTS_MS = {
  DECRYPT_PROOF: Number(process.env.VALIDATOR_STEP_TIMEOUT_DECRYPT_MS || '30000'),
  FETCH_DETAILS: Number(process.env.VALIDATOR_STEP_TIMEOUT_FETCH_MS || '30000'),
  LLM_ANALYSIS: Number(process.env.VALIDATOR_STEP_TIMEOUT_LLM_MS || '660000'),
  UPDATE_RESULT: Number(process.env.VALIDATOR_STEP_TIMEOUT_UPDATE_MS || '30000'),
  RECORD_ONCHAIN: Number(process.env.VALIDATOR_STEP_TIMEOUT_ONCHAIN_MS || '180000'),
  REPUTATION: Number(process.env.VALIDATOR_STEP_TIMEOUT_REPUTATION_MS || '60000'),
} as const;

async function runWithStepTimeout<T>(
  step: keyof typeof VALIDATION_STEP_TIMEOUTS_MS,
  task: () => Promise<T>
): Promise<T> {
  const timeoutMs = VALIDATION_STEP_TIMEOUTS_MS[step];

  let timeoutHandle: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new ValidationStepTimeoutError(step, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

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
    log.info('Already running');
    return;
  }

  log.info('Starting...');

  // Verify LLM client is configured
  try {
    const kimiClient = getKimiClient();
    const healthy = await kimiClient.healthCheck();

    if (!healthy) {
      log.warn('Kimi API health check failed - validation may not work');
    } else {
      log.info('Kimi API ready');
    }
  } catch (error) {
    log.error({ err: error }, 'Failed to initialize Kimi client');
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

      log.info({ proofId: submission.proofId }, 'Received proof submission');

      await processValidationLLM(submission);
    },
    {
      connection: redisConnection,
      concurrency: 1,
      lockDuration: 900_000, // 15 min — covers LLM_ANALYSIS (11 min) + on-chain steps
    }
  );

  validatorLLMWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, 'Job completed');
  });

  validatorLLMWorker.on('failed', (job, error) => {
    log.error({ jobId: job?.id, err: error }, 'Job failed');
  });

  log.info('Running and listening for validation jobs');
}

/**
 * Stop Validator Agent
 */
export async function stopValidatorAgentLLM(): Promise<void> {
  if (!validatorLLMWorker) {
    return;
  }

  log.info('Stopping...');
  await validatorLLMWorker.close();
  validatorLLMWorker = null;
  log.info('Stopped');
}

/**
 * Process a single validation request with LLM analysis
 */
async function processValidationLLM(submission: ProofSubmissionMessage): Promise<void> {
  try {
    log.info({ proofId: submission.proofId }, 'Processing validation');

    const validationService = getValidationService();
    const kimiClient = getKimiClient();

    const vId = submission.proofId;
    const pId = submission.protocolId;

    // Update proof status to VALIDATING (enables frontend ActiveValidationPanel detection)
    await prisma.proof.update({
      where: { id: submission.proofId },
      data: { status: 'VALIDATING' },
    });

    await emitValidationProgress(vId, pId, 'DECRYPT_PROOF', 'RUNNING', 'LLM', 0, 'Decrypting proof payload...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Decrypting proof payload...');

    // =================
    // STEP 1: Decrypt and parse proof
    // =================
    const decryptResult = await runWithStepTimeout('DECRYPT_PROOF', async () => decryptProof(submission));

    if (!decryptResult.success || !decryptResult.proof) {
      throw new Error(decryptResult.error || 'Proof decryption failed');
    }

    const proof = decryptResult.proof;
    log.debug({ vulnerabilityType: proof.vulnerabilityType }, 'Proof decrypted');

    await emitValidationProgress(vId, pId, 'DECRYPT_PROOF', 'RUNNING', 'LLM', 10, 'Proof decrypted');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitValidationProgress(vId, pId, 'FETCH_DETAILS', 'RUNNING', 'LLM', 10, 'Fetching finding and protocol details...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Fetching finding and protocol details...');

    // =================
    // STEP 2: Fetch finding and protocol details
    // =================
    const finding = await runWithStepTimeout('FETCH_DETAILS', async () => validationService.getFinding(proof.findingId));

    if (!finding || !finding.scan || !finding.scan.protocol) {
      throw new Error(`Finding ${proof.findingId} or associated protocol not found`);
    }

    const protocol = finding.scan.protocol;
    log.debug({ githubUrl: protocol.githubUrl }, 'Protocol details fetched');

    await emitValidationProgress(vId, pId, 'FETCH_DETAILS', 'RUNNING', 'LLM', 20, 'Details fetched');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Protocol: ${protocol.githubUrl}`);

    await emitValidationProgress(vId, pId, 'READ_CONTRACT', 'RUNNING', 'LLM', 20, 'Reading contract source code...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Reading contract source code...');

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
      log.debug({ contractPath, chars: contractCode.length }, 'Read contract code from primary path');
    } catch (error) {
      // Try alternative path with just the vulnerable file from the finding
      try {
        const sanitizedProtocolId = protocol.id.replace(/[^a-zA-Z0-9-_]/g, '_');
        const sanitizedScanId = proof.scanId.replace(/[^a-zA-Z0-9-_]/g, '_');
        const cacheDir = `/tmp/thunder-repos/${sanitizedProtocolId}/${sanitizedScanId}`;
        const findingPath = join(cacheDir, proof.location?.filePath || '');

        contractCode = readFileSync(findingPath, 'utf-8');
        log.debug({ findingPath, chars: contractCode.length }, 'Read contract code from finding location');
      } catch (findingError) {
        log.warn('Could not read cached contract code, providing context from proof description');
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

    await emitValidationProgress(vId, pId, 'READ_CONTRACT', 'RUNNING', 'LLM', 30, 'Contract loaded');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Contract loaded (${contractCode.length} chars)`);

    await emitValidationProgress(vId, pId, 'LLM_ANALYSIS', 'RUNNING', 'LLM', 30, 'Submitting to Kimi 2.5 for analysis...');
    await emitValidationLog(vId, pId, 'ANALYSIS', '[ANALYSIS] Submitting to Kimi 2.5 for proof analysis...');

    // =================
    // STEP 4: Analyze proof with Kimi 2.5 LLM
    // =================
    // Build proof details from exploitDetails (the correct field in DecryptedProof)
    const proofDetails = proof.exploitDetails
      ? `Reproduction Steps:\n${proof.exploitDetails.reproductionSteps?.join('\n') || 'N/A'}\n\nExpected Outcome: ${proof.exploitDetails.expectedOutcome || 'N/A'}\n\nActual Outcome: ${proof.exploitDetails.actualOutcome || 'N/A'}`
      : `Description: ${proof.description}\nLocation: ${proof.location?.filePath || 'unknown'}:${proof.location?.lineNumber || 'N/A'}`;

    const analysis = await runWithStepTimeout('LLM_ANALYSIS', async () => kimiClient.analyzeProof(
      proof.vulnerabilityType,
      proofDetails,
      contractCode,
      finding.description
    ));

    log.info({ isValid: analysis.isValid, confidence: analysis.confidence, severity: analysis.severity }, 'LLM analysis complete');

    await emitValidationProgress(vId, pId, 'LLM_ANALYSIS', 'RUNNING', 'LLM', 60, `Verdict: ${analysis.isValid ? 'VALID' : 'INVALID'} (${analysis.confidence}%)`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Verdict: ${analysis.isValid ? 'VALID' : 'INVALID'} (${analysis.confidence}% confidence)`);
    await emitValidationLog(vId, pId, analysis.isValid ? 'ANALYSIS' : 'WARN', `[${analysis.isValid ? 'ANALYSIS' : 'WARN'}] Severity: ${analysis.severity} | Exploitability: ${analysis.exploitability}`);

    await emitValidationProgress(vId, pId, 'UPDATE_RESULT', 'RUNNING', 'LLM', 60, 'Updating finding and proof status...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Updating finding and proof status...');

    // =================
    // STEP 5: Update finding with validation result
    // =================
    await runWithStepTimeout('UPDATE_RESULT', async () => validationService.validateFinding(proof.findingId, {
      isValid: analysis.isValid,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      severity: analysis.severity as any,
      exploitability: analysis.exploitability,
    }));

    // =================
    // STEP 6: Keep proof in validating state until on-chain write succeeds
    // =================
    await prisma.proof.update({
      where: { id: submission.proofId },
      data: {
        status: 'VALIDATING',
      },
    });

    log.info({ result: analysis.isValid ? 'VALIDATED' : 'REJECTED' }, 'Off-chain validation completed');

    await emitValidationProgress(vId, pId, 'UPDATE_RESULT', 'RUNNING', 'LLM', 80, `Status: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'}`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Status: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'}`);

    // =================
    // STEP 7: Ensure agents registered on-chain (AgentIdentityRegistry + ReputationRegistry)
    // =================
    let researcherWallet = '';
    let validatorWallet = '';

    try {
      // Resolve researcher wallet
      const scan = await prisma.scan.findUnique({
        where: { id: proof.scanId },
        include: { agent: true },
      });
      if (scan?.agent) {
        const researcherIdentity = await prisma.agentIdentity.findFirst({
          where: { agentType: 'RESEARCHER', isActive: true },
          orderBy: { registeredAt: 'asc' },
        });
        if (researcherIdentity) {
          researcherWallet = researcherIdentity.walletAddress;
        }
      }
      if (!researcherWallet) {
        researcherWallet = process.env.RESEARCHER_WALLET_ADDRESS || '';
      }

      // Resolve validator wallet
      const validatorIdentity = await prisma.agentIdentity.findFirst({
        where: { agentType: 'VALIDATOR', isActive: true },
        orderBy: { registeredAt: 'asc' },
      });
      if (validatorIdentity) {
        validatorWallet = validatorIdentity.walletAddress;
      }
      if (!validatorWallet) {
        validatorWallet = process.env.VALIDATOR_WALLET_ADDRESS || process.env.PLATFORM_WALLET_ADDRESS || '';
      }

      if (researcherWallet) {
        await emitValidationLog(vId, pId, 'DEFAULT', '> Ensuring researcher agent registered on-chain...');
        const researcherNftId = await agentIdentityService.ensureAgentRegisteredOnChain(
          researcherWallet,
          'RESEARCHER' as AgentIdentityType
        );
        await reputationService.initializeReputationOnChainIfNeeded(researcherNftId, researcherWallet);
        await emitValidationLog(vId, pId, 'INFO', `[INFO] Researcher agent on-chain: agentNftId=${researcherNftId}`);
      }

      if (validatorWallet) {
        await emitValidationLog(vId, pId, 'DEFAULT', '> Ensuring validator agent registered on-chain...');
        const validatorNftId = await agentIdentityService.ensureAgentRegisteredOnChain(
          validatorWallet,
          'VALIDATOR' as AgentIdentityType
        );
        await reputationService.initializeReputationOnChainIfNeeded(validatorNftId, validatorWallet);
        await emitValidationLog(vId, pId, 'INFO', `[INFO] Validator agent on-chain: agentNftId=${validatorNftId}`);
      }
    } catch (agentRegError) {
      const errMsg = agentRegError instanceof Error ? agentRegError.message : String(agentRegError);
      log.warn({ err: agentRegError, errMsg }, 'Agent on-chain registration failed (non-fatal)');
      await emitValidationLog(vId, pId, 'WARN', `[WARN] Agent on-chain registration failed: ${errMsg.slice(0, 200)}`);
    }

    // =================
    // STEP 8: Record validation on-chain (Base Sepolia)
    // =================
    await emitValidationProgress(vId, pId, 'RECORD_ONCHAIN', 'RUNNING', 'LLM', 80, 'Recording validation on-chain...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Recording validation on Base Sepolia...');

    let validationIdForReputation: string | null = null;

    try {
      if (!protocol.onChainProtocolId) {
        throw new Error('VALIDATION_ONCHAIN_REQUIRED: Protocol is not registered on-chain');
      } else {
        const onChainProtocolId = protocol.onChainProtocolId;
        const severityMap: Record<string, OnChainSeverity> = {
          'CRITICAL': OnChainSeverity.CRITICAL,
          'HIGH': OnChainSeverity.HIGH,
          'MEDIUM': OnChainSeverity.MEDIUM,
          'LOW': OnChainSeverity.LOW,
          'INFO': OnChainSeverity.INFORMATIONAL,
        };

        const onChainSeverity = severityMap[finding.severity] ?? OnChainSeverity.INFORMATIONAL;
        const outcome = analysis.isValid ? ValidationOutcome.CONFIRMED : ValidationOutcome.REJECTED;

        const proofHash = ethers.keccak256(
          ethers.toUtf8Bytes(
            JSON.stringify({
              findingId: finding.id,
              vulnerabilityType: finding.vulnerabilityType,
              severity: finding.severity,
              validated: analysis.isValid,
            })
          )
        );

        const executionLogStr = `LLM validation: ${analysis.reasoning}`.slice(0, 500);

        log.debug({ onChainProtocolId, findingId: finding.id, severity: OnChainSeverity[onChainSeverity], outcome: ValidationOutcome[outcome] }, 'Recording validation on-chain');

        const validationClient = new ValidationRegistryClient();

        const onChainResult = await runWithStepTimeout('RECORD_ONCHAIN', async () => validationClient.recordValidation(
          onChainProtocolId,
          ethers.id(finding.id),
          finding.vulnerabilityType,
          onChainSeverity,
          outcome,
          executionLogStr,
          proofHash
        ));

        log.info({ validationId: onChainResult.validationId, txHash: onChainResult.txHash }, 'On-chain validation recorded successfully');

        validationIdForReputation = onChainResult.validationId;

        await prisma.proof.update({
          where: { id: submission.proofId },
          data: {
            onChainValidationId: onChainResult.validationId,
            onChainTxHash: onChainResult.txHash,
          },
        });

        await emitValidationLog(vId, pId, 'INFO', `[INFO] On-chain TX: ${onChainResult.txHash}`);
        await emitValidationProgress(vId, pId, 'RECORD_ONCHAIN', 'RUNNING', 'LLM', 90, 'On-chain recording complete');
      }
    } catch (onChainError) {
      const errMsg = onChainError instanceof Error ? onChainError.message : String(onChainError);
      log.error({ err: onChainError, errMsg }, 'Failed to record validation on-chain');
      await emitValidationLog(vId, pId, 'WARN', `[WARN] On-chain recording failed: ${errMsg.slice(0, 200)}`);
      throw new Error(`VALIDATION_ONCHAIN_REQUIRED: ${errMsg}`);
    }

    // =================
    // STEP 9: Record reputation feedback on-chain
    // =================
    try {
      const severityToFeedback: Record<string, FeedbackType> = {
        'CRITICAL': 'CONFIRMED_CRITICAL',
        'HIGH': 'CONFIRMED_HIGH',
        'MEDIUM': 'CONFIRMED_MEDIUM',
        'LOW': 'CONFIRMED_LOW',
        'INFO': 'CONFIRMED_INFORMATIONAL',
      };

      const feedbackType: FeedbackType = analysis.isValid
        ? (severityToFeedback[finding.severity] || 'CONFIRMED_INFORMATIONAL')
        : 'REJECTED';

      const repValidationId = validationIdForReputation || ethers.id(submission.proofId);

      if (researcherWallet && validatorWallet) {
        log.debug({ researcherWallet, validatorWallet, feedbackType }, 'Recording reputation feedback on-chain');

        await runWithStepTimeout('REPUTATION', async () => reputationService.recordFeedbackOnChain(
          researcherWallet,
          validatorWallet,
          repValidationId,
          finding.id,
          feedbackType
        ));

        log.info('Reputation feedback recorded on-chain successfully');
        await emitValidationLog(vId, pId, 'INFO', '[INFO] Reputation feedback recorded on-chain successfully');
      } else {
        log.debug('Skipping reputation feedback - agent wallets not found');
      }
    } catch (reputationError) {
      const errMsg = reputationError instanceof Error ? reputationError.message : String(reputationError);
      log.error({ err: reputationError, errMsg }, 'Failed to record reputation feedback');
      await emitValidationLog(vId, pId, 'WARN', `[WARN] Reputation recording failed: ${errMsg.slice(0, 200)}`);
    }

    // Finalize proof status only after both off-chain and on-chain records are done.
    await prisma.proof.update({
      where: { id: submission.proofId },
      data: {
        status: analysis.isValid ? 'VALIDATED' : 'REJECTED',
        validatedAt: new Date(),
      },
    });

    // Notify frontend — fire-and-forget, don't fail the job over notifications
    try {
      await Promise.race([
        Promise.all([
          emitValidationProgress(vId, pId, 'COMPLETE', 'COMPLETED', 'LLM', 100, `Validation complete: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'} (${analysis.confidence}% confidence)`),
          emitValidationLog(vId, pId, 'INFO', `[INFO] Validation complete: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'} (${analysis.confidence}% confidence)`),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('emit timeout')), 10_000)),
      ]);
    } catch (emitErr) {
      log.warn({ err: emitErr }, 'COMPLETE notification failed (validation already saved)');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: error, errorMessage }, 'Validation failed');

    const isOnChainRequiredError = errorMessage.includes('VALIDATION_ONCHAIN_REQUIRED');
    const isLLMDown = isLLMUnavailableError(error);

    // Update proof/finding status
    try {
      // Check if proof was already finalized before this error occurred
      const currentProof = await prisma.proof.findUnique({ where: { id: submission.proofId } });
      const alreadyFinalized = currentProof?.status === 'VALIDATED' || currentProof?.status === 'REJECTED';

      const shouldKeepValidating = isOnChainRequiredError || isLLMDown;

      if (alreadyFinalized) {
        log.info({ proofId: submission.proofId, status: currentProof.status }, 'Proof already finalized — skipping error rollback');
      } else {
        // Keep proof in VALIDATING state when LLM is unavailable or on-chain failed
        // so BullMQ retries can succeed later without permanent false rejection
        await prisma.proof.update({
          where: { id: submission.proofId },
          data: {
            status: shouldKeepValidating ? 'VALIDATING' : 'REJECTED',
          },
        });
      }

      // Only reject findings for actual validation logic failures,
      // NOT for LLM unavailability (timeout/abort/network errors)
      if (!shouldKeepValidating && !alreadyFinalized) {
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
      }
    } catch (dbError) {
      log.error({ err: dbError }, 'Failed to update database');
    }

    const statusMsg = isLLMDown
      ? `LLM unavailable, will retry: ${errorMessage}`
      : `Validation failed: ${errorMessage}`;

    await emitValidationProgress(submission.proofId, submission.protocolId, 'COMPLETE', 'FAILED', 'LLM', 0, statusMsg);
    await emitValidationLog(submission.proofId, submission.protocolId, isLLMDown ? 'WARN' : 'ALERT', `[${isLLMDown ? 'WARN' : 'ALERT'}] ${statusMsg}`);

    // Re-throw so BullMQ can retry if attempts remain
    throw error;
  }
}
