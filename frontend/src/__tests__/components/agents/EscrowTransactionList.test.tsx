import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EscrowTransactionList } from '../../../components/agents/EscrowTransactionList';
import type { EscrowTransaction } from '../../../types/dashboard';

const mockTransactions: EscrowTransaction[] = [
  {
    id: 't1',
    agentEscrowId: 'e1',
    transactionType: 'DEPOSIT' as const,
    amount: '1000000',
    txHash: '0xdef456',
    findingId: null,
    protocolId: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 't2',
    agentEscrowId: 'e1',
    transactionType: 'SUBMISSION_FEE' as const,
    amount: '500000',
    txHash: null,
    findingId: 'f1',
    protocolId: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('EscrowTransactionList', () => {
  it('renders transaction table headers', () => {
    render(<EscrowTransactionList transactions={mockTransactions} isLoading={false} />);

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('TX')).toBeInTheDocument();
  });

  it('renders DEPOSIT rows', () => {
    render(<EscrowTransactionList transactions={mockTransactions} isLoading={false} />);

    expect(screen.getByText('Deposit')).toBeInTheDocument();
    // 1000000 / 1_000_000 = 1.00
    expect(screen.getByText('1.00 USDC')).toBeInTheDocument();
  });

  it('renders SUBMISSION_FEE rows', () => {
    render(<EscrowTransactionList transactions={mockTransactions} isLoading={false} />);

    expect(screen.getByText('Submission Fee')).toBeInTheDocument();
    // 500000 / 1_000_000 = 0.50
    expect(screen.getByText('0.50 USDC')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', () => {
    render(<EscrowTransactionList transactions={[]} isLoading={false} />);

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <EscrowTransactionList transactions={[]} isLoading={true} />
    );

    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
