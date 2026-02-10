import { Worker, Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { proofRepository } from '../../db/repositories.js';
import { emitValidationProgress, emitValidationLog } from '../../websocket/events.js';
import { decryptProof } from './steps/decrypt.js';
import { spawnSandbox, deployToSandbox, killSandbox } from './steps/sandbox.js';
import { executeExploit } from './steps/execute.js';
import { cloneRepository, cleanupRepository } from '../protocol/steps/clone.js';
import { compileContract } from '../protocol/steps/compile.js';
import type { ChildProcess } from 'child_process';
import { ValidationRegistryClient, ValidationOutcome, Severity as OnChainSeverity } from '../../blockchain/index.js';
import { ethers } from 'ethers';
import { reputationService } from '../../services/reputation.service.js';
import type { FeedbackType } from '@prisma/client';
import type { ProofSubmissionMessage } from '../../messages/schemas.js';
import { validateMessage, ProofSubmissionSchema } from '../../messages/schemas.js';

const prisma = getPrismaClient();

let validatorWorker: Worker<ProofSubmissionMessage> | null = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

/**
 * Start Validator Agent
 *
 * Uses BullMQ Worker on 'validation-jobs' queue (replaces Redis Pub/Sub).
 * Benefits: guaranteed delivery, automatic retries, job inspection.
 */
export async function startValidatorAgent(): Promise<void> {
  if (validatorWorker) {
    console.log('[Validator Agent] Already running');
    return;
  }

  console.log('[Validator Agent] Starting BullMQ worker on validation-jobs queue...');

  validatorWorker = new Worker<ProofSubmissionMessage>(
    'validation-jobs',
    async (job: Job<ProofSubmissionMessage>) => {
      // Validate message schema
      const submission = validateMessage(
        ProofSubmissionSchema,
        job.data,
        `validation job ${job.id}`
      );

      console.log(`[Validator Agent] Processing proof: ${submission.proofId}`);
      await processValidation(submission);
    },
    {
      connection: redisConnection,
      concurrency: 1, // Process one validation at a time
      limiter: {
        max: 10,
        duration: 60000, // 10 validations per minute
      },
    }
  );

  validatorWorker.on('completed', (job) => {
    console.log(`[Validator Agent] Job ${job.id} completed`);
  });

  validatorWorker.on('failed', (job, error) => {
    console.error(`[Validator Agent] Job ${job?.id} failed:`, error.message);
  });

  console.log('[Validator Agent] Running and listening for validation jobs...');
}

/**
 * Stop Validator Agent
 */
export async function stopValidatorAgent(): Promise<void> {
  if (!validatorWorker) {
    return;
  }

  console.log('[Validator Agent] Stopping...');
  await validatorWorker.close();
  validatorWorker = null;
  console.log('[Validator Agent] Stopped');
}

/**
 * Process a single validation request
 */
async function processValidation(submission: ProofSubmissionMessage): Promise<void> {
  let repoPath: string | undefined;
  let anvilProcess: ChildProcess | undefined;

  try {
    console.log(`[Validator] Processing validation for proof ${submission.proofId}`);

    // Update proof status to VALIDATING
    await proofRepository.updateProofStatus(submission.proofId, 'VALIDATING');

    const vId = submission.proofId;
    const pId = submission.protocolId;

    await emitValidationProgress(vId, pId, 'DECRYPT_PROOF', 'RUNNING', 'EXECUTION', 0, 'Decrypting proof payload...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Decrypting proof payload...');

    // =================
    // STEP 1: Decrypt and parse proof
    // =================
    const decryptResult = await decryptProof(submission);

    if (!decryptResult.success || !decryptResult.proof) {
      throw new Error(decryptResult.error || 'Proof decryption failed');
    }

    const proof = decryptResult.proof;
    console.log(`[Validator] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitValidationProgress(vId, pId, 'DECRYPT_PROOF', 'RUNNING', 'EXECUTION', 5, 'Proof decrypted');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitValidationProgress(vId, pId, 'FETCH_DETAILS', 'RUNNING', 'EXECUTION', 5, 'Fetching protocol details...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Fetching protocol details...');

    // =================
    // STEP 2: Fetch protocol details
    // =================
    const protocol = await prisma.protocol.findUnique({
      where: { id: proof.protocolId },
    });

    if (!protocol) {
      throw new Error(`Protocol ${proof.protocolId} not found`);
    }

    console.log(`[Validator] Protocol: ${protocol.githubUrl}`);

    await emitValidationProgress(vId, pId, 'FETCH_DETAILS', 'RUNNING', 'EXECUTION', 10, 'Protocol details fetched');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Protocol: ${protocol.githubUrl}`);

    await emitValidationProgress(vId, pId, 'CLONE_REPO', 'RUNNING', 'EXECUTION', 10, 'Cloning repository...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Cloning repository from GitHub...');

    // =================
    // STEP 3: Clone same commit as Researcher
    // =================
    const cloneResult = await cloneRepository(
      `validator-${proof.proofId}`,
      protocol.githubUrl,
      proof.commitHash !== 'latest' ? proof.commitHash : protocol.branch
    );

    if (!cloneResult.success || !cloneResult.repoPath) {
      throw new Error(cloneResult.error || 'Repository clone failed');
    }

    repoPath = cloneResult.repoPath;
    console.log(`[Validator] Repository cloned to ${repoPath}`);

    await emitValidationProgress(vId, pId, 'CLONE_REPO', 'RUNNING', 'EXECUTION', 20, 'Repository cloned');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Repository cloned to ${repoPath}`);

    await emitValidationProgress(vId, pId, 'COMPILE', 'RUNNING', 'EXECUTION', 20, 'Compiling contracts...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Compiling contracts...');

    // =================
    // STEP 4: Compile contracts
    // =================
    const compileResult = await compileContract(
      repoPath,
      protocol.contractPath,
      protocol.contractName.replace('.sol', '')
    );

    if (!compileResult.success || !compileResult.bytecode || !compileResult.abi) {
      throw new Error(compileResult.error || 'Compilation failed');
    }

    console.log(`[Validator] Contract compiled successfully`);

    await emitValidationProgress(vId, pId, 'COMPILE', 'RUNNING', 'EXECUTION', 30, 'Contracts compiled');
    await emitValidationLog(vId, pId, 'INFO', '[INFO] Contract compiled successfully');

    await emitValidationProgress(vId, pId, 'SPAWN_SANDBOX', 'RUNNING', 'EXECUTION', 30, 'Spawning isolated Anvil sandbox...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Spawning isolated Anvil sandbox...');

    // =================
    // STEP 5: Spawn isolated Anvil sandbox
    // =================
    const sandboxResult = await spawnSandbox();

    if (!sandboxResult.success || !sandboxResult.provider || !sandboxResult.anvilProcess) {
      throw new Error(sandboxResult.error || 'Sandbox spawn failed');
    }

    anvilProcess = sandboxResult.anvilProcess;
    console.log(`[Validator] Sandbox spawned at ${sandboxResult.rpcUrl}`);

    await emitValidationProgress(vId, pId, 'SPAWN_SANDBOX', 'RUNNING', 'EXECUTION', 40, 'Sandbox spawned');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Sandbox spawned at ${sandboxResult.rpcUrl}`);

    await emitValidationProgress(vId, pId, 'DEPLOY', 'RUNNING', 'EXECUTION', 40, 'Deploying contract to sandbox...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Deploying contract to sandbox...');

    // =================
    // STEP 6: Deploy contract to sandbox
    // =================
    const deployResult = await deployToSandbox(
      sandboxResult.provider,
      compileResult.bytecode,
      compileResult.abi
    );

    if (!deployResult.success || !deployResult.contractAddress) {
      throw new Error(deployResult.error || 'Deployment failed');
    }

    console.log(`[Validator] Contract deployed at ${deployResult.contractAddress}`);

    await emitValidationProgress(vId, pId, 'DEPLOY', 'RUNNING', 'EXECUTION', 55, 'Contract deployed');
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Contract deployed at ${deployResult.contractAddress}`);

    await emitValidationProgress(vId, pId, 'EXECUTE_EXPLOIT', 'RUNNING', 'EXECUTION', 55, 'Executing exploit...');
    await emitValidationLog(vId, pId, 'ANALYSIS', '[ANALYSIS] Executing exploit against sandboxed contract...');

    // =================
    // STEP 7: Execute exploit
    // =================
    const executionResult = await executeExploit(
      sandboxResult.provider,
      deployResult.contractAddress,
      compileResult.abi,
      proof
    );

    console.log(`[Validator] Exploit execution completed: ${executionResult.validated ? 'CONFIRMED' : 'REJECTED'}`);

    await emitValidationProgress(vId, pId, 'EXECUTE_EXPLOIT', 'RUNNING', 'EXECUTION', 75, `Exploit ${executionResult.validated ? 'CONFIRMED' : 'REJECTED'}`);
    await emitValidationLog(vId, pId, executionResult.validated ? 'ALERT' : 'WARN', `[${executionResult.validated ? 'ALERT' : 'WARN'}] Exploit ${executionResult.validated ? 'CONFIRMED — vulnerability reproduced' : 'REJECTED — exploit failed'}`);

    await emitValidationProgress(vId, pId, 'UPDATE_RESULT', 'RUNNING', 'EXECUTION', 75, 'Updating validation result...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Updating validation result...');

    // =================
    // STEP 8: Update validation result
    // =================
    const validationStatus = executionResult.validated ? 'CONFIRMED' : 'REJECTED';

    await proofRepository.updateProofStatus(submission.proofId, validationStatus);

    // Update proof with validation result
    await prisma.proof.update({
      where: { id: submission.proofId },
      data: {
        status: executionResult.validated ? 'VALIDATED' : 'REJECTED',
        validatedAt: new Date(),
        validatorPublicKey: 'validator-agent-001', // See GitHub Issue #111
      },
    });

    // Update finding status
    await prisma.finding.update({
      where: { id: proof.findingId },
      data: {
        status: executionResult.validated ? 'VALIDATED' : 'REJECTED',
        validatedAt: new Date(),
      },
    });

    console.log(`[Validator] Validation complete: ${validationStatus}`);

    await emitValidationProgress(vId, pId, 'UPDATE_RESULT', 'RUNNING', 'EXECUTION', 85, `Status: ${validationStatus}`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Status: ${validationStatus}`);

    // =================
    // STEP 9: Record validation on-chain (Base Sepolia)
    // =================
    await emitValidationProgress(vId, pId, 'RECORD_ONCHAIN', 'RUNNING', 'EXECUTION', 85, 'Recording validation on-chain...');
    await emitValidationLog(vId, pId, 'DEFAULT', '> Recording validation on Base Sepolia...');

    try {
      // Get protocol to access onChainProtocolId
      const protocol = await prisma.protocol.findUnique({
        where: { id: proof.protocolId },
      });

      if (!protocol || !protocol.onChainProtocolId) {
        console.warn('[Validator] Protocol not registered on-chain, skipping on-chain validation');
        await emitValidationLog(vId, pId, 'WARN', '[WARN] Protocol not registered on-chain, skipping');
      } else {
        // Get finding details
        const finding = await prisma.finding.findUnique({
          where: { id: proof.findingId },
        });

        if (!finding) {
          console.warn('[Validator] Finding not found, skipping on-chain validation');
        } else {
          // Map severity from database enum to smart contract enum
          const severityMap: Record<string, OnChainSeverity> = {
            'CRITICAL': OnChainSeverity.CRITICAL,
            'HIGH': OnChainSeverity.HIGH,
            'MEDIUM': OnChainSeverity.MEDIUM,
            'LOW': OnChainSeverity.LOW,
            'INFO': OnChainSeverity.INFORMATIONAL,
          };

          const onChainSeverity = severityMap[finding.severity] ?? OnChainSeverity.INFORMATIONAL;

          // Map validation outcome (validated → CONFIRMED, rejected → REJECTED)
          const outcome = executionResult.validated
            ? ValidationOutcome.CONFIRMED
            : ValidationOutcome.REJECTED;

          // Hash the proof data for on-chain storage
          const proofHash = ethers.keccak256(
            ethers.toUtf8Bytes(
              JSON.stringify({
                findingId: finding.id,
                vulnerabilityType: finding.vulnerabilityType,
                severity: finding.severity,
                validated: executionResult.validated,
              })
            )
          );

          // Prepare execution log (truncate if too long for on-chain storage)
          const executionLogStr = (executionResult.executionLog?.join('\n') || '').slice(0, 500);

          console.log('[Validator] Recording validation on-chain...');
          console.log(`  Protocol ID: ${protocol.onChainProtocolId}`);
          console.log(`  Finding ID: ${finding.id}`);
          console.log(`  Severity: ${OnChainSeverity[onChainSeverity]}`);
          console.log(`  Outcome: ${ValidationOutcome[outcome]}`);

          // Record validation on-chain
          const validationClient = new ValidationRegistryClient();

          const onChainResult = await validationClient.recordValidation(
            protocol.onChainProtocolId,
            finding.id, // Using database ID as findingId
            finding.vulnerabilityType,
            onChainSeverity,
            outcome,
            executionLogStr,
            proofHash
          );

          console.log('[Validator] On-chain validation recorded successfully!');
          console.log(`  Validation ID: ${onChainResult.validationId}`);
          console.log(`  TX Hash: ${onChainResult.txHash}`);

          // Update proof with on-chain validation ID and transaction hash
          await prisma.proof.update({
            where: { id: submission.proofId },
            data: {
              onChainValidationId: onChainResult.validationId,
              onChainTxHash: onChainResult.txHash,
            },
          });

          console.log('[Validator] Database updated with on-chain validation IDs');
          await emitValidationLog(vId, pId, 'INFO', `[INFO] On-chain TX: ${onChainResult.txHash}`);
          await emitValidationProgress(vId, pId, 'RECORD_ONCHAIN', 'RUNNING', 'EXECUTION', 95, 'On-chain recording complete');

          // =================
          // STEP 10: Record reputation feedback (ERC-8004)
          // =================
          try {
            // Get researcher wallet from scan context
            const scan = await prisma.scan.findUnique({
              where: { id: proof.scanId },
              include: { agent: true },
            });

            // Map severity + outcome to FeedbackType
            // INFO severity maps to CONFIRMED_INFORMATIONAL
            const severityToFeedback: Record<string, FeedbackType> = {
              'CRITICAL': 'CONFIRMED_CRITICAL',
              'HIGH': 'CONFIRMED_HIGH',
              'MEDIUM': 'CONFIRMED_MEDIUM',
              'LOW': 'CONFIRMED_LOW',
              'INFO': 'CONFIRMED_INFORMATIONAL',
            };

            const feedbackType: FeedbackType = executionResult.validated
              ? (severityToFeedback[finding.severity] || 'CONFIRMED_INFORMATIONAL')
              : 'REJECTED';

            // Resolve researcher identity from AgentIdentity table
            // Look up RESEARCHER agents - if a scan has an associated agent, use that agent's identity
            let researcherWallet = '';
            if (scan?.agent) {
              // Look up agent identity by the platform agent's linked wallet
              const researcherIdentity = await prisma.agentIdentity.findFirst({
                where: { agentType: 'RESEARCHER', isActive: true },
                orderBy: { registeredAt: 'asc' },
              });
              if (researcherIdentity) {
                researcherWallet = researcherIdentity.walletAddress;
              }
            }
            // Fallback: check env var
            if (!researcherWallet) {
              researcherWallet = process.env.RESEARCHER_WALLET_ADDRESS || '';
            }

            // Resolve validator identity dynamically
            let validatorWallet = '';
            const validatorIdentity = await prisma.agentIdentity.findFirst({
              where: { agentType: 'VALIDATOR', isActive: true },
              orderBy: { registeredAt: 'asc' },
            });
            if (validatorIdentity) {
              validatorWallet = validatorIdentity.walletAddress;
            }
            // Fallback: check env vars
            if (!validatorWallet) {
              validatorWallet = process.env.VALIDATOR_WALLET_ADDRESS || process.env.PLATFORM_WALLET_ADDRESS || '';
            }

            if (researcherWallet && validatorWallet) {
              console.log('[Validator] Recording reputation feedback...');
              console.log(`  Researcher: ${researcherWallet}`);
              console.log(`  Validator: ${validatorWallet}`);
              console.log(`  Feedback Type: ${feedbackType}`);

              await reputationService.recordFeedback(
                researcherWallet,
                validatorWallet,
                onChainResult.validationId,
                finding.id,
                feedbackType
              );

              console.log('[Validator] Reputation feedback recorded successfully');
            } else {
              console.log('[Validator] Skipping reputation feedback - agent wallets not found');
              console.log(`  Researcher: ${researcherWallet || '(not found)'}`);
              console.log(`  Validator: ${validatorWallet || '(not found)'}`);
            }
          } catch (reputationError) {
            // Don't fail validation if reputation recording fails
            console.error('[Validator] Failed to record reputation feedback:', reputationError);
          }
        }
      }
    } catch (onChainError) {
      // Log error but don't fail the validation - off-chain validation is still valid
      console.error('[Validator] Failed to record validation on-chain:', onChainError);
      console.error('  Continuing with off-chain validation only');
      await emitValidationLog(vId, pId, 'WARN', '[WARN] On-chain recording failed, continuing with off-chain validation');
    }

    await emitValidationProgress(vId, pId, 'COMPLETE', 'COMPLETED', 'EXECUTION', 100, `Validation complete: ${validationStatus}`);
    await emitValidationLog(vId, pId, 'INFO', `[INFO] Validation complete: ${validationStatus}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator] Validation failed:`, errorMessage);

    // Mark proof as rejected on validation failure
    try {
      await proofRepository.updateProofStatus(submission.proofId, 'REJECTED');
    } catch (dbError) {
      console.error('[Validator] Failed to update database:', dbError);
    }

    await emitValidationProgress(submission.proofId, submission.protocolId, 'COMPLETE', 'FAILED', 'EXECUTION', 0, `Validation failed: ${errorMessage}`);
    await emitValidationLog(submission.proofId, submission.protocolId, 'ALERT', `[ALERT] Validation failed: ${errorMessage}`);

    // Re-throw so BullMQ can retry if attempts remain
    throw error;
  } finally {
    // =================
    // CLEANUP
    // =================
    console.log('[Validator] Cleaning up resources...');

    if (anvilProcess) {
      try {
        await killSandbox(anvilProcess);
      } catch (error) {
        console.error('[Validator] Failed to kill sandbox:', error);
      }
    }

    if (repoPath) {
      try {
        await cleanupRepository(repoPath);
      } catch (error) {
        console.error('[Validator] Failed to cleanup repository:', error);
      }
    }

    console.log('[Validator] Cleanup complete');
  }
}
