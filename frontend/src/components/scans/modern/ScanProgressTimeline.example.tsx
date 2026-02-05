/**
 * Example usage of ScanProgressTimeline component
 *
 * This file demonstrates how to integrate the ScanProgressTimeline component
 * with the useScanProgressLive hook for real-time scan progress updates.
 */

import { ScanProgressTimeline } from './ScanProgressTimeline';
import { useScanProgressLive } from '../../../hooks/useScanProgressLive';

interface ScanProgressExampleProps {
  scanId: string;
}

export function ScanProgressExample({ scanId }: ScanProgressExampleProps) {
  // Subscribe to real-time scan progress updates via WebSocket
  const progressState = useScanProgressLive(scanId);

  // Track stage durations (you would typically store this in state)
  const stageDurations = {
    CLONE: 5,
    COMPILE: 12,
    DEPLOY: 8,
    ANALYZE: 45,
    AI_DEEP_ANALYSIS: 120,
    PROOF_GENERATION: 30,
    SUBMIT: 2,
  };

  // Mock data for demonstration (replace with real data from your API)
  const blockNumber = '18123456';
  const findingsCount = 23;

  return (
    <div className="w-full max-w-md">
      <h2 className="text-xl font-bold text-white mb-4">Scan Progress</h2>

      <ScanProgressTimeline
        currentStep={progressState.currentStep}
        state={progressState.state}
        progress={progressState.progress}
        message={progressState.message}
        blockNumber={blockNumber}
        findingsCount={findingsCount}
        stageDurations={stageDurations}
      />

      {/* Connection status indicator */}
      <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${
            progressState.isConnected ? 'bg-accent-green' : 'bg-status-critical'
          }`}
        />
        <span>{progressState.isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  );
}

/**
 * Example with mock data (useful for development/Storybook)
 */
export function ScanProgressTimelineMockExample() {
  return (
    <div className="w-full max-w-md bg-surface-dark p-6 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-6">Active Scan Progress</h2>

      <ScanProgressTimeline
        currentStep="AI_DEEP_ANALYSIS"
        state="RUNNING"
        message="Analyzing contract logic with AI models..."
        blockNumber="18123456"
        findingsCount={23}
        stageDurations={{
          CLONE: 5,
          COMPILE: 12,
          DEPLOY: 8,
          ANALYZE: 45,
        }}
      />
    </div>
  );
}

/**
 * Example with completed scan
 */
export function ScanProgressTimelineCompletedExample() {
  return (
    <div className="w-full max-w-md bg-surface-dark p-6 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-6">Completed Scan</h2>

      <ScanProgressTimeline
        currentStep="SUBMIT"
        state="COMPLETED"
        blockNumber="18123456"
        findingsCount={42}
        stageDurations={{
          CLONE: 5,
          COMPILE: 12,
          DEPLOY: 8,
          ANALYZE: 45,
          AI_DEEP_ANALYSIS: 180,
          PROOF_GENERATION: 35,
          SUBMIT: 2,
        }}
      />
    </div>
  );
}

/**
 * Example with failed scan
 */
export function ScanProgressTimelineFailedExample() {
  return (
    <div className="w-full max-w-md bg-surface-dark p-6 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-6">Failed Scan</h2>

      <ScanProgressTimeline
        currentStep="DEPLOY"
        state="FAILED"
        message="Failed to fork Ethereum mainnet: RPC endpoint unavailable"
        stageDurations={{
          CLONE: 5,
          COMPILE: 12,
        }}
      />
    </div>
  );
}
