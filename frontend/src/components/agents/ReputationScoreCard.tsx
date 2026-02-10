import { Shield } from 'lucide-react';
import type { AgentReputation } from '../../types/dashboard';

interface ReputationScoreCardProps {
  reputation: AgentReputation | null | undefined;
  isLoading: boolean;
  isOnChain?: boolean;
  agentType?: 'RESEARCHER' | 'VALIDATOR';
}

function CircularProgress({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor = 'stroke-red-500';
  if (score >= 80) strokeColor = 'stroke-green-400';
  else if (score >= 60) strokeColor = 'stroke-yellow-400';
  else if (score >= 40) strokeColor = 'stroke-orange-400';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-700"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-700 bg-gray-800 p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-36 w-36 rounded-full bg-gray-700" />
        <div className="h-4 w-32 rounded bg-gray-700" />
        <div className="flex gap-8">
          <div className="h-10 w-20 rounded bg-gray-700" />
          <div className="h-10 w-20 rounded bg-gray-700" />
          <div className="h-10 w-20 rounded bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export default function ReputationScoreCard({ reputation, isLoading, isOnChain, agentType }: ReputationScoreCardProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!reputation) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-gray-500">No reputation data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
      <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-gray-400">
        Reputation Score
      </h3>

      <div className="flex flex-col items-center gap-6">
        <CircularProgress score={
          agentType === 'VALIDATOR'
            ? (reputation.validatorReputationScore ?? 0)
            : reputation.reputationScore
        } />

        {/* On-chain verification indicator */}
        {isOnChain && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Score verified on blockchain</span>
          </div>
        )}

        {/* Dual score display */}
        <div className="w-full grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
          {/* As Researcher */}
          <div className="text-center">
            <h4 className="text-xs font-medium text-purple-400 mb-2 uppercase tracking-wider">As Researcher</h4>
            <div className="flex justify-around">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-green-400">{reputation.confirmedCount}</span>
                <span className="text-[10px] text-gray-400">Confirmed</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-red-400">{reputation.rejectedCount}</span>
                <span className="text-[10px] text-gray-400">Rejected</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-white">{reputation.totalSubmissions}</span>
                <span className="text-[10px] text-gray-400">Total</span>
              </div>
            </div>
          </div>

          {/* As Validator */}
          <div className="text-center">
            <h4 className="text-xs font-medium text-cyan-400 mb-2 uppercase tracking-wider">As Validator</h4>
            <div className="flex justify-around">
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-green-400">{reputation.validatorConfirmedCount ?? 0}</span>
                <span className="text-[10px] text-gray-400">Confirmed</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-red-400">{reputation.validatorRejectedCount ?? 0}</span>
                <span className="text-[10px] text-gray-400">Rejected</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-bold text-white">{reputation.validatorTotalSubmissions ?? 0}</span>
                <span className="text-[10px] text-gray-400">Total</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Last updated {new Date(reputation.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
