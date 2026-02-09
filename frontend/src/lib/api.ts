import { supabase } from './supabase';
import { getCsrfToken } from './csrf';
import type {
  Agent,
  Vulnerability,
  DashboardStats,
  Payment,
  PaymentStatus,
  SeverityLevel,
} from '../types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Get headers for state-changing requests (POST, PUT, DELETE, PATCH).
 * Includes auth headers plus CSRF token.
 */
async function getMutationHeaders(): Promise<HeadersInit> {
  const [authHeaders, csrfToken] = await Promise.all([
    getAuthHeaders(),
    getCsrfToken(),
  ]);
  return {
    ...authHeaders,
    'x-csrf-token': csrfToken,
  };
}

/**
 * Check if the backend server is reachable
 */
export async function checkBackendHealth(): Promise<{
  healthy: boolean;
  error?: string;
  cors: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
    });

    return {
      healthy: response.ok,
      cors: true,
    };
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        healthy: false,
        error: 'Backend server is not reachable. Make sure it is running on ' + API_BASE_URL,
        cors: false,
      };
    }
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cors: false,
    };
  }
}

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const result = await supabase.auth.getSession();

    if (!result || !result.data) {
      console.error('[API] Supabase getSession returned invalid response:', result);
      throw new Error('Authentication service is not responding correctly. Please refresh the page.');
    }

    const { data: { session }, error } = result;

    if (error) {
      console.error('[API] Supabase session error:', error);
      throw new Error(`Authentication error: ${error.message}`);
    }

    if (!session?.access_token) {
      console.error('[API] No active session found');
      throw new Error('No active session. Please log in to continue.');
    }

    console.log('[API] Authentication successful, user:', session.user?.email);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  } catch (error) {
    // Handle AbortError specifically (from React Strict Mode or navigation)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[API] Session fetch aborted, trying localStorage fallback...');

      // Fallback: Try to get session from localStorage directly
      const storageKey = 'thunder-security-auth';
      const keys = ['sb-ekxbtdlnbellyhovgoxw-auth-token', storageKey];

      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const sessionData = JSON.parse(stored);
            const token = sessionData?.access_token || sessionData?.currentSession?.access_token;
            if (token) {
              console.log('[API] Using token from localStorage');
              return {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              };
            }
          }
        } catch (e) {
          // Continue to next key
        }
      }

      throw new Error('No active session. Please connect your wallet.');
    }

    if (error instanceof Error && error.message.includes('No active session')) {
      throw error;
    }
    console.error('[API] Unexpected error getting auth headers:', error);
    throw new Error('Authentication failed. Please try logging in again.');
  }
}

/**
 * Fetch protocol details
 */
export async function fetchProtocol(protocolId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols/${protocolId}`, {
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch protocol: ${response.statusText}`);
  }

  const result = await response.json();

  // Backend returns { data: { ...protocol, stats: { ... } } }
  // Map it to the format expected by the frontend
  if (result.data) {
    const protocol = result.data;
    return {
      id: protocol.id,
      githubUrl: protocol.githubUrl,
      branch: protocol.branch,
      contractPath: protocol.contractPath,
      contractName: protocol.contractName,
      status: protocol.status,
      registrationState: protocol.registrationState,
      ownerAddress: protocol.ownerAddress,
      riskScore: protocol.riskScore,
      totalBountyPool: protocol.totalBountyPool,
      availableBounty: protocol.availableBounty,
      paidBounty: protocol.paidBounty,
      bountyTerms: protocol.bountyTerms,
      createdAt: protocol.createdAt,
      updatedAt: protocol.updatedAt,
      // Funding Gate fields
      onChainProtocolId: protocol.onChainProtocolId,
      bountyPoolAmount: protocol.bountyPoolAmount,
      fundingState: protocol.fundingState as FundingState | null,
      fundingTxHash: protocol.fundingTxHash,
      fundingVerifiedAt: protocol.fundingVerifiedAt,
      minimumBountyRequired: protocol.minimumBountyRequired || 25,
      canRequestScan: protocol.canRequestScan || false,
      // Map stats to root level for easier access
      scansCount: protocol.stats?.scanCount || 0,
      vulnerabilitiesCount: protocol.stats?.vulnerabilityCount || 0,
      lastScanAt: protocol.stats?.lastScanAt,
    };
  }

  return result;
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
    { headers, credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch vulnerabilities: ${response.statusText}`);
  }

  const result = await response.json();
  // Backend returns { data: { data: [...], pagination: {...} } }
  return result.data?.data || [];
}

/**
 * Fetch all agents status
 */
export async function fetchAgents(): Promise<Agent[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agents`, { headers, credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.statusText}`);
  }

  const result = await response.json();
  // Backend returns { data: [...agents] }
  return result.data || [];
}

/**
 * Fetch dashboard statistics
 */
export async function fetchStats(): Promise<DashboardStats> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/stats`, { headers, credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const result = await response.json();
  // Backend returns { data: {...stats} }
  return result.data || {
    bountyPool: '0',
    vulnerabilitiesFound: 0,
    totalPaid: '0',
  };
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
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create scan: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch scans for a protocol or all scans
 */
export async function fetchScans(protocolId?: string, limit: number = 10): Promise<{ scans: Scan[]; total: number }> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ limit: limit.toString() });
  if (protocolId) {
    params.append('protocolId', protocolId);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/scans?${params.toString()}`,
    { headers, credentials: 'include' }
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
    credentials: 'include',
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
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/scans/${scanId}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
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
    credentials: 'include',
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
    `${API_BASE_URL}/api/v1/scans/${scanId}/progress`,
    { withCredentials: true }
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
  githubUrl: string;
  branch?: string;
  contractPath: string;
  contractName: string;
  bountyTerms: string;
  ownerAddress: string;
  bountyPoolAmount?: number; // Requested bounty pool in USDC (min 25)
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
  try {
    const headers = await getMutationHeaders();
    const url = `${API_BASE_URL}/api/v1/protocols`;

    console.log('[API] Creating protocol:', request.contractName);
    console.log('[API] Request URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(request),
    });

    console.log('[API] Response status:', response.status, response.statusText);

    // Handle x.402 Payment Required response
    if (response.status === 402) {
      const x402Error = new Error('Payment required');
      (x402Error as any).status = 402;

      // x402 v2: payment terms in PAYMENT-REQUIRED header (base64 JSON)
      const paymentHeader = response.headers.get('PAYMENT-REQUIRED');
      let paymentTerms;

      if (paymentHeader) {
        try {
          const decoded = JSON.parse(atob(paymentHeader));
          console.log('[API] x.402 Payment Required (header):', decoded);
          const req = decoded.accepts?.[0] || {};
          paymentTerms = {
            amount: req.amount || '1000000',
            asset: 'USDC',
            chain: 'base-sepolia',
            recipient: req.payTo || '',
            memo: decoded.resource?.description || 'Protocol registration fee',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          };
        } catch (e) {
          console.error('[API] Failed to decode PAYMENT-REQUIRED header:', e);
        }
      }

      // Fallback: try body (v1 compat / custom responses)
      if (!paymentTerms) {
        const body = await response.json().catch(() => ({}));
        console.log('[API] x.402 Payment Required (body fallback):', body);
        const x402 = body.x402 || {};
        paymentTerms = {
          amount: x402.amount || '1000000',
          asset: 'USDC',
          chain: 'base-sepolia',
          recipient: x402.payTo || x402.recipient || '',
          memo: body.description || 'Protocol registration fee',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      }

      (x402Error as any).paymentTerms = paymentTerms;
      throw x402Error;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error?.message || response.statusText;
      console.error('[API] Protocol creation failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const protocol = data.data || data;
    console.log('[API] Protocol created successfully:', protocol.id);
    return protocol;
  } catch (error) {
    // Enhanced error handling for common issues
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('[API] Network error - possible causes:');
      console.error('  1. Backend server not running');
      console.error('  2. CORS policy blocking the request');
      console.error('  3. Network connectivity issue');
      console.error('  4. Invalid API URL:', API_BASE_URL);
      throw new Error(
        'Network error: Could not connect to the server. Please check if the backend is running on http://localhost:3000'
      );
    }
    throw error;
  }
}

/**
 * Retry protocol creation with x.402 payment signature
 */
export async function retryCreateProtocolWithPayment(
  request: CreateProtocolRequest,
  paymentTxHash: string
): Promise<CreateProtocolResponse> {
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/protocols`, {
    method: 'POST',
    headers: { ...headers, 'payment-signature': paymentTxHash },
    credentials: 'include',
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || response.statusText);
  }
  const data = await response.json();
  return data.data || data;
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
  const response = await fetch(url, { headers, credentials: 'include' });

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
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API GET request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async post(url: string, body?: unknown) {
    const headers = await getMutationHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API POST request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async put(url: string, body?: unknown) {
    const headers = await getMutationHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API PUT request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },

  async delete(url: string) {
    const headers = await getMutationHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1${url}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
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
    { headers, credentials: 'include' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch USDC allowance: ${response.statusText}`);
  }

  const result = await response.json();
  // Backend wraps response in { data: { ... } }
  return result.data;
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
    { headers, credentials: 'include' }
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
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/payments/approve`, {
    method: 'POST',
    headers,
    credentials: 'include',
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
    { headers, credentials: 'include' }
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
  const response = await fetch(url, { headers, credentials: 'include' });

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
    { headers, credentials: 'include' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to fetch bounty pool status: ${response.statusText}`);
  }

  return response.json();
}

// ========== Funding Gate API Functions ==========

export type FundingState = 'AWAITING_FUNDING' | 'FUNDED' | 'UNDERFUNDED';

/**
 * Response from verify-funding API
 */
export interface VerifyFundingResponse {
  fundingState: FundingState;
  onChainBalance: number;
  requestedAmount: number;
  canRequestScan: boolean;
  message: string;
}

/**
 * Response from funding-status API
 */
export interface FundingStatusResponse {
  fundingState: FundingState | null;
  bountyPoolAmount: number | null;
  minimumBountyRequired: number;
  fundingTxHash: string | null;
  fundingVerifiedAt: string | null;
  onChainBalance: number;
  canRequestScan: boolean;
}

/**
 * Verify protocol funding by checking on-chain balance
 */
export async function verifyProtocolFunding(
  protocolId: string
): Promise<VerifyFundingResponse> {
  const headers = await getMutationHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/verify-funding`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || `Failed to verify funding: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Request a scan for a funded protocol
 */
export async function requestProtocolScan(
  protocolId: string,
  branch?: string
): Promise<{ scanId: string; message: string }> {
  const headers = await getMutationHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/request-scan`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ branch }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || `Failed to request scan: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Record a funding transaction hash
 */
export async function recordFundingTransaction(
  protocolId: string,
  txHash: string
): Promise<{ message: string; txHash: string }> {
  const headers = await getMutationHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/record-funding`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ txHash }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || `Failed to record funding: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get current funding status for a protocol
 */
export async function fetchFundingStatus(
  protocolId: string
): Promise<FundingStatusResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/protocols/${protocolId}/funding-status`,
    { headers, credentials: 'include' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || `Failed to fetch funding status: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// ========== ERC-8004 Agent Identity API Functions ==========

import type {
  AgentIdentity,
  AgentReputation,
  AgentFeedback,
  EscrowBalance,
  EscrowTransaction,
  X402PaymentEvent,
  AgentIdentityType,
} from '../types/dashboard';

export async function fetchAgentIdentities(): Promise<AgentIdentity[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch agent identities: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}

export async function fetchAgentIdentity(id: string): Promise<AgentIdentity> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${id}`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch agent identity: ${response.statusText}`);
  const result = await response.json();
  return result.data;
}

export async function fetchAgentByWallet(walletAddress: string): Promise<AgentIdentity> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/wallet/${walletAddress}`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch agent: ${response.statusText}`);
  const result = await response.json();
  return result.data;
}

export async function registerAgent(
  walletAddress: string,
  agentType: AgentIdentityType,
  registerOnChain = false
): Promise<{ agentIdentity: AgentIdentity; onChain: any }> {
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/register`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ walletAddress, agentType, registerOnChain }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Registration failed: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data;
}

export async function fetchAgentReputation(agentId: string): Promise<AgentReputation> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/reputation`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch reputation: ${response.statusText}`);
  const result = await response.json();
  return result.data;
}

export async function fetchAgentFeedback(agentId: string): Promise<AgentFeedback[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/feedback`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch feedback: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}

export async function fetchAgentLeaderboard(limit = 10): Promise<AgentIdentity[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/leaderboard?limit=${limit}`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}

export async function fetchEscrowBalance(agentId: string): Promise<EscrowBalance> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/escrow`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch escrow balance: ${response.statusText}`);
  const result = await response.json();
  return result.data;
}

export async function depositEscrow(
  agentId: string,
  amount: string,
  txHash?: string
): Promise<{ balance: string; totalDeposited: string; remainingSubmissions: number }> {
  const headers = await getMutationHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/escrow/deposit`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ amount, txHash }),
  });
  if (!response.ok) throw new Error(`Failed to deposit: ${response.statusText}`);
  const result = await response.json();
  return result.data;
}

export async function fetchEscrowTransactions(agentId: string): Promise<EscrowTransaction[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/escrow/transactions`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch escrow transactions: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}

export async function fetchX402Payments(): Promise<X402PaymentEvent[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/x402-payments`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch x402 payments: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}

export async function fetchAgentX402Payments(agentId: string): Promise<X402PaymentEvent[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/agent-identities/${agentId}/x402-payments`, { headers, credentials: 'include' });
  if (!response.ok) throw new Error(`Failed to fetch agent x402 payments: ${response.statusText}`);
  const result = await response.json();
  return result.data || [];
}
