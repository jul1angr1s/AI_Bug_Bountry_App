import { useState, useEffect, useRef } from 'react';

export type ValidationWorkerType = 'EXECUTION' | 'LLM';

export interface ValidationProgressEvent {
  eventType: 'validation:progress';
  timestamp: string;
  validationId: string;
  protocolId: string;
  data: {
    currentStep: string;
    state: string;
    progress?: number;
    message?: string;
    workerType: ValidationWorkerType;
  };
}

export interface ValidationProgressState {
  validationId: string | null;
  currentStep: string;
  state: string;
  progress: number;
  message: string;
  workerType: ValidationWorkerType;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to stream validation progress via SSE.
 * Mirrors useScanProgressLive pattern.
 */
export function useValidationProgressLive(validationId: string | null) {
  const [progressState, setProgressState] = useState<ValidationProgressState>({
    validationId: null,
    currentStep: 'DECRYPT_PROOF',
    state: 'PENDING',
    progress: 0,
    message: 'Waiting to start...',
    workerType: 'LLM',
    isConnected: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!validationId) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/validations/${validationId}/progress`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setProgressState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const progressEvent: ValidationProgressEvent = JSON.parse(event.data);

        setProgressState({
          validationId: progressEvent.validationId,
          currentStep: progressEvent.data.currentStep,
          state: progressEvent.data.state,
          progress: progressEvent.data.progress || 0,
          message: progressEvent.data.message || '',
          workerType: progressEvent.data.workerType || 'LLM',
          isConnected: true,
          error: null,
        });

        // Close connection if validation completed or failed
        if (
          progressEvent.data.state === 'COMPLETED' ||
          progressEvent.data.state === 'FAILED'
        ) {
          eventSource.close();
        }
      } catch (err) {
        console.error('[SSE] Failed to parse validation progress event:', err);
      }
    };

    eventSource.onerror = () => {
      setProgressState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connection error - retrying...',
      }));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [validationId]);

  return progressState;
}
