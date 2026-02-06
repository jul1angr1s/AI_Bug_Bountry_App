import { Worker, Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { proofRepository } from '../../db/repositories.js';
import { emitAgentTaskUpdate } from '../../websocket/events.js';
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

    await emitAgentTaskUpdate('validator-agent', 'Decrypting proof', 5);

    // =================
    // STEP 1: Decrypt and parse proof
    // =================
    const decryptResult = await decryptProof(submission);

    if (!decryptResult.success || !decryptResult.proof) {
      throw new Error(decryptResult.error || 'Proof decryption failed');
    }

    const proof = decryptResult.proof;
    console.log(`[Validator] Proof decrypted: ${proof.vulnerabilityType}`);

    await emitAgentTaskUpdate('validator-agent', 'Fetching protocol details', 10);

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

    await emitAgentTaskUpdate('validator-agent', 'Cloning repository', 15);

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

    await emitAgentTaskUpdate('validator-agent', 'Compiling contracts', 30);

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

    await emitAgentTaskUpdate('validator-agent', 'Spawning isolated sandbox', 45);

    // =================
    // STEP 5: Spawn isolated Anvil sandbox
    // =================
    const sandboxResult = await spawnSandbox();

    if (!sandboxResult.success || !sandboxResult.provider || !sandboxResult.anvilProcess) {
      throw new Error(sandboxResult.error || 'Sandbox spawn failed');
    }

    anvilProcess = sandboxResult.anvilProcess;
    console.log(`[Validator] Sandbox spawned at ${sandboxResult.rpcUrl}`);

    await emitAgentTaskUpdate('validator-agent', 'Deploying contract to sandbox', 60);

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

    await emitAgentTaskUpdate('validator-agent', 'Executing exploit', 75);

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

    await emitAgentTaskUpdate('validator-agent', 'Updating validation result', 90);

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
        validatorPublicKey: 'validator-agent-001', // TODO: dynamic agent ID
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

    await emitAgentTaskUpdate(
      'validator-agent',
      `Validation ${validationStatus.toLowerCase()}`,
      100
    );

    // =================
    // STEP 9: Record validation on-chain (Base Sepolia)
    // =================
    try {
      // Get protocol to access onChainProtocolId
      const protocol = await prisma.protocol.findUnique({
        where: { id: proof.protocolId },
      });

      if (!protocol || !protocol.onChainProtocolId) {
        console.warn('[Validator] Protocol not registered on-chain, skipping on-chain validation');
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
            let researcherWallet = '';
            if (scan?.agent) {
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
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator] Validation failed:`, errorMessage);

    // Update proof status to FAILED
    try {
      await proofRepository.updateProofStatus(submission.proofId, 'FAILED');

      // Mark proof as failed — no separate validation model exists
      // The proof status tracks the validation outcome
      await proofRepository.updateProofStatus(submission.proofId, 'REJECTED');
    } catch (dbError) {
      console.error('[Validator] Failed to update database:', dbError);
    }

    await emitAgentTaskUpdate('validator-agent', `Validation error: ${errorMessage}`, 0);

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
