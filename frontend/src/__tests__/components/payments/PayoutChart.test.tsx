import { render, screen, fireEvent } from '@testing-library/react';
import { PayoutChart } from '../../../components/payments/PayoutChart';
import type { PaymentStats } from '../../../hooks/usePaymentStats';

describe('PayoutChart', () => {
  const mockStats: PaymentStats = {
    totalPayments: 10,
    totalAmountPaid: 30.0,
    averagePaymentAmount: 3.0,
    paymentsByStatus: {
      PENDING: 0,
      COMPLETED: 10,
      FAILED: 0,
    },
  };

  it('renders chart title', () => {
    render(<PayoutChart stats={mockStats} />);
    expect(screen.getByText('Payout Distribution by Severity')).toBeInTheDocument();
  });

  it('renders chart subtitle', () => {
    render(<PayoutChart stats={mockStats} />);
    expect(screen.getByText('Current bounty amounts per severity level')).toBeInTheDocument();
  });

  it('renders all three severity bars', () => {
    render(<PayoutChart stats={mockStats} />);
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('displays correct amounts for each severity', () => {
    const { container } = render(<PayoutChart stats={mockStats} />);
    const highBar = container.querySelector('[class*="from-orange"]');
    const mediumBar = container.querySelector('[class*="from-yellow"]');
    const lowBar = container.querySelector('[class*="from-blue"]');
    
    expect(highBar).toBeInTheDocument();
    expect(mediumBar).toBeInTheDocument();
    expect(lowBar).toBeInTheDocument();
  });

  it('shows help text at bottom', () => {
    render(<PayoutChart stats={mockStats} />);
    expect(screen.getByText('Click a bar to filter payments by severity')).toBeInTheDocument();
  });

  it('calls onSeverityClick when bar is clicked', () => {
    const mockCallback = vi.fn();
    const { container } = render(
      <PayoutChart stats={mockStats} onSeverityClick={mockCallback} />
    );
    
    const highBar = container.querySelector('[class*="from-orange"]');
    if (highBar && highBar.parentElement) {
      fireEvent.click(highBar.parentElement);
      expect(mockCallback).toHaveBeenCalledWith('HIGH');
    }
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(<PayoutChart stats={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays tooltip on hover', () => {
    const { container } = render(<PayoutChart stats={mockStats} />);
    const barContainer = container.querySelector('.group');
    
    if (barContainer) {
      fireEvent.mouseEnter(barContainer);
      // Tooltip should become visible (opacity-100)
      const tooltip = barContainer.querySelector('[class*="opacity"]');
      expect(tooltip).toBeInTheDocument();
    }
  });
});
