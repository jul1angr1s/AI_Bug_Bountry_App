import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import findFreePort from 'find-free-port';

export interface DeployStepParams {
  abi: ethers.InterfaceAbi;
  bytecode: string;
  contractName: string;
}

export interface DeployStepResult {
  deploymentAddress: string;
  anvilPort: number;
  anvilProcess: ChildProcess;
  provider: ethers.JsonRpcProvider;
  transactionHash: string;
}

/**
 * DEPLOY Step - Deploy contract to local Anvil instance
 *
 * This step:
 * 1. Finds a free port for Anvil
 * 2. Starts Anvil instance
 * 3. Deploys contract using ethers.js
 * 4. Returns deployment address and process handle
 */
export async function executeDeployStep(params: DeployStepParams): Promise<DeployStepResult> {
  const { abi, bytecode, contractName } = params;

  // Find a free port for Anvil
  const [freePort] = await findFreePort(8545, 8645);

  console.log(`[Deploy] Starting Anvil on port ${freePort}...`);

  // Start Anvil
  const anvilProcess = await startAnvil(freePort);

  try {
    // Wait for Anvil to be ready
    await waitForAnvil(freePort);

    console.log(`[Deploy] Anvil ready on port ${freePort}`);

    // Connect to Anvil
    const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${freePort}`);

    // Get default signer (Anvil provides test accounts with ETH)
    const signer = await provider.getSigner(0);

    console.log(`[Deploy] Deploying ${contractName}...`);

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy contract
    const contract = await factory.deploy();

    // Wait for deployment
    await contract.waitForDeployment();

    const deploymentAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    console.log(`[Deploy] Contract deployed at ${deploymentAddress}`);
    console.log(`[Deploy] Transaction hash: ${deploymentTx?.hash}`);

    return {
      deploymentAddress,
      anvilPort: freePort,
      anvilProcess,
      provider,
      transactionHash: deploymentTx?.hash || '0x0',
    };

  } catch (error) {
    // If deployment fails, kill Anvil
    console.error('[Deploy] Deployment failed, cleaning up Anvil...');
    await killAnvil(anvilProcess);
    throw error;
  }
}

/**
 * Start Anvil instance on specified port
 */
function startAnvil(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log(`[Deploy] Spawning anvil on port ${port}...`);
    const anvil = spawn('anvil', [
      '--port', port.toString(),
      '--host', '127.0.0.1',
      // Removed --silent flag to see output
    ]);

    let started = false;
    let outputBuffer = '';

    anvil.stdout?.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;
      console.log('[Deploy] Anvil stdout:', output.trim());

      // Check if Anvil has started - look for multiple indicators
      if ((output.includes('Listening') || output.includes('localhost:') || outputBuffer.includes('Accounts')) && !started) {
        started = true;
        console.log('[Deploy] Anvil started successfully!');
        // Give Anvil a moment to fully initialize
        setTimeout(() => resolve(anvil), 500);
      }
    });

    anvil.stderr?.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('[Deploy] Anvil stderr:', errorOutput.trim());

      // Some Anvil messages go to stderr but aren't actually errors
      if (errorOutput.includes('Listening') && !started) {
        started = true;
        console.log('[Deploy] Anvil started successfully (detected via stderr)!');
        resolve(anvil);
      }
    });

    anvil.on('error', (error) => {
      if (!started) {
        reject(new Error(`Failed to start Anvil: ${error.message}`));
      }
    });

    anvil.on('exit', (code) => {
      if (!started && code !== 0) {
        reject(new Error(`Anvil exited with code ${code}`));
      }
    });

    // Timeout after 15 seconds (increased from 10)
    setTimeout(() => {
      if (!started) {
        console.error('[Deploy] Anvil startup timeout after 15 seconds');
        anvil.kill();
        reject(new Error('Anvil startup timeout'));
      }
    }, 15000);
  });
}

/**
 * Wait for Anvil to be ready by checking connectivity
 */
async function waitForAnvil(port: number, maxAttempts = 30): Promise<void> {
  const provider = new ethers.JsonRpcProvider(`http://127.0.0.1:${port}`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await provider.getBlockNumber();
      return; // Success!
    } catch (error) {
      // Wait 100ms before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error('Anvil failed to become ready');
}

/**
 * Kill Anvil process gracefully
 */
export async function killAnvil(anvilProcess: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!anvilProcess || anvilProcess.killed) {
      resolve();
      return;
    }

    // Try graceful shutdown first
    anvilProcess.kill('SIGTERM');

    // Wait up to 5 seconds for graceful shutdown
    const timeout = setTimeout(() => {
      if (!anvilProcess.killed) {
        console.log('[Deploy] Anvil did not stop gracefully, forcing kill...');
        anvilProcess.kill('SIGKILL');
      }
    }, 5000);

    anvilProcess.on('exit', () => {
      clearTimeout(timeout);
      console.log('[Deploy] Anvil process terminated');
      resolve();
    });
  });
}
