import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface LeaderboardEntry {
  researcherAddress: string;
  totalEarnings: number;
  paymentCount: number;
  averagePaymentAmount: number;
}

interface UsePaymentLeaderboardOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export function usePaymentLeaderboard(options?: UsePaymentLeaderboardOptions) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['payment-leaderboard', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.startDate) params.append('startDate', options.startDate);
      if (options?.endDate) params.append('endDate', options.endDate);

      const response = await api.get(`/payments/leaderboard?${params}`);
      // Backend returns { data: leaderboard, cached }, extract the nested data
      return response.data?.data || response.data;
    },
    refetchInterval: 60000, // Refresh every 60s
    staleTime: 30000, // Consider fresh for 30s
  });
}
