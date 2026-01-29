import StatCard from '@/components/shared/StatCard';
import type { DashboardStats } from '@/types/dashboard';

interface StatisticsPanelProps {
  stats: DashboardStats;
}

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Bounty Pool"
        value={stats.bountyPool}
        progress={stats.bountyPoolProgress}
      />

      <StatCard
        title="Vulnerabilities Found"
        value={stats.vulnerabilitiesFound}
      />

      <StatCard
        title="Total Paid"
        value={stats.totalPaid}
        subtitle={stats.lastPaymentDate ? `Last payment: ${stats.lastPaymentDate}` : undefined}
      />
    </div>
  );
}
