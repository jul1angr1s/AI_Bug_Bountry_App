import { useState, useEffect, useRef } from 'react';
import type { LogMessage } from '../components/scans/modern/LiveTerminalOutput';

interface ValidationLogEvent {
  eventType: 'validation:log';
  timestamp: string;
  validationId: string;
  protocolId: string;
  data: {
    level: string;
    message: string;
  };
}

const TERMINAL_STATES = ['COMPLETED', 'FAILED', 'VALIDATED', 'REJECTED'];

/**
 * Hook to stream validation logs via SSE for the LiveTerminalOutput component.
 * Mirrors useScanLogs pattern.
 */
export function useValidationLogs(validationId: string | null, validationState?: string) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect if no validationId or validation is already in a terminal state
    if (!validationId || (validationState && TERMINAL_STATES.includes(validationState))) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/validations/${validationId}/logs`;
    const eventSource = new EventSource(url, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const logEvent: ValidationLogEvent = JSON.parse(event.data);

        const logMessage: LogMessage = {
          level: (logEvent.data.level as LogMessage['level']) || 'DEFAULT',
          message: logEvent.data.message,
          timestamp: logEvent.timestamp,
        };

        setLogs((prev) => [...prev, logMessage]);
      } catch (err) {
        console.error('[SSE] Failed to parse validation log event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [validationId, validationState]);

  return logs;
}
