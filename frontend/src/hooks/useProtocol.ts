import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProtocol, type Protocol } from '../lib/api';
import { useEffect } from 'react';

interface UseProtocolOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch a single protocol's details with real-time updates
 */
export function useProtocol(protocolId: string, options: UseProtocolOptions = {}) {
  const { enabled = !!protocolId } = options;

  return useQuery<Protocol>({
    queryKey: ['protocol', protocolId],
    queryFn: () => fetchProtocol(protocolId),
    enabled,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute for updates
  });
}

/**
 * Hook to subscribe to protocol real-time updates via WebSocket
 */
export function useProtocolRealtime(protocolId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!protocolId) {
      return;
    }

    // TODO: Connect to WebSocket and listen for protocol events
    // For now, we'll use polling via refetchInterval in useProtocol

    // Example WebSocket connection (to be implemented):
    /*
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      if (data.protocolId === protocolId &&
          (data.event === 'protocol:updated' ||
           data.event === 'protocol:status_changed' ||
           data.event === 'protocol:stats_updated')) {
        // Invalidate protocol query to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['protocol', protocolId] });
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
