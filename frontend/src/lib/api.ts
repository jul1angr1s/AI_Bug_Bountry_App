import { supabase } from './supabase';
import type {
  Protocol,
  Agent,
  Vulnerability,
  DashboardStats,
  Payment,
  PaymentStatus,
  SeverityLevel,
} from '../types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

/**
 * Fetch protocol details
 */
export async function fetchProtocol(protocolId: string): Promise<Protocol> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/${protocolId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch protocol: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch vulnerabilities for a protocol
 */
export async function fetchVulnerabilities(
  protocolId: string
): Promise<Vulnerability[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/vulnerabilities`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch vulnerabilities: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all agents status
 */
export async function fetchAgents(): Promise<Agent[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agents`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch dashboard statistics
 */
export async function fetchStats(): Promise<DashboardStats> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/stats`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  return response.json();
}

// ========== Scan API Functions (Task 5.1-5.2) ==========

export interface Scan {
  id: string;
  protocolId: string;
  state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  currentStep?: string;
  startedAt: string;
  finishedAt?: string;
  findingsCount: number;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  protocol?: {
    id: string;
    githubUrl: string;
    contractName: string;
  };
}

export interface CreateScanRequest {
  protocolId: string;
  branch?: string;
  commitHash?: string;
}

export interface Finding {
  id: string;
  vulnerabilityType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'DUPLICATE';
  filePath: string;
  lineNumber?: number;
  description: string;
  confidenceScore: number;
  createdAt: string;
  proofs?: Array<{
    id: string;
    status: string;
    submittedAt: string;
  }>;
}

/**
 * Create a new scan job
 */
export async function createScan(request: CreateScanRequest): Promise<{ scanId: string; state: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create scan: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch scans for a protocol
 */
export async function fetchScans(protocolId: string, limit: number = 10): Promise<{ scans: Scan[]; total: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/scans?protocolId=${protocolId}&limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch scans: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch scan details
 */
export async function fetchScan(scanId: string): Promise<Scan> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scan: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Cancel a scan
 */
export async function cancelScan(scanId: string): Promise<{ id: string; state: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to cancel scan: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch findings for a scan
 */
export async function fetchScanFindings(scanId: string): Promise<{
  scanId: string;
  findings: Finding[];
  total: number;
}> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}/findings`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch findings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Subscribe to scan progress via SSE
 */
export function subscribeToScanProgress(
  scanId: string,
  onProgress: (data: {
    scanId: string;
    step?: string;
    state: string;
    timestamp: string;
  }) => void,
  onError?: (error: Event) => void
): () => void {
  const eventSource = new EventSource(
    `${API_BASE_URL}/api/v1/scans/${scanId}/progress`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data);
  };

  if (onError) {
    eventSource.onerror = onError;
  }

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// ========== Protocol Registration API (Task 1.1.5) ==========

export interface CreateProtocolRequest {
  name: string;
  githubUrl: string;
  branch?: string;
  contractPath: string;
  contractName: string;
  bountyPoolAddress: string;
  network?: string;
}

export interface CreateProtocolResponse {
  id: string;
  name: string;
  status: string;
  message: string;
}

export interface ProtocolListItem {
  id: string;
  name: string;
  githubUrl: string;
  status: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'DEPRECATED';
  riskScore?: number;
  scansCount: number;
  vulnerabilitiesCount: number;
  createdAt: string;
}

export interface ProtocolListResponse {
  protocols: ProtocolListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create a new protocol registration
 */
export async function createProtocol(request: CreateProtocolRequest): Promise<CreateProtocolResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create protocol: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all protocols with optional filtering
 */
export async function fetchProtocols(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ProtocolListResponse> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const url = `${API_BASE_URL}/api/v1/protocols${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch protocols: ${response.statusText}`);
  }

  return response.json();
}

// ========== API Client Object ==========

/**
 * Axios-style API client for hooks
 * Provides get, post, put, delete methods that return { data: response }
 */
export const api = {
  async get(url: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`API GET request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async post(url: string, body?: unknown) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API POST request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async put(url: string, body?: unknown) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API PUT request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async delete(url: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API DELETE request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },
};

// ========== USDC API Functions (Task 14.1-14.10) ==========

export interface USDCAllowanceResponse {
  owner: string;
  spender: string;
  allowance: string; // USDC amount in base units (6 decimals)
  allowanceFormatted: string; // Human-readable format (e.g., "1000.50")
}

export interface USDCBalanceResponse {
  address: string;
  balance: string; // USDC amount in base units (6 decimals)
  balanceFormatted: string; // Human-readable format (e.g., "1000.50")
}

export interface USDCApprovalTransactionData {
  to: string;
  data: string;
  value: string;
  chainId: number;
  gasLimit: string;
}

/**
 * Check USDC allowance for a specific owner and spender
 */
export async function fetchUSDCAllowance(
  owner: string,
  spender: string
): Promise<USDCAllowanceResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/payments/usdc/allowance?owner=${owner}&spender=${spender}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch USDC allowance: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check USDC balance for a wallet address
 */
export async function fetchUSDCBalance(
  address: string
): Promise<USDCBalanceResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/payments/usdc/balance?address=${address}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch USDC balance: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate USDC approval transaction data for wallet signing
 */
export async function generateUSDCApprovalTx(
  amount: string,
  spender: string
): Promise<USDCApprovalTransactionData> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/payments/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount, spender }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to generate approval transaction: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Leaderboard entry for researcher earnings
 */
export interface LeaderboardEntry {
  researcherAddress: string;
  totalEarnings: string; // USDC amount
  paymentCount: number;
  averagePaymentAmount: string; // USDC amount
}

/**
 * Response from fetchLeaderboard API
 */
export interface FetchLeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

/**
 * Fetch earnings leaderboard
 */
export async function fetchLeaderboard(
  limit: number = 10
): Promise<FetchLeaderboardResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/payments/leaderboard?limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch leaderboard: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Query parameters for fetching payments
 */
export interface FetchPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  severity?: SeverityLevel;
  startDate?: string;
  endDate?: string;
  protocolId?: string;
}

/**
 * Response from fetchPayments API
 */
export interface FetchPaymentsResponse {
  payments: Payment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Fetch payments with optional filtering and pagination
 */
export async function fetchPayments(
  params?: FetchPaymentsParams
): Promise<FetchPaymentsResponse> {
  const headers = await getAuthHeaders();
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);
  if (params?.severity) queryParams.append('severity', params.severity);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.protocolId) queryParams.append('protocolId', params.protocolId);

  const url = `${API_BASE_URL}/api/v1/payments${queryParams.toString() ? `?${queryParams}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch payments: ${response.statusText}`);
  }

  return response.json();
}

// ========== Bounty Pool API Functions ==========

/**
 * Pool transaction entry
 */
export interface PoolTransaction {
  id?: string; // Optional ID for tracking
  type: 'DEPOSIT' | 'PAYMENT';
  amount: string;
  timestamp: string; // ISO format
  txHash: string;
}

/**
 * Response from fetchBountyPoolStatus API
 */
export interface BountyPoolStatusResponse {
  availableBalance: string;
  totalDeposited: string;
  totalPaid: string;
  pendingPaymentsTotal: string;
  pendingPaymentsCount: number;
  recentTransactions: PoolTransaction[];
}

/**
 * Fetch bounty pool status for a protocol
 */
export async function fetchBountyPoolStatus(
  protocolId: string
): Promise<BountyPoolStatusResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/bounty-pool`,
    { headers }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch bounty pool status: ${response.statusText}`);
  }

  return response.json();
}
