import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface CompileStepResult {
  success: boolean;
  bytecode?: string;
  abi?: Record<string, unknown>[];
  compilationOutput?: string;
  error?: string;
}

/**
 * Compile Solidity contracts using Foundry (forge)
 * @param repoPath - Path to cloned repository
 * @param contractPath - Relative path to contract directory
 * @param contractName - Contract name (without .sol extension)
 * @returns Compilation result with bytecode and ABI or error
 */
export async function compileContract(
  repoPath: string,
  contractPath: string,
  contractName: string
): Promise<CompileStepResult> {
  try {
    console.log(`Compiling contract ${contractName} in ${repoPath}`);

    // Check if foundry.toml exists, if not create a minimal one
    const foundryConfigPath = path.join(repoPath, 'foundry.toml');
    try {
      await fs.access(foundryConfigPath);
    } catch {
      // Create minimal foundry.toml
      const minimalConfig = `[profile.default]
src = "${contractPath}"
out = "out"
libs = ["lib"]
solc_version = "0.8.20"

[rpc_endpoints]
mainnet = "https://eth-mainnet.g.alchemy.com/v2/demo"

[etherscan]
mainnet = { key = "demo" }
`;
      await fs.writeFile(foundryConfigPath, minimalConfig, 'utf-8');
      console.log('Created minimal foundry.toml configuration');
    }

    // Initialize git submodules if they exist
    try {
      const gitmodulesPath = path.join(repoPath, '.gitmodules');
      await fs.access(gitmodulesPath);
      console.log('Initializing git submodules...');
      await execAsync('git submodule update --init --recursive', {
        cwd: repoPath,
        timeout: 120000, // 2 minute timeout for submodules
        maxBuffer: 10 * 1024 * 1024,
      });
      console.log('Git submodules initialized successfully');
    } catch (error) {
      // No .gitmodules file or submodule init failed, continue anyway
      console.log('No git submodules or initialization skipped');
    }

    // Run forge build
    const { stdout, stderr } = await execAsync('forge build --force', {
      cwd: repoPath,
      timeout: 60000, // 60 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    console.log('Forge build output:', stdout);
    if (stderr) {
      console.warn('Forge build stderr:', stderr);
    }

    // Read compiled artifacts
    // Foundry outputs to: out/<ContractName>.sol/<ContractName>.json
    const contractFileName = contractName.endsWith('.sol') ? contractName : `${contractName}.sol`;
    const artifactPath = path.join(
      repoPath,
      'out',
      contractFileName,
      `${contractName}.json`
    );

    console.log(`Reading artifact from ${artifactPath}`);

    let artifactContent: string;
    try {
      artifactContent = await fs.readFile(artifactPath, 'utf-8');
    } catch (error) {
      // Try alternative path structure
      const altArtifactPath = path.join(repoPath, 'out', `${contractName}.json`);
      try {
        artifactContent = await fs.readFile(altArtifactPath, 'utf-8');
      } catch {
        return {
          success: false,
          compilationOutput: stdout,
          error: `Artifact file not found at ${artifactPath} or ${altArtifactPath}`,
        };
      }
    }

    const artifact = JSON.parse(artifactContent);

    // Extract bytecode and ABI
    const bytecode = artifact.bytecode?.object || artifact.bytecode;
    const abi = artifact.abi;

    if (!bytecode || !abi) {
      return {
        success: false,
        compilationOutput: stdout,
        error: 'Compilation succeeded but bytecode or ABI not found in artifact',
      };
    }

    console.log(`Successfully compiled contract ${contractName}`);
    console.log(`Bytecode length: ${bytecode.length} characters`);
    console.log(`ABI entries: ${abi.length}`);

    return {
      success: true,
      bytecode,
      abi,
      compilationOutput: stdout,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to compile contract:`, errorMessage);

    // Check if it's a compilation error or command execution error
    if (error && typeof error === 'object' && 'stderr' in error) {
      const execError = error as { stderr: string; stdout: string };
      return {
        success: false,
        compilationOutput: execError.stdout,
        error: `Compilation failed: ${execError.stderr}`,
      };
    }

    return {
      success: false,
      error: `Failed to compile contract: ${errorMessage}`,
    };
  }
}

/**
 * Calculate a risk score based on contract complexity
 * This is a simplified version - in production, use static analysis tools
 */
export function calculateRiskScore(bytecode: string, abi: Record<string, unknown>[]): number {
  let score = 0;

  // Bytecode complexity (simplified)
  const bytecodeLength = bytecode.replace(/^0x/, '').length / 2; // Convert hex to bytes
  if (bytecodeLength > 24000) score += 30; // Close to 24KB limit
  else if (bytecodeLength > 16000) score += 20;
  else if (bytecodeLength > 8000) score += 10;

  // Number of functions
  const functionCount = abi.filter(item => item.type === 'function').length;
  if (functionCount > 50) score += 25;
  else if (functionCount > 30) score += 15;
  else if (functionCount > 15) score += 5;

  // Payable functions (higher risk)
  const payableFunctions = abi.filter(
    item => item.type === 'function' && item.stateMutability === 'payable'
  ).length;
  score += payableFunctions * 5;

  // Fallback and receive functions
  const hasFallback = abi.some(item => item.type === 'fallback');
  const hasReceive = abi.some(item => item.type === 'receive');
  if (hasFallback) score += 10;
  if (hasReceive) score += 10;

  // Ensure score is between 0 and 100
  return Math.min(100, Math.max(0, score));
}
