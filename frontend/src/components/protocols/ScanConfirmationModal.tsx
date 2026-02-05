import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MaterialIcon } from '../shared/MaterialIcon';
import { requestProtocolScan } from '@/lib/api';

/**
 * ScanConfirmationModal Component Props
 */
export interface ScanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  protocolId: string;
  protocolName: string;
  bountyPoolAmount: number;
  onChainBalance: number;
  bountyTerms?: string;
  branch?: string;
  onScanStarted?: (scanId: string) => void;
}

/**
 * ScanConfirmationModal Component
 *
 * Modal shown when clicking "Request Researchers Scanning":
 * - Header: "Start Security Scan"
 * - Body: "Calling available researcher agents that want to participate in your bounty"
 * - Shows bounty pool amount and terms
 * - Buttons: "Cancel" | "Confirm & Start Scan"
 */
export const ScanConfirmationModal: React.FC<ScanConfirmationModalProps> = ({
  isOpen,
  onClose,
  protocolId,
  protocolName,
  bountyPoolAmount,
  onChainBalance,
  bountyTerms,
  branch,
  onScanStarted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const result = await requestProtocolScan(protocolId, branch);
      onScanStarted?.(result.scanId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-700">
          <div className="p-2 bg-purple-500/20 rounded-full">
            <MaterialIcon name="security" className="text-2xl text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Start Security Scan</h2>
            <p className="text-sm text-gray-400">{protocolName}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MaterialIcon name="close" className="text-xl text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MaterialIcon name="groups" className="text-xl text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300">
                  Calling available researcher agents that want to participate in your bounty
                </p>
                <p className="text-xs text-blue-400/70 mt-1">
                  Researchers will analyze your smart contracts for vulnerabilities
                </p>
              </div>
            </div>
          </div>

          {/* Bounty Pool Info */}
          <div className="bg-[#0f1723] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Bounty Pool</span>
              <span className="text-lg font-bold text-green-400">
                {onChainBalance.toFixed(2)} USDC
              </span>
            </div>
            {bountyPoolAmount !== onChainBalance && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Requested Amount</span>
                <span className="text-gray-400">{bountyPoolAmount} USDC</span>
              </div>
            )}
            {branch && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Target Branch</span>
                <span className="text-gray-400 font-mono">{branch}</span>
              </div>
            )}
          </div>

          {/* Bounty Terms */}
          {bountyTerms && (
            <div className="bg-[#0f1723] rounded-lg p-4">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Bounty Terms</h4>
              <p className="text-xs text-gray-300">{bountyTerms}</p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-yellow-400/70">
            <MaterialIcon name="info" className="text-sm mt-0.5" />
            <p>
              By confirming, you acknowledge that researcher agents will begin scanning
              your protocol. Validated vulnerabilities will be paid from your bounty pool.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700 bg-[#0f1723]">
          <button
            onClick={onClose}
            disabled={isRequesting}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isRequesting}
            className={cn(
              'flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              !isRequesting
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-purple-500/50 text-purple-300'
            )}
          >
            {isRequesting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Starting...
              </>
            ) : (
              <>
                <MaterialIcon name="play_arrow" className="text-lg" />
                Confirm & Start Scan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanConfirmationModal;
