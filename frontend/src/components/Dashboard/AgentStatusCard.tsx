import { Bot, Activity } from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import type { Agent } from '@/types/dashboard';

interface AgentStatusCardProps {
  agent: Agent;
  onClick?: () => void;
}

export default function AgentStatusCard({ agent, onClick }: AgentStatusCardProps) {
  const CardWrapper = onClick ? 'button' : 'div';
  const interactiveProps = onClick ? {
    onClick,
    className: "bg-navy-800 rounded-lg p-4 border border-navy-900 w-full text-left transition-colors hover:bg-navy-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-navy-950 cursor-pointer",
    'aria-label': `${agent.type} agent - ${agent.status}`
  } : {
    className: "bg-navy-800 rounded-lg p-4 border border-navy-900"
  };

  return (
    <CardWrapper {...interactiveProps} role="article" aria-live="polite">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-white">{agent.type}</h4>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Activity className="w-3 h-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-gray-400">Last active:</span>
          <span className="text-gray-300">{agent.lastActive}</span>
        </div>

        {agent.scansCompleted !== undefined && (
          <div className="text-xs">
            <span className="text-gray-400">Scans completed: </span>
            <span className="text-primary font-semibold" aria-label={`${agent.scansCompleted} scans`}>
              {agent.scansCompleted}
            </span>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
