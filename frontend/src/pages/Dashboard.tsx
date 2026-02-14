import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import ProtocolOverview from '@/components/Dashboard/ProtocolOverview';
import StatisticsPanel from '@/components/Dashboard/StatisticsPanel';
import AgentStatusGrid from '@/components/Dashboard/AgentStatusGrid';
import VulnerabilitiesTable from '@/components/Dashboard/VulnerabilitiesTable';
import CriticalAlertBanner from '@/components/Dashboard/CriticalAlertBanner';
import {
  ProtocolOverviewSkeleton,
  StatisticsPanelSkeleton,
  AgentStatusGridSkeleton,
  VulnerabilitiesTableSkeleton,
} from '@/components/shared/LoadingSkeleton';
import { DashboardErrorBoundary } from '@/components/ErrorBoundary';
import {
  useProtocol,
  useVulnerabilities,
  useAgents,
  useStats,
} from '@/hooks/useDashboardData';
import { useProtocols } from '@/hooks/useProtocols';
import { useDashboardStore } from '@/stores/dashboardStore';
import type {
  Alert,
} from '@/types/dashboard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);

  // Fetch list of protocols to select the first one
  const {
    data: protocolsData,
    isLoading: protocolsListLoading,
  } = useProtocols({ limit: 1 });

  // Auto-select first protocol if none selected
  useEffect(() => {
    if (!selectedProtocolId && protocolsData?.protocols?.length) {
      setSelectedProtocolId(protocolsData.protocols[0].id);
    }
  }, [protocolsData, selectedProtocolId]);

  // Fetch data using TanStack Query - NO MOCK FALLBACKS
  const {
    data: protocol,
    isLoading: protocolLoading,
    error: protocolError,
  } = useProtocol(selectedProtocolId || '', {
    enabled: !!selectedProtocolId,
  });

  const {
    data: vulnerabilities,
    isLoading: vulnLoading,
    error: vulnError,
  } = useVulnerabilities(selectedProtocolId || '', {
    enabled: !!selectedProtocolId,
  });

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useAgents();

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useStats();

  // Use Zustand store for alerts
  const dismissAlert = useDashboardStore((state) => state.dismissAlert);

  // Check for critical vulnerabilities and create alert
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    if (vulnerabilities?.length) {
      const criticalVuln = vulnerabilities.find((v) => v.severity === 'CRITICAL' && v.status === 'CONFIRMED');
      if (criticalVuln) {
        setAlert({
          id: `alert-${criticalVuln.id}`,
          severity: 'CRITICAL',
          message: `Critical vulnerability detected: ${criticalVuln.title}. Immediate action required.`,
          timestamp: criticalVuln.discoveredAt,
        });
      }
    }
  }, [vulnerabilities]);

  const handleDismissAlert = (id: string) => {
    dismissAlert(id);
    if (alert?.id === id) {
      setAlert(null);
    }
  };

  // Handle errors - agents error is expected for non-admin users
  const criticalError = protocolError || vulnError || statsError;
  if (criticalError) {
    console.error('Dashboard error:', criticalError);
  }

  // Log agents error separately (expected for non-admin)
  if (agentsError) {
    console.log('Agents endpoint not accessible (requires admin role):', agentsError);
  }

  // Loading state - show while fetching initial data
  const isInitialLoading = protocolsListLoading || (selectedProtocolId && protocolLoading);

  // Empty state - no protocols registered
  if (!protocolsListLoading && !protocolsData?.protocols?.length) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No Protocols Registered</h2>
            <p className="text-gray-400 mb-6">
              Get started by registering your first smart contract protocol for automated security analysis.
            </p>
            <button
              onClick={() => navigate('/protocols/register')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              Register Protocol
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state - backend unavailable (only show for critical errors, not agents)
  if (criticalError && !isInitialLoading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Backend Unavailable</h2>
            <p className="text-gray-400 mb-6">
              Unable to connect to the backend API. Please check your connection or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">Monitor protocol security and agent operations</p>
      </div>

      {/* Critical Alert */}
      {alert && (
        <CriticalAlertBanner alert={alert} onDismiss={handleDismissAlert} />
      )}

      {/* Protocol Overview & Statistics */}
      <DashboardErrorBoundary>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {isInitialLoading ? (
              <ProtocolOverviewSkeleton />
            ) : protocol ? (
              <ProtocolOverview protocol={protocol} />
            ) : (
              <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-400">No protocol data available</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            {statsLoading ? (
              <StatisticsPanelSkeleton />
            ) : stats ? (
              <StatisticsPanel stats={stats} />
            ) : (
              <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-6 text-center">
                <p className="text-gray-400">No statistics available</p>
              </div>
            )}
          </div>
        </div>
      </DashboardErrorBoundary>

      {/* Agent Status */}
      <DashboardErrorBoundary>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Agent Status</h2>
          {agentsLoading ? (
            <AgentStatusGridSkeleton />
          ) : agentsError ? (
            <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">Agent status requires admin access</p>
              <p className="text-sm text-gray-500 mt-2">
                Contact your administrator to view agent status
              </p>
            </div>
          ) : agents && agents.length > 0 ? (
            <AgentStatusGrid agents={agents} />
          ) : (
            <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No agents active</p>
            </div>
          )}
        </div>
      </DashboardErrorBoundary>

      {/* Vulnerabilities */}
      <DashboardErrorBoundary>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Vulnerabilities
          </h2>
          {vulnLoading ? (
            <VulnerabilitiesTableSkeleton />
          ) : vulnerabilities && vulnerabilities.length > 0 ? (
            <VulnerabilitiesTable vulnerabilities={vulnerabilities} />
          ) : (
            <div className="bg-[#1a1f2e] border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No vulnerabilities found</p>
              <p className="text-sm text-gray-500 mt-2">
                {selectedProtocolId ? 'This protocol has not been scanned yet or no issues were detected.' : 'Register a protocol to start scanning for vulnerabilities.'}
              </p>
            </div>
          )}
        </div>
      </DashboardErrorBoundary>
    </div>
  );
}
