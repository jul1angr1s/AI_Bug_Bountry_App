import { Shield, BrainCircuit, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentType, AgentStatus } from '@/types/dashboard';

interface AgentStatusCardProps {
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
}

export default function AgentStatusCard({ name, type, status, currentTask }: AgentStatusCardProps) {
  const iconMap = {
    PROTOCOL: Shield,
    RESEARCHER: BrainCircuit,
    VALIDATOR: ShieldCheck,
  };

  const statusConfig = {
    ONLINE: { label: 'ONLINE', color: 'bg-green-500/10 text-green-500' },
    BUSY: { label: 'BUSY', color: 'bg-blue-500/10 text-blue-500 animate-pulse' },
    OFFLINE: { label: 'OFFLINE', color: 'bg-gray-500/10 text-gray-500' },
    ERROR: { label: 'ERROR', color: 'bg-red-500/10 text-red-500' },
  };

  const Icon = iconMap[type];
  const statusStyle = statusConfig[status];

  return (
    <div className="bg-navy-900 border border-navy-800 rounded-lg p-4 hover:border-navy-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusStyle.color)}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">{currentTask || 'Idle'}</p>
        </div>
      </div>
    </div>
  );
}
