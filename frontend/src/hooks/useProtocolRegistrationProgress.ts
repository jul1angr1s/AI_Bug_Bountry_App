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

/**
 * Hook to stream protocol registration progress via SSE
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

  useEffect(() => {
    if (!protocolId) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';

    // Development: Query param fallback for SSE authentication
    // In production, cookie authentication is used (set via syncAuthCookie)
    const isDev = import.meta.env.MODE === 'development';
    const token = isDev ? localStorage.getItem('token') : undefined;

    // Create SSE connection
    const url = token
      ? `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress?token=${token}`
      : `${apiUrl}/api/v1/protocols/${protocolId}/registration-progress`;

    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Registration progress connected');
      setProgressState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    };

    eventSource.onmessage = (event) => {
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

    eventSource.onerror = (error) => {
      console.error('[SSE] Registration progress error:', error);
      setProgressState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connection error - retrying...',
      }));
      eventSource.close();
    };

    // Handle custom close event from server
    eventSource.addEventListener('close', () => {
      console.log('[SSE] Server closed registration progress stream');
      eventSource.close();
    });

    return () => {
      console.log('[SSE] Cleaning up registration progress connection');
      eventSource.close();
    };
  }, [protocolId]);

  return progressState;
}
