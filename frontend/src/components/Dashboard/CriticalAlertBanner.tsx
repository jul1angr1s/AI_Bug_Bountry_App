import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SeverityBadge from '@/components/shared/SeverityBadge';
import type { Alert } from '@/types/dashboard';
import { KeyboardEvent } from 'react';

interface CriticalAlertBannerProps {
  alert: Alert | null;
  onDismiss: (id: string) => void;
}

export default function CriticalAlertBanner({
  alert,
  onDismiss,
}: CriticalAlertBannerProps) {
  if (!alert) return null;

  const severityColors = {
    CRITICAL: 'bg-status-critical border-red-800',
    HIGH: 'bg-orange-500/20 border-orange-800',
    MEDIUM: 'bg-yellow-500/20 border-yellow-800',
    LOW: 'bg-gray-500/20 border-gray-800',
    INFO: 'bg-status-info border-blue-800',
  };

  const handleDismissKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss(alert.id);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg p-4 sm:p-6 border-2 flex flex-col sm:flex-row items-start gap-3 sm:gap-4',
        severityColors[alert.severity]
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onKeyDown={handleDismissKeyDown}
    >
      <AlertTriangle
        className="w-6 h-6 text-white flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-gray-300">
            {new Date(alert.timestamp).toLocaleString()}
          </span>
        </div>

        <p className="text-white font-medium break-words">{alert.message}</p>
      </div>

      <button
        onClick={() => onDismiss(alert.id)}
        className="text-white/70 hover:text-white transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded p-1"
        aria-label="Dismiss alert (press Escape)"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
