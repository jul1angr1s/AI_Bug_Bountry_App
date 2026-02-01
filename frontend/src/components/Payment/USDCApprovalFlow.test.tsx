import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { USDCApprovalFlow } from './USDCApprovalFlow';
import * as api from '@/lib/api';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    data: null,
    error: null,
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
}));

// Mock API functions
vi.mock('@/lib/api', () => ({
  fetchUSDCAllowance: vi.fn(),
  generateUSDCApprovalTx: vi.fn(),
}));

describe('USDCApprovalFlow', () => {
  const defaultProps = {
    depositAmount: '1000',
    bountyPoolAddress: '0xBountyPoolAddress',
    onApprovalComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(api.fetchUSDCAllowance).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<USDCApprovalFlow {...defaultProps} />);
    expect(screen.getByText(/checking usdc allowance/i)).toBeInTheDocument();
  });

  it('should show approval button when allowance is insufficient', async () => {
    vi.mocked(api.fetchUSDCAllowance).mockResolvedValue({
      owner: '0x1234567890123456789012345678901234567890',
      spender: defaultProps.bountyPoolAddress,
      allowance: '0',
      allowanceFormatted: '0',
    });

    render(<USDCApprovalFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/usdc approval required/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /approve 1000 usdc/i })).toBeInTheDocument();
  });

  it('should show approved state when allowance is sufficient', async () => {
    vi.mocked(api.fetchUSDCAllowance).mockResolvedValue({
      owner: '0x1234567890123456789012345678901234567890',
      spender: defaultProps.bountyPoolAddress,
      allowance: '1000000000', // 1000 USDC (6 decimals)
      allowanceFormatted: '1000',
    });

    const onApprovalComplete = vi.fn();
    render(<USDCApprovalFlow {...defaultProps} onApprovalComplete={onApprovalComplete} />);

    await waitFor(() => {
      expect(screen.getByText(/approved: 1000 usdc/i)).toBeInTheDocument();
    });

    expect(onApprovalComplete).toHaveBeenCalled();
  });

  it('should show error state when API fails', async () => {
    vi.mocked(api.fetchUSDCAllowance).mockRejectedValue(
      new Error('Network error')
    );

    render(<USDCApprovalFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should display current allowance in insufficient state', async () => {
    vi.mocked(api.fetchUSDCAllowance).mockResolvedValue({
      owner: '0x1234567890123456789012345678901234567890',
      spender: defaultProps.bountyPoolAddress,
      allowance: '500000000', // 500 USDC (6 decimals)
      allowanceFormatted: '500',
    });

    render(<USDCApprovalFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/current allowance: 500 usdc/i)).toBeInTheDocument();
    });
  });

  it('should handle wallet not connected state', async () => {
    const { useAccount } = await import('wagmi');
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any);

    render(<USDCApprovalFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/wallet not connected/i)).toBeInTheDocument();
    });
  });
});
