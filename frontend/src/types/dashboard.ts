export type AgentType = 'PROTOCOL' | 'RESEARCHER' | 'VALIDATOR';
export type AgentStatus = 'ONLINE' | 'BUSY' | 'OFFLINE' | 'ERROR';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type VulnStatus = 'OPEN' | 'PENDING_VALIDATION' | 'CONFIRMED' | 'PAID' | 'DUPLICATE';
export type MonitoringStatus = 'MONITORING_ACTIVE' | 'PAUSED' | 'ERROR';

export interface Protocol {
  id: string;
  name: string;
  contractAddress: string;
  contractName: string;
  githubUrl: string;
  status: 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  monitoringStatus: MonitoringStatus;
  lastScanAt: string;
  nextScanScheduled: string | null;
  owner: {
    address: string;
    name?: string;
  };
}

export interface AgentStatusData {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string | null;
  taskProgress?: number;
  lastHeartbeat: string;
  uptime: number;
  icon: string;
}

export interface Vulnerability {
  id: string;
  protocolId: string;
  title: string;
  description: string;
  severity: Severity;
  status: VulnStatus;
  researcher: {
    address: string;
    name?: string;
  };
  discoveredAt: string;
  confirmedAt?: string;
  paidAt?: string;
  bountyAmount?: string;
  txHash?: string;
}

export interface DashboardStats {
  bountyPool: {
    total: string;
    available: string;
    reserved: string;
    paid: string;
    currency: 'USDC';
    percentage: number;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    pending: number;
    confirmed: number;
  };
  payments: {
    total: string;
    count: number;
    lastPayment?: {
      amount: string;
      timestamp: string;
      researcher: string;
    };
  };
  scans: {
    total: number;
    lastScan: string;
    avgDuration: number;
  };
}

export interface Alert {
  id: string;
  type: 'CRITICAL_VULNERABILITY' | 'AGENT_ERROR' | 'POOL_LOW';
  severity: Severity;
  title: string;
  message: string;
  vulnerabilityId?: string;
  timestamp: string;
  dismissed: boolean;
  actionUrl?: string;
}
