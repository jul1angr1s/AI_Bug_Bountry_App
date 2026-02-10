import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useAgentIdentity } from '../hooks/useAgentIdentities';
import { useAgentReputation, useAgentFeedback } from '../hooks/useReputation';
import ReputationScoreCard from '../components/agents/ReputationScoreCard';
import FeedbackHistoryList from '../components/agents/FeedbackHistoryList';

type FeedbackFilter = 'ALL' | 'AS_RESEARCHER' | 'AS_VALIDATOR';

export default function ReputationTracker() {
  const { id } = useParams<{ id: string }>();
  const { data: agent } = useAgentIdentity(id);
  const { data: reputation, isLoading: repLoading } = useAgentReputation(id);
  const { data: feedbacks, isLoading: fbLoading } = useAgentFeedback(id);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('ALL');

  const filteredFeedbacks = useMemo(() => {
    if (!feedbacks) return [];
    if (feedbackFilter === 'ALL') return feedbacks;
    if (feedbackFilter === 'AS_RESEARCHER') {
      return feedbacks.filter(
        (fb) => !fb.feedbackDirection || fb.feedbackDirection === 'VALIDATOR_RATES_RESEARCHER'
      );
    }
    return feedbacks.filter(
      (fb) => fb.feedbackDirection === 'RESEARCHER_RATES_VALIDATOR'
    );
  }, [feedbacks, feedbackFilter]);

  const filterTabs: { key: FeedbackFilter; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'AS_RESEARCHER', label: 'As Researcher' },
    { key: 'AS_VALIDATOR', label: 'As Validator' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Award className="w-6 h-6 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Reputation Tracker</h1>
          {agent && (
            <p className="text-sm text-gray-400">
              {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)} &middot; {agent.agentType}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ReputationScoreCard
            reputation={reputation}
            isLoading={repLoading}
            isOnChain={!!agent?.onChainTxHash}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-1 rounded-lg bg-gray-800 p-1 border border-gray-700">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFeedbackFilter(tab.key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  feedbackFilter === tab.key
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <FeedbackHistoryList feedbacks={filteredFeedbacks} isLoading={fbLoading} />
        </div>
      </div>
    </div>
  );
}
