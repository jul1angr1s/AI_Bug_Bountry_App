import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SeverityBadge from '@/components/shared/SeverityBadge';
import type { Alert } from '@/types/dashboard';

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

  return (
    <div
      className={cn(
        'rounded-lg p-4 border-2 flex items-start gap-4',
        severityColors[alert.severity]
      )}
    >
      <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-gray-300">
            {new Date(alert.timestamp).toLocaleString()}
          </span>
        </div>

        <p className="text-white font-medium">{alert.message}</p>
      </div>

      <button
        onClick={() => onDismiss(alert.id)}
        className="text-white/70 hover:text-white transition-colors flex-shrink-0"
        aria-label="Dismiss alert"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
