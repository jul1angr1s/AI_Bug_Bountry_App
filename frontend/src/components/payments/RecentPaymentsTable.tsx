import { isValidTxHash } from '../../lib/utils';

interface Payment {
  id: string;
  researcherAddress: string;
  amount: number;
  currency: string;
  status: string;
  txHash: string | null;
  paidAt: string | null;
  createdAt: string;
  vulnerability?: {
    severity: string;
  };
}

interface RecentPaymentsTableProps {
  payments: Payment[];
  isLoading: boolean;
  onViewAll?: () => void;
}

export function RecentPaymentsTable({ payments, isLoading, onViewAll }: RecentPaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    const severityConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      CRITICAL: {
        bg: 'bg-red-500/10',
        text: 'text-red-500',
        border: 'border-red-500/20',
        dot: 'bg-red-500',
      },
      HIGH: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        border: 'border-orange-500/20',
        dot: 'bg-orange-500',
      },
      MEDIUM: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-500',
        border: 'border-yellow-500/20',
        dot: 'bg-yellow-500',
      },
      LOW: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
        dot: 'bg-blue-500',
      },
      INFO: {
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/20',
        dot: 'bg-slate-500',
      },
    };

    const config = severityConfig[severity] || severityConfig.INFO;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}
      >
        <span className={`size-1.5 rounded-full ${config.dot}`}></span>
        {severity}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    return `${diffDays} days ago`;
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-3)}`;
  };

  const getBasescanUrl = (txHash: string) => {
    // Using centralized explorer URL utility
    const EXPLORER_BASE_URL = import.meta.env.VITE_EXPLORER_BASE_URL || 'https://sepolia.basescan.org';
    return `${EXPLORER_BASE_URL}/tx/${txHash}`;
  };

  // Generate gradient for avatar
  const getGradient = (address: string) => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-emerald-500 to-teal-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-amber-500 to-orange-500',
    ];
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Payouts</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-primary text-sm font-medium hover:text-blue-400 transition-colors"
          >
            View All Transactions
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Researcher</th>
              <th className="px-6 py-4">Severity</th>
              <th className="px-6 py-4 text-right">Amount (USDC)</th>
              <th className="px-6 py-4 text-center">TX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.slice(0, 10).map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-slate-50 dark:hover:bg-hover-dark/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-8 rounded-full bg-gradient-to-tr ${getGradient(payment.researcherAddress)}`}
                      ></div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white font-mono text-xs">
                          {truncateAddress(payment.researcherAddress)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTimeAgo(payment.paidAt || payment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getSeverityBadge(payment.vulnerability?.severity || 'UNKNOWN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-accent-gold font-bold font-mono">
                      {payment.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {payment.txHash && isValidTxHash(payment.txHash) ? (
                      <a
                        href={getBasescanUrl(payment.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white transition-colors inline-block"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
