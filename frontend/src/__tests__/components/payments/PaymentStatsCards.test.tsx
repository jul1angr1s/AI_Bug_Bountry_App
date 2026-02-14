import { render, screen } from '@testing-library/react';
import { PaymentStatsCards } from '../../../components/payments/PaymentStatsCards';
import type { PaymentStats } from '../../../hooks/usePaymentStats';

describe('PaymentStatsCards', () => {
  const mockStats: PaymentStats = {
    totalPayments: 15,
    totalAmountPaid: 45.0,
    averagePaymentAmount: 3.0,
    paymentsByStatus: {
      PENDING: 3,
      COMPLETED: 12,
      FAILED: 0,
    },
  };

  it('renders all four stat cards', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    
    expect(screen.getByText('Total Bounty Pool')).toBeInTheDocument();
    expect(screen.getByText('Total Paid (All Time)')).toBeInTheDocument();
    expect(screen.getByText('Pending Claims')).toBeInTheDocument();
    expect(screen.getByText('Budget Remaining')).toBeInTheDocument();
  });

  it('displays correct pool balance', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('displays correct total paid amount', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('$45.00')).toBeInTheDocument();
  });

  it('displays correct pending claims count', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Claims')).toBeInTheDocument();
  });

  it('calculates budget remaining percentage correctly', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    // (50 - 45) / 50 * 100 = 10%
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('shows "All clear" when no pending claims', () => {
    const statsNoPending: PaymentStats = {
      ...mockStats,
      paymentsByStatus: {
        PENDING: 0,
        COMPLETED: 15,
        FAILED: 0,
      },
    };
    render(<PaymentStatsCards stats={statsNoPending} poolBalance={50} />);
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('shows "Requires review" when pending claims exist', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('Requires review')).toBeInTheDocument();
  });

  it('displays loading skeletons when isLoading is true', () => {
    const { container } = render(<PaymentStatsCards stats={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows total payment count in trend indicator', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('15 payments')).toBeInTheDocument();
  });

  it('displays remaining USDC amount', () => {
    render(<PaymentStatsCards stats={mockStats} poolBalance={50} />);
    expect(screen.getByText('$5.00 USDC left')).toBeInTheDocument();
  });
});
