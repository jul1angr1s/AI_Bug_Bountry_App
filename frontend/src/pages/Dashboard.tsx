import { useState } from 'react';
import ProtocolOverview from '@/components/Dashboard/ProtocolOverview';
import StatisticsPanel from '@/components/Dashboard/StatisticsPanel';
import AgentStatusGrid from '@/components/Dashboard/AgentStatusGrid';
import VulnerabilitiesTable from '@/components/Dashboard/VulnerabilitiesTable';
import CriticalAlertBanner from '@/components/Dashboard/CriticalAlertBanner';
import type {
  Protocol,
  DashboardStats,
  Agent,
  Vulnerability,
  Alert,
} from '@/types/dashboard';

// Mock data - will be replaced with real API calls in Phase 4
const mockProtocol: Protocol = {
  id: '1',
  name: 'DeFi Protocol',
  contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
  status: 'MONITORING',
  bountyPool: '$50,000',
};

const mockStats: DashboardStats = {
  bountyPool: '$50,000',
  bountyPoolProgress: 75,
  vulnerabilitiesFound: 12,
  totalPaid: '$25,000',
  lastPaymentDate: '2 hours ago',
};

const mockAgents: Agent[] = [
  {
    id: '1',
    type: 'Protocol',
    status: 'ONLINE',
    lastActive: '2 minutes ago',
    scansCompleted: 150,
  },
  {
    id: '2',
    type: 'Researcher',
    status: 'SCANNING',
    lastActive: 'Just now',
    scansCompleted: 89,
  },
  {
    id: '3',
    type: 'Validator',
    status: 'ONLINE',
    lastActive: '5 minutes ago',
    scansCompleted: 234,
  },
];

const mockVulnerabilities: Vulnerability[] = [
  {
    id: '1',
    title: 'Reentrancy vulnerability in withdraw function',
    severity: 'CRITICAL',
    status: 'CONFIRMED',
    protocol: 'DeFi Protocol',
    discoveredAt: '2024-01-28T10:00:00Z',
    bounty: '$10,000',
  },
  {
    id: '2',
    title: 'Integer overflow in token calculation',
    severity: 'HIGH',
    status: 'PENDING',
    protocol: 'Token Contract',
    discoveredAt: '2024-01-27T15:30:00Z',
    bounty: '$5,000',
  },
  {
    id: '3',
    title: 'Missing access control on admin function',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    protocol: 'Governance Contract',
    discoveredAt: '2024-01-26T09:15:00Z',
    bounty: '$2,500',
  },
  {
    id: '4',
    title: 'Front-running vulnerability in DEX swap',
    severity: 'HIGH',
    status: 'CONFIRMED',
    protocol: 'DeFi Protocol',
    discoveredAt: '2024-01-25T14:20:00Z',
    bounty: '$7,500',
  },
];

const mockAlert: Alert = {
  id: '1',
  severity: 'CRITICAL',
  message: 'Critical reentrancy vulnerability detected in DeFi Protocol withdraw function. Immediate action required.',
  timestamp: '2024-01-28T10:00:00Z',
};

export default function Dashboard() {
  const [alert, setAlert] = useState<Alert | null>(mockAlert);

  const handleDismissAlert = (id: string) => {
    if (alert?.id === id) {
      setAlert(null);
    }
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ProtocolOverview protocol={mockProtocol} />
        </div>
        <div className="lg:col-span-2">
          <StatisticsPanel stats={mockStats} />
        </div>
      </div>

      {/* Agent Status */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Agent Status</h2>
        <AgentStatusGrid agents={mockAgents} />
      </div>

      {/* Vulnerabilities */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Vulnerabilities
        </h2>
        <VulnerabilitiesTable vulnerabilities={mockVulnerabilities} />
      </div>
    </div>
  );
}
