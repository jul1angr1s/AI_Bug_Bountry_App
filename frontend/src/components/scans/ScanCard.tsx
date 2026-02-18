import { useNavigate } from 'react-router-dom';
import { GlowCard } from '../shared/GlowCard';
import { MaterialIcon } from '../shared/MaterialIcon';
import { PulseIndicator } from '../shared/PulseIndicator';
import type { Scan } from '../../lib/api';

interface ScanCardProps {
  scan: Scan;
}

export default function ScanCard({ scan }: ScanCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/scans/${scan.id}`);
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return {
          color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          pulse: 'idle' as const,
          icon: 'schedule',
          label: 'Queued',
        };
      case 'RUNNING':
        return {
          color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          pulse: 'active' as const,
          icon: 'motion_photos_on',
          label: 'Running',
        };
      case 'SUCCEEDED':
        return {
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          pulse: 'active' as const,
          icon: 'task_alt',
          label: 'Succeeded',
        };
      case 'FAILED':
        return {
          color: 'bg-red-500/15 text-red-300 border-red-500/30',
          pulse: 'error' as const,
          icon: 'error',
          label: 'Failed',
        };
      case 'CANCELED':
        return {
          color: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
          pulse: 'idle' as const,
          icon: 'block',
          label: 'Canceled',
        };
      default:
        return {
          color: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
          pulse: 'idle' as const,
          icon: 'search',
          label: status,
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getProgressPercentage = () => {
    if (scan.state === 'QUEUED') return 12;
    if (scan.state === 'RUNNING') return 55;
    if (scan.state === 'SUCCEEDED') return 100;
    return 0;
  };

  const protocolName = scan.protocol?.contractName || 'Unknown Protocol';
  const status = getStatusMeta(scan.state);

  return (
    <GlowCard
      glowColor="cyan"
      className="relative overflow-hidden cursor-pointer group hover:border-cyan-400/40"
      onClick={handleClick}
    >
      <MaterialIcon
        name="radar"
        className="absolute -right-5 -bottom-6 text-[120px] text-cyan-500/10 group-hover:text-cyan-400/20 transition-colors duration-300"
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-heading font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
              {protocolName}
            </h3>
            <div className="mt-1 inline-flex items-center gap-2 px-2 py-1 rounded-md border border-navy-700/70 bg-navy-900/50">
              <MaterialIcon name="fingerprint" className="text-base text-gray-400" />
              <span className="text-xs text-gray-400">{scan.id.slice(0, 10)}...</span>
            </div>
          </div>
          <div className={`flex shrink-0 items-center gap-2 px-2.5 py-1 rounded text-xs font-medium border ${status.color}`}>
            <PulseIndicator status={status.pulse} size="sm" />
            <MaterialIcon name={status.icon} className="text-base" />
            <span>{status.label}</span>
          </div>
        </div>

        {(scan.state === 'RUNNING' || scan.state === 'QUEUED') && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>{scan.currentStep || 'Analyzing contracts'}</span>
              <span className="text-cyan-300">{getProgressPercentage()}%</span>
            </div>
            <div className="h-2 bg-navy-900 rounded-full overflow-hidden border border-navy-700/60">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-primary transition-all duration-500"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {scan.currentStep && scan.state !== 'RUNNING' && scan.state !== 'QUEUED' && (
          <div className="mb-4 rounded-lg border border-navy-700/60 bg-navy-900/45 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Last Step</div>
            <p className="text-sm text-gray-300 truncate mt-0.5">{scan.currentStep}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-navy-700/60 bg-navy-900/45 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MaterialIcon name="crisis_alert" className="text-sm" />
              <span>Findings</span>
            </div>
            <p className="text-xl font-semibold text-white">{scan.findingsCount}</p>
          </div>
          <div className="rounded-lg border border-navy-700/60 bg-navy-900/45 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <MaterialIcon name="history" className="text-sm" />
              <span>Started</span>
            </div>
            <p className="text-sm font-medium text-white">{formatDate(scan.startedAt)}</p>
          </div>
        </div>

        {scan.state === 'FAILED' && scan.errorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-xs text-red-300 line-clamp-2">{scan.errorMessage}</p>
          </div>
        )}

        <div className="pt-3 border-t border-navy-700/60 flex items-center justify-between">
          <span className="text-xs text-gray-500">{scan.retryCount > 0 ? `Retries: ${scan.retryCount}` : 'Stable run'}</span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-cyan-300 group-hover:text-cyan-200">
            View Details
            <MaterialIcon name="arrow_forward" className="text-base" />
          </span>
        </div>
      </div>
    </GlowCard>
  );
}
