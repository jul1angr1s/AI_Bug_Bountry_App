import { useState, useEffect, useRef } from 'react';
import { getDashboardWebSocket } from '../lib/websocket';

export interface ScanProgressEvent {
  eventType: 'scan:progress';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    currentStep: string;
    state: string;
    progress?: number;
    message?: string;
  };
}

export interface ScanProgressState {
  scanId: string | null;
  currentStep: string;
  state: string;
  progress: number;
  message: string;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to stream scan progress via WebSocket with SSE fallback
 */
export function useScanProgressLive(scanId: string | null) {
  const [progressState, setProgressState] = useState<ScanProgressState>({
    scanId: null,
    currentStep: 'INITIALIZING',
    state: 'PENDING',
    progress: 0,
    message: 'Waiting to start...',
    isConnected: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const useSSE = false; // Prefer WebSocket, set to true for SSE fallback

  // WebSocket approach
  useEffect(() => {
    if (!scanId || useSSE) {
      return;
    }

    const ws = getDashboardWebSocket();

    const unsubscribe = ws.on('scan:progress', (data: any) => {
      const event = data as ScanProgressEvent;
      if (event.scanId === scanId) {
        console.log('[WebSocket] Scan progress update:', event);

        setProgressState({
          scanId: event.scanId,
          currentStep: event.data.currentStep,
          state: event.data.state,
          progress: event.data.progress || 0,
          message: event.data.message || '',
          isConnected: true,
          error: null,
        });
      }
    });

    // Ensure WebSocket is connected
    if (!ws.isConnected()) {
      ws.connect();
    }

    setProgressState((prev) => ({ ...prev, isConnected: ws.isConnected() }));

    return () => {
      unsubscribe();
    };
  }, [scanId, useSSE]);

  // SSE fallback approach
  useEffect(() => {
    if (!scanId || !useSSE) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/scans/${scanId}/progress`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Scan progress connected');
      setProgressState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
      }));
    };

    eventSource.onmessage = (event) => {
      try {
        const progressEvent: ScanProgressEvent = JSON.parse(event.data);
        console.log('[SSE] Scan progress update:', progressEvent);

        setProgressState({
          scanId: progressEvent.scanId,
          currentStep: progressEvent.data.currentStep,
          state: progressEvent.data.state,
          progress: progressEvent.data.progress || 0,
          message: progressEvent.data.message || '',
          isConnected: true,
          error: null,
        });

        // Close connection if scan completed or failed
        if (
          progressEvent.data.state === 'COMPLETED' ||
          progressEvent.data.state === 'FAILED' ||
          progressEvent.data.state === 'ABORTED'
        ) {
          eventSource.close();
        }
      } catch (err) {
        console.error('[SSE] Failed to parse scan progress event:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Scan progress error:', error);
      setProgressState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Connection error - retrying...',
      }));
      eventSource.close();
    };

    return () => {
      console.log('[SSE] Cleaning up scan progress connection');
      eventSource.close();
    };
  }, [scanId, useSSE]);

  return progressState;
}
