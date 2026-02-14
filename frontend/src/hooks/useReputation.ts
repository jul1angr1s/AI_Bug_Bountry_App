import { useQuery } from '@tanstack/react-query';
import { fetchAgentReputation, fetchAgentFeedback, fetchAgentLeaderboard } from '../lib/api';

export function useAgentReputation(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-reputation', agentId],
    queryFn: () => fetchAgentReputation(agentId!),
    enabled: !!agentId,
    refetchInterval: 30000,
  });
}

export function useAgentFeedback(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agent-feedback', agentId],
    queryFn: () => fetchAgentFeedback(agentId!),
    enabled: !!agentId,
  });
}

export function useAgentLeaderboard(limit = 10) {
  return useQuery({
    queryKey: ['agent-leaderboard', limit],
    queryFn: () => fetchAgentLeaderboard(limit),
    refetchInterval: 30000,
  });
}
