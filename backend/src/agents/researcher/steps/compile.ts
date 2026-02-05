import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface CompileStepParams {
  clonedPath: string;
  contractPath: string;
  contractName: string;
}

export interface CompileStepResult {
  success: boolean;
  artifactsPath: string;
  abi?: any;
  bytecode?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * COMPILE Step - Compile Solidity contracts using Foundry
 *
 * This step:
 * 1. Navigates to the cloned repository
 * 2. Runs `forge build` to compile contracts
 * 3. Parses compilation output for errors/warnings
 * 4. Extracts ABI and bytecode from artifacts
 * 5. Returns compilation results
 */
export async function executeCompileStep(params: CompileStepParams): Promise<CompileStepResult> {
  const { clonedPath, contractPath, contractName } = params;

  try {
    console.log(`[Compile] Compiling contracts in ${clonedPath}...`);

    // Check if foundry.toml exists
    const foundryConfigPath = path.join(clonedPath, 'foundry.toml');
    let hasFoundryConfig = false;

    try {
      await fs.access(foundryConfigPath);
      hasFoundryConfig = true;
    } catch {
      console.log('[Compile] No foundry.toml found, will use default settings');
    }

    // Initialize Foundry project if needed
    if (!hasFoundryConfig) {
      console.log('[Compile] Initializing Foundry project...');
      try {
        await execAsync('forge init --force --no-git', { cwd: clonedPath });
      } catch (initError) {
        console.log('[Compile] Init failed, continuing anyway:', initError);
      }
    }

    // Install dependencies
    try {
      console.log('[Compile] Installing dependencies...');
      await execAsync('forge install --no-git', {
        cwd: clonedPath,
        timeout: 60000, // 60 second timeout
      });
    } catch (installError) {
      console.log('[Compile] Dependency installation failed, continuing:', installError);
    }

    // Run forge build
    console.log('[Compile] Running forge build...');

    const buildResult = await execAsync('forge build --force', {
      cwd: clonedPath,
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Parse stdout/stderr for errors and warnings
    const output = buildResult.stdout + buildResult.stderr;

    if (output.includes('Error') || output.includes('error')) {
      const errorMatches = output.match(/Error[:\s]+.*/gi);
      if (errorMatches) {
        errors.push(...errorMatches);
      }
    }

    if (output.includes('Warning') || output.includes('warning')) {
      const warningMatches = output.match(/Warning[:\s]+.*/gi);
      if (warningMatches) {
        warnings.push(...warningMatches);
      }
    }

    console.log('[Compile] Build completed, extracting artifacts...');

    // Extract ABI and bytecode
    const artifactsPath = path.join(clonedPath, 'out');
    const { abi, bytecode } = await extractArtifacts(artifactsPath, contractPath, contractName);

    console.log(`[Compile] Successfully compiled ${contractName}`);

    return {
      success: true,
      artifactsPath,
      abi,
      bytecode,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

  } catch (error) {
    console.error('[Compile] Compilation failed:', error);

    // Check if it's a compilation error or infrastructure error
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('forge: command not found') || errorMessage.includes('forge: not found')) {
      throw new Error('Foundry (forge) is not installed or not in PATH');
    }

    throw new Error(`Compilation failed: ${errorMessage}`);
  }
}

/**
 * Extract ABI and bytecode from Foundry artifacts
 */
async function extractArtifacts(
  artifactsPath: string,
  contractPath: string,
  contractName: string
): Promise<{ abi?: any; bytecode?: string }> {
  try {
    // Foundry stores artifacts in out/<ContractFile>/<ContractName>.json
    const contractFileName = path.basename(contractPath, '.sol');
    const artifactPath = path.join(artifactsPath, `${contractFileName}.sol`, `${contractName}.json`);

    console.log(`[Compile] Looking for artifact at ${artifactPath}`);

    // Read the artifact file
    const artifactContent = await fs.readFile(artifactPath, 'utf-8');
    const artifact = JSON.parse(artifactContent);

    // Extract ABI and bytecode
    const abi = artifact.abi;
    const bytecode = artifact.bytecode?.object || artifact.bytecode;

    if (!abi) {
      console.warn('[Compile] No ABI found in artifact');
    }

    if (!bytecode) {
      console.warn('[Compile] No bytecode found in artifact');
    }

    return { abi, bytecode };

  } catch (error) {
    console.error('[Compile] Failed to extract artifacts:', error);

    // Try to find the artifact in alternative locations
    try {
      const files = await findJsonFiles(artifactsPath);
      console.log(`[Compile] Found ${files.length} artifact files, searching for ${contractName}...`);

      for (const file of files) {
        if (file.includes(contractName)) {
          const content = await fs.readFile(file, 'utf-8');
          const artifact = JSON.parse(content);

          if (artifact.abi && artifact.bytecode) {
            console.log(`[Compile] Found artifact at ${file}`);
            return {
              abi: artifact.abi,
              bytecode: artifact.bytecode?.object || artifact.bytecode,
            };
          }
        }
      }
    } catch (searchError) {
      console.error('[Compile] Failed to search for artifacts:', searchError);
    }

    return {};
  }
}

/**
 * Recursively find all JSON files in a directory
 */
async function findJsonFiles(dir: string, files: string[] = []): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await findJsonFiles(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  } catch (error) {
    console.error(`[Compile] Error reading directory ${dir}:`, error);
    return files;
  }
}
