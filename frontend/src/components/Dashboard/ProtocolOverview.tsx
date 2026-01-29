import { Shield } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Protocol } from '@/types/dashboard';

interface ProtocolOverviewProps {
  protocol: Protocol;
}

export default function ProtocolOverview({ protocol }: ProtocolOverviewProps) {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const statusMap = {
    MONITORING: 'ONLINE',
    PAUSED: 'OFFLINE',
    INACTIVE: 'OFFLINE',
  } as const;

  return (
    <div className="bg-navy-800 rounded-lg p-6 border border-navy-900">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Protocol</p>
            <h3 className="text-lg font-semibold text-white">{protocol.name}</h3>
          </div>
        </div>
        <StatusBadge status={statusMap[protocol.status]} />
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Contract Address</p>
          <p className="text-sm text-gray-300 font-mono">
            {truncateAddress(protocol.contractAddress)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <p className="text-sm text-white">{protocol.status}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Bounty Pool</p>
          <p className="text-xl font-bold text-primary">{protocol.bountyPool}</p>
        </div>
      </div>
    </div>
  );
}
