import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PaymentStats {
  totalPayments: number;
  totalAmountPaid: number;
  averagePaymentAmount: number;
  paymentsByStatus: {
    PENDING: number;
    COMPLETED: number;
    FAILED: number;
  };
  timeSeries?: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

interface UsePaymentStatsOptions {
  protocolId?: string;
  groupBy?: 'day' | 'week' | 'month';
  days?: number;
}

export function usePaymentStats(filters?: UsePaymentStatsOptions) {
  return useQuery<PaymentStats>({
    queryKey: ['payment-stats', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.protocolId) params.append('protocolId', filters.protocolId);
      if (filters?.groupBy) params.append('groupBy', filters.groupBy);
      if (filters?.days) params.append('days', filters.days.toString());

      const response = await api.get(`/payments/stats?${params}`);
      // Backend returns { data: stats, cached }, extract the nested data
      return response.data?.data || response.data;
    },
    refetchInterval: 60000, // Refresh every 60s
    staleTime: 30000, // Consider fresh for 30s
  });
}
