import type { AgentIdentity } from '../../types/dashboard';

interface ReputationLeaderboardProps {
  agents: AgentIdentity[];
  isLoading: boolean;
}

const rankGradients = [
  'from-yellow-400 to-amber-600',   // #1
  'from-gray-300 to-gray-500',      // #2
  'from-orange-400 to-orange-600',  // #3
];

const avatarGradients = [
  'from-purple-500 to-blue-500',
  'from-green-400 to-cyan-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-violet-500',
  'from-teal-400 to-emerald-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-500 to-pink-500',
  'from-sky-400 to-blue-500',
];

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getAvatarGradient(index: number): string {
  return avatarGradients[index % avatarGradients.length];
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-4 py-3">
      <div className="h-6 w-6 rounded bg-gray-700" />
      <div className="h-10 w-10 rounded-full bg-gray-700" />
      <div className="flex-1">
        <div className="h-4 w-32 rounded bg-gray-700" />
      </div>
      <div className="h-5 w-12 rounded bg-gray-700" />
    </div>
  );
}

export default function ReputationLeaderboard({ agents, isLoading }: ReputationLeaderboardProps) {
  const sorted = [...agents]
    .filter((a) => a.reputation)
    .sort((a, b) => {
      const scoreA = a.agentType === 'VALIDATOR'
        ? (a.reputation?.validatorReputationScore ?? 0)
        : (a.reputation?.reputationScore ?? 0);
      const scoreB = b.agentType === 'VALIDATOR'
        ? (b.reputation?.validatorReputationScore ?? 0)
        : (b.reputation?.reputationScore ?? 0);
      return scoreB - scoreA;
    });

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800">
      <div className="border-b border-gray-700 bg-gray-900 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Reputation Leaderboard
        </h3>
      </div>

      <div className="divide-y divide-gray-700">
        {isLoading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No agents with reputation data found.
          </div>
        )}

        {!isLoading &&
          sorted.map((agent, index) => {
            const rank = index + 1;
            const score = agent.agentType === 'VALIDATOR'
              ? (agent.reputation?.validatorReputationScore ?? 0)
              : (agent.reputation?.reputationScore ?? 0);
            const isTopThree = rank <= 3;

            return (
              <div
                key={agent.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-750 transition-colors"
              >
                {/* Rank */}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isTopThree
                      ? `bg-gradient-to-br ${rankGradients[rank - 1]} text-gray-900`
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {rank}
                </span>

                {/* Avatar */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(index)} text-sm font-bold text-white`}
                >
                  {agent.walletAddress.slice(2, 4).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-gray-300">
                    {truncateAddress(agent.walletAddress)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {agent.agentType.toLowerCase()}
                  </p>
                </div>

                {/* Score */}
                <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
