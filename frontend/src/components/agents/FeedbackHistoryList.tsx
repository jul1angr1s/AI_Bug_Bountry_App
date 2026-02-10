import { ArrowRight } from 'lucide-react';
import type { AgentFeedback, FeedbackType } from '../../types/dashboard';
import { formatDate, truncateHash } from '../../lib/utils';

interface FeedbackHistoryListProps {
  feedbacks: AgentFeedback[];
  isLoading: boolean;
}

const feedbackBadgeConfig: Record<FeedbackType, { bg: string; text: string; label: string }> = {
  CONFIRMED_CRITICAL: { bg: 'bg-red-900/50', text: 'text-red-300', label: 'Critical' },
  CONFIRMED_HIGH: { bg: 'bg-orange-900/50', text: 'text-orange-300', label: 'High' },
  CONFIRMED_MEDIUM: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', label: 'Medium' },
  CONFIRMED_LOW: { bg: 'bg-blue-900/50', text: 'text-blue-300', label: 'Low' },
  CONFIRMED_INFORMATIONAL: { bg: 'bg-gray-700', text: 'text-gray-300', label: 'Informational' },
  REJECTED: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Rejected' },
};

function DirectionBadge({ direction }: { direction?: string }) {
  const isValidatorRates = !direction || direction === 'VALIDATOR_RATES_RESEARCHER';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isValidatorRates
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
    }`}>
      {isValidatorRates ? 'V' : 'R'}
      <ArrowRight className="h-2.5 w-2.5" />
      {isValidatorRates ? 'R' : 'V'}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-20 rounded bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function FeedbackHistoryList({ feedbacks, isLoading }: FeedbackHistoryListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-900">
          <tr>
            {['Type', 'Direction', 'Validator', 'Finding', 'Verification', 'Date'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {!isLoading && feedbacks.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                No feedback events found.
              </td>
            </tr>
          )}

          {!isLoading &&
            feedbacks.map((fb) => {
              const badge = feedbackBadgeConfig[fb.feedbackType];
              const validatorAddr =
                fb.validatorAgent?.walletAddress ?? fb.validatorAgentId;

              return (
                <tr key={fb.id} className="hover:bg-gray-750 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <DirectionBadge direction={fb.feedbackDirection} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-300">
                    {truncateHash(validatorAddr)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-300">
                    {fb.findingId ? truncateHash(fb.findingId) : <span className="text-gray-500">-</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {fb.onChainFeedbackId ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="size-2 rounded-full bg-emerald-400"></span>
                        <span className="text-emerald-400 font-medium">On-chain</span>
                        <span className="font-mono text-gray-500">{truncateHash(fb.onChainFeedbackId)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="size-2 rounded-full bg-gray-500"></span>
                        <span className="text-gray-500">Off-chain</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">
                    {formatDate(fb.createdAt)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
