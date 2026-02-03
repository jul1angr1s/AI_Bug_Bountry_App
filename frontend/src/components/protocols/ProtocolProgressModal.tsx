import { useState } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import RegistrationProgress from './RegistrationProgress';
import ScanProgressLive from './ScanProgressLive';
import { useLatestScan } from '../../hooks/useLatestScan';

interface ProtocolProgressModalProps {
  protocolId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal showing detailed progress for registration and scanning phases
 */
export default function ProtocolProgressModal({ protocolId, isOpen, onClose }: ProtocolProgressModalProps) {
  const [activeTab, setActiveTab] = useState<'registration' | 'scanning'>('registration');
  const { data: latestScan } = useLatestScan(protocolId);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isScanRunning = latestScan?.state === 'RUNNING' || latestScan?.state === 'PENDING';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#1a1f2e] border border-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Protocol Progress</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('registration')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'registration'
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registration</span>
            </div>
            {activeTab === 'registration' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('scanning')}
            disabled={!isScanRunning && !latestScan}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'scanning'
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            } ${!isScanRunning && !latestScan ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              {isScanRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : latestScan?.state === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <div className="w-4 h-4" />
              )}
              <span>Scanning</span>
            </div>
            {activeTab === 'scanning' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'registration' ? (
            <RegistrationProgress protocolId={protocolId} />
          ) : latestScan ? (
            <ScanProgressLive scanId={latestScan.id} />
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>No scan data available</p>
              <p className="text-sm mt-2">Scan will start after registration completes</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
