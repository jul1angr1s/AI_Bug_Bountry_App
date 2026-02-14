import { useState } from 'react';
import { Users, UserPlus, Shield, Star } from 'lucide-react';
import { useAgentIdentities } from '../hooks/useAgentIdentities';
import { useAgentLeaderboard } from '../hooks/useReputation';
import { AgentRegistryTable } from '../components/agents/AgentRegistryTable';
import { RegisterAgentModal } from '../components/agents/RegisterAgentModal';
import ReputationLeaderboard from '../components/agents/ReputationLeaderboard';
import { registerAgent } from '../lib/api';
import ContractBadge from '../components/shared/ContractBadge';
import { getContractByName } from '../lib/contracts';
import type { AgentIdentityType } from '../types/dashboard';

export default function AgentRegistry() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: agents, isLoading, refetch } = useAgentIdentities();
  const { data: leaderboard, isLoading: leaderboardLoading } = useAgentLeaderboard();

  const handleRegister = async (data: { walletAddress: string; agentType: AgentIdentityType; registerOnChain?: boolean }) => {
    await registerAgent(data.walletAddress, data.agentType, data.registerOnChain);
    await refetch();
    setIsModalOpen(false);
  };

  // Compute stats from agents array
  const totalAgents = agents?.length || 0;
  const activeAgents = agents?.filter((a) => a.isActive).length || 0;
  const onChainVerified = agents?.filter((a) => !!a.onChainTxHash).length || 0;
  const avgReputation = totalAgents > 0
    ? Math.round(
        (agents?.reduce((sum, a) => {
          const score = a.agentType === 'VALIDATOR'
            ? (a.reputation?.validatorReputationScore ?? 0)
            : (a.reputation?.reputationScore ?? 0);
          return sum + score;
        }, 0) || 0) / totalAgents
      )
    : 0;

  const stats = [
    { label: 'Total Agents', value: totalAgents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Agents', value: activeAgents, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'On-Chain Verified', value: onChainVerified, icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Avg. Reputation', value: avgReputation, icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Agent Registry</h1>
          {getContractByName('AgentIdentityRegistry') && (
            <ContractBadge variant="inline" contract={getContractByName('AgentIdentityRegistry')!} />
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register Agent
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-700 bg-gray-800 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
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
