import StatCard from '@/components/shared/StatCard';
import type { DashboardStats } from '@/types/dashboard';
import { Wallet, Shield, DollarSign } from 'lucide-react';

interface StatisticsPanelProps {
  stats: DashboardStats;
}

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Dashboard statistics"
    >
      <StatCard
        title="Bounty Pool"
        value={stats.bountyPool}
        progress={stats.bountyPoolProgress}
        icon={Wallet}
      />

      <StatCard
        title="Vulnerabilities Found"
        value={stats.vulnerabilitiesFound}
        icon={Shield}
      />

      <StatCard
        title="Total Paid"
        value={stats.totalPaid}
        subtitle={stats.lastPaymentDate ? `Last payment: ${stats.lastPaymentDate}` : undefined}
        icon={DollarSign}
      />
    </div>
  );
}
