import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
  icon?: LucideIcon;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  progress,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-navy-800 rounded-lg p-4 sm:p-6 border border-navy-900',
        className
      )}
      role="region"
      aria-label={`${title} statistics`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {Icon && <Icon className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />}
      </div>

      <p className="text-2xl sm:text-3xl font-bold text-white mb-1 break-words" aria-live="polite">
        {value}
      </p>

      {subtitle && (
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <div className="bg-navy-900 rounded-full h-2 overflow-hidden" role="presentation">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress: ${progress}%`}
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1" aria-hidden="true">
            {progress}% of target
          </p>
        </div>
      )}
    </div>
  );
}
