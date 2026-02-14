import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component for loading states
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-navy-900/50',
        className
      )}
    />
  );
}

/**
 * Skeleton for StatCard component
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-navy-800 rounded-lg p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

/**
 * Skeleton for ProtocolOverview component
 */
export function ProtocolOverviewSkeleton() {
  return (
    <div className="bg-navy-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-40" />
      </div>
    </div>
  );
}

/**
 * Skeleton for AgentStatusCard component
 */
export function AgentStatusCardSkeleton() {
  return (
    <div className="bg-navy-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

/**
 * Skeleton for VulnerabilitiesTable component
 */
export function VulnerabilitiesTableSkeleton() {
  return (
    <div className="bg-navy-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-navy-900">
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="divide-y divide-navy-900">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for full dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Protocol Overview */}
      <ProtocolOverviewSkeleton />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AgentStatusCardSkeleton />
        <AgentStatusCardSkeleton />
        <AgentStatusCardSkeleton />
      </div>

      {/* Vulnerabilities Table */}
      <VulnerabilitiesTableSkeleton />
    </div>
  );
}
