import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MaterialIcon } from '../../shared/MaterialIcon';
import { cancelScan } from '../../../lib/api';
import { toast } from 'sonner';

export interface ScanDashboardHeaderProps {
  scan: {
    id: string;
    protocolId: string;
    state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
    currentStep?: string;
    startedAt: string;
    protocol?: {
      id: string;
      githubUrl: string;
      contractName: string;
    };
  };
  contractAddress?: string;
  onScanUpdate?: () => void;
}

export function ScanDashboardHeader({
  scan,
  contractAddress,
  onScanUpdate,
}: ScanDashboardHeaderProps) {
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

  const getStatusBadgeColor = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'QUEUED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'SUCCEEDED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'CANCELED':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (state: string) => {
    switch (state) {
      case 'RUNNING':
        return 'Active Scan';
      case 'QUEUED':
        return 'Queued';
      case 'SUCCEEDED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
      case 'CANCELED':
        return 'Canceled';
      default:
        return state;
    }
  };

  const truncateAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatStartTime = (startedAt: string) => {
    try {
      return `Started ${formatDistanceToNow(new Date(startedAt), { addSuffix: true })}`;
    } catch (error) {
      return 'Start time unknown';
    }
  };

  const handleAbortClick = () => {
    setShowAbortDialog(true);
  };

  const handleAbortConfirm = async () => {
    setIsAborting(true);
    try {
      await cancelScan(scan.id);
      toast.success('Scan aborted successfully');
      setShowAbortDialog(false);
      if (onScanUpdate) {
        onScanUpdate();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to abort scan');
    } finally {
      setIsAborting(false);
    }
  };

  const handleAbortCancel = () => {
    setShowAbortDialog(false);
  };

  const protocolName = scan.protocol?.contractName || 'Unknown Protocol';
  const scanIdShort = scan.id.slice(0, 8);
  const isRunning = scan.state === 'RUNNING';

  return (
    <>
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left side - Metadata */}
          <div className="flex-1 min-w-0">
            {/* Status Badge and Scan ID */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${getStatusBadgeColor(
                  scan.state
                )}`}
              >
                {isRunning && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                )}
                {getStatusText(scan.state)}
              </div>
              <span className="text-sm text-gray-400 font-mono">
                #SCAN-{scanIdShort}
              </span>
            </div>

            {/* Protocol Name */}
            <h1 className="text-3xl font-bold text-white mb-2">
              {protocolName}
            </h1>

            {/* Contract Address and Start Time */}
            <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
              {contractAddress && (
                <div className="flex items-center gap-2">
                  <MaterialIcon name="description" className="text-base" />
                  <span className="font-mono">{truncateAddress(contractAddress)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MaterialIcon name="schedule" className="text-base" />
                <span>{formatStartTime(scan.startedAt)}</span>
              </div>
            </div>
          </div>

          {/* Right side - Action Buttons */}
          {isRunning && (
            <div className="flex items-center gap-3">
              {/* Pause Button - Coming soon */}
              <button
                disabled
                className="px-4 py-2 bg-gray-700/50 text-gray-500 rounded-lg border border-gray-600 cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                title="Pause feature coming soon"
              >
                <MaterialIcon name="pause" className="text-base" />
                <span className="hidden sm:inline">Pause</span>
              </button>

              {/* Abort Button */}
              <button
                onClick={handleAbortClick}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <MaterialIcon name="cancel" className="text-base" />
                <span className="hidden sm:inline">Abort Scan</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Abort Confirmation Dialog */}
      {showAbortDialog && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleAbortCancel}
        >
          <div
            className="bg-surface-dark border border-surface-border rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="abort-dialog-title"
            aria-describedby="abort-dialog-description"
          >
            {/* Dialog Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <MaterialIcon name="warning" className="text-2xl text-red-400" />
              </div>
              <h2 id="abort-dialog-title" className="text-xl font-bold text-white">
                Abort Scan
              </h2>
            </div>

            {/* Dialog Content */}
            <p id="abort-dialog-description" className="text-gray-300 mb-6">
              Are you sure you want to abort this scan? This action cannot be undone.
              Any findings discovered so far will be saved, but the scan will not complete.
            </p>

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleAbortCancel}
                disabled={isAborting}
                className="px-4 py-2 bg-surface-dark text-gray-300 rounded-lg border border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAbortConfirm}
                disabled={isAborting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAborting ? (
                  <>
                    <MaterialIcon name="sync" className="text-base animate-spin" />
                    Aborting...
                  </>
                ) : (
                  <>
                    <MaterialIcon name="cancel" className="text-base" />
                    Abort Scan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
