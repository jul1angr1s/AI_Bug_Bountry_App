import { cn } from '@/lib/utils';

interface ProtocolOverviewProps {
  name: string;
  contractAddress: string;
  monitoringStatus: 'MONITORING_ACTIVE' | 'PAUSED' | 'ERROR';
}

export default function ProtocolOverview({ name, contractAddress, monitoringStatus }: ProtocolOverviewProps) {
  const statusConfig = {
    MONITORING_ACTIVE: { label: 'MONITORING ACTIVE', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    PAUSED: { label: 'PAUSED', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    ERROR: { label: 'ERROR', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  };

  const status = statusConfig[monitoringStatus];

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-2">{name}</h2>
          <p className="text-sm text-gray-400">
            Contract: <span className="text-gray-300 font-mono">{contractAddress}</span>
          </p>
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2', status.color)}>
          <span className="w-2 h-2 bg-current rounded-full animate-pulse"></span>
          {status.label}
        </span>
      </div>
    </div>
  );
}
