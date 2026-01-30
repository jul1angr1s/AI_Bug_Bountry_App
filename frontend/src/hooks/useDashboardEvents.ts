import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import type { Vulnerability, Agent, Protocol, DashboardStats } from '../types/dashboard';

/**
 * WebSocket event payloads
 */
interface ProtocolUpdatedEvent {
  protocol: Protocol;
}

interface VulnDiscoveredEvent {
  vulnerability: Vulnerability;
}

interface VulnConfirmedEvent {
  vulnerabilityId: string;
  status: 'CONFIRMED' | 'RESOLVED';
  bounty?: string;
}

interface AgentStatusEvent {
  agent: Agent;
}

interface PaymentReleasedEvent {
  vulnerabilityId: string;
  amount: string;
  recipient: string;
  timestamp: string;
}

interface StatsUpdatedEvent {
  stats: DashboardStats;
}

/**
 * Dashboard event handlers
 */
interface DashboardEventHandlers {
  onProtocolUpdated?: (data: ProtocolUpdatedEvent) => void;
  onVulnDiscovered?: (data: VulnDiscoveredEvent) => void;
  onVulnConfirmed?: (data: VulnConfirmedEvent) => void;
  onAgentStatus?: (data: AgentStatusEvent) => void;
  onPaymentReleased?: (data: PaymentReleasedEvent) => void;
  onStatsUpdated?: (data: StatsUpdatedEvent) => void;
}

/**
 * Hook for subscribing to dashboard WebSocket events
 */
export function useDashboardEvents(handlers: DashboardEventHandlers) {
  const { subscribe, isConnected } = useWebSocket({ autoConnect: true });

  // Protocol updates
  useEffect(() => {
    if (!handlers.onProtocolUpdated) return;

    return subscribe('protocol:updated', (data) => {
      handlers.onProtocolUpdated!(data as ProtocolUpdatedEvent);
    });
  }, [subscribe, handlers.onProtocolUpdated]);

  // Vulnerability discovered
  useEffect(() => {
    if (!handlers.onVulnDiscovered) return;

    return subscribe('vuln:discovered', (data) => {
      handlers.onVulnDiscovered!(data as VulnDiscoveredEvent);
    });
  }, [subscribe, handlers.onVulnDiscovered]);

  // Vulnerability confirmed
  useEffect(() => {
    if (!handlers.onVulnConfirmed) return;

    return subscribe('vuln:confirmed', (data) => {
      handlers.onVulnConfirmed!(data as VulnConfirmedEvent);
    });
  }, [subscribe, handlers.onVulnConfirmed]);

  // Agent status changes
  useEffect(() => {
    if (!handlers.onAgentStatus) return;

    return subscribe('agent:status', (data) => {
      handlers.onAgentStatus!(data as AgentStatusEvent);
    });
  }, [subscribe, handlers.onAgentStatus]);

  // Payment released
  useEffect(() => {
    if (!handlers.onPaymentReleased) return;

    return subscribe('payment:released', (data) => {
      handlers.onPaymentReleased!(data as PaymentReleasedEvent);
    });
  }, [subscribe, handlers.onPaymentReleased]);

  // Stats updated
  useEffect(() => {
    if (!handlers.onStatsUpdated) return;

    return subscribe('stats:updated', (data) => {
      handlers.onStatsUpdated!(data as StatsUpdatedEvent);
    });
  }, [subscribe, handlers.onStatsUpdated]);

  return { isConnected };
}

/**
 * Helper hook for creating event handler that shows toast and updates state
 */
export function useDashboardEventHandler<T>(
  eventName: string,
  handler: (data: T) => void
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    return subscribe(eventName, (data) => {
      handler(data as T);
    });
  }, [subscribe, eventName, handler]);
}
