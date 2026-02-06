import { getRedisClient } from '../../lib/redis.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { proofRepository } from '../../db/repositories.js';
import { emitAgentTaskUpdate } from '../../websocket/events.js';
import {
  decryptProof,
  type ProofSubmissionMessage,
  type DecryptedProof,
} from './steps/decrypt.js';
import { spawnSandbox, deployToSandbox, killSandbox } from './steps/sandbox.js';
import { executeExploit } from './steps/execute.js';
import { cloneRepository, cleanupRepository } from '../protocol/steps/clone.js';
import { compileContract } from '../protocol/steps/compile.js';
import type { ChildProcess } from 'child_process';
import { ValidationRegistryClient, ValidationOutcome, Severity as OnChainSeverity } from '../../blockchain/index.js';
import { ethers } from 'ethers';
import { reputationService } from '../../services/reputation.service.js';
import type { FeedbackType } from '@prisma/client';

const redis = getRedisClient();
const prisma = getPrismaClient();

let isRunning = false;
let subscriber: any = null;

/**
 * Start Validator Agent
 *
 * Subscribes to Redis 'PROOF_SUBMISSION' channel and processes
 * validation requests from Researcher Agent
 */
export async function startValidatorAgent(): Promise<void> {
  if (isRunning) {
    console.log('[Validator Agent] Already running');
    return;
  }

  console.log('[Validator Agent] Starting...');

  // Create Redis subscriber
  subscriber = redis.duplicate();
  await subscriber.connect();

  // Subscribe to proof submission channel
  await subscriber.subscribe('PROOF_SUBMISSION', async (message: string) => {
    try {
      const submission: ProofSubmissionMessage = JSON.parse(message);
      console.log(`[Validator Agent] Received proof submission: ${submission.proofId}`);

      // Process validation asynchronously (don't block subscriber)
      processValidation(submission).catch((error) => {
        console.error('[Validator Agent] Validation processing error:', error);
      });
    } catch (error) {
      console.error('[Validator Agent] Failed to parse proof submission:', error);
    }
  });

  isRunning = true;
  console.log('[Validator Agent] Running and listening for proofs...');
}

/**
 * Stop Validator Agent
 */
export async function stopValidatorAgent(): Promise<void> {
  if (!isRunning) {
    return;
  }

  console.log('[Validator Agent] Stopping...');

  if (subscriber) {
    await subscriber.unsubscribe('PROOF_SUBMISSION');
    await subscriber.quit();
    subscriber = null;
  }

  isRunning = false;
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

    // Create validation record
    await prisma.validation.create({
      data: {
        proofId: submission.proofId,
        scanId: proof.scanId,
        protocolId: proof.protocolId,
        validatorAgentId: 'validator-agent-001', // TODO: dynamic agent ID
        result: executionResult.validated ? 'TRUE' : 'FALSE',
        executionLog: executionResult.executionLog?.join('\n') || '',
        stateChanges: executionResult.stateChanges as any,
        transactionHash: executionResult.transactionHash,
        gasUsed: executionResult.gasUsed,
        failureReason: executionResult.error,
      },
    });

    // Update finding status
    await prisma.finding.update({
      where: { id: proof.findingId },
      data: {
        status: executionResult.validated ? 'CONFIRMED' : 'REJECTED',
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
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator] Validation failed:`, errorMessage);

    // Update proof status to FAILED
    try {
      await proofRepository.updateProofStatus(submission.proofId, 'FAILED');

      // Record failed validation
      await prisma.validation.create({
        data: {
          proofId: submission.proofId,
          scanId: submission.scanId,
          protocolId: submission.protocolId,
          validatorAgentId: 'validator-agent-001',
          result: 'ERROR',
          failureReason: errorMessage,
        },
      });
    } catch (dbError) {
      console.error('[Validator] Failed to update database:', dbError);
    }

    await emitAgentTaskUpdate('validator-agent', `Validation error: ${errorMessage}`, 0);
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
