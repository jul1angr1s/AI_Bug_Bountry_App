import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReputationScoreCard from '../../../components/agents/ReputationScoreCard';
import type { AgentReputation } from '../../../types/dashboard';

const mockReputation: AgentReputation = {
  id: 'r1',
  agentIdentityId: '1',
  confirmedCount: 8,
  rejectedCount: 2,
  inconclusiveCount: 0,
  totalSubmissions: 10,
  reputationScore: 80,
  lastUpdated: '2026-01-01T00:00:00Z',
};

describe('ReputationScoreCard', () => {
  it('renders reputation score', () => {
    render(<ReputationScoreCard reputation={mockReputation} isLoading={false} />);

    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('renders confirmed count and rejected count', () => {
    render(<ReputationScoreCard reputation={mockReputation} isLoading={false} />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows "No data" when reputation is null', () => {
    render(<ReputationScoreCard reputation={null} isLoading={false} />);

    expect(screen.getByText('No reputation data available.')).toBeInTheDocument();
  });
});
