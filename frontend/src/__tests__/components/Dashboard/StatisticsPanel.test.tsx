import { render, screen } from '@testing-library/react';
import StatisticsPanel from '../../../components/Dashboard/StatisticsPanel';
import type { DashboardStats } from '../../../types/dashboard';

describe('StatisticsPanel', () => {
  const mockStats: DashboardStats = {
    bountyPool: '$50,000',
    bountyPoolProgress: 75,
    vulnerabilitiesFound: 12,
    totalPaid: '$25,000',
    lastPaymentDate: '2 hours ago',
  };

  it('renders bounty pool stat card', () => {
    render(<StatisticsPanel stats={mockStats} />);
    expect(screen.getByText('Bounty Pool')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('renders vulnerabilities found stat card', () => {
    render(<StatisticsPanel stats={mockStats} />);
    expect(screen.getByText('Vulnerabilities Found')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders total paid stat card', () => {
    render(<StatisticsPanel stats={mockStats} />);
    expect(screen.getByText('Total Paid')).toBeInTheDocument();
    expect(screen.getByText('$25,000')).toBeInTheDocument();
  });

  it('displays last payment timestamp when provided', () => {
    render(<StatisticsPanel stats={mockStats} />);
    expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
  });

  it('renders three stat cards in a grid', () => {
    const { container } = render(<StatisticsPanel stats={mockStats} />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });
});
