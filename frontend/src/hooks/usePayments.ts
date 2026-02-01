import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function usePayments(filters?: { status?: string; protocolId?: string }) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.protocolId) params.append('protocolId', filters.protocolId);

      const response = await api.get(`/payments?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 10000,
  });
}
