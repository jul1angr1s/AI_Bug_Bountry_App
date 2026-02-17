import { useState, useEffect, useRef } from 'react';

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

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 2000;
const CONNECTION_TIMEOUT_MS = 30000;

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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!protocolId) return;

    let isActive = true;

    const clearTimers = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    const cleanup = () => {
      clearTimers();
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };

    const scheduleReconnect = () => {
      if (!isActive) return;

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setProgressState((prev) => ({
          ...prev,
          isConnected: false,
          error: 'Connection failed after multiple attempts. Please refresh the page.',
        }));
        return;
      }

      reconnectAttemptsRef.current += 1;
      const delayMs = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current - 1);

      setProgressState((prev) => ({
        ...prev,
        isConnected: false,
        error: `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
      }));

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (!isActive) return;
      cleanup();

      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const isDev = import.meta.env.MODE === 'development';
      const token = isDev ? localStorage.getItem('token') : undefined;
      const url = token
        ? `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress?token=${token}`
        : `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress`;

      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      connectionTimeoutRef.current = setTimeout(() => {
        eventSource.close();
        scheduleReconnect();
      }, CONNECTION_TIMEOUT_MS);

      eventSource.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
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
          setProgressState({
            currentStep: progressEvent.data.currentStep,
            state: progressEvent.data.state,
            progress: progressEvent.data.progress,
            message: progressEvent.data.message,
            isConnected: true,
            error: null,
          });

          if (progressEvent.data.state === 'COMPLETED' || progressEvent.data.state === 'FAILED') {
            eventSource.close();
          }
        } catch (err) {
          console.error('[SSE] Failed to parse progress event:', err);
        }
      };

      eventSource.onerror = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        eventSource.close();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isActive = false;
      cleanup();
    };
  }, [protocolId]);

  const isCompleted = progressState.state === 'COMPLETED';
  const isFailed = progressState.state === 'FAILED';

  return { ...progressState, isCompleted, isFailed };
}
