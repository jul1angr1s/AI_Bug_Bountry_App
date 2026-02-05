import { useState, useEffect } from 'react';
import { MaterialIcon } from '../shared/MaterialIcon';
import { LiveTerminalOutput, LogMessage } from '../scans/modern/LiveTerminalOutput';
import { ScanProgressTimeline } from '../scans/modern/ScanProgressTimeline';
import { useLatestScan } from '@/hooks/useLatestScan';
import { useScanProgressLive } from '@/hooks/useScanProgressLive';
import { mapScanProgressToLogs, formatStepName } from '@/lib/scanProgressMapper';

interface ScanProgressModalProps {
  protocolId: string;
  onClose: () => void;
}

export function ScanProgressModal({ protocolId, onClose }: ScanProgressModalProps) {
  const { data: latestScan } = useLatestScan(protocolId);
  const progressState = useScanProgressLive(latestScan?.id || null);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Debug logging
  useEffect(() => {
    console.log('[ScanProgressModal] Protocol ID:', protocolId);
    console.log('[ScanProgressModal] Latest Scan:', latestScan);
    console.log('[ScanProgressModal] Progress State:', progressState);
  }, [protocolId, latestScan, progressState]);

  // Convert progress messages to terminal logs
  useEffect(() => {
    if (progressState.message && progressState.currentStep) {
      console.log('[ScanProgressModal] New progress message:', progressState.message);
      
      const log = mapScanProgressToLogs(
        progressState.currentStep,
        progressState.message,
        new Date().toISOString()
      );
      
      // Avoid duplicate logs by checking if the message already exists
      setLogs((prev) => {
        const lastLog = prev[prev.length - 1];
        if (lastLog && lastLog.message === log.message) {
          return prev;
        }
        return [...prev, log];
      });
    }
  }, [progressState.message, progressState.currentStep]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const scanState = latestScan?.state || 'RUNNING';
  const isComplete = scanState === 'SUCCEEDED' || scanState === 'FAILED' || scanState === 'CANCELED';

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1a1f2e] border border-gray-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
              <MaterialIcon name="terminal" className="text-2xl text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                Scan Progress
              </h2>
              <p className="text-sm text-gray-400">
                {isComplete ? 'Scan completed' : formatStepName(progressState.currentStep)}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            aria-label="Close modal"
          >
            <MaterialIcon name="close" className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Card */}
          <div className="bg-[#0f1723] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MaterialIcon 
                  name={isComplete ? 'check_circle' : 'sync'} 
                  className={`text-2xl ${
                    isComplete ? 'text-green-400' : 'text-blue-400 animate-spin'
                  }`} 
                />
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <p className="text-lg font-semibold text-white">
                    {scanState === 'RUNNING' ? 'In Progress' : scanState}
                  </p>
                </div>
              </div>
              
              {!isComplete && progressState.progress > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-400">Progress</p>
                  <p className="text-lg font-semibold text-white">
                    {Math.round(progressState.progress)}%
                  </p>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {!isComplete && progressState.progress > 0 && (
              <div className="mt-3 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressState.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-[#0f1723] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MaterialIcon name="timeline" className="text-xl text-purple-400" />
              Scan Pipeline
            </h3>
            <ScanProgressTimeline
              currentStep={progressState.currentStep}
              state={progressState.state}
              message={progressState.message}
              progress={progressState.progress}
            />
          </div>

          {/* Terminal Output */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <MaterialIcon name="code" className="text-xl text-green-400" />
              Live Terminal Output
            </h3>
            <LiveTerminalOutput
              logs={logs}
              scanState={scanState as 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABORTED'}
            />
          </div>

          {/* Connection Status */}
          {!isComplete && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                progressState.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span>
                {progressState.isConnected ? 'Connected to live stream' : 'Connection lost - retrying...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          {latestScan && (
            <button
              onClick={() => {
                onClose();
                window.location.href = `/scans/${latestScan.id}`;
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-glow-purple text-white rounded-lg transition-all flex items-center gap-2"
            >
              <span>View Full Details</span>
              <MaterialIcon name="arrow_forward" className="text-lg" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
