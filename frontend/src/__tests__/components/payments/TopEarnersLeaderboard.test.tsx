import { render, screen, fireEvent } from '@testing-library/react';
import { TopEarnersLeaderboard } from '../../../components/payments/TopEarnersLeaderboard';
import type { LeaderboardEntry } from '../../../hooks/usePaymentLeaderboard';

describe('TopEarnersLeaderboard', () => {
  const mockLeaderboard: LeaderboardEntry[] = [
    {
      researcherAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      totalEarnings: 25.0,
      paymentCount: 5,
      averagePaymentAmount: 5.0,
    },
    {
      researcherAddress: '0x3A2B1C4D5E6F7890abcdef1234567890abcdefB14',
      totalEarnings: 15.0,
      paymentCount: 5,
      averagePaymentAmount: 3.0,
    },
    {
      researcherAddress: '0x9B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8C42',
      totalEarnings: 9.0,
      paymentCount: 3,
      averagePaymentAmount: 3.0,
    },
  ];

  it('renders leaderboard title and subtitle', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    
    expect(screen.getByText('Top Earners')).toBeInTheDocument();
    expect(screen.getByText('Researchers by total earnings')).toBeInTheDocument();
  });

  it('renders all leaderboard entries', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    
    expect(screen.getByText('0x71C7...76F')).toBeInTheDocument();
    expect(screen.getByText('0x3A2B...B14')).toBeInTheDocument();
    expect(screen.getByText('0x9B1C...C42')).toBeInTheDocument();
  });

  it('displays correct earnings amounts', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$9.00')).toBeInTheDocument();
  });

  it('shows payment counts for each researcher', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    
    const fiveBounties = screen.getAllByText('5 Bounties');
    expect(fiveBounties.length).toBe(2); // Two researchers have 5 bounties
    expect(screen.getByText('3 Bounties')).toBeInTheDocument();
  });

  it('renders rank badges for top 3', () => {
    const { container } = render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    
    const goldBadge = container.querySelector('.bg-amber-500');
    const silverBadge = container.querySelector('.bg-slate-400');
    const bronzeBadge = container.querySelector('.bg-amber-700');
    
    expect(goldBadge).toBeInTheDocument();
    expect(silverBadge).toBeInTheDocument();
    expect(bronzeBadge).toBeInTheDocument();
  });

  it('shows "Elite Hunter" label for first place', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    expect(screen.getByText('Elite Hunter')).toBeInTheDocument();
  });

  it('shows "Researcher" label for non-first place', () => {
    render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    const researcherLabels = screen.getAllByText('Researcher');
    expect(researcherLabels.length).toBe(2);
  });

  it('shows empty state when no leaderboard data', () => {
    render(<TopEarnersLeaderboard leaderboard={[]} isLoading={false} />);
    expect(screen.getByText('No researchers yet')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<TopEarnersLeaderboard leaderboard={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('limits display to maxVisible entries', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      researcherAddress: `0x${i}234567890123456789012345678901234567890`,
      totalEarnings: 10 - i,
      paymentCount: 2,
      averagePaymentAmount: 5.0,
    }));
    
    const { container } = render(
      <TopEarnersLeaderboard leaderboard={manyEntries} isLoading={false} maxVisible={5} />
    );
    
    const entries = container.querySelectorAll('[class*="flex items-center justify-between"]');
    expect(entries.length).toBeLessThanOrEqual(5);
  });

  it('shows "View Full Leaderboard" button when more entries than maxVisible', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      researcherAddress: `0x${i}234567890123456789012345678901234567890`,
      totalEarnings: 10 - i,
      paymentCount: 2,
      averagePaymentAmount: 5.0,
    }));
    
    const mockCallback = vi.fn();
    render(
      <TopEarnersLeaderboard 
        leaderboard={manyEntries} 
        isLoading={false} 
        maxVisible={5}
        onViewAll={mockCallback}
      />
    );
    
    const button = screen.getByText('View Full Leaderboard');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(mockCallback).toHaveBeenCalled();
  });

  it('displays gradient avatars for each researcher', () => {
    const { container } = render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    const avatars = container.querySelectorAll('[class*="bg-gradient-to-tr"]');
    expect(avatars.length).toBe(3);
  });

  it('highlights first place entry with special styling', () => {
    const { container } = render(<TopEarnersLeaderboard leaderboard={mockLeaderboard} isLoading={false} />);
    const firstEntry = container.querySelector('.from-amber-500\\/10');
    expect(firstEntry).toBeInTheDocument();
  });
});
