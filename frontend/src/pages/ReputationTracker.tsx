import { useParams } from 'react-router-dom';
import { Award } from 'lucide-react';
import { useAgentIdentity } from '../hooks/useAgentIdentities';
import { useAgentReputation, useAgentFeedback } from '../hooks/useReputation';
import ReputationScoreCard from '../components/agents/ReputationScoreCard';
import FeedbackHistoryList from '../components/agents/FeedbackHistoryList';

export default function ReputationTracker() {
  const { id } = useParams<{ id: string }>();
  const { data: agent } = useAgentIdentity(id);
  const { data: reputation, isLoading: repLoading } = useAgentReputation(id);
  const { data: feedbacks, isLoading: fbLoading } = useAgentFeedback(id);

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
          <ReputationScoreCard reputation={reputation} isLoading={repLoading} />
        </div>
        <div className="lg:col-span-2">
          <FeedbackHistoryList feedbacks={feedbacks || []} isLoading={fbLoading} />
        </div>
      </div>
    </div>
  );
}
