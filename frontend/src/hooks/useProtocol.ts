import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProtocol } from '../lib/api';
import { useEffect } from 'react';
import { getDashboardWebSocket } from '../lib/websocket';
import { toast } from 'sonner';

interface UseProtocolOptions {
  enabled?: boolean;
  enableRealtime?: boolean;
}

/**
 * Hook to fetch a single protocol's details with real-time updates
 */
export function useProtocol(protocolId: string, options: UseProtocolOptions = {}) {
  const { enabled = !!protocolId, enableRealtime = true } = options;
  const queryClient = useQueryClient();

  // Subscribe to real-time updates
  useEffect(() => {
    if (!protocolId || !enableRealtime) {
      return;
    }

    const ws = getDashboardWebSocket();

    // Subscribe to protocol status changes
    const unsubscribeStatus = ws.on('protocol:status_changed', (data: any) => {
      if (data.protocolId === protocolId) {
        console.log('[useProtocol] Protocol status changed:', data);
        queryClient.invalidateQueries({ queryKey: ['protocol', protocolId] });

        // Show toast notification
        if (data.data.status === 'ACTIVE') {
          toast.success('Protocol is now active');
        } else if (data.data.registrationState === 'FAILED') {
          toast.error(`Protocol registration failed: ${data.data.failureReason || 'Unknown error'}`);
        }
      }
    });

    // Subscribe to scan started events
    const unsubscribeScanStarted = ws.on('scan:started', (data: any) => {
      if (data.protocolId === protocolId) {
        console.log('[useProtocol] Scan started:', data);
        queryClient.invalidateQueries({ queryKey: ['protocol', protocolId] });
        queryClient.invalidateQueries({ queryKey: ['scans', protocolId] });
        toast.info('Vulnerability scan started');
      }
    });

    // Subscribe to scan completed events
    const unsubscribeScanCompleted = ws.on('scan:completed', (data: any) => {
      if (data.protocolId === protocolId) {
        console.log('[useProtocol] Scan completed:', data);
        queryClient.invalidateQueries({ queryKey: ['protocol', protocolId] });
        queryClient.invalidateQueries({ queryKey: ['scans', protocolId] });

        if (data.data.state === 'COMPLETED') {
          toast.success(`Scan completed with ${data.data.findingsCount} findings`);
        } else if (data.data.state === 'FAILED') {
          toast.error(`Scan failed: ${data.data.errorMessage || 'Unknown error'}`);
        }
      }
    });

    // Ensure WebSocket is connected
    if (!ws.isConnected()) {
      ws.connect();
    }

    return () => {
      unsubscribeStatus();
      unsubscribeScanStarted();
      unsubscribeScanCompleted();
    };
  }, [protocolId, enableRealtime, queryClient]);

  return useQuery<any>({
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
