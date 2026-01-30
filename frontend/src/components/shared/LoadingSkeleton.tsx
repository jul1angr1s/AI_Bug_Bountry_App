import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'table-row';
  count?: number;
}

export function LoadingSkeleton({
  className,
  variant = 'card',
  count = 1,
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-700/50 rounded';

  const variantClasses = {
    card: 'h-32 w-full',
    text: 'h-4 w-full',
    circle: 'h-12 w-12 rounded-full',
    'table-row': 'h-16 w-full',
  };

  const elements = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={cn(baseClasses, variantClasses[variant], className)}
    />
  ));

  return <>{elements}</>;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
      <div className="space-y-3">
        <LoadingSkeleton variant="text" className="w-24" />
        <LoadingSkeleton variant="text" className="h-8 w-32" />
        <LoadingSkeleton variant="text" className="w-20" />
      </div>
    </div>
  );
}

export function ProtocolOverviewSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 h-full">
      <div className="space-y-4">
        <LoadingSkeleton variant="text" className="w-32 h-6" />
        <div className="space-y-3">
          <LoadingSkeleton variant="text" className="w-full" />
          <LoadingSkeleton variant="text" className="w-3/4" />
          <LoadingSkeleton variant="text" className="w-24 h-8" />
        </div>
      </div>
    </div>
  );
}

export function StatisticsPanelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

export function AgentStatusCardSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 flex-1">
          <LoadingSkeleton variant="text" className="w-24 h-5" />
          <LoadingSkeleton variant="text" className="w-32" />
        </div>
        <LoadingSkeleton variant="circle" className="h-3 w-3" />
      </div>
      <LoadingSkeleton variant="text" className="w-20" />
    </div>
  );
}

export function AgentStatusGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AgentStatusCardSkeleton />
      <AgentStatusCardSkeleton />
      <AgentStatusCardSkeleton />
    </div>
  );
}

export function VulnerabilitiesTableSkeleton() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/30 border-b border-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <LoadingSkeleton variant="text" className="w-24 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <LoadingSkeleton variant="text" className="w-20 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <LoadingSkeleton variant="text" className="w-16 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <LoadingSkeleton variant="text" className="w-20 h-4" />
              </th>
              <th className="px-6 py-3 text-left">
                <LoadingSkeleton variant="text" className="w-16 h-4" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((i) => (
              <tr key={i} className="border-b border-gray-700/30">
                <td className="px-6 py-4">
                  <LoadingSkeleton variant="text" className="w-64" />
                </td>
                <td className="px-6 py-4">
                  <LoadingSkeleton variant="text" className="w-20" />
                </td>
                <td className="px-6 py-4">
                  <LoadingSkeleton variant="text" className="w-24" />
                </td>
                <td className="px-6 py-4">
                  <LoadingSkeleton variant="text" className="w-32" />
                </td>
                <td className="px-6 py-4">
                  <LoadingSkeleton variant="text" className="w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
