import { useState, useEffect, useRef } from 'react';
import type { LogMessage } from '../components/scans/modern/LiveTerminalOutput';

interface ScanLogEvent {
  eventType: 'scan:log';
  timestamp: string;
  scanId: string;
  protocolId: string;
  data: {
    level: string;
    message: string;
  };
}

const TERMINAL_STATES = ['SUCCEEDED', 'FAILED', 'CANCELED'];

/**
 * Hook to stream scan logs via SSE for the LiveTerminalOutput component.
 * Follows the same pattern as useScanProgressLive.
 */
export function useScanLogs(scanId: string | null, scanState?: string) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if no scanId or scan is already in a terminal state
    if (!scanId || (scanState && TERMINAL_STATES.includes(scanState))) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/scans/${scanId}/logs`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const logEvent: ScanLogEvent = JSON.parse(event.data);

        const logMessage: LogMessage = {
          level: (logEvent.data.level as LogMessage['level']) || 'DEFAULT',
          message: logEvent.data.message,
          timestamp: logEvent.timestamp,
        };

        setLogs((prev) => [...prev, logMessage]);
      } catch (err) {
        console.error('[SSE] Failed to parse scan log event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [scanId, scanState]);

  return logs;
}
