import { supabase } from './supabase';
import type {
  Protocol,
  Agent,
  Vulnerability,
  DashboardStats,
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
