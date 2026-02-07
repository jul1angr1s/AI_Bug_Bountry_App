import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EscrowBalanceCard } from '../../../components/agents/EscrowBalanceCard';
import type { EscrowBalance } from '../../../types/dashboard';

const mockBalance: EscrowBalance = {
  balance: '1500000',
  totalDeposited: '3000000',
  totalDeducted: '1500000',
  remainingSubmissions: 3,
  submissionFee: '500000',
};

describe('EscrowBalanceCard', () => {
  const mockOnDeposit = vi.fn();

  it('renders balance formatted as USDC', () => {
    render(
      <EscrowBalanceCard balance={mockBalance} isLoading={false} onDeposit={mockOnDeposit} />
    );

    // 1500000 / 1_000_000 = 1.50
    expect(screen.getByText('1.50')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
  });

  it('renders remaining submissions count', () => {
    render(
      <EscrowBalanceCard balance={mockBalance} isLoading={false} onDeposit={mockOnDeposit} />
    );

    expect(screen.getByText('3 submissions remaining')).toBeInTheDocument();
  });

  it('shows "0.00 USDC" for zero balance', () => {
    render(
      <EscrowBalanceCard balance={undefined} isLoading={false} onDeposit={mockOnDeposit} />
    );

    // The component renders "0.00" and "USDC" separately
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('renders deposit button', () => {
    render(
      <EscrowBalanceCard balance={mockBalance} isLoading={false} onDeposit={mockOnDeposit} />
    );

    expect(screen.getByText('Deposit')).toBeInTheDocument();
  });
});
