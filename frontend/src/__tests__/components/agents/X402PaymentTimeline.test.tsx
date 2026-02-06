import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import X402PaymentTimeline from '../../../components/agents/X402PaymentTimeline';
import type { X402PaymentEvent } from '../../../types/dashboard';

const mockPayments: X402PaymentEvent[] = [
  {
    id: 'p1',
    requestType: 'PROTOCOL_REGISTRATION' as const,
    requesterAddress: '0x1234567890abcdef1234567890abcdef12345678',
    amount: '1000000',
    status: 'COMPLETED' as const,
    txHash: '0xabc',
    expiresAt: '2026-02-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: '2026-01-01T00:01:00Z',
  },
  {
    id: 'p2',
    requestType: 'FINDING_SUBMISSION' as const,
    requesterAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    amount: '500000',
    status: 'PENDING' as const,
    txHash: null,
    expiresAt: '2026-02-01T00:00:00Z',
    createdAt: '2026-01-02T00:00:00Z',
    completedAt: null,
  },
];

describe('X402PaymentTimeline', () => {
  it('renders table headers', () => {
    render(<X402PaymentTimeline payments={mockPayments} isLoading={false} />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Requester')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('TX')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<X402PaymentTimeline payments={mockPayments} isLoading={false} />);

    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows empty state when no events', () => {
    render(<X402PaymentTimeline payments={[]} isLoading={false} />);

    expect(screen.getByText('No x.402 payment events found.')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <X402PaymentTimeline payments={[]} isLoading={true} />
    );

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
