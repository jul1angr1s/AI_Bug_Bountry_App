import AgentStatusCard from './AgentStatusCard';
import type { Agent } from '@/types/dashboard';

interface AgentStatusGridProps {
  agents: Agent[];
}

export default function AgentStatusGrid({ agents }: AgentStatusGridProps) {
  if (agents.length === 0) {
    return (
      <div className="bg-navy-800 rounded-lg p-8 border border-navy-900 text-center">
        <p className="text-gray-400">No agents available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentStatusCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
