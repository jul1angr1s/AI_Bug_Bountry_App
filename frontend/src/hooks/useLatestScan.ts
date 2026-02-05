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
        console.log('[useLatestScan] No protocol ID provided');
        return null;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('token');
      const url = `${apiUrl}/api/v1/scans?protocolId=${protocolId}&limit=1`;

      console.log('[useLatestScan] Fetching scan from:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[useLatestScan] Response status:', response.status);

      if (!response.ok) {
        console.error('[useLatestScan] Failed to fetch scans:', response.statusText);
        throw new Error('Failed to fetch scans');
      }

      const data = await response.json();
      console.log('[useLatestScan] Response data:', data);

      const scan = data.scans && data.scans.length > 0 ? data.scans[0] : null;
      console.log('[useLatestScan] Latest scan:', scan);

      return scan;
    },
    enabled: !!protocolId,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for active scans
  });
}
