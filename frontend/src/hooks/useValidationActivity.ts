import { useState, useEffect, useRef } from 'react';

interface ValidationActivityState {
  activeValidationId: string | null;
  state: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  isConnected: boolean;
}

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

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/validations/activity/stream`;

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
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
      // EventSource auto-reconnects by default
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return activity;
}
