import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import X402PaymentCard from '../../../components/agents/X402PaymentCard';
import type { X402PaymentEvent } from '../../../types/dashboard';

const mockPaymentWithTx: X402PaymentEvent = {
  id: 'p1',
  requestType: 'PROTOCOL_REGISTRATION' as const,
  requesterAddress: '0x1234567890abcdef1234567890abcdef12345678',
  amount: '1000000',
  status: 'COMPLETED' as const,
  txHash: '0xabc123def456789012345678901234567890abcd',
  expiresAt: '2026-02-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T00:01:00Z',
};

const mockPaymentNoTx: X402PaymentEvent = {
  id: 'p2',
  requestType: 'FINDING_SUBMISSION' as const,
  requesterAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  amount: '500000',
  status: 'PENDING' as const,
  txHash: null,
  expiresAt: '2026-02-01T00:00:00Z',
  createdAt: '2026-01-02T00:00:00Z',
  completedAt: null,
};

describe('X402PaymentCard', () => {
  it('renders amount in USDC format', () => {
    render(<X402PaymentCard payment={mockPaymentWithTx} />);

    // 1000000 / 1e6 = 1.00 USDC
    expect(screen.getByText('1.00 USDC')).toBeInTheDocument();
  });

  it('renders request type label', () => {
    render(<X402PaymentCard payment={mockPaymentWithTx} />);

    expect(screen.getByText('Protocol Registration')).toBeInTheDocument();
  });

  it('renders basescan link when txHash present', () => {
    render(<X402PaymentCard payment={mockPaymentWithTx} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      `https://sepolia.basescan.org/tx/${mockPaymentWithTx.txHash}`
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('handles null txHash gracefully', () => {
    render(<X402PaymentCard payment={mockPaymentNoTx} />);

    // When txHash is null, the component renders "-" instead of a link
    const txHashRow = screen.getByText('TX Hash').closest('div');
    expect(txHashRow).toBeInTheDocument();
    // No link should be rendered
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
