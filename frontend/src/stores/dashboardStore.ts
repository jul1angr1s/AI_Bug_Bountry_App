import { create } from 'zustand';
import type {
  Protocol,
  Agent,
  Vulnerability,
  DashboardStats,
  Alert,
} from '../types/dashboard';

/**
 * Optimistic update history for rollback
 */
interface OptimisticUpdate {
  id: string;
  type: string;
  previousState: unknown;
  timestamp: number;
}

/**
 * Dashboard state interface
 */
interface DashboardState {
  // Data
  selectedProtocol: Protocol | null;
  agents: Agent[];
  vulnerabilities: Vulnerability[];
  stats: DashboardStats;
  alerts: Alert[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Optimistic updates
  optimisticUpdates: Record<string, OptimisticUpdate>;

  // Actions
  setProtocol: (protocol: Protocol) => void;
  setAgents: (agents: Agent[]) => void;
  setVulnerabilities: (vulnerabilities: Vulnerability[]) => void;
  setStats: (stats: DashboardStats) => void;
  setAlerts: (alerts: Alert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Optimistic update actions
  updateAgentOptimistic: (agentId: string, updates: Partial<Agent>) => string;
  updateVulnerabilityOptimistic: (
    vulnId: string,
    updates: Partial<Vulnerability>
  ) => string;
  updateStatsOptimistic: (updates: Partial<DashboardStats>) => string;
  rollbackOptimisticUpdate: (updateId: string) => void;
  confirmOptimisticUpdate: (updateId: string) => void;

  // Real-time update actions
  handleProtocolUpdate: (protocol: Protocol) => void;
  handleVulnDiscovered: (vulnerability: Vulnerability) => void;
  handleVulnConfirmed: (vulnId: string, status: string, bounty?: string) => void;
  handleAgentStatusUpdate: (agent: Agent) => void;
  handlePaymentReleased: (vulnId: string, amount: string) => void;
  handleStatsUpdate: (stats: DashboardStats) => void;

  // Alert actions
  dismissAlert: (alertId: string) => void;
  addAlert: (alert: Alert) => void;

  // Reset
  reset: () => void;
}

const initialStats: DashboardStats = {
  bountyPool: '0',
  bountyPoolProgress: 0,
  vulnerabilitiesFound: 0,
  totalPaid: '0',
};

/**
 * Dashboard store with optimistic updates
 */
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  selectedProtocol: null,
  agents: [],
  vulnerabilities: [],
  stats: initialStats,
  alerts: [],
  isLoading: false,
  error: null,
  optimisticUpdates: {},

  // Basic setters
  setProtocol: (protocol) => set({ selectedProtocol: protocol }),
  setAgents: (agents) => set({ agents }),
  setVulnerabilities: (vulnerabilities) => set({ vulnerabilities }),
  setStats: (stats) => set({ stats }),
  setAlerts: (alerts) => set({ alerts }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Optimistic update: Agent
  updateAgentOptimistic: (agentId, updates) => {
    const updateId = `agent-${agentId}-${Date.now()}`;
    const currentAgent = get().agents.find((a) => a.id === agentId);

    if (!currentAgent) return updateId;

    const optimisticUpdates = {
      ...get().optimisticUpdates,
      [updateId]: {
        id: updateId,
        type: 'agent',
        previousState: { ...currentAgent },
        timestamp: Date.now(),
      },
    };

    const agents = get().agents.map((a) =>
      a.id === agentId ? { ...a, ...updates } : a
    );

    set({ agents, optimisticUpdates });
    return updateId;
  },

  // Optimistic update: Vulnerability
  updateVulnerabilityOptimistic: (vulnId, updates) => {
    const updateId = `vuln-${vulnId}-${Date.now()}`;
    const currentVuln = get().vulnerabilities.find((v) => v.id === vulnId);

    if (!currentVuln) return updateId;

    const optimisticUpdates = {
      ...get().optimisticUpdates,
      [updateId]: {
        id: updateId,
        type: 'vulnerability',
        previousState: { ...currentVuln },
        timestamp: Date.now(),
      },
    };

    const vulnerabilities = get().vulnerabilities.map((v) =>
      v.id === vulnId ? { ...v, ...updates } : v
    );

    set({ vulnerabilities, optimisticUpdates });
    return updateId;
  },

  // Optimistic update: Stats
  updateStatsOptimistic: (updates) => {
    const updateId = `stats-${Date.now()}`;
    const currentStats = get().stats;

    const optimisticUpdates = {
      ...get().optimisticUpdates,
      [updateId]: {
        id: updateId,
        type: 'stats',
        previousState: { ...currentStats },
        timestamp: Date.now(),
      },
    };

    const stats = { ...currentStats, ...updates };
    set({ stats, optimisticUpdates });
    return updateId;
  },

  // Rollback optimistic update
  rollbackOptimisticUpdate: (updateId) => {
    const update = get().optimisticUpdates[updateId];
    if (!update) return;

    const { [updateId]: _, ...optimisticUpdates } = get().optimisticUpdates;

    switch (update.type) {
      case 'agent': {
        const agent = update.previousState as Agent;
        const agents = get().agents.map((a) =>
          a.id === agent.id ? agent : a
        );
        set({ agents, optimisticUpdates });
        break;
      }
      case 'vulnerability': {
        const vuln = update.previousState as Vulnerability;
        const vulnerabilities = get().vulnerabilities.map((v) =>
          v.id === vuln.id ? vuln : v
        );
        set({ vulnerabilities, optimisticUpdates });
        break;
      }
      case 'stats': {
        const stats = update.previousState as DashboardStats;
        set({ stats, optimisticUpdates });
        break;
      }
    }
  },

  // Confirm optimistic update
  confirmOptimisticUpdate: (updateId) => {
    const { [updateId]: _, ...optimisticUpdates } = get().optimisticUpdates;
    set({ optimisticUpdates });
  },

  // Real-time event handlers
  handleProtocolUpdate: (protocol) => {
    const currentProtocol = get().selectedProtocol;
    if (currentProtocol?.id === protocol.id) {
      set({ selectedProtocol: protocol });
    }
  },

  handleVulnDiscovered: (vulnerability) => {
    const vulnerabilities = get().vulnerabilities;
    if (!vulnerabilities.find((v) => v.id === vulnerability.id)) {
      const updatedVulnerabilities = [vulnerability, ...vulnerabilities];
      const stats = {
        ...get().stats,
        vulnerabilitiesFound: updatedVulnerabilities.length,
      };
      set({ vulnerabilities: updatedVulnerabilities, stats });
    }
  },

  handleVulnConfirmed: (vulnId, status, bounty) => {
    const vulnerabilities = get().vulnerabilities.map((v) =>
      v.id === vulnId
        ? {
            ...v,
            status: status as 'CONFIRMED' | 'PENDING' | 'RESOLVED',
            bounty,
          }
        : v
    );
    set({ vulnerabilities });
  },

  handleAgentStatusUpdate: (agent) => {
    const agents = get().agents;
    const agentIndex = agents.findIndex((a) => a.id === agent.id);

    if (agentIndex !== -1) {
      const updatedAgents = [...agents];
      updatedAgents[agentIndex] = agent;
      set({ agents: updatedAgents });
    } else {
      set({ agents: [...agents, agent] });
    }
  },

  handlePaymentReleased: (vulnId, amount) => {
    const vulnerabilities = get().vulnerabilities.map((v) =>
      v.id === vulnId
        ? {
            ...v,
            status: 'RESOLVED' as const,
            bounty: amount,
          }
        : v
    );

    const currentTotal = parseFloat(get().stats.totalPaid || '0');
    const paymentAmount = parseFloat(amount);
    const stats = {
      ...get().stats,
      totalPaid: (currentTotal + paymentAmount).toString(),
    };

    set({ vulnerabilities, stats });
  },

  handleStatsUpdate: (stats) => {
    set({ stats });
  },

  // Alert actions
  dismissAlert: (alertId) => {
    const alerts = get().alerts.filter((a) => a.id !== alertId);
    set({ alerts });
  },

  addAlert: (alert) => {
    const alerts = [alert, ...get().alerts].slice(0, 5);
    set({ alerts });
  },

  // Reset
  reset: () =>
    set({
      selectedProtocol: null,
      agents: [],
      vulnerabilities: [],
      stats: initialStats,
      alerts: [],
      isLoading: false,
      error: null,
      optimisticUpdates: {},
    }),
}));
