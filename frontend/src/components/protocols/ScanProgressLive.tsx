import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { useScanProgressLive } from '../../hooks/useScanProgressLive';

interface ScanProgressLiveProps {
  scanId: string;
}

const SCAN_STEPS = [
  { key: 'CLONE', label: 'Clone Repository', description: 'Cloning target repository' },
  { key: 'COMPILE', label: 'Compile Contracts', description: 'Compiling with Foundry' },
  { key: 'DEPLOY', label: 'Deploy (Optional)', description: 'Deploying to local Anvil', optional: true },
  { key: 'ANALYZE', label: 'Analyze Contracts', description: 'Running static analysis' },
  { key: 'AI_DEEP_ANALYSIS', label: 'AI Analysis (Optional)', description: 'Deep AI-powered analysis', optional: true },
  { key: 'PROOF_GENERATION', label: 'Generate Proofs', description: 'Creating vulnerability proofs' },
  { key: 'SUBMIT', label: 'Submit Findings', description: 'Submitting to database' },
];

/**
 * Component showing detailed scan progress with 7 steps
 */
export default function ScanProgressLive({ scanId }: ScanProgressLiveProps) {
  const progress = useScanProgressLive(scanId);

  const getStepState = (stepKey: string) => {
    if (progress.state === 'FAILED' && progress.currentStep === stepKey) {
      return 'failed';
    }
    if (progress.currentStep === stepKey && progress.state === 'IN_PROGRESS') {
      return 'active';
    }
    if (progress.state === 'COMPLETED' ||
        (progress.currentStep === stepKey && progress.state === 'COMPLETED')) {
      return 'completed';
    }

    // Check if this step comes before current step
    const currentIndex = SCAN_STEPS.findIndex(s => s.key === progress.currentStep);
    const stepIndex = SCAN_STEPS.findIndex(s => s.key === stepKey);

    if (stepIndex < currentIndex) {
      return 'completed';
    }

    return 'pending';
  };

  const getStepIcon = (stepKey: string) => {
    const state = getStepState(stepKey);

    switch (state) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStepColor = (stepKey: string) => {
    const state = getStepState(stepKey);

    switch (state) {
      case 'completed':
        return 'text-green-400';
      case 'active':
        return 'text-purple-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  const getElapsedTime = () => {
    // Estimate elapsed time based on progress
    const minutes = Math.floor(progress.progress / 15);
    return minutes > 0 ? `${minutes}m` : 'Just started';
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Scan Progress</span>
          <span className="text-white font-semibold">{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              progress.state === 'FAILED' ? 'bg-red-500' :
              progress.state === 'ABORTED' ? 'bg-yellow-500' :
              'bg-purple-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Connection Status */}
      {!progress.isConnected && progress.state !== 'COMPLETED' && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          <span>Connecting to progress stream...</span>
        </div>
      )}

      {/* Error Message */}
      {progress.error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
          <XCircle className="w-4 h-4" />
          <span>{progress.error}</span>
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-3">
        {SCAN_STEPS.map((step, index) => {
          const state = getStepState(step.key);

          return (
            <div
              key={step.key}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                state === 'active'
                  ? 'bg-purple-500/10 border-purple-500/30'
                  : state === 'failed'
                  ? 'bg-red-500/10 border-red-500/30'
                  : state === 'completed'
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-gray-800/50 border-gray-800'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step.key)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-medium ${getStepColor(step.key)}`}>
                    {step.label}
                    {step.optional && (
                      <span className="ml-2 text-xs text-gray-500">(Optional)</span>
                    )}
                  </h4>
                  <span className="text-xs text-gray-500">
                    Step {index + 1}/{SCAN_STEPS.length}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {state === 'active' && progress.message ? progress.message : step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
        <span>Elapsed: {getElapsedTime()}</span>
        <span>{progress.message}</span>
      </div>
    </div>
  );
}
