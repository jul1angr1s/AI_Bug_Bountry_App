import { cn } from '@/lib/utils';
import { VulnStatus } from '@/types/dashboard';

interface StatusBadgeProps {
  status: VulnStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles = {
    PAID: 'bg-green-500/10 text-green-500',
    CONFIRMED: 'bg-blue-500/10 text-blue-500',
    PENDING_VALIDATION: 'bg-yellow-500/10 text-yellow-500',
    OPEN: 'bg-gray-500/10 text-gray-500',
    DUPLICATE: 'bg-gray-500/10 text-gray-500',
  };

  const statusLabels = {
    PAID: 'Paid',
    CONFIRMED: 'Confirmed',
    PENDING_VALIDATION: 'Pending',
    OPEN: 'Open',
    DUPLICATE: 'Duplicate',
  };

  return (
    <span className={cn('px-2 py-1 rounded text-xs font-medium', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
