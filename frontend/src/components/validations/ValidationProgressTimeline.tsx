import { useMemo } from 'react';
import type { ValidationWorkerType } from '../../hooks/useValidationProgressLive';

export interface ValidationProgressTimelineProps {
  currentStep: string;
  state: string;
  progress?: number;
  message?: string;
  workerType: ValidationWorkerType;
}

interface TimelineStage {
  id: string;
  title: string;
  mobileTitle: string;
}

const LLM_STAGES: TimelineStage[] = [
  { id: 'DECRYPT_PROOF', title: 'Decrypt Proof', mobileTitle: 'Decrypt' },
  { id: 'FETCH_DETAILS', title: 'Fetch Details', mobileTitle: 'Fetch' },
  { id: 'READ_CONTRACT', title: 'Read Contract', mobileTitle: 'Read' },
  { id: 'LLM_ANALYSIS', title: 'LLM Analysis', mobileTitle: 'LLM' },
  { id: 'UPDATE_RESULT', title: 'Update Result', mobileTitle: 'Update' },
  { id: 'RECORD_ONCHAIN', title: 'Record On-Chain', mobileTitle: 'On-Chain' },
  { id: 'COMPLETE', title: 'Complete', mobileTitle: 'Done' },
];

const EXECUTION_STAGES: TimelineStage[] = [
  { id: 'DECRYPT_PROOF', title: 'Decrypt Proof', mobileTitle: 'Decrypt' },
  { id: 'FETCH_DETAILS', title: 'Fetch Details', mobileTitle: 'Fetch' },
  { id: 'CLONE_REPO', title: 'Clone Repository', mobileTitle: 'Clone' },
  { id: 'COMPILE', title: 'Compile Contracts', mobileTitle: 'Compile' },
  { id: 'SPAWN_SANDBOX', title: 'Spawn Sandbox', mobileTitle: 'Sandbox' },
  { id: 'DEPLOY', title: 'Deploy Contract', mobileTitle: 'Deploy' },
  { id: 'EXECUTE_EXPLOIT', title: 'Execute Exploit', mobileTitle: 'Exploit' },
  { id: 'UPDATE_RESULT', title: 'Update Result', mobileTitle: 'Update' },
  { id: 'RECORD_ONCHAIN', title: 'Record On-Chain', mobileTitle: 'On-Chain' },
  { id: 'COMPLETE', title: 'Complete', mobileTitle: 'Done' },
];

type StageStatus = 'completed' | 'active' | 'failed' | 'pending';

export function ValidationProgressTimeline({
  currentStep,
  state,
  message,
  workerType,
}: ValidationProgressTimelineProps) {
  const stages = workerType === 'EXECUTION' ? EXECUTION_STAGES : LLM_STAGES;

  const stageStatuses = useMemo(() => {
    const statuses: Record<string, StageStatus> = {};
    const currentIndex = stages.findIndex((stage) => stage.id === currentStep);

    stages.forEach((stage, index) => {
      if (state === 'FAILED' && stage.id === currentStep) {
        statuses[stage.id] = 'failed';
      } else if (index < currentIndex) {
        statuses[stage.id] = 'completed';
      } else if (index === currentIndex) {
        if (state === 'COMPLETED' && currentStep === 'COMPLETE') {
          statuses[stage.id] = 'completed';
        } else {
          statuses[stage.id] = 'active';
        }
      } else {
        statuses[stage.id] = 'pending';
      }
    });

    return statuses;
  }, [currentStep, state, stages]);

  const getStageIcon = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return 'check';
      case 'active':
        return 'sync';
      case 'failed':
        return 'close';
      case 'pending':
      default:
        return 'radio_button_unchecked';
    }
  };

  const getStageIconClass = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return 'text-accent-green';
      case 'active':
        return 'text-primary animate-spin';
      case 'failed':
        return 'text-status-critical';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  const getStageBorderClass = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return 'border-accent-green';
      case 'active':
        return 'border-primary shadow-glow-blue animate-pulse';
      case 'failed':
        return 'border-status-critical';
      case 'pending':
      default:
        return 'border-gray-600';
    }
  };

  const getStageOpacity = (status: StageStatus) => {
    return status === 'pending' ? 'opacity-50' : 'opacity-100';
  };

  return (
    <div className="relative">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentStep && stageStatuses[currentStep] === 'active' && (
          <span>
            {stages.find((s) => s.id === currentStep)?.title} is now in progress
          </span>
        )}
      </div>

      <ol className="relative space-y-4">
        <div
          className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-surface-border"
          aria-hidden="true"
        />

        {stages.map((stage) => {
          const status = stageStatuses[stage.id];

          return (
            <li key={stage.id} className={`relative flex items-start ${getStageOpacity(status)}`}>
              <div
                className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 bg-surface-dark ${getStageBorderClass(status)}`}
                aria-label={`${stage.title}: ${status}`}
                role="img"
              >
                <span className={`material-symbols-outlined text-base ${getStageIconClass(status)}`}>
                  {getStageIcon(status)}
                </span>
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <h3 className="hidden md:block text-sm font-semibold text-white">
                  {stage.title}
                </h3>
                <h3 className="block md:hidden text-sm font-semibold text-white">
                  {stage.mobileTitle}
                </h3>

                {status === 'active' && message && (
                  <p className="text-xs text-primary animate-pulse truncate mt-0.5">
                    {message}
                  </p>
                )}
                {status === 'failed' && (
                  <p className="text-xs text-status-critical mt-0.5">
                    {message || 'Stage failed'}
                  </p>
                )}
                {status === 'completed' && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Success
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
