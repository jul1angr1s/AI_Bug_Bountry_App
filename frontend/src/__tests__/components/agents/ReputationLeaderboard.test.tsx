import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReputationLeaderboard from '../../../components/agents/ReputationLeaderboard';
import type { AgentIdentity } from '../../../types/dashboard';

const mockAgents: AgentIdentity[] = [
  {
    id: '1',
    walletAddress: '0x59932bDf3056D88DC07cb320263419B8ec1e942d',
    agentType: 'RESEARCHER' as const,
    isActive: true,
    registeredAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    agentNftId: '1',
    onChainTxHash: '0xabc123',
    reputation: {
      id: 'r1',
      agentIdentityId: '1',
      confirmedCount: 8,
      rejectedCount: 2,
      inconclusiveCount: 0,
      totalSubmissions: 10,
      reputationScore: 90,
      lastUpdated: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    walletAddress: '0x8160ab516366ffaab6c239524d35963058feb850',
    agentType: 'VALIDATOR' as const,
    isActive: true,
    registeredAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    agentNftId: '2',
    onChainTxHash: '0xdef456',
    reputation: {
      id: 'r2',
      agentIdentityId: '2',
      confirmedCount: 5,
      rejectedCount: 3,
      inconclusiveCount: 1,
      totalSubmissions: 9,
      reputationScore: 70,
      lastUpdated: '2026-01-02T00:00:00Z',
    },
  },
];

describe('ReputationLeaderboard', () => {
  it('renders ranked list of agents', () => {
    render(<ReputationLeaderboard agents={mockAgents} isLoading={false} />);

    expect(screen.getByText('Reputation Leaderboard')).toBeInTheDocument();
  });

  it('renders position numbers (#1, #2)', () => {
    render(<ReputationLeaderboard agents={mockAgents} isLoading={false} />);

    // The rank numbers are rendered as plain text inside spans
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders wallet addresses truncated', () => {
    render(<ReputationLeaderboard agents={mockAgents} isLoading={false} />);

    // 0x59932bDf3056D88DC07cb320263419B8ec1e942d => 0x5993...942d
    expect(screen.getByText('0x5993...942d')).toBeInTheDocument();
    // 0x8160ab516366ffaab6c239524d35963058feb850 => 0x8160...b850
    expect(screen.getByText('0x8160...b850')).toBeInTheDocument();
  });

  it('renders reputation scores', () => {
    render(<ReputationLeaderboard agents={mockAgents} isLoading={false} />);

    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('shows empty state when no agents', () => {
    render(<ReputationLeaderboard agents={[]} isLoading={false} />);

    expect(screen.getByText('No agents with reputation data found.')).toBeInTheDocument();
  });
});
