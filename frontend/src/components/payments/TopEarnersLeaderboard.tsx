import { LeaderboardEntry } from '../../hooks/usePaymentLeaderboard';

interface TopEarnersLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  maxVisible?: number;
  onViewAll?: () => void;
}

export function TopEarnersLeaderboard({
  leaderboard,
  isLoading,
  maxVisible = 5,
  onViewAll,
}: TopEarnersLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-3)}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-amber-500 text-black font-bold text-sm">
          1
        </div>
      );
    } else if (rank === 2) {
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-slate-400 text-white font-bold text-sm">
          2
        </div>
      );
    } else if (rank === 3) {
      return (
        <div className="flex items-center justify-center size-8 rounded-full bg-amber-700 text-white font-bold text-sm">
          3
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center size-8 rounded-full text-slate-500 font-bold text-sm">
          {rank}
        </div>
      );
    }
  };

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
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top Earners</h3>
        <p className="text-slate-500 text-sm">Researchers by total earnings</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No researchers yet</p>
          </div>
        ) : (
          leaderboard.slice(0, maxVisible).map((entry, index) => {
            const rank = index + 1;

            return (
              <div
                key={entry.researcherAddress}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  rank === 1
                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20'
                    : 'hover:bg-hover-dark/50 transition-colors'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getRankBadge(rank)}
                  <div
                    className={`size-10 rounded-full bg-gradient-to-tr ${getGradient(entry.researcherAddress)}`}
                  ></div>
                  <div>
                    <p className="font-bold text-white font-mono text-sm">
                      {truncateAddress(entry.researcherAddress)}
                    </p>
                    <p className={`text-xs ${rank === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {rank === 1 ? 'Elite Hunter' : 'Researcher'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold font-mono ${
                      rank === 1 ? 'text-amber-400' : 'text-white'
                    }`}
                  >
                    ${entry.totalEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">{entry.paymentCount} Bounties</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {onViewAll && leaderboard.length > maxVisible && (
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onViewAll}
            className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors font-medium"
          >
            View Full Leaderboard
          </button>
        </div>
      )}
    </div>
  );
}
