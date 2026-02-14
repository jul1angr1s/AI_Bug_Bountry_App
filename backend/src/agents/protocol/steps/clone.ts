import { simpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ProtocolClone');

export interface CloneStepResult {
  success: boolean;
  repoPath?: string;
  error?: string;
}

/**
 * Clone GitHub repository to temporary directory
 * @param protocolId - Protocol ID
 * @param githubUrl - GitHub repository URL
 * @param branch - Branch to checkout (default: main)
 * @returns Result with repo path or error
 */
export async function cloneRepository(
  protocolId: string,
  githubUrl: string,
  branch: string = 'main'
): Promise<CloneStepResult> {
  const repoPath = path.join('/tmp', 'thunder-repos', protocolId);

  try {
    // Clean up existing directory if it exists
    try {
      await fs.rm(repoPath, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    // Ensure parent directory exists
    await fs.mkdir(path.dirname(repoPath), { recursive: true });

    // Sanitize GitHub URL to prevent command injection
    const sanitizedUrl = sanitizeGithubUrl(githubUrl);
    if (!sanitizedUrl) {
      return {
        success: false,
        error: 'Invalid GitHub URL format',
      };
    }

    log.info({ url: sanitizedUrl, repoPath }, 'Cloning repository');

    // Clone repository
    const git = simpleGit();
    await git.clone(sanitizedUrl, repoPath, ['--depth', '1', '--branch', branch]);

    log.info({ repoPath }, 'Successfully cloned repository');

    return {
      success: true,
      repoPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error({ err: errorMessage }, 'Failed to clone repository');

    return {
      success: false,
      error: `Failed to clone repository: ${errorMessage}`,
    };
  }
}

/**
 * Sanitize GitHub URL to prevent command injection
 * Only allow HTTPS GitHub URLs
 */
function sanitizeGithubUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS protocol
    if (parsedUrl.protocol !== 'https:') {
      return null;
    }

    // Only allow github.com domain
    if (parsedUrl.hostname !== 'github.com') {
      return null;
    }

    // Ensure path follows GitHub repo format: /owner/repo
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      return null;
    }

    return url;
  } catch (error) {
    return null;
  }
}

/**
 * Clean up cloned repository
 */
export async function cleanupRepository(repoPath: string): Promise<void> {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    log.info({ repoPath }, 'Cleaned up repository');
  } catch (error) {
    log.error({ err: error }, 'Failed to cleanup repository');
  }
}
