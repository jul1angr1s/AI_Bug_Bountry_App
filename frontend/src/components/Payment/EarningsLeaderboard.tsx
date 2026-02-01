import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { RefreshCw, Trophy, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/api';

/**
 * Props interface for EarningsLeaderboard component
 */
export interface EarningsLeaderboardProps {
  limit?: number; // Default 10
}

/**
 * Truncate Ethereum address for display
 * Example: 0x1234567890abcdef1234567890abcdef12345678 -> 0x1234...5678
 */
const truncateAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Get rank badge icon and color based on position
 */
const getRankBadge = (rank: number): { icon: React.ReactNode; color: string } => {
  switch (rank) {
    case 1:
      return {
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-yellow-500',
      };
    case 2:
      return {
        icon: <Medal className="w-5 h-5" />,
        color: 'text-gray-400',
      };
    case 3:
      return {
        icon: <Award className="w-5 h-5" />,
        color: 'text-amber-600',
      };
    default:
      return {
        icon: (
          <span className="text-sm font-semibold text-gray-500">#{rank}</span>
        ),
        color: 'text-gray-500',
      };
  }
};

/**
 * EarningsLeaderboard Component
 *
 * Displays top 10 researchers by earnings with:
 * - Rank badges (1st: Gold Trophy, 2nd: Silver Medal, 3rd: Bronze Award, 4-10: Numbered)
 * - Researcher address (truncated with full address in tooltip)
 * - Total earnings in USDC
 * - Payment count
 * - Average payment in USDC
 * - Highlighted row for current user's wallet address
 * - Manual refresh button
 * - 60-second cache
 */
export const EarningsLeaderboard: React.FC<EarningsLeaderboardProps> = ({
  limit = 10,
}) => {
  const { address: currentUserAddress } = useAccount();

  // Fetch leaderboard with TanStack Query (60-second cache)
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    refetch();
  };

  /**
   * Check if row is for current user
   */
  const isCurrentUser = (address: string): boolean => {
    return (
      !!currentUserAddress &&
      address.toLowerCase() === currentUserAddress.toLowerCase()
    );
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Earnings Leaderboard
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" />
          <p className="ml-3 text-sm text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Earnings Leaderboard
          </h2>
        </div>
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Error loading leaderboard
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (!data || data.leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Earnings Leaderboard
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className={cn(
              'flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              isFetching
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            )}
            title="Refresh leaderboard"
          >
            <RefreshCw
              className={cn('w-4 h-4', isFetching && 'animate-spin')}
            />
            <span>Refresh</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-600">No payments yet</p>
          <p className="text-xs text-gray-500 mt-1">
            The leaderboard will appear once researchers receive payments.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render leaderboard table
   */
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          Earnings Leaderboard
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className={cn(
            'flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
            isFetching
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          )}
          title="Refresh leaderboard"
        >
          <RefreshCw
            className={cn('w-4 h-4', isFetching && 'animate-spin')}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 w-20">Rank</th>
              <th className="px-6 py-3">Researcher Address</th>
              <th className="px-6 py-3 text-right">Total Earnings</th>
              <th className="px-6 py-3 text-right">Payments</th>
              <th className="px-6 py-3 text-right">Avg Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.leaderboard.map((entry: LeaderboardEntry, index: number) => {
              const rank = index + 1;
              const { icon, color } = getRankBadge(rank);
              const isCurrentUserRow = isCurrentUser(entry.researcherAddress);

              return (
                <tr
                  key={entry.researcherAddress}
                  className={cn(
                    'transition-colors',
                    isCurrentUserRow
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  )}
                >
                  {/* Rank */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn('flex items-center', color)}>
                      {icon}
                    </div>
                  </td>

                  {/* Researcher Address */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span
                        className={cn(
                          'text-sm font-mono',
                          isCurrentUserRow
                            ? 'text-blue-900 font-semibold'
                            : 'text-gray-900'
                        )}
                        title={entry.researcherAddress}
                      >
                        {truncateAddress(entry.researcherAddress)}
                      </span>
                      {isCurrentUserRow && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          You
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total Earnings */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isCurrentUserRow ? 'text-blue-900' : 'text-gray-900'
                      )}
                    >
                      {entry.totalEarnings} USDC
                    </span>
                  </td>

                  {/* Payment Count */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={cn(
                        'text-sm',
                        isCurrentUserRow ? 'text-blue-700' : 'text-gray-700'
                      )}
                    >
                      {entry.paymentCount}
                    </span>
                  </td>

                  {/* Average Payment */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={cn(
                        'text-sm',
                        isCurrentUserRow ? 'text-blue-700' : 'text-gray-700'
                      )}
                    >
                      {entry.averagePaymentAmount} USDC
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <p className="text-xs text-gray-500">
          Showing top {data.leaderboard.length} researcher
          {data.leaderboard.length !== 1 ? 's' : ''} by total earnings
        </p>
      </div>
    </div>
  );
};

export default EarningsLeaderboard;
