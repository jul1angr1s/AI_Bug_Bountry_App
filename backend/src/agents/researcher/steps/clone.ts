import { simpleGit, SimpleGit, GitError } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ResearcherClone');

export interface CloneStepParams {
  scanId: string;
  protocolId: string;
  repoUrl: string;
  targetBranch?: string;
  targetCommitHash?: string;
}

export interface CloneStepResult {
  clonedPath: string;
  branch: string;
  commitHash: string;
}

/**
 * CLONE Step - Clone GitHub repository to local filesystem
 *
 * This step:
 * 1. Sanitizes inputs to prevent injection attacks
 * 2. Creates a clean directory for the repo
 * 3. Clones the repository
 * 4. Checks out the specified branch/commit
 * 5. Returns the cloned directory path
 */
export async function executeCloneStep(params: CloneStepParams): Promise<CloneStepResult> {
  const { scanId, protocolId, repoUrl, targetBranch, targetCommitHash } = params;

  // Sanitize inputs
  const sanitizedScanId = sanitizePathComponent(scanId);
  const sanitizedProtocolId = sanitizePathComponent(protocolId);

  // Validate GitHub URL
  if (!isValidGitHubUrl(repoUrl)) {
    throw new Error(`Invalid GitHub URL: ${repoUrl}`);
  }

  // Create clone directory path
  const baseDir = '/tmp/thunder-repos';
  const clonePath = path.join(baseDir, sanitizedProtocolId, sanitizedScanId);

  try {
    // Ensure base directory exists
    await fs.mkdir(baseDir, { recursive: true });

    // Remove existing directory if it exists
    try {
      await fs.rm(clonePath, { recursive: true, force: true });
    } catch (err) {
      // Ignore if directory doesn't exist
    }

    // Create fresh directory
    await fs.mkdir(clonePath, { recursive: true });

    // Initialize git client
    const git: SimpleGit = simpleGit();

    log.info(`Cloning ${repoUrl} to ${clonePath}...`);

    // Clone the repository
    const cloneArgs: string[] = ['--depth', '1'];
    if (!targetBranch) {
      cloneArgs.push('--single-branch');
    }
    if (targetBranch) {
      cloneArgs.push('--branch', targetBranch);
    }
    await git.clone(repoUrl, clonePath, cloneArgs);

    // Initialize git client in cloned directory
    const repoGit: SimpleGit = simpleGit(clonePath);

    // Checkout specific commit if provided
    let actualCommitHash: string;
    let actualBranch: string;

    if (targetCommitHash) {
      log.info(`Checking out commit ${targetCommitHash}...`);

      // For specific commit, we may need to fetch more
      await repoGit.fetch(['--depth=50']); // Fetch more history
      await repoGit.checkout(targetCommitHash);

      actualCommitHash = targetCommitHash;
      actualBranch = targetBranch || 'detached';
    } else {
      // Get current commit hash
      actualCommitHash = await repoGit.revparse(['HEAD']);
      actualBranch = targetBranch || 'main';
    }

    log.info(`Successfully cloned to ${clonePath} at commit ${actualCommitHash}`);

    return {
      clonedPath: clonePath,
      branch: actualBranch,
      commitHash: actualCommitHash.trim(),
    };

  } catch (error) {
    // Clean up on failure
    try {
      await fs.rm(clonePath, { recursive: true, force: true });
    } catch (cleanupErr) {
      log.error('Failed to clean up after error:', cleanupErr);
    }

    if (error instanceof GitError) {
      throw new Error(`Git clone failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Sanitize path components to prevent directory traversal
 */
function sanitizePathComponent(component: string): string {
  // Remove any path separators and special characters
  return component.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Validate GitHub URL format
 */
function isValidGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check if it's a GitHub URL
    if (!parsed.hostname.includes('github.com')) {
      return false;
    }

    // Check if it's HTTPS or git protocol
    if (!['https:', 'git:'].includes(parsed.protocol)) {
      return false;
    }

    // Basic path validation (should be org/repo format)
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
