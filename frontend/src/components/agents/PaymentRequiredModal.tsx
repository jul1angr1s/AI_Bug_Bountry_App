import { useState } from 'react';
import { X, AlertTriangle, CreditCard } from 'lucide-react';

interface PaymentRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  paymentTerms?: {
    amount: string;
    asset: string;
    chain: string;
    recipient: string;
    memo?: string;
    expiresAt: string;
  };
}

export default function PaymentRequiredModal({
  isOpen,
  onClose,
  onRetry,
  paymentTerms,
}: PaymentRequiredModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const formattedAmount = paymentTerms
    ? (Number(paymentTerms.amount) / 1_000_000).toFixed(2)
    : '0.00';

  const expiresAt = paymentTerms
    ? new Date(paymentTerms.expiresAt).toLocaleString()
    : '';

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleApproveAndPay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Future: wagmi integration for on-chain payment
      // For now, delegate to the onRetry callback
      await onRetry();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Payment failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
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
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Payment Required
            </h2>
            <p className="text-sm text-gray-400">
              HTTP 402 — x.402 payment gated endpoint
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
              <span className="text-sm text-gray-200">
                {paymentTerms.chain === 'base-sepolia'
                  ? 'Base Sepolia'
                  : paymentTerms.chain}
              </span>
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

        {/* Steps */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">How it works</h3>
          <ol className="space-y-2">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-gray-300">
                1
              </span>
              <span className="text-sm text-gray-400">
                Approve the USDC spend from your connected wallet.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-gray-300">
                2
              </span>
              <span className="text-sm text-gray-400">
                The platform sends payment to the recipient on-chain.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-medium text-gray-300">
                3
              </span>
              <span className="text-sm text-gray-400">
                Your original request is retried automatically with payment proof.
              </span>
            </li>
          </ol>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveAndPay}
            disabled={isLoading || !paymentTerms}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
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
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Approve & Pay
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
