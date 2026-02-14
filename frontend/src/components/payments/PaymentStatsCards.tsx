import { PaymentStats } from '../../hooks/usePaymentStats';

interface PaymentStatsCardsProps {
  stats: PaymentStats | undefined;
  poolBalance?: number;
  isLoading?: boolean;
}

export function PaymentStatsCards({ stats, poolBalance = 0, isLoading }: PaymentStatsCardsProps) {
  if (isLoading) {
    return (
      <section className="px-6 md:px-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const totalPaid = stats?.totalAmountPaid || 0;
  const pendingCount = stats?.paymentsByStatus?.PENDING || 0;
  const budgetRemaining = poolBalance > 0 ? ((poolBalance - totalPaid) / poolBalance * 100).toFixed(1) : 0;

  return (
    <section className="px-6 md:px-10 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Pool Liquidity */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Bounty Pool</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-accent-gold">${poolBalance.toFixed(2)}</h3>
            <span className="text-sm font-semibold text-slate-500">USDC</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <div className="flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
              <span className="mr-1">↑</span>
              {budgetRemaining}% left
            </div>
          </div>
        </div>

        {/* Total Paid (All Time) */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Total Paid (All Time)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">${totalPaid.toFixed(2)}</h3>
            <span className="text-sm font-semibold text-slate-500">USDC</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <div className="flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
              <span className="mr-1">↑</span>
              {stats?.totalPayments || 0} payments
            </div>
          </div>
        </div>

        {/* Pending Claims */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Pending Claims</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{pendingCount}</h3>
            <span className="text-sm font-semibold text-slate-500">Claims</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            {pendingCount > 0 ? (
              <div className="flex items-center px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold">
                Requires review
              </div>
            ) : (
              <div className="flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">
                All clear
              </div>
            )}
          </div>
        </div>

        {/* Budget Remaining */}
        <div className="bg-white dark:bg-card-dark rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">Budget Remaining</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{budgetRemaining}%</h3>
            <span className="text-sm font-semibold text-slate-500">Available</span>
          </div>
          <div className="flex items-center gap-2 mt-auto pt-2">
            <p className="text-slate-400 text-xs">${(poolBalance - totalPaid).toFixed(2)} USDC left</p>
          </div>
        </div>
      </div>
    </section>
  );
}
