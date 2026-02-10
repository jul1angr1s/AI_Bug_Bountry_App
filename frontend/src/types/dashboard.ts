export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'SCANNING' | 'ERROR';
export type AgentType = 'Protocol' | 'Researcher' | 'Validator' | 'Payment';
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

export interface ProtocolAgentAssociation {
  id: string;
  role: AgentIdentityType;
  associatedAt: string;
  agentIdentity: {
    id: string;
    walletAddress: string;
    agentType: AgentIdentityType;
    isActive: boolean;
    reputation: { reputationScore: number; totalSubmissions: number } | null;
  };
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
  agentAssociations?: ProtocolAgentAssociation[];
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

// ========== ERC-8004 Agent Identity Types ==========

export type AgentIdentityType = 'RESEARCHER' | 'VALIDATOR';

export interface AgentIdentity {
  id: string;
  walletAddress: string;
  agentNftId?: string | null;
  agentType: AgentIdentityType;
  isActive: boolean;
  registeredAt: string;
  updatedAt: string;
  onChainTxHash?: string | null;
  reputation?: AgentReputation | null;
}

export interface AgentReputation {
  id: string;
  agentIdentityId: string;
  confirmedCount: number;
  rejectedCount: number;
  inconclusiveCount: number;
  totalSubmissions: number;
  reputationScore: number;
  lastUpdated: string;
  // Validator reputation fields (bidirectional)
  validatorConfirmedCount?: number;
  validatorRejectedCount?: number;
  validatorTotalSubmissions?: number;
  validatorReputationScore?: number;
  validatorLastUpdated?: string | null;
}

export type FeedbackType =
  | 'CONFIRMED_CRITICAL'
  | 'CONFIRMED_HIGH'
  | 'CONFIRMED_MEDIUM'
  | 'CONFIRMED_LOW'
  | 'CONFIRMED_INFORMATIONAL'
  | 'REJECTED';

export type FeedbackDirection = 'VALIDATOR_RATES_RESEARCHER' | 'RESEARCHER_RATES_VALIDATOR';

export interface AgentFeedback {
  id: string;
  researcherAgentId: string;
  validatorAgentId: string;
  validationId?: string | null;
  findingId?: string | null;
  feedbackType: FeedbackType;
  feedbackDirection?: FeedbackDirection;
  onChainFeedbackId?: string | null;
  createdAt: string;
  validatorAgent?: AgentIdentity;
  researcherAgent?: AgentIdentity;
}

// ========== Escrow Types ==========

export type EscrowTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'SUBMISSION_FEE' | 'PROTOCOL_FEE';

export interface EscrowBalance {
  balance: string;
  totalDeposited: string;
  totalDeducted: string;
  remainingSubmissions: number;
  submissionFee: string;
}

export interface EscrowTransaction {
  id: string;
  agentEscrowId: string;
  transactionType: EscrowTransactionType;
  amount: string;
  txHash?: string | null;
  findingId?: string | null;
  protocolId?: string | null;
  createdAt: string;
}

// ========== x.402 Payment Types ==========

export type X402RequestType = 'PROTOCOL_REGISTRATION' | 'FINDING_SUBMISSION' | 'SCAN_REQUEST_FEE' | 'EXPLOIT_SUBMISSION_FEE';
export type X402PaymentStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'FAILED';

export interface X402PaymentEvent {
  id: string;
  requestType: X402RequestType;
  requesterAddress: string;
  amount: string;
  status: X402PaymentStatus;
  protocolId?: string | null;
  paymentReceipt?: string | null;
  txHash?: string | null;
  recipientAddress?: string | null;
  expiresAt: string;
  createdAt: string;
  completedAt?: string | null;
}
