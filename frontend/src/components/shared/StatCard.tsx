import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  progress,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-navy-800 rounded-lg p-6 border border-navy-900',
        className
      )}
    >
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>

      {subtitle && (
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <div className="bg-navy-900 rounded-full h-2 overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}% of target</p>
        </div>
      )}
    </div>
  );
}
