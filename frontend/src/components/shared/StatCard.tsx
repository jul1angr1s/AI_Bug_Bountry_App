import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'progress';
  progress?: number;
  loading?: boolean;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  progress = 0,
  loading = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('bg-navy-900 border border-navy-800 rounded-lg p-4', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-navy-800 rounded w-1/3"></div>
          <div className="h-8 bg-navy-800 rounded w-2/3"></div>
          {subtitle && <div className="h-3 bg-navy-800 rounded w-1/2"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-navy-900 border border-navy-800 rounded-lg p-4 relative', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">{title}</h3>
        {Icon && (
          <div className="text-gray-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-2xl font-bold text-white mb-1">{value}</div>

      {/* Subtitle */}
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}

      {/* Progress Bar (for variant="progress") */}
      {variant === 'progress' && (
        <div className="mt-3 h-1 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
