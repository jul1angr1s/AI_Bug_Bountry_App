import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { ExternalLink, ArrowDown, ArrowUp, Loader2, Wallet } from 'lucide-react';
import { cn, getExplorerTxUrl } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  fetchBountyPoolStatus,
  type BountyPoolStatusResponse,
  type PoolTransaction,
} from '@/lib/api';
import { USDCApprovalFlow } from './USDCApprovalFlow';

/**
 * Props interface for BountyPoolStatus component
 */
export interface BountyPoolStatusProps {
  protocolId: string;
  protocolOwner?: string; // Protocol owner address for deposit permission check
}

/**
 * BountyPoolStatus Component
 *
 * Displays bounty pool status including:
 * - Pool balance visualization (progress bar)
 * - Recent transactions (deposits and payments)
 * - Deposit button (for protocol owner only)
 * - Real-time WebSocket updates
 *
 * Requirements from OpenSpec tasks 17.1-17.9
 */
export const BountyPoolStatus: React.FC<BountyPoolStatusProps> = ({
  protocolId,
  protocolOwner,
}) => {
  // Wagmi hooks
  const { address: userAddress } = useAccount();

  // WebSocket connection
  const { subscribe } = useWebSocket();

  // Local state
  const [poolData, setPoolData] = useState<BountyPoolStatusResponse | null>(null);
  const [showDepositFlow, setShowDepositFlow] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [bountyPoolAddress, setBountyPoolAddress] = useState('');

  // Fetch pool status using TanStack Query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bountyPoolStatus', protocolId],
    queryFn: () => fetchBountyPoolStatus(protocolId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update local state when data changes
  useEffect(() => {
    if (data) {
      setPoolData(data);
    }
  }, [data]);

  /**
   * Subscribe to WebSocket bounty_pool:updated event
   */
  useEffect(() => {
    const unsubscribe = subscribe('bounty_pool:updated', (eventData: unknown) => {
      const poolUpdate = eventData as {
        protocolId: string;
        availableBalance: string;
        transaction?: PoolTransaction;
      };

      // Only update if event is for this protocol
      if (poolUpdate.protocolId === protocolId && poolData) {
        // Update pool balance
        setPoolData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            availableBalance: poolUpdate.availableBalance,
          };
        });

        // Prepend new transaction if provided
        if (poolUpdate.transaction) {
          setPoolData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              recentTransactions: [
                poolUpdate.transaction!,
                ...prev.recentTransactions.slice(0, 9), // Keep max 10 transactions
              ],
            };
          });
        }

        // Refetch full data to ensure consistency
        refetch();
      }
    });

    return unsubscribe;
  }, [subscribe, protocolId, poolData, refetch]);

  /**
   * Calculate progress percentage (totalPaid / totalDeposited * 100)
   */
  const calculateProgress = useCallback((): number => {
    if (!poolData) return 0;

    const totalDeposited = parseFloat(poolData.totalDeposited) || 0;
    const totalPaid = parseFloat(poolData.totalPaid) || 0;

    if (totalDeposited === 0) return 0;

    return Math.min((totalPaid / totalDeposited) * 100, 100);
  }, [poolData]);

  /**
   * Calculate remaining percentage for color coding
   */
  const calculateRemainingPercentage = useCallback((): number => {
    if (!poolData) return 100;

    const totalDeposited = parseFloat(poolData.totalDeposited) || 0;
    const availableBalance = parseFloat(poolData.availableBalance) || 0;

    if (totalDeposited === 0) return 100;

    return Math.min((availableBalance / totalDeposited) * 100, 100);
  }, [poolData]);

  /**
   * Get progress bar color based on remaining percentage
   */
  const getProgressBarColor = useCallback((): string => {
    const remainingPercentage = calculateRemainingPercentage();

    if (remainingPercentage < 20) return 'bg-red-500';
    if (remainingPercentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [calculateRemainingPercentage]);

  /**
   * Format transaction date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get Basescan transaction URL
   */
  const getBasescanUrl = (txHash: string): string => {
    return getExplorerTxUrl(txHash);
  };

  /**
   * Check if user is protocol owner
   */
  const isProtocolOwner = useCallback((): boolean => {
    if (!userAddress || !protocolOwner) return false;
    return userAddress.toLowerCase() === protocolOwner.toLowerCase();
  }, [userAddress, protocolOwner]);

  /**
   * Handle deposit button click
   */
  const handleDepositClick = () => {
    // For now, set a default deposit amount and bounty pool address
    // In production, these would come from protocol configuration
    setDepositAmount('1000');
    setBountyPoolAddress(protocolOwner || '');
    setShowDepositFlow(true);
  };

  /**
   * Handle approval complete
   */
  const handleApprovalComplete = () => {
    setShowDepositFlow(false);
    // Refetch pool data to show updated balance
    refetch();
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading bounty pool status...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (isError) {
    return (
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
        <div className="flex items-start space-x-3">
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
            <h3 className="text-sm font-medium text-red-400">Error Loading Pool Status</h3>
            <p className="mt-1 text-sm text-red-300">
              {error instanceof Error ? error.message : 'Failed to fetch bounty pool status'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!poolData) {
    return null;
  }

  const progress = calculateProgress();
  const remainingPercentage = calculateRemainingPercentage();
  const progressBarColor = getProgressBarColor();

  return (
    <div className="space-y-6">
      {/* Pool Balance Card */}
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
        {/* Header with Deposit Button */}
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-semibold text-white">Bounty Pool Balance</h3>
          {isProtocolOwner() && (
            <button
              onClick={handleDepositClick}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Wallet className="h-4 w-4" />
              <span>Deposit USDC</span>
            </button>
          )}
        </div>

        {/* Progress Bar Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">
              Available: {poolData.availableBalance} USDC
            </span>
            <span className="text-xs text-gray-400">
              {progress.toFixed(1)}% Utilized
            </span>
          </div>
          <div
            className="bg-navy-900 rounded-full h-4 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Pool usage: ${progress.toFixed(1)}%`}
          >
            <div
              className={cn('h-full transition-all duration-300', progressBarColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              Total Deposited: {poolData.totalDeposited} USDC
            </span>
            <span className="text-xs text-yellow-500">
              Pending Payments: {poolData.pendingPaymentsTotal} USDC
            </span>
          </div>
        </div>

        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400">Total Paid</p>
            <p className="text-sm font-semibold text-white">{poolData.totalPaid} USDC</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Pending Count</p>
            <p className="text-sm font-semibold text-yellow-500">
              {poolData.pendingPaymentsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Remaining</p>
            <p className={cn(
              "text-sm font-semibold",
              remainingPercentage < 20 ? "text-red-500" :
              remainingPercentage < 50 ? "text-yellow-500" : "text-green-500"
            )}>
              {remainingPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* USDC Approval Flow (shown when deposit button is clicked) */}
      {showDepositFlow && (
        <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Deposit to Bounty Pool</h3>
            <p className="text-sm text-gray-400">
              Approve USDC transfer to the bounty pool contract
            </p>
          </div>
          <USDCApprovalFlow
            depositAmount={depositAmount}
            bountyPoolAddress={bountyPoolAddress}
            onApprovalComplete={handleApprovalComplete}
          />
          <button
            onClick={() => setShowDepositFlow(false)}
            className="mt-4 w-full px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>

        {poolData.recentTransactions.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-900">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900">
                {poolData.recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-navy-900/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {tx.type === 'DEPOSIT' ? (
                          <ArrowDown className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUp className="h-4 w-4 text-blue-500" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-medium',
                            tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-blue-400'
                          )}
                        >
                          {tx.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-white">{tx.amount} USDC</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-300">{formatDate(tx.timestamp)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={getBasescanUrl(tx.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BountyPoolStatus;
