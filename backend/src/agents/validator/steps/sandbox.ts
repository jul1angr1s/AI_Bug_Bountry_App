import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ValidatorSandbox');

export interface SandboxResult {
  success: boolean;
  anvilProcess?: ChildProcess;
  rpcUrl?: string;
  provider?: ethers.JsonRpcProvider;
  error?: string;
}

/**
 * SANDBOX Step - Spawn isolated Anvil instance for validation
 *
 * Creates a completely isolated Anvil instance on a different port (31338)
 * to ensure no state contamination from Researcher Agent's instance (31337)
 */
export async function spawnSandbox(): Promise<SandboxResult> {
  const SANDBOX_PORT = 31338; // Different from researcher's 31337
  const rpcUrl = `http://127.0.0.1:${SANDBOX_PORT}`;

  log.info({ port: SANDBOX_PORT }, 'Spawning isolated Anvil instance');

  try {
    // Spawn Anvil process
    const anvilProcess = spawn('anvil', [
      '--port',
      SANDBOX_PORT.toString(),
      '--accounts',
      '10',
      '--balance',
      '10000',
      '--gas-limit',
      '30000000',
      '--code-size-limit',
      '50000',
      '--silent', // Reduce noise
    ]);

    // Capture stdout/stderr for debugging
    anvilProcess.stdout?.on('data', (data) => {
      log.debug(data.toString().trim());
    });

    anvilProcess.stderr?.on('data', (data) => {
      log.error(data.toString().trim());
    });

    anvilProcess.on('error', (error) => {
      log.error({ err: error }, 'Anvil process error');
    });

    anvilProcess.on('exit', (code, signal) => {
      log.debug({ code, signal }, 'Anvil process exited');
    });

    // Wait for Anvil to be ready
    await waitForAnvilReady(rpcUrl);

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test connection
    const blockNumber = await provider.getBlockNumber();
    log.info({ rpcUrl, blockNumber }, 'Anvil ready');

    return {
      success: true,
      anvilProcess,
      rpcUrl,
      provider,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: errorMessage }, 'Failed to spawn sandbox');

    return {
      success: false,
      error: `Sandbox spawn failed: ${errorMessage}`,
    };
  }
}

/**
 * Wait for Anvil to be ready by polling the RPC endpoint
 */
async function waitForAnvilReady(rpcUrl: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber();
      log.debug({ attempts: i + 1 }, 'Anvil is ready');
      return;
    } catch (error) {
      // Wait 200ms before next attempt
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error('Anvil failed to start within timeout');
}

/**
 * Deploy contract to sandbox from compiled artifacts
 */
export async function deployToSandbox(
  provider: ethers.JsonRpcProvider,
  bytecode: string,
  abi: ethers.InterfaceAbi,
  constructorArgs: unknown[] = []
): Promise<{
  success: boolean;
  contractAddress?: string;
  deploymentTx?: string;
  error?: string;
}> {
  try {
    log.info('Deploying contract to sandbox');

    // Get deployer account (Anvil's first account)
    const signer = await provider.getSigner(0);
    const signerAddress = await signer.getAddress();

    log.debug({ signerAddress }, 'Deployer address');

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy contract
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction()?.hash;

    log.info({ contractAddress, deploymentTx }, 'Contract deployed to sandbox');

    return {
      success: true,
      contractAddress,
      deploymentTx,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: errorMessage }, 'Deployment failed');

    return {
      success: false,
      error: `Deployment failed: ${errorMessage}`,
    };
  }
}

/**
 * Kill sandbox Anvil process
 */
export async function killSandbox(anvilProcess: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!anvilProcess || anvilProcess.killed) {
      log.debug('Anvil process already killed');
      resolve();
      return;
    }

    log.info('Killing Anvil process');

    // Set a timeout for forceful kill
    const killTimeout = setTimeout(() => {
      log.warn('Force killing Anvil process (SIGKILL)');
      anvilProcess.kill('SIGKILL');
    }, 5000);

    // Listen for exit event
    anvilProcess.on('exit', () => {
      clearTimeout(killTimeout);
      log.info('Anvil process terminated successfully');
      resolve();
    });

    // Try graceful termination first
    const killed = anvilProcess.kill('SIGTERM');

    if (!killed) {
      clearTimeout(killTimeout);
      log.warn('Failed to send kill signal');
      resolve(); // Resolve anyway to prevent hanging
    }
  });
}
