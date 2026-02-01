import React, { useEffect, useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { cn } from '@/lib/utils';
import {
  fetchUSDCAllowance,
  generateUSDCApprovalTx,
  type USDCAllowanceResponse,
} from '@/lib/api';

/**
 * Props interface for USDCApprovalFlow component
 */
export interface USDCApprovalFlowProps {
  depositAmount: string; // USDC amount to approve (human-readable, e.g., "1000.50")
  bountyPoolAddress: string; // Spender address (BountyPool contract)
  onApprovalComplete: () => void; // Callback when approval is confirmed
}

/**
 * Approval flow states
 */
type ApprovalState =
  | 'loading' // Checking allowance
  | 'insufficient' // Needs approval
  | 'approving' // Waiting for user signature
  | 'pending' // Transaction submitted, waiting for confirmation
  | 'approved' // Approval confirmed
  | 'error'; // Error occurred

/**
 * USDC configuration (Base Sepolia)
 */
const USDC_CONFIG = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  decimals: 6,
  symbol: 'USDC',
  chainId: 84532, // Base Sepolia
};

/**
 * Polling configuration
 */
const POLLING_CONFIG = {
  interval: 2000, // 2 seconds
  maxDuration: 5 * 60 * 1000, // 5 minutes
  warningThreshold: 60 * 1000, // 60 seconds
};

/**
 * USDCApprovalFlow Component
 *
 * Handles USDC approval flow for BountyPool deposits:
 * 1. Checks current allowance on mount
 * 2. Shows approval button if allowance is insufficient
 * 3. Handles wallet signing via wagmi
 * 4. Polls for transaction confirmation
 * 5. Calls onApprovalComplete when approved
 */
export const USDCApprovalFlow: React.FC<USDCApprovalFlowProps> = ({
  depositAmount,
  bountyPoolAddress,
  onApprovalComplete,
}) => {
  // Wagmi hooks
  const { address: userAddress, isConnected } = useAccount();
  const { writeContract, data: txHash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Component state
  const [state, setState] = useState<ApprovalState>('loading');
  const [allowance, setAllowance] = useState<USDCAllowanceResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);


  /**
   * Fetch current USDC allowance from backend
   */
  const checkAllowance = useCallback(async () => {
    if (!userAddress || !isConnected) {
      setState('error');
      setErrorMessage('Wallet not connected');
      return;
    }

    try {
      setState('loading');
      setErrorMessage('');

      const allowanceData = await fetchUSDCAllowance(userAddress, bountyPoolAddress);
      setAllowance(allowanceData);

      // Check if allowance is sufficient
      const allowanceBigInt = BigInt(allowanceData.allowance);
      const depositBigInt = parseUnits(depositAmount, USDC_CONFIG.decimals);

      if (allowanceBigInt >= depositBigInt) {
        setState('approved');
        onApprovalComplete();
      } else {
        setState('insufficient');
      }
    } catch (error) {
      console.error('[USDCApprovalFlow] Error checking allowance:', error);
      setState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to check USDC allowance'
      );
    }
  }, [userAddress, isConnected, bountyPoolAddress, depositAmount, onApprovalComplete]);

  /**
   * Handle approval button click
   */
  const handleApprove = async () => {
    if (!userAddress || !isConnected) {
      setErrorMessage('Wallet not connected');
      return;
    }

    try {
      setState('approving');
      setErrorMessage('');

      // Generate approval transaction data from backend (validates spender address)
      await generateUSDCApprovalTx(depositAmount, bountyPoolAddress);

      // Call wagmi's writeContract to prompt user for signature
      writeContract({
        address: USDC_CONFIG.address,
        abi: [
          {
            name: 'approve',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
          },
        ],
        functionName: 'approve',
        args: [
          bountyPoolAddress as `0x${string}`,
          parseUnits(depositAmount, USDC_CONFIG.decimals),
        ],
      });
    } catch (error) {
      console.error('[USDCApprovalFlow] Error initiating approval:', error);
      setState('insufficient');

      if (error instanceof Error && error.message.includes('User rejected')) {
        setErrorMessage('Approval cancelled by user');
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to initiate approval'
        );
      }
    }
  };

  /**
   * Handle retry after error
   */
  const handleRetry = () => {
    setErrorMessage('');
    checkAllowance();
  };

  /**
   * Check allowance on mount and when deposit amount changes
   */
  useEffect(() => {
    if (userAddress && isConnected) {
      checkAllowance();
    }
  }, [userAddress, isConnected, depositAmount, checkAllowance]);

  /**
   * Handle write contract errors
   */
  useEffect(() => {
    if (writeError) {
      console.error('[USDCApprovalFlow] Write contract error:', writeError);
      setState('insufficient');

      const errorMsg = writeError.message.toLowerCase();
      if (errorMsg.includes('user rejected') || errorMsg.includes('user denied')) {
        setErrorMessage('Approval cancelled by user');
      } else {
        setErrorMessage(writeError.message || 'Transaction failed');
      }
    }
  }, [writeError]);

  /**
   * Handle transaction confirmation
   */
  useEffect(() => {
    if (txHash && !isConfirming && !isConfirmed) {
      setState('pending');
      setPollingStartTime(Date.now());
      setShowWarning(false);
    }

    if (isConfirmed) {
      setState('approved');
      onApprovalComplete();
    }
  }, [txHash, isConfirming, isConfirmed, onApprovalComplete]);

  /**
   * Show warning if approval takes too long
   */
  useEffect(() => {
    if (state !== 'pending' || !pollingStartTime) return;

    const warningTimer = setTimeout(() => {
      const elapsed = Date.now() - pollingStartTime;
      if (elapsed >= POLLING_CONFIG.warningThreshold) {
        setShowWarning(true);
      }
    }, POLLING_CONFIG.warningThreshold);

    return () => clearTimeout(warningTimer);
  }, [state, pollingStartTime]);

  /**
   * Basescan transaction URL
   */
  const getBasescanUrl = (hash: string): string => {
    return `https://sepolia.basescan.org/tx/${hash}`;
  };

  /**
   * Render loading state
   */
  if (state === 'loading') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600">Checking USDC allowance...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (state === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
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
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={handleRetry}
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
   * Render approved state
   */
  if (state === 'approved') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">
              Approved: {depositAmount} USDC
            </p>
            <p className="text-xs text-green-600 mt-1">
              You can now proceed with the deposit
            </p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render pending state
   */
  if (state === 'pending') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              Confirming on blockchain...
            </p>
            <p className="text-xs text-gray-600 mt-1">
              This may take up to 2 minutes
            </p>
            {txHash && (
              <a
                href={getBasescanUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline inline-block"
              >
                View on Basescan
              </a>
            )}
            {showWarning && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800">
                  Approval taking longer than expected. Your transaction is still processing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render approving state (waiting for signature)
   */
  if (state === 'approving') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600">Waiting for signature...</p>
        </div>
      </div>
    );
  }

  /**
   * Render insufficient allowance state (show approve button)
   */
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">USDC Approval Required</h3>
          <p className="text-xs text-gray-600 mt-1">
            You need to approve {depositAmount} USDC before depositing to the bounty pool.
          </p>
          {allowance && (
            <p className="text-xs text-gray-500 mt-1">
              Current allowance: {allowance.allowanceFormatted} USDC
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-800">{errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={!isConnected}
          className={cn(
            'w-full px-4 py-2 text-sm font-medium rounded-md transition-colors',
            isConnected
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {isConnected ? `Approve ${depositAmount} USDC` : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );
};

export default USDCApprovalFlow;
