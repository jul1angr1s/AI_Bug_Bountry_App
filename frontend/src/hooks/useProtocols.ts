import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProtocols, type ProtocolListResponse } from '../lib/api';
import { useEffect } from 'react';

interface UseProtocolsOptions {
  status?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch protocols list with pagination and filtering
 */
export function useProtocols(options: UseProtocolsOptions = {}) {
  const { status, page = 1, limit = 20, enabled = true } = options;

  return useQuery<ProtocolListResponse>({
    queryKey: ['protocols', { status, page, limit }],
    queryFn: () => fetchProtocols({ status, page, limit }),
    enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute for updates
  });
}

/**
 * Hook to subscribe to protocol real-time updates via WebSocket
 */
export function useProtocolsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // TODO: Connect to WebSocket and listen for protocol events
    // For now, we'll use polling via refetchInterval in useProtocols

    // Example WebSocket connection (to be implemented):
    /*
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      if (data.event === 'protocol:registered' ||
          data.event === 'protocol:active' ||
          data.event === 'protocol:status_changed') {
        // Invalidate protocols query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['protocols'] });
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
  }, [queryClient]);
}

/**
 * Hook to prefetch next page of protocols
 */
export function usePrefetchProtocols(options: UseProtocolsOptions = {}) {
  const queryClient = useQueryClient();
  const { status, page = 1, limit = 20 } = options;

  const prefetchNextPage = () => {
    queryClient.prefetchQuery({
      queryKey: ['protocols', { status, page: page + 1, limit }],
      queryFn: () => fetchProtocols({ status, page: page + 1, limit }),
    });
  };

  return { prefetchNextPage };
}
