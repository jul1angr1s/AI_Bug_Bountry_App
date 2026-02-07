import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EscrowDepositFlow } from '../../../components/agents/EscrowDepositFlow';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  depositEscrow: vi.fn().mockResolvedValue(undefined),
}));

describe('EscrowDepositFlow', () => {
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders amount input field', () => {
    render(
      <EscrowDepositFlow agentId="agent-1" onSuccess={mockOnSuccess} onClose={mockOnClose} />
    );

    expect(screen.getByLabelText('Amount (USDC)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('renders Deposit button', () => {
    render(
      <EscrowDepositFlow agentId="agent-1" onSuccess={mockOnSuccess} onClose={mockOnClose} />
    );

    expect(screen.getByText('Deposit')).toBeInTheDocument();
  });

  it('validates amount is positive number', async () => {
    render(
      <EscrowDepositFlow agentId="agent-1" onSuccess={mockOnSuccess} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText('0.00');
    fireEvent.change(input, { target: { value: '-5' } });

    // Submit the form directly to trigger validation
    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid positive amount (max 6 decimal places).')
      ).toBeInTheDocument();
    });
  });
});
