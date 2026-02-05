import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@/components/shared/MaterialIcon';
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader';
import { ModernAgentCard } from '@/components/Dashboard/ModernAgentCard';
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar';
import ProtocolOverview from '@/components/Dashboard/ProtocolOverview';
import StatisticsPanel from '@/components/Dashboard/StatisticsPanel';
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
import type { Alert } from '@/types/dashboard';

export default function DashboardModern() {
  const navigate = useNavigate();
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);

  // Fetch list of protocols
  const {
    data: protocolsData,
    isLoading: protocolsListLoading,
  } = useProtocols({ limit: 1 });

  // Auto-select first protocol
  useEffect(() => {
    if (!selectedProtocolId && protocolsData?.protocols?.length) {
      setSelectedProtocolId(protocolsData.protocols[0].id);
    }
  }, [protocolsData, selectedProtocolId]);

  // Fetch data
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

  // Check for critical vulnerabilities
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

  // Handle errors
  const criticalError = protocolError || vulnError || statsError;
  if (criticalError) {
    console.error('Dashboard error:', criticalError);
  }

  if (agentsError) {
    console.log('Agents endpoint not accessible (requires admin role):', agentsError);
  }

  const isInitialLoading = protocolsListLoading || (selectedProtocolId && protocolLoading);

  // Mock data for sidebar (replace with real hooks later)
  const sidebarStats = {
    totalProtocols: protocolsData?.protocols?.length || 0,
    activeAgents: agents?.filter(a => a.status === 'active').length || 0,
    avgResponseTime: 250,
  };

  const mockActivities = [
    {
      id: '1',
      type: 'scan',
      message: 'Protocol scan completed successfully',
      timestamp: new Date().toISOString(),
      icon: 'task_alt',
    },
    {
      id: '2',
      type: 'vulnerability',
      message: 'New vulnerability detected in DeFi protocol',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      icon: 'warning',
    },
    {
      id: '3',
      type: 'bounty',
      message: 'Bounty payment processed: 500 USDC',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      icon: 'payments',
    },
  ];

  // Transform agents data for ModernAgentCard
  const modernAgents = agents?.map(agent => ({
    id: agent.id,
    type: agent.type as 'Protocol' | 'Researcher' | 'Validator',
    status: agent.status as 'active' | 'idle' | 'error',
    scansCompleted: agent.tasksCompleted || 0,
    uptime: agent.uptime || '99.9%',
  })) || [];

  // Empty state - no protocols
  if (!protocolsListLoading && !protocolsData?.protocols?.length) {
    return (
      <>
        <DashboardHeader />
        <div className="p-8">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-navy-800 border border-navy-700 rounded-lg p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-accent-purple/10 rounded-full">
                  <MaterialIcon name="warning" className="text-6xl text-accent-purple" />
                </div>
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">No Protocols Registered</h2>
              <p className="text-gray-400 mb-6">
                Get started by registering your first smart contract protocol for automated security analysis.
              </p>
              <button
                onClick={() => navigate('/protocols/register')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-purple to-primary
                         text-white font-heading font-semibold rounded-lg hover:scale-105 transition-all"
              >
                <MaterialIcon name="add" className="text-xl" />
                Register Protocol
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (criticalError && !isInitialLoading) {
    return (
      <>
        <DashboardHeader />
        <div className="p-8">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-status-critical/10 border border-status-critical/30 rounded-lg p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-status-critical/10 rounded-full">
                  <MaterialIcon name="error" className="text-6xl text-status-critical" />
                </div>
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Backend Unavailable</h2>
              <p className="text-gray-400 mb-6">
                Unable to connect to the backend API. Please check your connection or try again later.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-status-critical text-white font-heading font-semibold
                         rounded-lg hover:bg-status-critical/80 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <DashboardHeader />

      <div className="p-8 space-y-6">
        {/* Critical Alert */}
        {alert && (
          <CriticalAlertBanner alert={alert} onDismiss={handleDismissAlert} />
        )}

        {/* 12-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - 8 columns */}
          <div className="lg:col-span-8 space-y-6">
            {/* Protocol Overview & Statistics */}
            <DashboardErrorBoundary>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  {isInitialLoading ? (
                    <ProtocolOverviewSkeleton />
                  ) : protocol ? (
                    <ProtocolOverview protocol={protocol} />
                  ) : (
                    <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 text-center">
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
                    <div className="bg-navy-800 border border-navy-700 rounded-lg p-6 text-center">
                      <p className="text-gray-400">No statistics available</p>
                    </div>
                  )}
                </div>
              </div>
            </DashboardErrorBoundary>

            {/* Modern Agent Cards */}
            <DashboardErrorBoundary>
              <div>
                <h2 className="text-xl font-heading font-semibold text-white mb-4">Agent Status</h2>
                {agentsLoading ? (
                  <AgentStatusGridSkeleton />
                ) : agentsError ? (
                  <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
                    <MaterialIcon name="lock" className="text-4xl text-gray-500 mb-2" />
                    <p className="text-gray-400">Agent status requires admin access</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Contact your administrator to view agent status
                    </p>
                  </div>
                ) : modernAgents.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modernAgents.map((agent) => (
                      <ModernAgentCard key={agent.id} agent={agent} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
                    <MaterialIcon name="smart_toy" className="text-4xl text-gray-500 mb-2" />
                    <p className="text-gray-400">No agents active</p>
                  </div>
                )}
              </div>
            </DashboardErrorBoundary>

            {/* Vulnerabilities */}
            <DashboardErrorBoundary>
              <div>
                <h2 className="text-xl font-heading font-semibold text-white mb-4">
                  Recent Vulnerabilities
                </h2>
                {vulnLoading ? (
                  <VulnerabilitiesTableSkeleton />
                ) : vulnerabilities && vulnerabilities.length > 0 ? (
                  <VulnerabilitiesTable vulnerabilities={vulnerabilities} />
                ) : (
                  <div className="bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
                    <MaterialIcon name="verified" className="text-4xl text-accent-green mb-2" />
                    <p className="text-gray-400">No vulnerabilities found</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedProtocolId
                        ? 'This protocol has not been scanned yet or no issues were detected.'
                        : 'Register a protocol to start scanning for vulnerabilities.'}
                    </p>
                  </div>
                )}
              </div>
            </DashboardErrorBoundary>
          </div>

          {/* Sidebar - 4 columns */}
          <div className="lg:col-span-4">
            <DashboardSidebar
              stats={sidebarStats}
              activities={mockActivities}
              className="lg:sticky lg:top-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
