import { useState, useMemo } from 'react';
import { CreditCard, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useX402Payments } from '../hooks/useX402Payments';
import X402PaymentTimeline from '../components/agents/X402PaymentTimeline';
import { formatUSDC, isValidTxHash } from '../lib/utils';
import type { X402RequestType } from '../types/dashboard';

type FilterTab = 'ALL' | X402RequestType;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PROTOCOL_REGISTRATION', label: 'Registration' },
  { key: 'SCAN_REQUEST_FEE', label: 'Scan Fees' },
  { key: 'EXPLOIT_SUBMISSION_FEE', label: 'Exploit Fees' },
  { key: 'FINDING_SUBMISSION', label: 'Submissions' },
];

export default function X402Payments() {
  const { data: payments, isLoading } = useX402Payments();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const onChainPayments = useMemo(
    () => (payments || []).filter((p) => p.txHash && isValidTxHash(p.txHash)),
    [payments]
  );

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'ALL') return onChainPayments;
    return onChainPayments.filter((p) => p.requestType === activeFilter);
  }, [onChainPayments, activeFilter]);

  const totalPayments = onChainPayments.length;
  const completedPayments = onChainPayments.filter((p) => p.status === 'COMPLETED').length;
  const pendingPayments = onChainPayments.filter((p) => p.status === 'PENDING').length;
  const totalVolume = onChainPayments
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
        On-chain x.402 payments only. Every row includes a verifiable Base Sepolia transaction.
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

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-800 p-1 border border-gray-700">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === tab.key
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <X402PaymentTimeline payments={filteredPayments} isLoading={isLoading} />
    </div>
  );
}
