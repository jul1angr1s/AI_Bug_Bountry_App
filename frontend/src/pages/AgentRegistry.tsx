import { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { useAgentIdentities } from '../hooks/useAgentIdentities';
import { useAgentLeaderboard } from '../hooks/useReputation';
import { AgentRegistryTable } from '../components/agents/AgentRegistryTable';
import { RegisterAgentModal } from '../components/agents/RegisterAgentModal';
import ReputationLeaderboard from '../components/agents/ReputationLeaderboard';
import { registerAgent } from '../lib/api';
import type { AgentIdentityType } from '../types/dashboard';

export default function AgentRegistry() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: agents, isLoading, refetch } = useAgentIdentities();
  const { data: leaderboard, isLoading: leaderboardLoading } = useAgentLeaderboard();

  const handleRegister = async (data: { walletAddress: string; agentType: AgentIdentityType }) => {
    await registerAgent(data.walletAddress, data.agentType);
    await refetch();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Agent Registry</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register Agent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AgentRegistryTable agents={agents || []} isLoading={isLoading} />
        </div>
        <div>
          <ReputationLeaderboard agents={leaderboard || []} isLoading={leaderboardLoading} />
        </div>
      </div>

      <RegisterAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRegister}
      />
    </div>
  );
}
