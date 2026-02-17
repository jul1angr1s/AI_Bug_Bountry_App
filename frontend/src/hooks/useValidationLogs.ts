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
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15000;

/**
 * Hook to stream validation logs via SSE for the LiveTerminalOutput component.
 * Mirrors useScanLogs pattern.
 */
export function useValidationLogs(validationId: string | null, validationState?: string) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    // Don't connect if no validationId or validation is already in a terminal state
    if (!validationId || (validationState && TERMINAL_STATES.includes(validationState))) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/v1/validations/${validationId}/logs`;
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
      const eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const logEvent: ValidationLogEvent = JSON.parse(event.data);
          const incomingMessage = logEvent.data.message;

          // Reconnects can re-emit this bootstrap event; keep it single.
          if (incomingMessage === 'Connected to validation log stream') {
            setLogs((prev) =>
              prev.some((log) => log.message === incomingMessage)
                ? prev
                : [
                    ...prev,
                    {
                      level: (logEvent.data.level as LogMessage['level']) || 'DEFAULT',
                      message: incomingMessage,
                      timestamp: logEvent.timestamp,
                    },
                  ]
            );
            return;
          }

          const logMessage: LogMessage = {
            level: (logEvent.data.level as LogMessage['level']) || 'DEFAULT',
            message: incomingMessage,
            timestamp: logEvent.timestamp,
          };

          setLogs((prev) => [...prev, logMessage]);
        } catch (err) {
          console.error('[SSE] Failed to parse validation log event:', err);
        }
      };

      eventSource.onerror = () => {
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
  }, [validationId, validationState]);

  return logs;
}
