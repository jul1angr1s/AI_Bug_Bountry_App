import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProtocol,
  fetchVulnerabilities,
  fetchAgents,
  fetchStats,
} from '../lib/api';
import type {
  Protocol,
  Agent,
  Vulnerability,
  DashboardStats,
} from '../types/dashboard';

/**
 * Query keys for caching and invalidation
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  protocol: (id: string) => [...dashboardKeys.all, 'protocol', id] as const,
  vulnerabilities: (protocolId: string) =>
    [...dashboardKeys.all, 'vulnerabilities', protocolId] as const,
  agents: () => [...dashboardKeys.all, 'agents'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch protocol details
 */
export function useProtocol(protocolId: string, options?: { enabled?: boolean }) {
  return useQuery<Protocol, Error>({
    queryKey: dashboardKeys.protocol(protocolId),
    queryFn: () => fetchProtocol(protocolId),
    enabled: options?.enabled !== undefined ? options.enabled : !!protocolId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch vulnerabilities
 */
export function useVulnerabilities(protocolId: string, options?: { enabled?: boolean }) {
  return useQuery<Vulnerability[], Error>({
    queryKey: dashboardKeys.vulnerabilities(protocolId),
    queryFn: () => fetchVulnerabilities(protocolId),
    enabled: options?.enabled !== undefined ? options.enabled : !!protocolId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to fetch agents status
 */
export function useAgents() {
  return useQuery<Agent[], Error>({
    queryKey: dashboardKeys.agents(),
    queryFn: fetchAgents,
    staleTime: 1000 * 10, // 10 seconds
    refetchInterval: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to fetch dashboard stats
 */
export function useStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: dashboardKeys.stats(),
    queryFn: fetchStats,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to invalidate dashboard queries
 * Useful for manual refresh or after mutations
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return {
    invalidateProtocol: (protocolId: string) =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.protocol(protocolId),
      }),
    invalidateVulnerabilities: (protocolId: string) =>
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.vulnerabilities(protocolId),
      }),
    invalidateAgents: () =>
      queryClient.invalidateQueries({ queryKey: dashboardKeys.agents() }),
    invalidateStats: () =>
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() }),
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  };
}
