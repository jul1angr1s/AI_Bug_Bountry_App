import { useState, useEffect, useRef, useCallback } from 'react';

export interface RegistrationProgressEvent {
  eventType: 'protocol:registration_progress';
  timestamp: string;
  protocolId: string;
  data: {
    currentStep: string;
    state: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    progress: number;
    message: string;
  };
}

export interface RegistrationProgressState {
  currentStep: string;
  state: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: number;
  message: string;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to stream protocol registration progress via SSE
 * with automatic reconnection and timeout handling
 */
export function useProtocolRegistrationProgress(protocolId: string | null) {
  const [progressState, setProgressState] = useState<RegistrationProgressState>({
    currentStep: 'INITIALIZING',
    state: 'PENDING',
    progress: 0,
    message: 'Waiting to start...',
    isConnected: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 2000; // 2 seconds
  const CONNECTION_TIMEOUT = 30000; // 30 seconds

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[SSE] Max reconnect attempts reached');
      setProgressState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connection failed after multiple attempts. Please refresh the page.',
      }));
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);

    console.log(
      `[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
    );

    setProgressState((prev) => ({
      ...prev,
      isConnected: false,
      error: `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (!protocolId) return;

    // Clear any existing connection
    cleanup();

    const apiUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    const isDev = import.meta.env.MODE === 'development';
    const token = isDev ? localStorage.getItem('token') : undefined;

    const url = token
      ? `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress?token=${token}`
      : `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress`;

    console.log('[SSE] Connecting to registration progress...');
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    // Connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      console.error('[SSE] Connection timeout');
      eventSource.close();
      scheduleReconnect();
    }, CONNECTION_TIMEOUT);

    eventSource.onopen = () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      console.log('[SSE] Registration progress connected');
      reconnectAttemptsRef.current = 0; // Reset on successful connection

      setProgressState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    };

    eventSource.onmessage = (event) => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      try {
        const progressEvent: RegistrationProgressEvent = JSON.parse(event.data);
        console.log('[SSE] Registration progress update:', progressEvent);

        setProgressState({
          currentStep: progressEvent.data.currentStep,
          state: progressEvent.data.state,
          progress: progressEvent.data.progress,
          message: progressEvent.data.message,
          isConnected: true,
          error: null,
        });

        // Close connection if registration completed or failed
        if (
          progressEvent.data.state === 'COMPLETED' ||
          progressEvent.data.state === 'FAILED'
        ) {
          eventSource.close();
        }
      } catch (err) {
        console.error('[SSE] Failed to parse progress event:', err);
      }
    };

    eventSource.onerror = (error: Event) => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      console.error('[SSE] Registration progress error:', error);
      eventSource.close();
      scheduleReconnect();
    };

    eventSource.addEventListener('close', () => {
      console.log('[SSE] Server closed registration progress stream');
      eventSource.close();
    });
  }, [protocolId, cleanup, scheduleReconnect]);

  useEffect(() => {
    if (!protocolId) return;

    connect();

    return cleanup;
  }, [protocolId, connect, cleanup]);

  const isCompleted = progressState.state === 'COMPLETED';
  const isFailed = progressState.state === 'FAILED';

  return { ...progressState, isCompleted, isFailed };
}
