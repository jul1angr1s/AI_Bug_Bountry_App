/**
 * Researcher Agent - Main Entry Point
 * 
 * This module initializes the Researcher Agent worker process.
 * It can be run as a standalone process or integrated into the main backend.
 * 
 * Usage:
 *   npm run researcher:worker  # Standalone mode
 *   # OR
 *   # As part of main backend server
 */

import { createResearcherWorker } from './worker.js';
import { getPrismaClient } from '../../lib/prisma.js';
import { ScanState } from '@prisma/client';
import { scanRepository } from '../../db/repositories.js';
import { pathToFileURL } from 'node:url';

// Feature flag to enable/disable Researcher Agent
const RESEARCHER_ENABLED = process.env.RESEARCHER_ENABLED !== 'false';

// Worker instance
let researcherWorker: ReturnType<typeof createResearcherWorker> | null = null;

/**
 * Start the Researcher Agent worker
 */
export async function startResearcherAgent(): Promise<void> {
  if (!RESEARCHER_ENABLED) {
    console.log('[Researcher Agent] Disabled by feature flag');
    return;
  }

  console.log('[Researcher Agent] Starting worker...');

  try {
    // Create and start the worker
    researcherWorker = createResearcherWorker();

    // Restore any interrupted scans from previous session
    await restoreInterruptedScans();

    console.log('[Researcher Agent] Worker started successfully');
  } catch (error) {
    console.error('[Researcher Agent] Failed to start:', error);
    throw error;
  }
}

/**
 * Stop the Researcher Agent worker gracefully
 */
export async function stopResearcherAgent(): Promise<void> {
  if (!researcherWorker) {
    return;
  }

  console.log('[Researcher Agent] Stopping worker...');

  try {
    await researcherWorker.close();
    researcherWorker = null;
    console.log('[Researcher Agent] Worker stopped');
  } catch (error) {
    console.error('[Researcher Agent] Error stopping worker:', error);
    throw error;
  }
}

/**
 * Restore scans that were interrupted (RUNNING state) from previous session
 */
async function restoreInterruptedScans(): Promise<void> {
  const prisma = getPrismaClient();
  
  // Find scans that were running but got interrupted
  const interruptedScans = await prisma.scan.findMany({
    where: {
      state: ScanState.RUNNING,
    },
  });

  if (interruptedScans.length === 0) {
    return;
  }

  console.log(`[Researcher Agent] Restoring ${interruptedScans.length} interrupted scans...`);

  // Mark them as failed with a recovery note
  for (const scan of interruptedScans) {
    await scanRepository.markScanFailed(
      scan.id,
      'WORKER_RESTART',
      'Scan interrupted by worker restart. Please resubmit.'
    );
  }

  console.log('[Researcher Agent] Interrupted scans marked as failed');
}

/**
 * Get Researcher Agent status
 */
export function getResearcherStatus(): {
  enabled: boolean;
  running: boolean;
} {
  return {
    enabled: RESEARCHER_ENABLED,
    running: researcherWorker !== null,
  };
}

// Standalone mode
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (isMain) {
  console.log('[Researcher Agent] Starting in standalone mode...');
  
  startResearcherAgent().catch((error) => {
    console.error('[Researcher Agent] Fatal error:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Researcher Agent] SIGTERM received, shutting down...');
    await stopResearcherAgent();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Researcher Agent] SIGINT received, shutting down...');
    await stopResearcherAgent();
    process.exit(0);
  });
}
