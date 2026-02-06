import { useQuery } from '@tanstack/react-query';
import { fetchAgentIdentities, fetchAgentIdentity } from '../lib/api';

export function useAgentIdentities() {
  return useQuery({
    queryKey: ['agent-identities'],
    queryFn: fetchAgentIdentities,
    refetchInterval: 15000,
  });
}

export function useAgentIdentity(id: string | undefined) {
  return useQuery({
    queryKey: ['agent-identity', id],
    queryFn: () => fetchAgentIdentity(id!),
    enabled: !!id,
  });
}
