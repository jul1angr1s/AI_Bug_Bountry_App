import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Protocol,
  Agent,
  Vulnerability,
  DashboardStats,
} from '../types/dashboard';

// API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

/**
 * Fetch protocol by ID
 */
async function fetchProtocol(protocolId: string): Promise<Protocol> {
  const response = await fetch(`${API_BASE_URL}/protocols/${protocolId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch protocol');
  }
  return response.json();
}

/**
 * Hook to fetch protocol data
 */
export function useProtocol(protocolId: string | null) {
  return useQuery({
    queryKey: ['protocol', protocolId],
    queryFn: () => fetchProtocol(protocolId!),
    enabled: !!protocolId,
  });
}

/**
 * Fetch vulnerabilities for a protocol
 */
async function fetchVulnerabilities(protocolId: string): Promise<Vulnerability[]> {
  const response = await fetch(
    `${API_BASE_URL}/protocols/${protocolId}/vulnerabilities`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch vulnerabilities');
  }
  return response.json();
}

/**
 * Hook to fetch vulnerabilities
 */
export function useVulnerabilities(protocolId: string | null) {
  return useQuery({
    queryKey: ['vulnerabilities', protocolId],
    queryFn: () => fetchVulnerabilities(protocolId!),
    enabled: !!protocolId,
  });
}

/**
 * Fetch all agents
 */
async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch(`${API_BASE_URL}/agents`);
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  return response.json();
}

/**
 * Hook to fetch agents
 */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Fetch dashboard statistics
 */
async function fetchDashboardStats(protocolId?: string): Promise<DashboardStats> {
  const url = protocolId
    ? `${API_BASE_URL}/stats?protocolId=${protocolId}`
    : `${API_BASE_URL}/stats`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats(protocolId?: string) {
  return useQuery({
    queryKey: ['dashboardStats', protocolId],
    queryFn: () => fetchDashboardStats(protocolId),
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Fetch all protocols
 */
async function fetchProtocols(): Promise<Protocol[]> {
  const response = await fetch(`${API_BASE_URL}/protocols`);
  if (!response.ok) {
    throw new Error('Failed to fetch protocols');
  }
  return response.json();
}

/**
 * Hook to fetch all protocols
 */
export function useProtocols() {
  return useQuery({
    queryKey: ['protocols'],
    queryFn: fetchProtocols,
  });
}

/**
 * Mutation to dismiss an alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

/**
 * Mutation to update vulnerability status
 */
export function useUpdateVulnerability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vulnId,
      status,
    }: {
      vulnId: string;
      status: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/vulnerabilities/${vulnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update vulnerability');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate vulnerabilities query
      queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
    },
  });
}
