import { Bot, Activity } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Agent } from '@/types/dashboard';

interface AgentStatusCardProps {
  agent: Agent;
}

export default function AgentStatusCard({ agent }: AgentStatusCardProps) {
  return (
    <div className="bg-navy-800 rounded-lg p-4 border border-navy-900">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold text-white">{agent.type}</h4>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Activity className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400">Last active:</span>
          <span className="text-gray-300">{agent.lastActive}</span>
        </div>

        {agent.scansCompleted !== undefined && (
          <div className="text-xs">
            <span className="text-gray-400">Scans completed: </span>
            <span className="text-primary font-semibold">{agent.scansCompleted}</span>
          </div>
        )}
      </div>
    </div>
  );
}
