import { render, screen } from '@testing-library/react';
import AgentStatusGrid from '../../../components/Dashboard/AgentStatusGrid';
import type { Agent } from '../../../types/dashboard';

describe('AgentStatusGrid', () => {
  const mockAgents: Agent[] = [
    {
      id: '1',
      type: 'Protocol',
      status: 'ONLINE',
      lastActive: '2 minutes ago',
      scansCompleted: 150,
    },
    {
      id: '2',
      type: 'Researcher',
      status: 'SCANNING',
      lastActive: 'Just now',
      scansCompleted: 89,
    },
    {
      id: '3',
      type: 'Validator',
      status: 'OFFLINE',
      lastActive: '1 hour ago',
      scansCompleted: 234,
    },
  ];

  it('renders all agents', () => {
    render(<AgentStatusGrid agents={mockAgents} />);
    expect(screen.getByText('Protocol')).toBeInTheDocument();
    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
  });

  it('displays agent status badges', () => {
    render(<AgentStatusGrid agents={mockAgents} />);
    expect(screen.getByText('ONLINE')).toBeInTheDocument();
    expect(screen.getByText('SCANNING')).toBeInTheDocument();
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('shows last active time', () => {
    render(<AgentStatusGrid agents={mockAgents} />);
    expect(screen.getByText(/2 minutes ago/i)).toBeInTheDocument();
    expect(screen.getByText(/Just now/i)).toBeInTheDocument();
  });

  it('displays scans completed when provided', () => {
    render(<AgentStatusGrid agents={mockAgents} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/89/)).toBeInTheDocument();
  });

  it('renders in a grid layout', () => {
    const { container } = render(<AgentStatusGrid agents={mockAgents} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('handles empty agents array', () => {
    const { container } = render(<AgentStatusGrid agents={[]} />);
    expect(container).toBeInTheDocument();
  });
});
