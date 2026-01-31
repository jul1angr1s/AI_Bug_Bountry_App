import React, { useEffect, useMemo, useState } from 'react';
import { Scan, subscribeToScanProgress } from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ScanProgressProps {
  scan: Scan;
  onComplete?: () => void;
}

const STEP_ORDER = ['CLONE', 'COMPILE', 'DEPLOY', 'ANALYZE', 'PROOF_GENERATION', 'SUBMIT'];

const STEP_LABELS: Record<string, string> = {
  CLONE: 'Cloning Repository',
  COMPILE: 'Compiling Contracts',
  DEPLOY: 'Deploying to Anvil',
  ANALYZE: 'Running Analysis',
  PROOF_GENERATION: 'Generating Proofs',
  SUBMIT: 'Submitting Results',
};

const STATE_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-500',
  RUNNING: 'bg-blue-500',
  SUCCEEDED: 'bg-green-500',
  FAILED: 'bg-red-500',
  CANCELED: 'bg-gray-500',
};

export const ScanProgress: React.FC<ScanProgressProps> = ({ scan, onComplete }) => {
  const [currentScan, setCurrentScan] = useState<Scan>(scan);
  const { subscribe } = useWebSocket();

  // Subscribe to SSE for real-time progress
  useEffect(() => {
    if (scan.state !== 'RUNNING') return;

    const unsubscribe = subscribeToScanProgress(
      scan.id,
      (data) => {
        
        if (data.state === 'SUCCEEDED' || data.state === 'FAILED' || data.state === 'CANCELED') {
          setCurrentScan((prev) => ({ ...prev, state: data.state as Scan['state'] }));
          onComplete?.();
        }
      },
      (error) => {
        console.error('SSE error:', error);
      }
    );

    return unsubscribe;
  }, [scan.id, scan.state, onComplete]);

  // WebSocket event handlers
  useEffect(() => {
    const handleScanProgress = (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const payload = event as { scanId?: string; data?: { currentStep?: string; state?: Scan['state'] } };
      if (payload.scanId === scan.id) {
        setCurrentScan((prev) => ({
          ...prev,
          currentStep: payload.data?.currentStep || prev.currentStep,
          state: payload.data?.state || prev.state,
        }));
      }
    };

    const handleScanCompleted = (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const payload = event as { scanId?: string; data?: { state?: Scan['state']; findingsCount?: number } };
      if (payload.scanId === scan.id) {
        setCurrentScan((prev) => ({
          ...prev,
          state: payload.data?.state || prev.state,
          findingsCount: payload.data?.findingsCount || prev.findingsCount,
        }));
        onComplete?.();
      }
    };

    const unsubProgress = subscribe('scan:progress', handleScanProgress);
    const unsubCompleted = subscribe('scan:completed', handleScanCompleted);

    return () => {
      unsubProgress();
      unsubCompleted();
    };
  }, [subscribe, scan.id, onComplete]);

  const progress = useMemo(() => {
    if (!currentScan.currentStep) {
      return 0;
    }
    const stepIndex = STEP_ORDER.indexOf(currentScan.currentStep);
    if (stepIndex < 0) {
      return 0;
    }
    return ((stepIndex + 1) / STEP_ORDER.length) * 100;
  }, [currentScan.currentStep]);

  const isComplete = ['SUCCEEDED', 'FAILED', 'CANCELED'].includes(currentScan.state);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Scan #{scan.id.slice(0, 8)}
          </h3>
          <p className="text-sm text-gray-500">
            Started {new Date(scan.startedAt).toLocaleString()}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
            STATE_COLORS[currentScan.state]
          }`}
        >
          {currentScan.state}
        </span>
      </div>

      {/* Progress Bar */}
      {!isComplete && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              {currentScan.currentStep
                ? STEP_LABELS[currentScan.currentStep] || currentScan.currentStep
                : 'Initializing...'}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step Indicators */}
      <div className="flex items-center space-x-2 mb-4">
        {STEP_ORDER.map((step, index) => {
          const isActive = currentScan.currentStep === step;
          const isPast =
            STEP_ORDER.indexOf(currentScan.currentStep || '') > index ||
            (currentScan.state === 'SUCCEEDED' && index < STEP_ORDER.length);
          const isFailed = currentScan.state === 'FAILED' && isActive;

          return (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  isFailed
                    ? 'bg-red-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white'
                    : isPast
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                title={STEP_LABELS[step]}
              >
                {index + 1}
              </div>
              {index < STEP_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-1 ${
                    isPast ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Results Summary */}
      {isComplete && (
        <div className="border-t pt-4">
          {currentScan.state === 'SUCCEEDED' && (
            <div className="text-green-600">
              <span className="font-semibold">{scan.findingsCount}</span> vulnerabilities found
            </div>
          )}
          {currentScan.state === 'FAILED' && (
            <div className="text-red-600">
              <p className="font-medium">Error: {scan.errorCode}</p>
              <p className="text-sm">{scan.errorMessage}</p>
            </div>
          )}
          {currentScan.state === 'CANCELED' && (
            <div className="text-gray-600">Scan was canceled</div>
          )}
        </div>
      )}
    </div>
  );
};
