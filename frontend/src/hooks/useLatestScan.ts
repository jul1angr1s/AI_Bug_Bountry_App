import { useQuery } from '@tanstack/react-query';
import { fetchScans } from '@/lib/api';

export interface Scan {
  id: string;
  protocolId: string;
  state: string;
  targetBranch?: string;
  targetCommitHash?: string;
  findingsCount: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Hook to fetch the latest scan for a protocol
 */
export function useLatestScan(protocolId: string | null) {
  return useQuery<Scan | null>({
    queryKey: ['latestScan', protocolId],
    queryFn: async () => {
      if (!protocolId) return null;
      const data = await fetchScans(protocolId, 1);
      return data.scans && data.scans.length > 0 ? data.scans[0] : null;
    },
    enabled: !!protocolId,
    staleTime: 5000,
    refetchInterval: 5000,
  });
}
