import { cn } from '@/lib/utils';
import { Severity } from '@/types/dashboard';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export default function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const severityStyles = {
    CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <span className={cn('px-2 py-1 rounded text-xs font-medium border uppercase', severityStyles[severity], className)}>
      {severity}
    </span>
  );
}
