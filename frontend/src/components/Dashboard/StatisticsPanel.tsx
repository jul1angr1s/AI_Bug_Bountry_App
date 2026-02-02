import StatCard from '@/components/shared/StatCard';
import type { DashboardStats } from '@/types/dashboard';
import { Wallet, Shield, DollarSign } from 'lucide-react';

interface StatisticsPanelProps {
  stats: DashboardStats;
}

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  const bountyPoolValue = `${stats.bountyPool.total} ${stats.bountyPool.currency}`;
  const bountyPoolProgress = stats.bountyPool.total > 0
    ? (stats.bountyPool.available / stats.bountyPool.total) * 100
    : undefined;

  const lastPaymentDate = stats.payments.lastPayment
    ? new Date(stats.payments.lastPayment).toLocaleDateString()
    : undefined;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="region"
      aria-label="Dashboard statistics"
    >
      <StatCard
        title="Bounty Pool"
        value={bountyPoolValue}
        progress={bountyPoolProgress}
        icon={Wallet}
      />

      <StatCard
        title="Vulnerabilities Found"
        value={stats.vulnerabilities.total}
        icon={Shield}
      />

      <StatCard
        title="Total Paid"
        value={`${stats.payments.total} ${stats.bountyPool.currency}`}
        subtitle={lastPaymentDate ? `Last payment: ${lastPaymentDate}` : undefined}
        icon={DollarSign}
      />
    </div>
  );
}
