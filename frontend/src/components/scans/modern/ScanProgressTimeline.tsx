import { useMemo } from 'react';

export interface ScanProgressTimelineProps {
  currentStep: string; // CLONE, COMPILE, DEPLOY, ANALYZE, AI_DEEP_ANALYSIS, PROOF_GENERATION, SUBMIT
  state: string; // RUNNING, COMPLETED, FAILED
  progress?: number; // 0-100
  message?: string;
  blockNumber?: string;
  findingsCount?: number;
  stageDurations?: Record<string, number>; // Duration in seconds for completed stages
}

interface TimelineStage {
  id: string;
  title: string;
  displayTitle: string;
  mobileTitle: string;
}

const TIMELINE_STAGES: TimelineStage[] = [
  { id: 'CLONE', title: 'Clone Repository', displayTitle: 'Clone Repository', mobileTitle: 'Clone' },
  { id: 'COMPILE', title: 'Compile Contracts', displayTitle: 'Compile Contracts', mobileTitle: 'Compile' },
  { id: 'DEPLOY', title: 'Deploy Testnet', displayTitle: 'Deploy Testnet', mobileTitle: 'Deploy' },
  { id: 'ANALYZE', title: 'Static Analysis', displayTitle: 'Static Analysis', mobileTitle: 'Analyze' },
  { id: 'AI_DEEP_ANALYSIS', title: 'AI Deep Analysis', displayTitle: 'AI Deep Analysis', mobileTitle: 'AI Analysis' },
  { id: 'PROOF_GENERATION', title: 'Proof of Concept', displayTitle: 'Proof of Concept', mobileTitle: 'PoC' },
  { id: 'SUBMIT', title: 'Submit Report', displayTitle: 'Submit Report', mobileTitle: 'Submit' },
];

type StageStatus = 'completed' | 'active' | 'failed' | 'pending';

export function ScanProgressTimeline({
  currentStep,
  state,
  message,
  blockNumber,
  findingsCount,
  stageDurations = {},
}: ScanProgressTimelineProps) {
  // Determine the status of each stage
  const stageStatuses = useMemo(() => {
    const statuses: Record<string, StageStatus> = {};
    const currentIndex = TIMELINE_STAGES.findIndex((stage) => stage.id === currentStep);

    TIMELINE_STAGES.forEach((stage, index) => {
      if (state === 'FAILED' && stage.id === currentStep) {
        statuses[stage.id] = 'failed';
      } else if (index < currentIndex) {
        statuses[stage.id] = 'completed';
      } else if (index === currentIndex) {
        if (state === 'COMPLETED' && currentStep === 'SUBMIT') {
          statuses[stage.id] = 'completed';
        } else {
          statuses[stage.id] = 'active';
        }
      } else {
        statuses[stage.id] = 'pending';
      }
    });

    return statuses;
  }, [currentStep, state]);

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

  const getStageMetadata = (stage: TimelineStage, status: StageStatus) => {
    const stageId = stage.id;
    const duration = stageDurations[stageId];

    if (status === 'completed' && duration !== undefined) {
      return (
        <span className="text-sm text-gray-400">
          Success &bull; {duration}s
        </span>
      );
    }

    if (status === 'active') {
      const displayMessage = message || 'Processing...';
      return (
        <span className="text-sm text-primary animate-pulse">
          {displayMessage}
        </span>
      );
    }

    if (status === 'failed') {
      const errorMessage = message || 'Stage failed';
      return (
        <span className="text-sm text-status-critical">
          {errorMessage}
        </span>
      );
    }

    if (status === 'pending') {
      return (
        <span className="text-sm text-gray-500">
          Pending
        </span>
      );
    }

    return null;
  };

  const getAdditionalContext = (stage: TimelineStage, status: StageStatus) => {
    if (status !== 'completed') return null;

    if (stage.id === 'DEPLOY' && blockNumber) {
      return (
        <span className="text-xs text-gray-500 mt-1">
          Forked Block #{blockNumber}
        </span>
      );
    }

    if (stage.id === 'ANALYZE' && findingsCount !== undefined) {
      return (
        <span className="text-xs text-gray-500 mt-1">
          Found {findingsCount} potential vectors
        </span>
      );
    }

    return null;
  };

  const getAriaLabel = (stage: TimelineStage, status: StageStatus) => {
    const statusText =
      status === 'completed'
        ? 'Completed'
        : status === 'active'
        ? 'In Progress'
        : status === 'failed'
        ? 'Failed'
        : 'Pending';

    return `${stage.title}: ${statusText}`;
  };

  return (
    <div className="relative">
      {/* ARIA live region for real-time updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentStep && stageStatuses[currentStep] === 'active' && (
          <span>
            {TIMELINE_STAGES.find((s) => s.id === currentStep)?.title} is now in progress
          </span>
        )}
      </div>

      {/* Timeline container */}
      <ol className="relative space-y-6">
        {/* Vertical connecting line */}
        <div
          className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-surface-border"
          aria-hidden="true"
        />

        {TIMELINE_STAGES.map((stage) => {
          const status = stageStatuses[stage.id];
          const metadata = getStageMetadata(stage, status);
          const additionalContext = getAdditionalContext(stage, status);
          const ariaLabel = getAriaLabel(stage, status);

          return (
            <li key={stage.id} className={`relative flex items-start ${getStageOpacity(status)}`}>
              {/* Stage icon */}
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 bg-surface-dark ${getStageBorderClass(
                  status
                )}`}
                aria-label={ariaLabel}
                role="img"
              >
                <span className={`material-symbols-outlined text-xl ${getStageIconClass(status)}`}>
                  {getStageIcon(status)}
                </span>
              </div>

              {/* Stage content */}
              <div className="ml-4 flex-1">
                {/* Desktop title */}
                <h3 className="hidden md:block text-base font-semibold text-white">
                  {stage.displayTitle}
                </h3>
                {/* Mobile title */}
                <h3 className="block md:hidden text-base font-semibold text-white">
                  {stage.mobileTitle}
                </h3>

                {/* Metadata */}
                {metadata && <div className="mt-1">{metadata}</div>}

                {/* Additional context */}
                {additionalContext && <div className="mt-1">{additionalContext}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
