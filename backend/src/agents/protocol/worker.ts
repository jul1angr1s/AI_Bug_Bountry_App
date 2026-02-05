import type { Job } from 'bullmq';
import { ethers } from 'ethers';
import { getPrismaClient } from '../../lib/prisma.js';
import { updateProtocolRegistrationState } from '../../services/protocol.service.js';
import {
  emitAgentTaskUpdate,
  emitProtocolStatusChange,
  emitProtocolRegistrationProgress
} from '../../websocket/events.js';
import { cloneRepository, cleanupRepository } from './steps/clone.js';
import { verifyContractPath, listSolidityFiles } from './steps/verify.js';
import { compileContract, calculateRiskScore } from './steps/compile.js';
import { ProtocolRegistryClient } from '../../blockchain/index.js';
import { setAwaitingFunding } from '../../services/funding.service.js';

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
    await emitProtocolRegistrationProgress(
      protocolId,
      'CLONE',
      'IN_PROGRESS',
      10,
      'Cloning repository from GitHub'
    );
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

    await emitProtocolRegistrationProgress(
      protocolId,
      'CLONE',
      'COMPLETED',
      15,
      'Repository cloned successfully'
    );

    // =================
    // STEP 2: Verify Contract Path
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Verifying contract path', 30);
    await emitProtocolRegistrationProgress(
      protocolId,
      'VERIFY',
      'IN_PROGRESS',
      30,
      'Verifying contract path exists'
    );
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

    await emitProtocolRegistrationProgress(
      protocolId,
      'VERIFY',
      'COMPLETED',
      35,
      'Contract path verified successfully'
    );

    // =================
    // STEP 3: Compile Contracts
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Compiling contracts with Foundry', 50);
    await emitProtocolRegistrationProgress(
      protocolId,
      'COMPILE',
      'IN_PROGRESS',
      50,
      'Compiling contracts with Foundry'
    );
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

    await emitProtocolRegistrationProgress(
      protocolId,
      'COMPILE',
      'COMPLETED',
      60,
      'Contracts compiled successfully'
    );

    // =================
    // STEP 4: Calculate Risk Score
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Calculating risk score', 70);
    await emitProtocolRegistrationProgress(
      protocolId,
      'RISK_SCORE',
      'IN_PROGRESS',
      70,
      'Calculating protocol risk score'
    );
    await job.updateProgress(70);

    const riskScore = calculateRiskScore(compileResult.bytecode!, compileResult.abi!);
    console.log(`[Protocol Agent] Risk score calculated: ${riskScore}`);

    // Store risk score
    await prisma.protocol.update({
      where: { id: protocolId },
      data: {
        riskScore,
      },
    });

    await emitProtocolRegistrationProgress(
      protocolId,
      'RISK_SCORE',
      'COMPLETED',
      75,
      `Risk score: ${riskScore}/100`
    );

    // =================
    // STEP 5: On-chain Registration (Base Sepolia) - Optional
    // =================
    const skipOnChainRegistration = process.env.SKIP_ONCHAIN_REGISTRATION === 'true';
    let onChainTxHash: string | undefined;

    if (skipOnChainRegistration) {
      console.log('[Protocol Agent] Skipping on-chain registration (SKIP_ONCHAIN_REGISTRATION=true)');

      // Still derive and store onChainProtocolId for real payments
      // This uses the same formula as setup-real-onchain.ts: keccak256(protocolId)
      const derivedOnChainProtocolId = ethers.id(protocolId);
      console.log(`[Protocol Agent] Derived onChainProtocolId: ${derivedOnChainProtocolId}`);

      await prisma.protocol.update({
        where: { id: protocolId },
        data: { onChainProtocolId: derivedOnChainProtocolId },
      });

      await emitAgentTaskUpdate('protocol-agent', 'Skipping on-chain registration', 85);
      await emitProtocolRegistrationProgress(
        protocolId,
        'ON_CHAIN_REGISTRATION',
        'COMPLETED',
        85,
        'Skipped on-chain registration (dev mode)'
      );
      await job.updateProgress(90);
    } else {
      await emitAgentTaskUpdate('protocol-agent', 'Registering on-chain', 85);
      await emitProtocolRegistrationProgress(
        protocolId,
        'ON_CHAIN_REGISTRATION',
        'IN_PROGRESS',
        85,
        'Registering protocol on Base Sepolia'
      );
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

      onChainTxHash = onChainResult.txHash;

      // Update database with on-chain protocol ID and transaction hash
      await prisma.protocol.update({
        where: { id: protocolId },
        data: {
          onChainProtocolId: onChainResult.protocolId,
          registrationTxHash: onChainResult.txHash,
        },
      });

      await emitProtocolRegistrationProgress(
        protocolId,
        'ON_CHAIN_REGISTRATION',
        'COMPLETED',
        90,
        `Protocol registered on-chain (TX: ${onChainResult.txHash.substring(0, 10)}...)`
      );
    }

    // =================
    // STEP 6: Update Protocol Status
    // =================
    await emitProtocolRegistrationProgress(
      protocolId,
      'STATUS_UPDATE',
      'IN_PROGRESS',
      92,
      'Updating protocol status to ACTIVE'
    );
    await updateProtocolRegistrationState(protocolId, 'ACTIVE', onChainTxHash);
    await job.updateProgress(95);

    // Emit protocol status change event
    await emitProtocolStatusChange(protocolId, {
      status: 'ACTIVE',
      registrationState: 'ACTIVE',
      registrationTxHash: onChainTxHash,
      riskScore,
    });

    await emitProtocolRegistrationProgress(
      protocolId,
      'STATUS_UPDATE',
      'COMPLETED',
      95,
      'Protocol status updated to ACTIVE'
    );

    // =================
    // STEP 7: Set Funding State to AWAITING_FUNDING
    // =================
    // NOTE: Auto-scan has been removed. Scans are now gated behind funding verification.
    // Protocol owners must fund their bounty pool before requesting researcher scans.
    await emitAgentTaskUpdate('protocol-agent', 'Setting up funding gate', 96);
    await emitProtocolRegistrationProgress(
      protocolId,
      'FUNDING_GATE',
      'IN_PROGRESS',
      96,
      'Setting up funding requirement'
    );
    await job.updateProgress(96);

    try {
      // Set protocol to AWAITING_FUNDING state
      await setAwaitingFunding(protocolId);

      console.log(`[Protocol Agent] Protocol ${protocolId} set to AWAITING_FUNDING`);
      console.log(`[Protocol Agent] Owner must fund the bounty pool before requesting scans`);

      await emitProtocolRegistrationProgress(
        protocolId,
        'FUNDING_GATE',
        'COMPLETED',
        98,
        'Protocol ready for funding - scans gated until funded'
      );
    } catch (fundingError) {
      // Log error but don't fail the registration
      console.error(`[Protocol Agent] Failed to set AWAITING_FUNDING state:`, fundingError);

      await emitProtocolRegistrationProgress(
        protocolId,
        'FUNDING_GATE',
        'FAILED',
        98,
        'Failed to set funding state'
      );
    }

    // =================
    // STEP 8: Cleanup
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Cleaning up', 98);
    if (repoPath) {
      await cleanupRepository(repoPath);
    }

    // =================
    // Complete
    // =================
    await emitAgentTaskUpdate('protocol-agent', 'Registration complete', 100);
    await emitProtocolRegistrationProgress(
      protocolId,
      'COMPLETED',
      'COMPLETED',
      100,
      'Protocol registration completed successfully'
    );
    await job.updateProgress(100);

    console.log(`[Protocol Agent] Registration completed successfully for protocol ${protocolId}`);

    return {
      success: true,
      protocolId,
      txHash: onChainTxHash,
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
    await emitProtocolRegistrationProgress(
      protocolId,
      'FAILED',
      'FAILED',
      0,
      `Registration failed: ${errorMessage}`
    );
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
