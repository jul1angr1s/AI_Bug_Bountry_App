import { Worker, Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { getKimiClient } from '../../lib/llm.js';
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
import type { FeedbackType, AgentIdentityType } from '@prisma/client';

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
    const decryptResult = await decryptProof(submission);

    if (!decryptResult.success || !decryptResult.proof) {
      throw new Error(decryptResult.error || 'Proof decryption failed');
    }

    const proof = decryptResult.proof;
    console.log(`[Validator LLM] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitValidationProgress(vId, pId, 'DECRYPT_PROOF', 'RUNNING', 'LLM', 10, 'Proof decrypted');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitValidationProgress(vId, pId, 'FETCH_DETAILS', 'RUNNING', 'LLM', 10, 'Fetching finding and protocol details...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Fetching finding and protocol details...');

    // =================
    // STEP 2: Fetch finding and protocol details
    // =================
    const finding = await validationService.getFinding(proof.findingId);

    if (!finding || !finding.scan || !finding.scan.protocol) {
      throw new Error(`Finding ${proof.findingId} or associated protocol not found`);
    }

    const protocol = finding.scan.protocol;
    console.log(`[Validator LLM] Protocol: ${protocol.githubUrl}`);

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

    await emitValidationProgress(vId, pId, 'LLM_ANALYSIS', 'RUNNING', 'LLM', 60, `Verdict: ${analysis.isValid ? 'VALID' : 'INVALID'} (${analysis.confidence}%)`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Verdict: ${analysis.isValid ? 'VALID' : 'INVALID'} (${analysis.confidence}% confidence)`);
    await emitValidationLog(vId, pId, analysis.isValid ? 'ANALYSIS' : 'WARN', `[${analysis.isValid ? 'ANALYSIS' : 'WARN'}] Severity: ${analysis.severity} | Exploitability: ${analysis.exploitability}`);

    await emitValidationProgress(vId, pId, 'UPDATE_RESULT', 'RUNNING', 'LLM', 60, 'Updating finding and proof status...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Updating finding and proof status...');

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
      console.warn('[Validator LLM] Agent on-chain registration failed (non-fatal):', errMsg);
      console.error('[Validator LLM] Full agent registration error:', agentRegError);
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
        console.warn('[Validator LLM] Protocol not registered on-chain, skipping on-chain validation');
        await emitValidationLog(vId, pId, 'WARN', '[WARN] Protocol not registered on-chain, skipping');
      } else {
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

        console.log('[Validator LLM] Recording validation on-chain...');
        console.log(`  Protocol ID: ${protocol.onChainProtocolId}`);
        console.log(`  Finding ID: ${finding.id}`);
        console.log(`  Severity: ${OnChainSeverity[onChainSeverity]}`);
        console.log(`  Outcome: ${ValidationOutcome[outcome]}`);

        const validationClient = new ValidationRegistryClient();

        const onChainResult = await validationClient.recordValidation(
          protocol.onChainProtocolId,
          ethers.id(finding.id),
          finding.vulnerabilityType,
          onChainSeverity,
          outcome,
          executionLogStr,
          proofHash
        );

        console.log('[Validator LLM] On-chain validation recorded successfully!');
        console.log(`  Validation ID: ${onChainResult.validationId}`);
        console.log(`  TX Hash: ${onChainResult.txHash}`);

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
      console.error('[Validator LLM] Failed to record validation on-chain:', errMsg);
      console.error('[Validator LLM] Full on-chain error:', onChainError);
      await emitValidationLog(vId, pId, 'WARN', `[WARN] On-chain recording failed: ${errMsg.slice(0, 200)}`);
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
        console.log('[Validator LLM] Recording reputation feedback on-chain...');
        console.log(`  Researcher: ${researcherWallet}`);
        console.log(`  Validator: ${validatorWallet}`);
        console.log(`  Feedback Type: ${feedbackType}`);

        await reputationService.recordFeedbackOnChain(
          researcherWallet,
          validatorWallet,
          repValidationId,
          finding.id,
          feedbackType
        );

        console.log('[Validator LLM] Reputation feedback recorded on-chain successfully');
        await emitValidationLog(vId, pId, 'INFO', '[INFO] Reputation feedback recorded on-chain successfully');
      } else {
        console.log('[Validator LLM] Skipping reputation feedback - agent wallets not found');
      }
    } catch (reputationError) {
      const errMsg = reputationError instanceof Error ? reputationError.message : String(reputationError);
      console.error('[Validator LLM] Failed to record reputation feedback:', errMsg);
      console.error('[Validator LLM] Full reputation error:', reputationError);
      await emitValidationLog(vId, pId, 'WARN', `[WARN] Reputation recording failed: ${errMsg.slice(0, 200)}`);
    }

    await emitValidationProgress(vId, pId, 'COMPLETE', 'COMPLETED', 'LLM', 100, `Validation complete: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'} (${analysis.confidence}% confidence)`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Validation complete: ${analysis.isValid ? 'VALIDATED' : 'REJECTED'} (${analysis.confidence}% confidence)`);
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

    await emitValidationProgress(submission.proofId, submission.protocolId, 'COMPLETE', 'FAILED', 'LLM', 0, `Validation failed: ${errorMessage}`);
    await emitValidationLog(submission.proofId, submission.protocolId, 'ALERT', `[ALERT] Validation failed: ${errorMessage}`);

    // Re-throw so BullMQ can retry if attempts remain
    throw error;
  }
}
