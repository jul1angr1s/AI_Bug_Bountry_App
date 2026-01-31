import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

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

    console.log(`Cloning repository ${sanitizedUrl} to ${repoPath}`);

    // Clone repository
    const git = simpleGit();
    await git.clone(sanitizedUrl, repoPath, ['--depth', '1', '--branch', branch]);

    console.log(`Successfully cloned repository to ${repoPath}`);

    return {
      success: true,
      repoPath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to clone repository:`, errorMessage);

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
    console.log(`Cleaned up repository at ${repoPath}`);
  } catch (error) {
    console.error(`Failed to cleanup repository:`, error);
  }
}
