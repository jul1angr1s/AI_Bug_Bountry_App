import { useQuery } from '@tanstack/react-query';

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
      if (!protocolId) {
        return null;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${apiUrl}/api/v1/scans?protocolId=${protocolId}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch scans');
      }

      const data = await response.json();
      return data.data && data.data.length > 0 ? data.data[0] : null;
    },
    enabled: !!protocolId,
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
