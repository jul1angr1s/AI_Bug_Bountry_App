import { useValidationProgressLive } from '../../hooks/useValidationProgressLive';
import { useValidationLogs } from '../../hooks/useValidationLogs';
import { ValidationProgressTimeline } from './ValidationProgressTimeline';
import { LiveTerminalOutput } from '../scans/modern/LiveTerminalOutput';

interface ActiveValidationPanelProps {
  validationId: string;
}

export function ActiveValidationPanel({ validationId }: ActiveValidationPanelProps) {
  const progress = useValidationProgressLive(validationId);
  const logs = useValidationLogs(validationId, progress.state);

  const terminalState = progress.state === 'RUNNING'
    ? 'RUNNING'
    : progress.state === 'COMPLETED'
    ? 'COMPLETED'
    : progress.state === 'FAILED'
    ? 'FAILED'
    : 'RUNNING';

  const statusColor = progress.state === 'COMPLETED'
    ? 'bg-accent-green'
    : progress.state === 'FAILED'
    ? 'bg-status-critical'
    : 'bg-primary';

  return (
    <div className="bg-surface-dark border border-surface-border rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${progress.state === 'RUNNING' ? 'animate-pulse' : ''}`} />
          <h2 className="text-lg font-semibold text-white">
            Active Validation
          </h2>
          <span className="text-xs text-gray-400 font-mono bg-surface-darker px-2 py-0.5 rounded">
            {progress.workerType === 'EXECUTION' ? 'Execution Worker' : 'LLM Worker'}
          </span>
        </div>
        {progress.progress > 0 && (
          <span className="text-sm text-gray-300 font-mono">
            {progress.progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-darker rounded-full h-1.5 mb-6">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            progress.state === 'FAILED' ? 'bg-status-critical' : 'bg-primary'
          }`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Content grid: timeline + terminal */}
      <div className="grid grid-cols-12 gap-4">
        {/* Timeline (left) */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <ValidationProgressTimeline
            currentStep={progress.currentStep}
            state={progress.state}
            progress={progress.progress}
            message={progress.message}
            workerType={progress.workerType}
          />
        </div>

        {/* Terminal (right) */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <LiveTerminalOutput
            logs={logs}
            scanState={terminalState}
          />
        </div>
      </div>
    </div>
  );
}
