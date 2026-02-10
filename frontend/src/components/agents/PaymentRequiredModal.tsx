import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CreditCard, ExternalLink, CheckCircle, Zap } from 'lucide-react';
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from 'wagmi';
import { formatUnits } from 'viem';
import { getExplorerTxUrl, truncateHash as truncateHashUtil } from '../../lib/utils';
import { useSmartAccountBatching } from '../../hooks/useSmartAccountBatching';

// Base Sepolia USDC contract address
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// Minimal ERC-20 ABI for approve + allowance
const ERC20_ABI = [
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
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

type PaymentType = 'PROTOCOL_REGISTRATION' | 'SCAN_REQUEST_FEE';

const PAYMENT_TYPE_CONFIG: Record<PaymentType, { title: string; subtitle: string; description: string }> = {
  PROTOCOL_REGISTRATION: {
    title: 'Protocol Registration Fee',
    subtitle: 'HTTP 402 — x.402 payment gated endpoint',
    description: '$1.00 USDC protocol registration fee',
  },
  SCAN_REQUEST_FEE: {
    title: 'Scan Request Fee',
    subtitle: 'HTTP 402 — x.402 scan request fee',
    description: '$10.00 USDC scan request fee to fee wallet',
  },
};

interface PaymentRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: (txHash: string) => void;
  paymentType?: PaymentType;
  paymentTerms?: {
    amount: string;
    asset: string;
    chain: string;
    recipient: string;
    memo?: string;
    expiresAt: string;
  };
}

type PaymentStep = 'idle' | 'approving' | 'approved' | 'paying' | 'confirming' | 'complete' | 'error';

export default function PaymentRequiredModal({
  isOpen,
  onClose,
  onRetry,
  paymentType = 'PROTOCOL_REGISTRATION',
  paymentTerms,
}: PaymentRequiredModalProps) {
  const typeConfig = PAYMENT_TYPE_CONFIG[paymentType];
  const [step, setStep] = useState<PaymentStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const hasRetried = useRef(false);

  const { address, isConnected } = useAccount();

  // EIP-7702 smart account batching
  const {
    supportsBatching,
    sendBatch,
    isSending: isBatchSending,
    batchError,
    batchStatus,
    batchTxHash,
    isWaitingForBatch,
    resetBatch,
  } = useSmartAccountBatching();

  // Stable ref for onRetry to prevent infinite effect loops
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;

  const amountBigInt = paymentTerms
    ? BigInt(paymentTerms.amount)
    : BigInt(0);

  const recipientAddress = paymentTerms?.recipient as `0x${string}` | undefined;

  // Check current USDC allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && recipientAddress ? [address, recipientAddress] : undefined,
    query: {
      enabled: !!address && !!recipientAddress,
    },
  });

  const hasAllowance = currentAllowance !== undefined && currentAllowance >= amountBigInt;

  // Approve USDC spend
  const {
    writeContract: approveWrite,
    data: approveTxHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  // Wait for approve confirmation
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
    });

  // Transfer USDC
  const {
    writeContract: transferWrite,
    data: transferTxHash,
    isPending: isTransferring,
    error: transferError,
  } = useWriteContract();

  // Wait for transfer confirmation
  const { isLoading: isTransferConfirming, isSuccess: isTransferConfirmed } =
    useWaitForTransactionReceipt({
      hash: transferTxHash,
    });

  // Update step based on transaction states
  useEffect(() => {
    if (isApproving) setStep('approving');
    if (isApproveConfirming) setStep('approving');
    if (isApproveConfirmed) {
      setStep('approved');
      refetchAllowance();
    }
  }, [isApproving, isApproveConfirming, isApproveConfirmed, refetchAllowance]);

  useEffect(() => {
    if (isTransferring) setStep('paying');
    if (isTransferConfirming) setStep('confirming');
    if (isTransferConfirmed && transferTxHash && !hasRetried.current) {
      hasRetried.current = true;
      setStep('complete');
      onRetryRef.current(transferTxHash);
    }
  }, [isTransferring, isTransferConfirming, isTransferConfirmed, transferTxHash]);

  // Handle batch completion (EIP-7702 flow)
  useEffect(() => {
    if (batchStatus === 'success' && batchTxHash && !hasRetried.current) {
      hasRetried.current = true;
      setStep('complete');
      onRetryRef.current(batchTxHash);
    }
  }, [batchStatus, batchTxHash]);

  useEffect(() => {
    if (approveError) {
      setStep('error');
      setError(approveError.message.split('\n')[0]);
    }
    if (transferError) {
      setStep('error');
      setError(transferError.message.split('\n')[0]);
    }
  }, [approveError, transferError]);

  // Handle batch errors
  useEffect(() => {
    if (batchError) {
      setStep('error');
      setError(batchError.message.split('\n')[0]);
    }
  }, [batchError]);

  // Reset state when modal opens — only trigger on isOpen changes, not resetBatch identity
  const resetBatchRef = useRef(resetBatch);
  resetBatchRef.current = resetBatch;

  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setError(null);
      hasRetried.current = false;
      resetBatchRef.current();
    }
  }, [isOpen]);

  // Auto-transfer after approval (sequential flow only)
  useEffect(() => {
    if (isApproveConfirmed && step === 'approved' && recipientAddress) {
      // Small delay to let allowance update
      const timer = setTimeout(() => {
        transferWrite({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipientAddress, amountBigInt],
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isApproveConfirmed, step, recipientAddress, amountBigInt, transferWrite]);

  if (!isOpen) return null;

  const formattedAmount = paymentTerms
    ? formatUnits(amountBigInt, 6)
    : '0.00';

  const expiresAt = paymentTerms
    ? new Date(paymentTerms.expiresAt).toLocaleString()
    : '';

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleApprove = () => {
    if (!recipientAddress) {
      setError('Missing payment recipient address. Please close and retry.');
      return;
    }
    setError(null);

    approveWrite({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [recipientAddress, amountBigInt],
    });
  };

  const handleTransfer = () => {
    if (!recipientAddress) {
      setError('Missing payment recipient address. Please close and retry.');
      return;
    }
    setError(null);

    transferWrite({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [recipientAddress, amountBigInt],
    });
  };

  const handleBatchedPayment = () => {
    if (!recipientAddress) {
      setError('Missing payment recipient address. Please close and retry.');
      return;
    }
    setError(null);
    setStep('approving');

    sendBatch([
      {
        to: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [recipientAddress, amountBigInt],
      },
      {
        to: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipientAddress, amountBigInt],
      },
    ]);
  };

  const handleApproveAndPay = async () => {
    if (hasAllowance) {
      handleTransfer();
    } else if (supportsBatching) {
      handleBatchedPayment();
    } else {
      handleApprove();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && step === 'idle') {
      onClose();
    }
  };

  const isBatchProcessing = isBatchSending || isWaitingForBatch;
  const isProcessing = ['approving', 'paying', 'confirming'].includes(step) || isBatchProcessing;

  // TX hash to display — prefer sequential transfer hash, fall back to batch hash
  const displayTxHash = transferTxHash || batchTxHash;

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet First';

    // Batch-specific states
    if (isBatchSending) return 'Approve & Pay...';
    if (isWaitingForBatch) return 'Confirming Batch...';

    switch (step) {
      case 'approving': return 'Approving USDC...';
      case 'approved': return 'Sending Payment...';
      case 'paying': return 'Sending USDC...';
      case 'confirming': return 'Confirming...';
      case 'complete': return 'Payment Complete';
      default:
        if (hasAllowance) return 'Pay Now';
        return supportsBatching ? 'Approve & Pay (1 click)' : 'Approve & Pay';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-2xl border border-gray-700">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            step === 'complete' ? 'bg-green-500/20' : 'bg-amber-500/20'
          }`}>
            {step === 'complete' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {step === 'complete' ? 'Payment Complete' : typeConfig.title}
            </h2>
            <p className="text-sm text-gray-400">
              {step === 'complete'
                ? 'Your request will be retried automatically'
                : typeConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Payment details */}
        {paymentTerms && (
          <div className="mb-6 space-y-3 rounded-lg bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Amount</span>
              <span className="text-lg font-bold text-white">
                {formattedAmount} USDC
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Chain</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-200">
                  {paymentTerms.chain === 'base-sepolia'
                    ? 'Base Sepolia'
                    : paymentTerms.chain}
                </span>
                {supportsBatching && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30">
                    <Zap className="h-3 w-3" />
                    Smart Account
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Recipient</span>
              <span
                className="text-sm font-mono text-gray-200"
                title={paymentTerms.recipient}
              >
                {truncateAddress(paymentTerms.recipient)}
              </span>
            </div>
            {paymentTerms.memo && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Memo</span>
                <span className="text-sm text-gray-200">
                  {paymentTerms.memo}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Expires</span>
              <span className="text-sm text-gray-200">{expiresAt}</span>
            </div>
          </div>
        )}

        {/* Transaction progress */}
        {displayTxHash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
            <span className="text-sm text-blue-400">TX:</span>
            <a
              href={getExplorerTxUrl(displayTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-blue-300 hover:text-blue-200 flex items-center gap-1"
            >
              {truncateHashUtil(displayTxHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Error state */}
        {(error || batchError) && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-sm text-red-400">
              {error || batchError?.message.split('\n')[0]}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveAndPay}
            disabled={isProcessing || !paymentTerms || !isConnected || step === 'complete'}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {getButtonText()}
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                {getButtonText()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
