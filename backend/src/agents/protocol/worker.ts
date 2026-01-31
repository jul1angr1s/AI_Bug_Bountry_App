import type { Job } from 'bullmq';
import { getPrismaClient } from '../../lib/prisma.js';
import { updateProtocolRegistrationState } from '../../services/protocol.service.js';
import { emitAgentTaskUpdate, emitProtocolStatusChange } from '../../websocket/events.js';
import { cloneRepository, cleanupRepository } from './steps/clone.js';
import { verifyContractPath, listSolidityFiles } from './steps/verify.js';
import { compileContract, calculateRiskScore } from './steps/compile.js';
import { ProtocolRegistryClient } from '../../blockchain/index.js';

const prisma = getPrismaClient();

export interface ProtocolRegistrationJobData {
  protocolId: string;
}

export interface ProtocolRegistrationResult {
  success: boolean;
  protocolId: string;
  txHash?: string;
  error?: string;
}

/**
 * Protocol Agent Worker
 * Processes protocol registration jobs by:
 * 1. Cloning the GitHub repository
 * 2. Verifying the contract path exists
 * 3. Compiling the contracts with Foundry
 * 4. Calculating risk score
 * 5. (Optional) Registering on-chain on Base Sepolia
 */
export async function processProtocolRegistration(
  job: Job<ProtocolRegistrationJobData>
): Promise<ProtocolRegistrationResult> {
  const { protocolId } = job.data;
  let repoPath: string | undefined;

  console.log(`[Protocol Agent] Processing registration job ${job.id} for protocol ${protocolId}`);

  try {
    // Fetch protocol details
    const protocol = await prisma.protocol.findUnique({
      where: { id: protocolId },
    });

    if (!protocol) {
      throw new Error(`Protocol ${protocolId} not found`);
    }

    // Update state to PROCESSING
    await updateProtocolRegistrationState(protocolId, 'PROCESSING');
    await job.updateProgress(5);

    // =================
    // STEP 1: Clone Repository
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Cloning repository', 10);
    await job.updateProgress(10);

    const cloneResult = await cloneRepository(
      protocolId,
      protocol.githubUrl,
      protocol.branch
    );

    if (!cloneResult.success) {
      throw new Error(cloneResult.error || 'Failed to clone repository');
    }

    repoPath = cloneResult.repoPath!;
    console.log(`[Protocol Agent] Repository cloned to ${repoPath}`);

    // =================
    // STEP 2: Verify Contract Path
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Verifying contract path', 30);
    await job.updateProgress(30);

    const verifyResult = await verifyContractPath(
      repoPath,
      protocol.contractPath,
      protocol.contractName
    );

    if (!verifyResult.success) {
      // Try to list available Solidity files to help with debugging
      const availableFiles = await listSolidityFiles(repoPath, protocol.contractPath);
      const errorMsg = verifyResult.error || 'Contract verification failed';
      const detailedError = availableFiles.length > 0
        ? `${errorMsg}. Available .sol files: ${availableFiles.join(', ')}`
        : errorMsg;

      throw new Error(detailedError);
    }

    console.log(`[Protocol Agent] Contract verified at ${verifyResult.contractFullPath}`);

    // =================
    // STEP 3: Compile Contracts
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Compiling contracts with Foundry', 50);
    await job.updateProgress(50);

    const compileResult = await compileContract(
      repoPath,
      protocol.contractPath,
      protocol.contractName.replace('.sol', '') // Remove .sol if present
    );

    if (!compileResult.success) {
      throw new Error(compileResult.error || 'Compilation failed');
    }

    console.log(`[Protocol Agent] Contract compiled successfully`);
    console.log(`[Protocol Agent] Bytecode size: ${compileResult.bytecode!.length / 2} bytes`);

    // =================
    // STEP 4: Calculate Risk Score
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Calculating risk score', 70);
    await job.updateProgress(70);

    const riskScore = calculateRiskScore(compileResult.bytecode!, compileResult.abi!);
    console.log(`[Protocol Agent] Risk score calculated: ${riskScore}`);

    // Store compilation artifacts
    await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        riskScore,
        compiledArtifacts: {
          abi: compileResult.abi,
          bytecode: compileResult.bytecode,
          compiledAt: new Date().toISOString(),
        },
      },
    });

    // =================
    // STEP 5: On-chain Registration (Base Sepolia)
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Registering on-chain', 85);
    await job.updateProgress(85);

    // Register protocol on-chain using ProtocolRegistry contract
    const registryClient = new ProtocolRegistryClient();

    const onChainResult = await registryClient.registerProtocol(
      protocol.githubUrl,
      protocol.contractPath,
      protocol.contractName,
      JSON.stringify(protocol.bountyTerms || {})
    );

    console.log(`[Protocol Agent] On-chain registration successful`);
    console.log(`  Protocol ID: ${onChainResult.protocolId}`);
    console.log(`  TX Hash: ${onChainResult.txHash}`);
    console.log(`  Block: ${onChainResult.blockNumber}`);

    // Update database with on-chain protocol ID and transaction hash
    await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        onChainProtocolId: onChainResult.protocolId,
        registrationTxHash: onChainResult.txHash,
      },
    });

    // =================
    // STEP 6: Update Protocol Status
    // =================
    await updateProtocolRegistrationState(protocolId, 'ACTIVE', onChainResult.txHash);
    await job.updateProgress(95);

    // Emit protocol status change event
    await emitProtocolStatusChange(protocolId, {
      status: 'ACTIVE',
      registrationState: 'ACTIVE',
      registrationTxHash: onChainResult.txHash,
      riskScore,
    });

    // =================
    // STEP 7: Cleanup
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Cleaning up', 98);
    if (repoPath) {
      await cleanupRepository(repoPath);
    }

    // =================
    // Complete
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Registration complete', 100);
    await job.updateProgress(100);

    console.log(`[Protocol Agent] Registration completed successfully for protocol ${protocolId}`);

    return {
      success: true,
      protocolId,
      txHash: onChainResult.txHash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Protocol Agent] Registration failed for ${protocolId}:`, errorMessage);

    // Update protocol to FAILED state
    await updateProtocolRegistrationState(
      protocolId,
      'FAILED',
      undefined,
      errorMessage
    );

    // Emit failure event
    await emitAgentTaskUpdate('protocol-agent', `Registration failed: ${errorMessage}`, 0);
    await emitProtocolStatusChange(protocolId, {
      status: 'PENDING',
      registrationState: 'FAILED',
      failureReason: errorMessage,
    });

    // Cleanup on failure
    if (repoPath) {
      await cleanupRepository(repoPath);
    }

    return {
      success: false,
      protocolId,
      error: errorMessage,
    };
  }
}
