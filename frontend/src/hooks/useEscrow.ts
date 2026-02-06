import { useQuery } from '@tanstack/react-query';
import { fetchEscrowBalance, fetchEscrowTransactions } from '../lib/api';

export function useEscrowBalance(agentId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-balance', agentId],
    queryFn: () => fetchEscrowBalance(agentId!),
    enabled: !!agentId,
    refetchInterval: 15000,
  });
}

export function useEscrowTransactions(agentId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-transactions', agentId],
    queryFn: () => fetchEscrowTransactions(agentId!),
    enabled: !!agentId,
  });
}
