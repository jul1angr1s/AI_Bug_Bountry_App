import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDashboardEvents } from './useDashboardEvents';
import { useDashboardStore } from '../stores/dashboardStore';
import type { SeverityLevel } from '../types/dashboard';

/**
 * Get toast type based on severity level
 */
function getToastTypeFromSeverity(severity: SeverityLevel): 'error' | 'warning' | 'info' | 'success' {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';
    case 'MEDIUM':
      return 'warning';
    case 'LOW':
    case 'INFO':
      return 'info';
    default:
      return 'info';
  }
}

/**
 * Hook to manage dashboard toast notifications
 */
export function useDashboardNotifications() {
  const {
    handleVulnDiscovered,
    handleVulnConfirmed,
    handleAgentStatusUpdate,
    handlePaymentReleased,
    handleProtocolUpdate,
    handleStatsUpdate,
    addAlert,
  } = useDashboardStore();

  const { isConnected } = useDashboardEvents({
    // Vulnerability discovered notification
    onVulnDiscovered: (data) => {
      const { vulnerability } = data;

      // Update store
      handleVulnDiscovered(vulnerability);

      // Show toast notification
      const toastType = getToastTypeFromSeverity(vulnerability.severity);
      toast[toastType]('New Vulnerability Discovered', {
        description: `${vulnerability.severity}: ${vulnerability.title}`,
        duration: 5000,
      });

      // Add critical alert if high/critical severity
      if (vulnerability.severity === 'CRITICAL' || vulnerability.severity === 'HIGH') {
        addAlert({
          id: `alert-${vulnerability.id}`,
          severity: vulnerability.severity,
          message: `New ${vulnerability.severity} vulnerability: ${vulnerability.title}`,
          timestamp: vulnerability.discoveredAt,
        });
      }
    },

    // Vulnerability confirmed notification
    onVulnConfirmed: (data) => {
      const { vulnerabilityId, status, bounty } = data;

      // Update store
      handleVulnConfirmed(vulnerabilityId, status, bounty);

      // Show toast notification
      if (status === 'CONFIRMED') {
        toast.success('Vulnerability Confirmed', {
          description: bounty
            ? `Bounty: ${bounty} ETH`
            : 'Validation complete',
          duration: 4000,
        });
      } else if (status === 'RESOLVED') {
        toast.info('Vulnerability Resolved', {
          description: 'Issue has been fixed',
          duration: 4000,
        });
      }
    },

    // Agent status update notification
    onAgentStatus: (data) => {
      const { agent } = data;

      // Update store
      handleAgentStatusUpdate(agent);

      // Only show toast for error states
      if (agent.status === 'ERROR') {
        toast.error('Agent Error', {
          description: `${agent.type} Agent encountered an error`,
          duration: 5000,
        });
      } else if (agent.status === 'ONLINE') {
        toast.success('Agent Online', {
          description: `${agent.type} Agent is now active`,
          duration: 3000,
        });
      }
    },

    // Payment released notification
    onPaymentReleased: (data) => {
      const { amount, recipient } = data;

      // Update store
      handlePaymentReleased(data.vulnerabilityId, amount);

      // Show toast notification
      toast.success('Bounty Payment Released', {
        description: `${amount} ETH sent to ${recipient.slice(0, 8)}...`,
        duration: 5000,
      });
    },

    // Protocol update notification
    onProtocolUpdated: (data) => {
      const { protocol } = data;

      // Update store
      handleProtocolUpdate(protocol);

      // Only show toast if status changed
      if (protocol.status === 'PAUSED') {
        toast.warning('Protocol Monitoring Paused', {
          description: protocol.name,
          duration: 4000,
        });
      } else if (protocol.status === 'MONITORING') {
        toast.info('Protocol Monitoring Resumed', {
          description: protocol.name,
          duration: 4000,
        });
      }
    },

    // Stats update (silent, no notification)
    onStatsUpdated: (data) => {
      handleStatsUpdate(data.stats);
    },
  });

  // Connection status notifications
  useEffect(() => {
    if (isConnected) {
      toast.success('Connected', {
        description: 'Real-time updates active',
        duration: 2000,
      });
    }
  }, [isConnected]);

  return { isConnected };
}
