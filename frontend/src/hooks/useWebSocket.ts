import { useEffect, useState, useCallback } from 'react';
import { getDashboardWebSocket } from '../lib/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const ws = getDashboardWebSocket();

  useEffect(() => {
    // Connection status handlers
    const unsubOpen = ws.on('connection:open', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    const unsubClose = ws.on('connection:close', () => {
      setIsConnected(false);
    });

    const unsubError = ws.on('connection:error', (error) => {
      setConnectionError(String(error));
    });

    const unsubFailed = ws.on('connection:failed', () => {
      setConnectionError('Failed to connect after multiple attempts');
    });

    // Auto-connect if enabled
    if (autoConnect && !ws.isConnected()) {
      ws.connect();
    }

    // Cleanup on unmount
    return () => {
      unsubOpen();
      unsubClose();
      unsubError();
      unsubFailed();
    };
  }, [autoConnect, ws]);

  const subscribe = useCallback(
    (event: string, handler: (data: unknown) => void) => {
      return ws.on(event, handler);
    },
    [ws]
  );

  const send = useCallback(
    (event: string, data?: unknown) => {
      ws.send(event, data);
    },
    [ws]
  );

  const connect = useCallback(() => {
    ws.connect();
  }, [ws]);

  const disconnect = useCallback(() => {
    ws.disconnect();
  }, [ws]);

  return {
    isConnected,
    connectionError,
    subscribe,
    send,
    connect,
    disconnect,
  };
}
