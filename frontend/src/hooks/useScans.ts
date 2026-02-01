import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchScans, type Scan } from '../lib/api';
import { useEffect } from 'react';

interface UseScanOptions {
  protocolId?: string;
  status?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export interface ScanListResponse {
  scans: Scan[];
  total: number;
}

/**
 * Hook to fetch scans list with filtering and pagination
 */
export function useScans(options: UseScanOptions = {}) {
  const { protocolId, status, page = 1, limit = 20, enabled = true } = options;

  return useQuery<ScanListResponse>({
    queryKey: ['scans', { protocolId, status, page, limit }],
    queryFn: () => {
      // Use protocolId if provided, otherwise pass limit
      if (protocolId) {
        return fetchScans(protocolId, limit);
      }
      throw new Error('protocolId is required for fetching scans');
    },
    enabled: enabled && !!protocolId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for real-time feel
  });
}

/**
 * Hook to subscribe to scans real-time updates via WebSocket
 */
export function useScansRealtime(protocolId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!protocolId) return;

    // TODO: Connect to WebSocket and listen for scan events
    // For now, we'll use polling via refetchInterval in useScans

    // Example WebSocket connection (to be implemented):
    /*
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      if (data.event === 'scan:created' ||
          data.event === 'scan:started' ||
          data.event === 'scan:completed' ||
          data.event === 'scan:failed' ||
          data.event === 'scan:progress') {
        // Invalidate scans query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['scans'] });
      }
    });

    return () => {
      ws.close();
    };
    */

    // Cleanup function
    return () => {
      // Cleanup WebSocket connection
    };
  }, [protocolId, queryClient]);
}

/**
 * Hook to prefetch next page of scans
 */
export function usePrefetchScans(options: UseScanOptions = {}) {
  const queryClient = useQueryClient();
  const { protocolId, status, page = 1, limit = 20 } = options;

  const prefetchNextPage = () => {
    if (!protocolId) return;

    queryClient.prefetchQuery({
      queryKey: ['scans', { protocolId, status, page: page + 1, limit }],
      queryFn: () => fetchScans(protocolId, limit),
    });
  };

  return { prefetchNextPage };
}
