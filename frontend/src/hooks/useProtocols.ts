import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProtocols, type ProtocolListResponse } from '../lib/api';
import { useEffect } from 'react';
import { getDashboardWebSocket } from '../lib/websocket';

interface UseProtocolsOptions {
  status?: string;
  page?: number;
  limit?: number;
  enabled?: boolean;
  enableRealtime?: boolean;
}

/**
 * Hook to fetch protocols list with pagination and filtering
 */
export function useProtocols(options: UseProtocolsOptions = {}) {
  const { status, page = 1, limit = 20, enabled = true, enableRealtime = true } = options;
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    const ws = getDashboardWebSocket();

    // Subscribe to protocol status changes globally
    const unsubscribeStatus = ws.on('protocol:status_changed', (data: any) => {
      console.log('[useProtocols] Protocol status changed:', data);
      // Invalidate protocols list to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      // Also invalidate the specific protocol
      queryClient.invalidateQueries({ queryKey: ['protocol', data.protocolId] });
    });

    // Subscribe to protocol registration progress
    const unsubscribeProgress = ws.on('protocol:registration_progress', (data: any) => {
      console.log('[useProtocols] Registration progress:', data);
      // Invalidate protocol queries to show updated progress
      queryClient.invalidateQueries({ queryKey: ['protocol', data.protocolId] });
    });

    // Ensure WebSocket is connected
    if (!ws.isConnected()) {
      ws.connect();
    }

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, [enableRealtime, queryClient]);

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
