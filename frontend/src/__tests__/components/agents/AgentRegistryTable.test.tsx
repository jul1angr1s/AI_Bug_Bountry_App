import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AgentRegistryTable } from '../../../components/agents/AgentRegistryTable';
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
    onChainTxHash: '0xabc123def456',
    reputation: {
      id: 'r1',
      agentIdentityId: '1',
      confirmedCount: 5,
      rejectedCount: 1,
      inconclusiveCount: 0,
      totalSubmissions: 6,
      reputationScore: 83,
      lastUpdated: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    walletAddress: '0x8160ab516366ffaab6c239524d35963058feb850',
    agentType: 'VALIDATOR' as const,
    isActive: false,
    registeredAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    agentNftId: null,
    onChainTxHash: null,
    reputation: null,
  },
];

describe('AgentRegistryTable', () => {
  it('renders table headers (Wallet, Type, NFT ID, Score, Status, TX)', () => {
    render(<AgentRegistryTable agents={mockAgents} isLoading={false} />);

    expect(screen.getByText('Wallet')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('NFT ID')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('TX')).toBeInTheDocument();
  });

  it('renders agent rows with truncated wallet addresses', () => {
    render(<AgentRegistryTable agents={mockAgents} isLoading={false} />);

    // 0x59932bDf3056D88DC07cb320263419B8ec1e942d => 0x5993...942d
    expect(screen.getByText('0x5993...942d')).toBeInTheDocument();
    // 0x8160ab516366ffaab6c239524d35963058feb850 => 0x8160...b850
    expect(screen.getByText('0x8160...b850')).toBeInTheDocument();
  });

  it('renders agent type badges (RESEARCHER, VALIDATOR)', () => {
    render(<AgentRegistryTable agents={mockAgents} isLoading={false} />);

    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
  });

  it('renders basescan links for registration tx hashes', () => {
    render(<AgentRegistryTable agents={mockAgents} isLoading={false} />);

    const link = screen.getByTitle('View on BaseScan');
    expect(link).toHaveAttribute(
      'href',
      'https://sepolia.basescan.org/tx/0xabc123def456'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows empty state when no agents', () => {
    render(<AgentRegistryTable agents={[]} isLoading={false} />);

    expect(screen.getByText('No agents registered yet')).toBeInTheDocument();
    expect(screen.getByText('Register an agent to get started')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(<AgentRegistryTable agents={[]} isLoading={true} />);

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
