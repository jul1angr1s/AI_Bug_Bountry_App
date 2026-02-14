import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ProtocolVerify');

export interface VerifyStepResult {
  success: boolean;
  contractFullPath?: string;
  error?: string;
}

/**
 * Verify that the contract file exists at the specified path
 * @param repoPath - Path to cloned repository
 * @param contractPath - Relative path to contract file
 * @param contractName - Contract file name (e.g., "VulnerableVault.sol")
 * @returns Result with full contract path or error
 */
export async function verifyContractPath(
  repoPath: string,
  contractPath: string,
  contractName: string
): Promise<VerifyStepResult> {
  try {
    // Sanitize contract path to prevent path traversal
    const sanitizedPath = sanitizePath(contractPath);
    if (!sanitizedPath) {
      return {
        success: false,
        error: 'Invalid contract path: path traversal detected',
      };
    }

    // Build full path to contract file
    // contractPath already includes the filename (e.g., "src/protocol/ThunderLoan.sol")
    const contractFullPath = path.join(repoPath, sanitizedPath);

    log.info(`Verifying contract exists at ${contractFullPath}`);

    // Check if file exists
    try {
      const stats = await fs.stat(contractFullPath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: `Contract path exists but is not a file: ${contractFullPath}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Contract file not found at ${contractFullPath}`,
      };
    }

    // Verify it's a Solidity file
    if (!contractFullPath.endsWith('.sol')) {
      return {
        success: false,
        error: `Contract file must be a Solidity file (.sol): ${contractFullPath}`,
      };
    }

    // Read first few lines to verify it's a valid Solidity file
    const content = await fs.readFile(contractFullPath, 'utf-8');
    if (!content.includes('pragma solidity') && !content.includes('contract ')) {
      return {
        success: false,
        error: `File does not appear to be a valid Solidity contract: ${contractFullPath}`,
      };
    }

    log.info(`Contract file verified successfully at ${contractFullPath}`);

    return {
      success: true,
      contractFullPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: errorMessage }, 'Failed to verify contract path');

    return {
      success: false,
      error: `Failed to verify contract path: ${errorMessage}`,
    };
  }
}

/**
 * Sanitize path to prevent path traversal attacks
 */
function sanitizePath(inputPath: string): string | null {
  // Remove any leading slashes
  let sanitized = inputPath.replace(/^\/+/, '');

  // Check for path traversal patterns
  if (sanitized.includes('..') || sanitized.includes('~')) {
    return null;
  }

  // Normalize path
  sanitized = path.normalize(sanitized);

  // Final check: ensure no absolute path or traversal
  if (path.isAbsolute(sanitized) || sanitized.startsWith('..')) {
    return null;
  }

  return sanitized;
}

/**
 * Get list of Solidity files in the contract directory
 * Useful for debugging when the specified contract is not found
 */
export async function listSolidityFiles(
  repoPath: string,
  contractPath: string
): Promise<string[]> {
  try {
    const dirPath = path.join(repoPath, contractPath);
    const files = await fs.readdir(dirPath);
    return files.filter(f => f.endsWith('.sol'));
  } catch (error) {
    return [];
  }
}
