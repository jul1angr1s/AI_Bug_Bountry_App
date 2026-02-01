import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useValidations(filters?: { status?: string; protocolId?: string }) {
  return useQuery({
    queryKey: ['validations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.protocolId) params.append('protocolId', filters.protocolId);

      const response = await api.get(`/validations?${params.toString()}`);
      return response.data;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
