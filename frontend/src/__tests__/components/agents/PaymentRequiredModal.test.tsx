import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PaymentRequiredModal from '../../../components/agents/PaymentRequiredModal';

describe('PaymentRequiredModal', () => {
  const mockOnClose = vi.fn();
  const mockOnRetry = vi.fn();

  const mockPaymentTerms = {
    amount: '2000000',
    asset: 'USDC',
    chain: 'base-sepolia',
    recipient: '0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab',
    memo: 'Protocol registration fee',
    expiresAt: '2026-02-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnRetry.mockResolvedValue(undefined);
  });

  it('does not render when isOpen=false', () => {
    const { container } = render(
      <PaymentRequiredModal
        isOpen={false}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        paymentTerms={mockPaymentTerms}
      />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders modal with "Payment Required" title when isOpen=true', () => {
    render(
      <PaymentRequiredModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        paymentTerms={mockPaymentTerms}
      />
    );

    expect(screen.getByText('Payment Required')).toBeInTheDocument();
    expect(screen.getByText('HTTP 402 — x.402 payment gated endpoint')).toBeInTheDocument();
  });

  it('displays payment amount in USDC format', () => {
    render(
      <PaymentRequiredModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        paymentTerms={mockPaymentTerms}
      />
    );

    // 2000000 / 1_000_000 = 2.00
    expect(screen.getByText('2.00 USDC')).toBeInTheDocument();
  });

  it('renders "Approve & Pay" button', () => {
    render(
      <PaymentRequiredModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        paymentTerms={mockPaymentTerms}
      />
    );

    expect(screen.getByText('Approve & Pay')).toBeInTheDocument();
  });

  it('closes on Cancel', () => {
    render(
      <PaymentRequiredModal
        isOpen={true}
        onClose={mockOnClose}
        onRetry={mockOnRetry}
        paymentTerms={mockPaymentTerms}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
