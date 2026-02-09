import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AgentIdentity } from '../../types/dashboard';
import { getAgentNftUrl, truncateHash } from '../../lib/utils';

interface AgentRegistryTableProps {
  agents: AgentIdentity[];
  isLoading: boolean;
}

export function AgentRegistryTable({ agents, isLoading }: AgentRegistryTableProps) {
  // Generate gradient for avatar based on wallet address
  const getGradient = (address: string) => {
    const colors = [
      'from-blue-500 to-purple-500',
      'from-emerald-500 to-teal-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-blue-500',
      'from-amber-500 to-orange-500',
      'from-cyan-500 to-blue-500',
      'from-violet-500 to-purple-500',
      'from-rose-500 to-pink-500',
    ];
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="h-6 bg-gray-700 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="size-10 rounded-full bg-gray-700 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-1/6 animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-12 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-8 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800/50 text-gray-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Wallet</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">NFT ID</th>
              <th className="px-6 py-4">Score</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Verification</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {agents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-12 rounded-full bg-gray-800 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-400 font-medium">No agents registered yet</p>
                    <p className="text-gray-600 text-xs">Register an agent to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-9 rounded-full bg-gradient-to-tr ${getGradient(agent.walletAddress)} shrink-0`}
                      ></div>
                      <span className="font-mono text-xs text-white font-medium">
                        {truncateHash(agent.walletAddress)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {agent.agentType === 'RESEARCHER' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        Researcher
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                        Validator
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {agent.agentNftId ? (
                      <span className="font-mono text-xs text-gray-300">
                        #{agent.agentNftId}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">
                        {agent.reputation?.reputationScore ?? 0}
                      </span>
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                          style={{ width: `${agent.reputation?.reputationScore ?? 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {agent.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <span className="size-1.5 rounded-full bg-emerald-400"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/15 text-gray-400 border border-gray-500/20">
                          <span className="size-1.5 rounded-full bg-gray-500"></span>
                          Inactive
                        </span>
                      )}
                      {agent.onChainTxHash ? (
                        <p className="text-[10px] text-emerald-500 mt-1">Verified on blockchain</p>
                      ) : (
                        <p className="text-[10px] text-gray-600 mt-1">Database only</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {agent.agentNftId ? (
                      <a
                        href={getAgentNftUrl(agent.agentNftId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs"
                        title="View ERC-8004 Agent NFT on BaseScan"
                      >
                        Verify on chain
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/agents/${agent.id}/reputation`}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Reputation
                      </Link>
                      <span className="text-gray-700">|</span>
                      <Link
                        to={`/agents/${agent.id}/escrow`}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                      >
                        Escrow
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
