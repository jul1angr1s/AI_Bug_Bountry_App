import { Worker, Job, UnrecoverableError } from 'bullmq';
import { ScanState, ScanStep, AgentStatus } from '@prisma/client';
import { scanRepository, scanStepRepository, findingRepository, proofRepository, agentRunRepository } from '../../db/repositories.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { getRedisConnectionOptions } from '../../lib/redis.js';
import { emitScanStarted, emitScanProgress, emitScanCompleted, emitScanLog } from '../../websocket/events.js';
import { ScanJobData } from '../../queues/scanQueue.js';
import { ChildProcess } from 'child_process';
import {
  executeCloneStep,
  executeCompileStep,
  executeDeployStep,
  executeAnalyzeStep,
  executeAIDeepAnalysisStep,
  executeProofGenerationStep,
  executeSubmitStep,
  cleanupResources,
} from './steps/index.js';
import type { VulnerabilityFinding } from './steps/analyze.js';
import type { AIAnalysisMetrics } from './steps/ai-deep-analysis.js';
import { agentPaymentService } from '../../services/agent-payment.service.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('ResearcherWorker');

// Error codes for structured error handling
export const ScanErrorCodes = {
  CLONE_FAILED: 'CLONE_FAILED',
  REPO_NOT_FOUND: 'REPO_NOT_FOUND',
  COMPILE_FAILED: 'COMPILE_FAILED',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  DEPLOY_FAILED: 'DEPLOY_FAILED',
  ANVIL_ERROR: 'ANVIL_ERROR',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  AI_ANALYSIS_REQUIRED_DISABLED: 'AI_ANALYSIS_REQUIRED_DISABLED',
  SCAN_INCONCLUSIVE_AI_ZERO_FINDINGS: 'SCAN_INCONCLUSIVE_AI_ZERO_FINDINGS',
  PROOF_GENERATION_FAILED: 'PROOF_GENERATION_FAILED',
  SUBMISSION_FAILED: 'SUBMISSION_FAILED',
  TIMEOUT: 'TIMEOUT',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ScanErrorCode = typeof ScanErrorCodes[keyof typeof ScanErrorCodes];

const NO_RESEARCHER_CAPACITY_WAIT_MS = 5 * 60 * 1000;
const NO_RESEARCHER_CAPACITY_POLL_MS = 15 * 1000;

class NoResearcherCapacityTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NO_RESEARCHER_CAPACITY_TIMEOUT';
  }
}

// Step timeouts (in milliseconds)
const STEP_TIMEOUTS: Record<ScanStep, number> = {
  [ScanStep.CLONE]: 5 * 60 * 1000,           // 5 minutes
  [ScanStep.COMPILE]: 10 * 60 * 1000,        // 10 minutes
  [ScanStep.DEPLOY]: 3 * 60 * 1000,          // 3 minutes
  [ScanStep.ANALYZE]: 15 * 60 * 1000,        // 15 minutes
  [ScanStep.AI_DEEP_ANALYSIS]: 10 * 60 * 1000, // 10 minutes
  [ScanStep.PROOF_GENERATION]: 5 * 60 * 1000, // 5 minutes
  [ScanStep.SUBMIT]: 2 * 60 * 1000,          // 2 minutes
};

// Create Researcher Agent Worker
export function createResearcherWorker(): Worker<ScanJobData> {
  const worker = new Worker<ScanJobData>(
    'scan-jobs',
    async (job: Job<ScanJobData>) => {
      const { scanId, protocolId, targetBranch, targetCommitHash } = job.data;
      
      // Get agent ID (in production, this would be the current worker's agent)
      const prisma = getPrismaClient();
      const queueStartedAt = job.data.queuedAt ?? Date.now();
      const agent = await waitForResearcherCapacity(prisma, scanId, protocolId, queueStartedAt);

      // Start agent run tracking
      const agentRun = await agentRunRepository.startRun({
        agentId: agent.id,
        scanId,
        runtimeVersion: process.env.npm_package_version || '1.0.0',
        workerId: `worker-${process.pid}`,
      });

      try {
        // Update agent status
        await prisma.agent.update({
          where: { id: agent.id },
          data: { 
            status: AgentStatus.SCANNING,
            currentTask: scanId,
          },
        });

        // Assign scan to agent and mark as running
        await scanRepository.assignToAgent(scanId, agent.id);
        
        // Emit WebSocket event
        await emitScanStarted(scanId, protocolId, agent.id, targetBranch, targetCommitHash);

        // Execute scan pipeline
        const scanResult = await executeScanPipeline(
          scanId,
          protocolId,
          targetBranch,
          targetCommitHash,
          job
        );

        // Complete agent run
        await agentRunRepository.completeRun(agentRun.id, {
          duration: Date.now() - agentRun.startedAt.getTime(),
        });

        // Update agent status
        await prisma.agent.update({
          where: { id: agent.id },
          data: { 
            status: AgentStatus.ONLINE,
            currentTask: null,
            scansCompleted: { increment: 1 },
          },
        });

        return scanResult;

      } catch (error) {
        // Record failure
        await agentRunRepository.failRun(agentRun.id, {
          code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          stackTrace: error instanceof Error ? error.stack : undefined,
        });

        // Set agent back to ONLINE (not ERROR) - the agent is still running,
        // it's just this particular scan that failed
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            status: AgentStatus.ONLINE,
            currentTask: null,
          },
        });

        throw error;
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2, // Process up to 2 scans concurrently
      stalledInterval: 30000, // Check for stalled jobs every 30s
      maxStalledCount: 2, // Max stalled job retries
    }
  );

  // Handle job completion
  worker.on('completed', async (job: Job<ScanJobData>, result) => {
    log.info({ scanId: job.data.scanId, result }, 'Scan completed');
  });

  // Handle job failure
  worker.on('failed', async (job: Job<ScanJobData> | undefined, error: Error) => {
    if (job) {
      const totalAttempts = job.opts.attempts ?? 1;
      const exhaustedRetries = job.attemptsMade >= totalAttempts;

      const nonRetryableErrorNames = new Set([
        'NO_RESEARCHER_CAPACITY_TIMEOUT',
        'UnrecoverableError',
      ]);

      if (!exhaustedRetries && !nonRetryableErrorNames.has(error.name)) {
        log.warn(
          {
            scanId: job.data.scanId,
            attempt: job.attemptsMade,
            totalAttempts,
            err: error,
          },
          'Scan attempt failed; waiting for retry'
        );
        return;
      }

      log.error({ scanId: job.data.scanId, err: error }, 'Scan failed');

      // Mark scan as failed only after retries are exhausted or when explicitly timed out by capacity wait
      await scanRepository.markScanFailed(
        job.data.scanId,
        error.name || 'UNKNOWN',
        error.message
      );

      // Emit completion event with failure
      const scan = await scanRepository.getScanById(job.data.scanId);
      if (scan) {
        await emitScanCompleted(
          scan.id,
          scan.protocolId,
          ScanState.FAILED,
          scan.findingsCount,
          scan.startedAt,
          error.name,
          error.message
        );
      }
    }
  });

  return worker;
}

async function waitForResearcherCapacity(
  prisma: ReturnType<typeof getPrismaClient>,
  scanId: string,
  protocolId: string,
  queuedAtMs: number
) {
  const deadlineMs = queuedAtMs + NO_RESEARCHER_CAPACITY_WAIT_MS;
  let agent = await findAvailableResearcher(prisma);

  while (!agent && Date.now() < deadlineMs) {
    const remainingMs = deadlineMs - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    log.warn(
      {
        scanId,
        protocolId,
        remainingSeconds,
      },
      'No available researcher agent, waiting for capacity'
    );

    await emitScanProgress(
      scanId,
      protocolId,
      'QUEUE',
      ScanState.QUEUED,
      0,
      `Waiting for available researcher agent (${remainingSeconds}s remaining)`
    );

    await sleep(Math.min(NO_RESEARCHER_CAPACITY_POLL_MS, Math.max(0, remainingMs)));
    agent = await findAvailableResearcher(prisma);
  }

  if (!agent) {
    throw new NoResearcherCapacityTimeoutError(
      `No researcher capacity available within ${Math.floor(NO_RESEARCHER_CAPACITY_WAIT_MS / 60000)} minutes`
    );
  }

  return agent;
}

async function findAvailableResearcher(prisma: ReturnType<typeof getPrismaClient>) {
  return prisma.agent.findFirst({
    where: {
      type: 'RESEARCHER',
      status: { in: ['ONLINE', 'SCANNING'] },
    },
  });
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Execute the full scan pipeline
async function executeScanPipeline(
  scanId: string,
  protocolId: string,
  targetBranch?: string,
  targetCommitHash?: string,
  job?: Job<ScanJobData>
): Promise<{ success: boolean; findingsCount: number }> {
  const scan = await scanRepository.getScanById(scanId);
  if (!scan) {
    throw new Error(`Scan ${scanId} not found`);
  }

  const protocol = scan.protocol;
  let findingsCount = 0;

  // State variables for cleanup
  let anvilProcess: ChildProcess | undefined;
  let clonedPath: string | undefined;
  let deploymentAddress: string | undefined;

  // Check for cancellation
  if (job && (await job.isFailed())) {
    throw new Error(ScanErrorCodes.CANCELED);
  }

  // Step 1: Clone Repository (0-15%)
  const cloneStep = await scanStepRepository.startStep(scanId, ScanStep.CLONE);
  try {
    await emitScanProgress(scanId, protocolId, 'CLONE', ScanState.RUNNING, 5, 'Cloning repository...');
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Cloning repository from ${protocol.githubUrl}...`);

    const cloneResult = await executeCloneStep({
      scanId,
      protocolId,
      repoUrl: protocol.githubUrl,
      targetBranch,
      targetCommitHash,
    });

    clonedPath = cloneResult.clonedPath;

    await scanStepRepository.completeStep(cloneStep.id, {
      repoUrl: protocol.githubUrl,
      branch: cloneResult.branch,
      commitHash: cloneResult.commitHash,
      clonedPath: cloneResult.clonedPath,
    });

    await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Repository cloned (${cloneResult.branch}@${cloneResult.commitHash?.slice(0, 7) || 'HEAD'})`);
    await emitScanProgress(scanId, protocolId, 'CLONE', ScanState.RUNNING, 15, 'Repository cloned');
  } catch (error) {
    await handleStepFailure(scanId, protocolId, cloneStep.id, ScanErrorCodes.CLONE_FAILED, error);
    throw error;
  }

  // Step 2: Compile Contracts (15-30%)
  const compileStep = await scanStepRepository.startStep(scanId, ScanStep.COMPILE);
  let compilationResult;
  try {
    await emitScanProgress(scanId, protocolId, 'COMPILE', ScanState.RUNNING, 20, 'Compiling contracts...');
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Compiling smart contracts...`);
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Loading ABI for ${protocol.contractName}...`);

    if (!clonedPath) {
      throw new Error('No cloned path available from previous step');
    }

    compilationResult = await executeCompileStep({
      clonedPath,
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
    });

    await scanStepRepository.completeStep(compileStep.id, {
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
      success: compilationResult.success,
      artifactsPath: compilationResult.artifactsPath,
      errors: compilationResult.errors,
      warnings: compilationResult.warnings,
    });

    await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Compilation successful`);
    if (compilationResult.warnings?.length) {
      await emitScanLog(scanId, protocolId, 'WARN', `[WARN] ${compilationResult.warnings.length} compilation warning(s)`);
    }
    await emitScanProgress(scanId, protocolId, 'COMPILE', ScanState.RUNNING, 30, 'Compilation successful');
  } catch (error) {
    await handleStepFailure(scanId, protocolId, compileStep.id, ScanErrorCodes.COMPILE_FAILED, error);
    throw error;
  }

  // Step 3: Deploy to Anvil (30-45%) - OPTIONAL
  const deployStep = await scanStepRepository.startStep(scanId, ScanStep.DEPLOY);
  let deploymentFailed = false;

  try {
    await emitScanProgress(scanId, protocolId, 'DEPLOY', ScanState.RUNNING, 35, 'Deploying to Anvil...');
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Deploying to local Anvil testnet...`);

    if (!compilationResult?.abi || !compilationResult?.bytecode) {
      throw new Error('No ABI or bytecode available from compilation step');
    }

    const deployResult = await executeDeployStep({
      abi: compilationResult.abi,
      bytecode: compilationResult.bytecode,
      contractName: protocol.contractName,
    });

    anvilProcess = deployResult.anvilProcess;
    deploymentAddress = deployResult.deploymentAddress;

    await scanStepRepository.completeStep(deployStep.id, {
      anvilPort: deployResult.anvilPort,
      deploymentAddress: deployResult.deploymentAddress,
      deploymentTx: deployResult.transactionHash,
    });

    await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Contract deployed at ${deployResult.deploymentAddress}`);
    await emitScanProgress(scanId, protocolId, 'DEPLOY', ScanState.RUNNING, 45, 'Deployment complete');
  } catch (error) {
    // Deployment is optional - continue with static analysis even if it fails
    log.warn({ err: error }, 'Deployment failed, continuing with static analysis only');
    deploymentFailed = true;

    await cleanupResources(anvilProcess);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await scanStepRepository.failStep(deployStep.id, ScanErrorCodes.DEPLOY_FAILED, errorMessage);

    await emitScanLog(scanId, protocolId, 'WARN', `[WARN] Deployment failed - continuing with static analysis`);
    await emitScanProgress(
      scanId,
      protocolId,
      'DEPLOY',
      ScanState.RUNNING,
      45,
      'Deployment skipped - continuing with static analysis'
    );

    // Do NOT throw - continue with static analysis
  }

  // Step 4: Static Analysis (45-60%)
  const analyzeStep = await scanStepRepository.startStep(scanId, ScanStep.ANALYZE);
  let slitherFindings: VulnerabilityFinding[] = [];
  let slitherStatus: 'OK' | 'TOOL_UNAVAILABLE' | 'ERROR' = 'ERROR';
  try {
    await emitScanProgress(scanId, protocolId, 'ANALYZE', ScanState.RUNNING, 50, 'Running static analysis...');
    await emitScanLog(scanId, protocolId, 'ANALYSIS', `[ANALYSIS] Running Slither detector suite...`);

    if (!clonedPath) {
      throw new Error('No cloned path available from previous step');
    }

    const analysisResult = await executeAnalyzeStep({
      clonedPath,
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
    });

    // Store Slither findings for AI analysis step
    slitherFindings = analysisResult.findings;
    slitherStatus = analysisResult.slitherStatus;

    await scanStepRepository.completeStep(analyzeStep.id, {
      findingsCount: analysisResult.findings.length,
      analysisTools: analysisResult.toolsUsed,
      slitherStatus: analysisResult.slitherStatus,
    });

    await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Found ${slitherFindings.length} potential vectors`);
    const highCritical = slitherFindings.filter(f => f.severity === 'HIGH' || f.severity === 'CRITICAL').length;
    if (highCritical > 0) {
      await emitScanLog(scanId, protocolId, 'ALERT', `[ALERT] ${highCritical} high/critical severity`);
    }
    await emitScanProgress(scanId, protocolId, 'ANALYZE', ScanState.RUNNING, 60, `Slither found ${slitherFindings.length} issues`);
  } catch (error) {
    await cleanupResources(anvilProcess);
    await handleStepFailure(scanId, protocolId, analyzeStep.id, ScanErrorCodes.ANALYSIS_FAILED, error);
    throw error;
  }

  // Step 5: AI Deep Analysis (60-75%)
  const aiAnalysisStep = await scanStepRepository.startStep(scanId, ScanStep.AI_DEEP_ANALYSIS);
  let finalFindings = slitherFindings;
  let aiMetrics: AIAnalysisMetrics | null = null;
  let aiAnalysisFailed = false;

  try {
    // AI is primary analysis engine for researcher scans (enabled by default)
    const aiEnabled = process.env.AI_ANALYSIS_ENABLED !== 'false';

    if (aiEnabled) {
      await emitScanProgress(scanId, protocolId, 'AI_DEEP_ANALYSIS', ScanState.RUNNING, 65, 'Running AI deep analysis...');
      await emitScanLog(scanId, protocolId, 'ANALYSIS', `[ANALYSIS] AI deep analysis starting...`);

      if (!clonedPath) {
        throw new Error('No cloned path available from previous step');
      }

      const aiAnalysisResult = await executeAIDeepAnalysisStep({
        clonedPath,
        contractPath: protocol.contractPath,
        contractName: protocol.contractName,
        slitherFindings,
      });

      // Use AI-enhanced findings if successful
      if (aiAnalysisResult.aiEnhanced) {
        finalFindings = aiAnalysisResult.findings;
        aiMetrics = aiAnalysisResult.metrics;

        await scanStepRepository.completeStep(aiAnalysisStep.id, {
          aiEnhanced: true,
          findingsCount: aiAnalysisResult.findings.length,
          enhancedFindings: aiAnalysisResult.metrics.enhancedFindings,
          newFindings: aiAnalysisResult.metrics.newFindings,
          modelUsed: aiAnalysisResult.metrics.modelUsed,
          processingTimeMs: aiAnalysisResult.metrics.processingTimeMs,
        });

        await emitScanLog(scanId, protocolId, 'INFO', `[INFO] AI enhanced ${aiAnalysisResult.metrics.enhancedFindings} findings`);
        if (aiAnalysisResult.metrics.newFindings > 0) {
          await emitScanLog(scanId, protocolId, 'ALERT', `[ALERT] AI discovered ${aiAnalysisResult.metrics.newFindings} new vulnerabilities`);
        }
        await emitScanProgress(
          scanId,
          protocolId,
          'AI_DEEP_ANALYSIS',
          ScanState.RUNNING,
          75,
          `AI enhanced ${aiAnalysisResult.metrics.enhancedFindings} findings, found ${aiAnalysisResult.metrics.newFindings} new issues`
        );
      } else {
        // AI analysis ran but didn't enhance findings
        finalFindings = slitherFindings;

        await scanStepRepository.completeStep(aiAnalysisStep.id, {
          aiEnhanced: false,
          findingsCount: slitherFindings.length,
          message: 'AI analysis skipped or not implemented',
        });

        await emitScanLog(scanId, protocolId, 'INFO', `[INFO] AI analysis did not enhance findings - using Slither results`);
        await emitScanProgress(scanId, protocolId, 'AI_DEEP_ANALYSIS', ScanState.RUNNING, 75, 'Using Slither findings only');
      }
    } else {
      throw new UnrecoverableError('AI analysis is required but AI_ANALYSIS_ENABLED=false');
    }
  } catch (error) {
    // AI step failed - mark with AI_ANALYSIS_FAILED but continue with Slither findings
    log.error({ err: error }, 'AI deep analysis failed, continuing with Slither findings');

    aiAnalysisFailed = true;
    finalFindings = slitherFindings;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const aiErrorCode =
      errorMessage.includes('AI_ANALYSIS_ENABLED=false')
        ? ScanErrorCodes.AI_ANALYSIS_REQUIRED_DISABLED
        : ScanErrorCodes.AI_ANALYSIS_FAILED;

    await scanStepRepository.failStep(aiAnalysisStep.id, aiErrorCode, errorMessage);

    await emitScanLog(scanId, protocolId, 'WARN', `[WARN] AI analysis failed - continuing with Slither findings`);
    await emitScanProgress(
      scanId,
      protocolId,
      'AI_DEEP_ANALYSIS',
      ScanState.RUNNING,
      75,
      `AI analysis failed - continuing with ${slitherFindings.length} Slither findings`
    );

    if (aiErrorCode === ScanErrorCodes.AI_ANALYSIS_REQUIRED_DISABLED) {
      await scanRepository.markScanFailed(scanId, aiErrorCode, errorMessage);
      throw new UnrecoverableError(errorMessage);
    }

    // DO NOT throw error - continue pipeline with Slither findings
  }

  // AI-first policy: zero findings means inconclusive scan, not clean success.
  if (finalFindings.length === 0) {
    const message = `AI analysis returned no actionable findings (slitherStatus=${slitherStatus}). Marking scan as inconclusive.`;

    await emitScanLog(scanId, protocolId, 'WARN', `[WARN] ${message}`);
    await emitScanProgress(
      scanId,
      protocolId,
      'AI_DEEP_ANALYSIS',
      ScanState.FAILED,
      75,
      message
    );

    await scanRepository.markScanFailed(
      scanId,
      ScanErrorCodes.SCAN_INCONCLUSIVE_AI_ZERO_FINDINGS,
      message
    );

    throw new UnrecoverableError(message);
  }

  // Store final findings in database
  for (const finding of finalFindings) {
    await findingRepository.createFinding({
      scanId,
      vulnerabilityType: finding.vulnerabilityType,
      severity: finding.severity,
      filePath: finding.filePath,
      lineNumber: finding.lineNumber,
      functionSelector: finding.functionSelector,
      description: finding.description,
      confidenceScore: finding.confidenceScore,
      aiConfidenceScore: finding.aiConfidenceScore,
      remediationSuggestion: finding.remediationSuggestion,
      codeSnippet: finding.codeSnippet,
      analysisMethod: finding.analysisMethod,
    });
    findingsCount++;
  }

  // Step 6: Proof Generation (75-90%) - Generate proofs even if deployment failed
  // For demonstration: proofs can be generated based on findings without deployment
  const proofStep = await scanStepRepository.startStep(scanId, ScanStep.PROOF_GENERATION);

  try {
    await emitScanProgress(scanId, protocolId, 'PROOF_GENERATION', ScanState.RUNNING, 80, 'Generating proofs...');
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Generating proof of concept exploit code...`);

    // Get findings to generate proofs for
    const findings = await findingRepository.getFindingsByScan(scanId);

    if (!clonedPath) {
      throw new Error('No cloned path available from previous step');
    }

    if (findings.length === 0) {
      log.info('No findings to generate proofs for');
      await scanStepRepository.completeStep(proofStep.id, {
        proofsGenerated: 0,
        message: 'No findings to generate proofs for',
      });
      await emitScanProgress(scanId, protocolId, 'PROOF_GENERATION', ScanState.RUNNING, 90, 'No findings for proof generation');
    } else {
      const proofGenResult = await executeProofGenerationStep({
        scanId,
        findings,
        clonedPath,
        deploymentAddress: deploymentAddress || undefined, // Pass undefined if no deployment
      });

      await scanStepRepository.completeStep(proofStep.id, {
        proofsGenerated: proofGenResult.proofsCreated,
        deploymentUsed: !!deploymentAddress,
      });

      await emitScanLog(scanId, protocolId, 'INFO', `[INFO] ${proofGenResult.proofsCreated} PoC exploits generated`);
      await emitScanProgress(scanId, protocolId, 'PROOF_GENERATION', ScanState.RUNNING, 90, `${proofGenResult.proofsCreated} proofs generated`);
    }
  } catch (error) {
    await cleanupResources(anvilProcess);
    await handleStepFailure(scanId, protocolId, proofStep.id, ScanErrorCodes.PROOF_GENERATION_FAILED, error);
    throw error;
  }

  // Step 7: Submit to Validator (90-100%)
  const submitStep = await scanStepRepository.startStep(scanId, ScanStep.SUBMIT);
  try {
    await emitScanProgress(scanId, protocolId, 'SUBMIT', ScanState.RUNNING, 95, 'Submitting to Validator Agent...');
    await emitScanLog(scanId, protocolId, 'DEFAULT', `> Submitting findings to Validator Agent...`);

    // Get proofs for submission
    const proofs = await proofRepository.getProofsByScan(scanId);

    const submitResult = await executeSubmitStep({
      scanId,
      protocolId,
      proofs: proofs.map(p => ({ id: p.id, findingId: p.findingId || '' } as any)),
      targetCommitHash,
      anvilProcess,
    });

    // Clear anvilProcess reference after cleanup
    if (submitResult.cleanupCompleted) {
      anvilProcess = undefined;
    }

    await scanStepRepository.completeStep(submitStep.id, {
      proofsSubmitted: submitResult.proofsSubmitted,
      submissionTimestamp: submitResult.submissionTimestamp,
    });

    await emitScanLog(scanId, protocolId, 'INFO', `[INFO] ${submitResult.proofsSubmitted} proofs submitted`);

    // Look up agent associations for payment streams (used by both exploit fees and finding submissions)
    const prismaClient = getPrismaClient();
    const validatorAssoc = await prismaClient.protocolAgentAssociation?.findFirst({
      where: { protocolId, role: 'VALIDATOR' },
      include: { agentIdentity: true },
    }).catch(() => null);

    const researcherAssoc = await prismaClient.protocolAgentAssociation?.findFirst({
      where: { protocolId, role: 'RESEARCHER' },
      include: { agentIdentity: true },
    }).catch(() => null);

    // Stream A: Pay exploit submission fee ($0.50 per exploit) to validator
    if (submitResult.proofsSubmitted > 0) {
      try {
        if (validatorAssoc?.agentIdentity?.walletAddress && researcherAssoc?.agentIdentity?.walletAddress) {
          const proofs = await proofRepository.getProofsByScan(scanId);
          for (const proof of proofs) {
            const feeResult = await agentPaymentService.payExploitSubmissionFee(
              researcherAssoc.agentIdentity.walletAddress,
              validatorAssoc.agentIdentity.walletAddress,
              proof.findingId || proof.id,
              protocolId
            );
            if (feeResult) {
              await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Exploit fee paid to validator: ${feeResult.txHash}`);
            }
          }
        } else {
          await emitScanLog(scanId, protocolId, 'DEFAULT', `> No agent associations found, skipping exploit fees`);
        }
      } catch (feeError) {
        // Non-fatal: exploit fee payment failure should not block scan completion
        log.error({ err: feeError }, 'Exploit fee payment error (non-fatal)');
        await emitScanLog(scanId, protocolId, 'ALERT', `[WARN] Exploit fee payment failed (non-fatal)`);
      }
    }

    await emitScanProgress(scanId, protocolId, 'SUBMIT', ScanState.RUNNING, 100, 'Submission complete');
  } catch (error) {
    await cleanupResources(anvilProcess);
    await handleStepFailure(scanId, protocolId, submitStep.id, ScanErrorCodes.SUBMISSION_FAILED, error);
    throw error;
  }

  // Mark scan as succeeded
  // Note: AI metrics are stored in the AI_DEEP_ANALYSIS step's metadata field
  await scanRepository.updateScanState(scanId, ScanState.SUCCEEDED, {
    findingsCount,
    // If AI analysis failed, mark the error code
    ...(aiAnalysisFailed ? { errorCode: ScanErrorCodes.AI_ANALYSIS_FAILED } : {}),
  });

  // Emit log and completion event
  await emitScanLog(scanId, protocolId, 'INFO', `[INFO] Scan completed - ${findingsCount} findings total`);
  await emitScanCompleted(
    scanId,
    protocolId,
    ScanState.SUCCEEDED,
    findingsCount,
    scan.startedAt
  );

  return { success: true, findingsCount };
}

// Handle step failure
async function handleStepFailure(
  scanId: string,
  protocolId: string,
  stepId: string,
  errorCode: string,
  error: unknown
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  await scanStepRepository.failStep(stepId, errorCode, errorMessage);

  await emitScanLog(scanId, protocolId, 'ALERT', `[ALERT] Scan failed at step: ${errorCode}`);
  await emitScanProgress(
    scanId,
    protocolId,
    'FAILED',
    ScanState.FAILED,
    undefined,
    `Step failed: ${errorCode} - ${errorMessage}`
  );
}
