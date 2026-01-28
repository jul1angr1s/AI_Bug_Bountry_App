import { useState } from 'react';
import ProtocolOverview from '../components/Dashboard/ProtocolOverview';
import StatisticsPanel from '../components/Dashboard/StatisticsPanel';
import AgentStatusGrid from '../components/Dashboard/AgentStatusGrid';
import VulnerabilitiesTable from '../components/Dashboard/VulnerabilitiesTable';
import CriticalAlertBanner from '../components/Dashboard/CriticalAlertBanner';

export default function DashboardPage() {
  const [showAlert, setShowAlert] = useState(true);

  // Mock data - will be replaced with API calls
  const protocolData = {
    name: 'Thunder Loan Protocol',
    contractAddress: '0x48...19f2',
    monitoringStatus: 'MONITORING_ACTIVE' as const,
  };

  const statsData = {
    bountyPool: {
      total: '$5,000',
      percentage: 50,
    },
    vulnerabilities: {
      total: 1,
      pending: 1,
    },
    totalPaid: {
      amount: '$5,000',
      lastPayment: 'Last payment: 2m ago',
    },
  };

  const handleDismissAlert = () => {
    setShowAlert(false);
    // Persist to localStorage
    localStorage.setItem('dismissed_alert_critical_oracle', 'true');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Critical Alert Banner */}
      {showAlert && (
        <CriticalAlertBanner
          title="CRITICAL ALERT: Oracle Manipulation Confirmed"
          message="A critical severity vulnerability involving oracle price manipulation has been validated by the autonomous cluster. Immediate attention required on the Thunder Loan Protocol."
          onDismiss={handleDismissAlert}
          onViewReport={() => console.log('View report')}
        />
      )}

      {/* Protocol Overview */}
      <ProtocolOverview
        name={protocolData.name}
        contractAddress={protocolData.contractAddress}
        monitoringStatus={protocolData.monitoringStatus}
      />

      {/* Statistics Panel */}
      <StatisticsPanel
        bountyPool={statsData.bountyPool}
        vulnerabilities={statsData.vulnerabilities}
        totalPaid={statsData.totalPaid}
      />

      {/* Agent Status Grid */}
      <AgentStatusGrid />

      {/* Vulnerabilities Table */}
      <VulnerabilitiesTable />
    </div>
  );
}
