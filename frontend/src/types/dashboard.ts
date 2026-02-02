export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'SCANNING' | 'ERROR';
export type AgentType = 'Protocol' | 'Researcher' | 'Validator';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED';

export interface Vulnerability {
  id: string;
  title: string;
  severity: SeverityLevel;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  protocol?: string;
  discoveredAt: string;
  bounty?: string | null;
}

export interface Agent {
  id: string;
  type: AgentType;
  status: AgentStatus;
  lastActive: string;
  scansCompleted?: number;
}

export interface Protocol {
  id: string;
  contractName: string;
  githubUrl: string;
  branch: string;
  contractPath: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  registrationState: string;
  ownerAddress: string;
  totalBountyPool: string;
  availableBounty: string;
  paidBounty: string;
  riskScore?: number | null;
  createdAt: string;
  updatedAt: string;
  scansCount?: number;
  vulnerabilitiesCount?: number;
  lastScanAt?: string | null;
  stats?: {
    vulnerabilityCount: number;
    scanCount: number;
    lastScanAt: string | null;
  };
}

export interface DashboardStats {
  bountyPool: {
    total: number;
    available: number;
    paid: number;
    currency: string;
  };
  vulnerabilities: {
    total: number;
    bySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      INFO: number;
    };
    byStatus: {
      OPEN: number;
      ACKNOWLEDGED: number;
      RESOLVED: number;
      DISMISSED: number;
    };
  };
  payments: {
    total: number;
    count: number;
    lastPayment: string | null;
  };
  scans: {
    total: number;
    lastScan: string | null;
    avgDuration: number;
  };
}

export interface Alert {
  id: string;
  severity: SeverityLevel;
  message: string;
  timestamp: string;
}

export interface Payment {
  id: string;
  researcherAddress: string;
  amount: string;
  status: PaymentStatus;
  txHash?: string;
  createdAt: string;
  failureReason?: string;
  protocol?: {
    id: string;
    name?: string;
  };
  vulnerability?: {
    id: string;
    severity: SeverityLevel;
  };
}
