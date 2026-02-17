import { useState, useEffect, useRef } from 'react';

interface ValidationActivityState {
  activeValidationId: string | null;
  state: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  isConnected: boolean;
}

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

/**
 * Hook to detect any active validation globally via SSE.
 * Replaces polling for instant detection of validation starts.
 */
export function useValidationActivity(): ValidationActivityState {
  const [activity, setActivity] = useState<ValidationActivityState>({
    activeValidationId: null,
    state: 'IDLE',
    isConnected: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/validations/activity/stream`;
    let isActive = true;

    const clearReconnectTimer = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (!isActive) return;
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttemptsRef.current += 1;
      clearReconnectTimer();
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    const connect = () => {
      if (!isActive) return;
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setActivity((prev) => ({ ...prev, isConnected: true }));
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.eventType === 'validation:activity') {
            setActivity({
              activeValidationId: data.activeValidationId || null,
              state: data.state || 'IDLE',
              isConnected: true,
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        setActivity((prev) => ({ ...prev, isConnected: false }));
        eventSource.close();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isActive = false;
      clearReconnectTimer();
      eventSourceRef.current?.close();
    };
  }, []);

  return activity;
}
