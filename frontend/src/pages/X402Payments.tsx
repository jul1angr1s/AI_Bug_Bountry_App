import { CreditCard, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useX402Payments } from '../hooks/useX402Payments';
import X402PaymentTimeline from '../components/agents/X402PaymentTimeline';
import { formatUSDC } from '../lib/utils';

export default function X402Payments() {
  const { data: payments, isLoading } = useX402Payments();

  const totalPayments = payments?.length || 0;
  const completedPayments = payments?.filter((p) => p.status === 'COMPLETED').length || 0;
  const pendingPayments = payments?.filter((p) => p.status === 'PENDING').length || 0;
  const totalVolume = payments
    ?.filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const stats = [
    {
      label: 'Total Payments',
      value: totalPayments.toString(),
      icon: CreditCard,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Total Volume',
      value: formatUSDC(totalVolume.toString()),
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Confirmed',
      value: completedPayments.toString(),
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Processing',
      value: pendingPayments.toString(),
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">x.402 Payment Events</h1>
      </div>

      <p className="text-sm text-gray-400">
        All on-chain payments processed through the x.402 payment protocol.
        Each transaction is verifiable on the Base Sepolia blockchain.
      </p>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <X402PaymentTimeline payments={payments || []} isLoading={isLoading} />
    </div>
  );
}
