import { render, screen } from '@testing-library/react';
import { RecentPaymentsTable } from '../../../components/payments/RecentPaymentsTable';

describe('RecentPaymentsTable', () => {
  const mockPayments = [
    {
      id: '1',
      researcherAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      amount: 5.0,
      currency: 'USDC',
      status: 'COMPLETED',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      paidAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:00:00Z',
      vulnerability: {
        severity: 'HIGH',
      },
    },
    {
      id: '2',
      researcherAddress: '0x3A2B1C4D5E6F7890abcdef1234567890abcdefB14',
      amount: 3.0,
      currency: 'USDC',
      status: 'COMPLETED',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      paidAt: '2024-01-14T15:20:00Z',
      createdAt: '2024-01-14T15:00:00Z',
      vulnerability: {
        severity: 'MEDIUM',
      },
    },
  ];

  it('renders table headers correctly', () => {
    render(<RecentPaymentsTable payments={mockPayments} isLoading={false} />);
    
    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Amount (USDC)')).toBeInTheDocument();
    expect(screen.getByText('TX')).toBeInTheDocument();
  });

  it('renders payment rows with correct data', () => {
    render(<RecentPaymentsTable payments={mockPayments} isLoading={false} />);
    
    expect(screen.getByText('0x71C7...76F')).toBeInTheDocument();
    expect(screen.getByText('0x3A2B...B14')).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('3.00')).toBeInTheDocument();
  });

  it('renders severity badges with correct colors', () => {
    const { container } = render(<RecentPaymentsTable payments={mockPayments} isLoading={false} />);
    
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    
    const highBadge = screen.getByText('HIGH').closest('span');
    const mediumBadge = screen.getByText('MEDIUM').closest('span');
    
    expect(highBadge?.className).toContain('text-orange-500');
    expect(mediumBadge?.className).toContain('text-yellow-500');
  });

  it('renders transaction links correctly', () => {
    const { container } = render(<RecentPaymentsTable payments={mockPayments} isLoading={false} />);
    
    const links = container.querySelectorAll('a[href*="basescan.org"]');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toContain('0x1234567890abcdef');
    expect(links[0].getAttribute('target')).toBe('_blank');
  });

  it('shows empty state when no payments', () => {
    render(<RecentPaymentsTable payments={[]} isLoading={false} />);
    expect(screen.getByText('No payments found')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<RecentPaymentsTable payments={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays researcher avatars with gradient backgrounds', () => {
    const { container } = render(<RecentPaymentsTable payments={mockPayments} isLoading={false} />);
    const avatars = container.querySelectorAll('[class*="bg-gradient-to-tr"]');
    expect(avatars.length).toBe(2);
  });

  it('formats time ago correctly', () => {
    const recentPayment = [{
      ...mockPayments[0],
      paidAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    }];
    
    render(<RecentPaymentsTable payments={recentPayment} isLoading={false} />);
    expect(screen.getByText(/hrs ago/i)).toBeInTheDocument();
  });

  it('shows "-" for payments without transaction hash', () => {
    const paymentWithoutTx = [{
      ...mockPayments[0],
      txHash: null,
    }];
    
    render(<RecentPaymentsTable payments={paymentWithoutTx} isLoading={false} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('limits display to 10 payments', () => {
    const manyPayments = Array.from({ length: 15 }, (_, i) => ({
      ...mockPayments[0],
      id: `${i}`,
    }));
    
    const { container } = render(<RecentPaymentsTable payments={manyPayments} isLoading={false} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(10);
  });
});
