import { useQuery } from '@tanstack/react-query';
import { fetchX402Payments } from '../lib/api';

export function useX402Payments() {
  return useQuery({
    queryKey: ['x402-payments'],
    queryFn: fetchX402Payments,
    refetchInterval: 15000,
  });
}
