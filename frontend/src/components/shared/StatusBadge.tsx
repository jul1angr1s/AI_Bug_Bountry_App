import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/dashboard';

interface StatusBadgeProps {
  status: AgentStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = {
    ONLINE: 'bg-status-online text-white',
    OFFLINE: 'bg-red-500 text-white',
    SCANNING: 'bg-blue-500 text-white animate-pulse',
    ERROR: 'bg-status-critical text-white',
  };

  const ariaLabels = {
    ONLINE: 'Agent is online',
    OFFLINE: 'Agent is offline',
    SCANNING: 'Agent is scanning',
    ERROR: 'Agent has an error',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        colors[status],
        className
      )}
      role="status"
      aria-label={ariaLabels[status]}
      aria-live="polite"
    >
      {status}
    </span>
  );
}
