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
