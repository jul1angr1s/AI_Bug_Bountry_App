import { cn } from '@/lib/utils';
import type { SeverityLevel } from '@/types/dashboard';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
}

export default function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const colors = {
    CRITICAL: 'bg-status-critical text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-500 text-black',
    LOW: 'bg-gray-500 text-white',
    INFO: 'bg-status-info text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}
