import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import * as fs from 'fs/promises';
import * as path from 'path';

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

  console.log(`[Validator/Sandbox] Spawning isolated Anvil on port ${SANDBOX_PORT}...`);

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
      console.log(`[Validator/Anvil] ${data.toString().trim()}`);
    });

    anvilProcess.stderr?.on('data', (data) => {
      console.error(`[Validator/Anvil Error] ${data.toString().trim()}`);
    });

    anvilProcess.on('error', (error) => {
      console.error(`[Validator/Anvil] Process error:`, error);
    });

    anvilProcess.on('exit', (code, signal) => {
      console.log(`[Validator/Anvil] Process exited with code ${code}, signal ${signal}`);
    });

    // Wait for Anvil to be ready
    await waitForAnvilReady(rpcUrl);

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test connection
    const blockNumber = await provider.getBlockNumber();
    console.log(`[Validator/Sandbox] Anvil ready at ${rpcUrl}, block ${blockNumber}`);

    return {
      success: true,
      anvilProcess,
      rpcUrl,
      provider,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator/Sandbox] Failed to spawn sandbox:`, errorMessage);

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
      console.log(`[Validator/Sandbox] Anvil is ready after ${i + 1} attempts`);
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
  abi: any[],
  constructorArgs: any[] = []
): Promise<{
  success: boolean;
  contractAddress?: string;
  deploymentTx?: string;
  error?: string;
}> {
  try {
    console.log('[Validator/Sandbox] Deploying contract to sandbox...');

    // Get deployer account (Anvil's first account)
    const signer = await provider.getSigner(0);
    const signerAddress = await signer.getAddress();

    console.log(`[Validator/Sandbox] Deployer address: ${signerAddress}`);

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy contract
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction()?.hash;

    console.log(`[Validator/Sandbox] Contract deployed at ${contractAddress}`);
    console.log(`[Validator/Sandbox] Deployment tx: ${deploymentTx}`);

    return {
      success: true,
      contractAddress,
      deploymentTx,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Validator/Sandbox] Deployment failed:`, errorMessage);

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
      console.log('[Validator/Sandbox] Anvil process already killed');
      resolve();
      return;
    }

    console.log('[Validator/Sandbox] Killing Anvil process...');

    // Set a timeout for forceful kill
    const killTimeout = setTimeout(() => {
      console.log('[Validator/Sandbox] Force killing Anvil process (SIGKILL)');
      anvilProcess.kill('SIGKILL');
    }, 5000);

    // Listen for exit event
    anvilProcess.on('exit', () => {
      clearTimeout(killTimeout);
      console.log('[Validator/Sandbox] Anvil process terminated successfully');
      resolve();
    });

    // Try graceful termination first
    const killed = anvilProcess.kill('SIGTERM');

    if (!killed) {
      clearTimeout(killTimeout);
      console.warn('[Validator/Sandbox] Failed to send kill signal');
      resolve(); // Resolve anyway to prevent hanging
    }
  });
}
