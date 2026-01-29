export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'SCANNING' | 'ERROR';
export type AgentType = 'Protocol' | 'Researcher' | 'Validator';

export interface Vulnerability {
  id: string;
  title: string;
  severity: SeverityLevel;
  status: 'CONFIRMED' | 'PENDING' | 'RESOLVED';
  protocol: string;
  discoveredAt: string;
  bounty?: string;
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
  name: string;
  contractAddress: string;
  status: 'MONITORING' | 'PAUSED' | 'INACTIVE';
  bountyPool: string;
}

export interface DashboardStats {
  bountyPool: string;
  bountyPoolProgress?: number;
  vulnerabilitiesFound: number;
  totalPaid: string;
  lastPaymentDate?: string;
}

export interface Alert {
  id: string;
  severity: SeverityLevel;
  message: string;
  timestamp: string;
}
