import { Shield, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Protocol } from '@/types/dashboard';

interface ProtocolOverviewProps {
  protocol: Protocol;
}

export default function ProtocolOverview({ protocol }: ProtocolOverviewProps) {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const statusMap = {
    MONITORING: 'ONLINE',
    PAUSED: 'OFFLINE',
    INACTIVE: 'OFFLINE',
  } as const;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(protocol.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  return (
    <div
      className="bg-navy-800 rounded-lg p-4 sm:p-6 border border-navy-900"
      role="region"
      aria-label="Protocol overview"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Protocol</p>
            <h3 className="text-lg font-semibold text-white break-words">{protocol.name}</h3>
          </div>
        </div>
        <StatusBadge status={statusMap[protocol.status]} />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Contract Address</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-300 font-mono break-all">
              {truncateAddress(protocol.contractAddress)}
            </p>
            <button
              onClick={handleCopyAddress}
              className="p-1 hover:bg-navy-900 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Copy contract address to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <p className="text-sm text-white">{protocol.status}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Bounty Pool</p>
          <p className="text-xl sm:text-2xl font-bold text-primary" aria-live="polite">
            {protocol.bountyPool}
          </p>
        </div>
      </div>
    </div>
  );
}
