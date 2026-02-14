import { useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import ProtocolProgressModal from './ProtocolProgressModal';

interface ProtocolProgressIndicatorProps {
  protocolId: string;
  status: string;
}

/**
 * Compact progress indicator for protocol cards
 * Shows animated spinner and progress bar when protocol is PENDING
 */
export default function ProtocolProgressIndicator({ protocolId, status }: ProtocolProgressIndicatorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only show for PENDING protocols
  if (status !== 'PENDING') {
    return null;
  }

  return (
    <>
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-white">Registration in progress</p>
              <p className="text-xs text-gray-400 mt-0.5">Processing protocol setup...</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
          >
            Details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar placeholder */}
        <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: '45%' }}
          />
        </div>
      </div>

      <ProtocolProgressModal
        protocolId={protocolId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
