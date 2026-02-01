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
