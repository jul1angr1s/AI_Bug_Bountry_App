import { Wallet, AlertTriangle, DollarSign } from 'lucide-react';
import StatCard from '../shared/StatCard';

interface StatisticsPanelProps {
  bountyPool: {
    total: string;
    percentage: number;
  };
  vulnerabilities: {
    total: number;
    pending: number;
  };
  totalPaid: {
    amount: string;
    lastPayment?: string;
  };
}

export default function StatisticsPanel({ bountyPool, vulnerabilities, totalPaid }: StatisticsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="BOUNTY POOL"
        value={bountyPool.total}
        icon={Wallet}
        variant="progress"
        progress={bountyPool.percentage}
      />
      <StatCard
        title="VULNS FOUND"
        value={vulnerabilities.total}
        subtitle={vulnerabilities.pending > 0 ? `${vulnerabilities.pending} Critical Pending` : undefined}
        icon={AlertTriangle}
      />
      <StatCard
        title="TOTAL PAID"
        value={totalPaid.amount}
        subtitle={totalPaid.lastPayment}
        icon={DollarSign}
      />
    </div>
  );
}
