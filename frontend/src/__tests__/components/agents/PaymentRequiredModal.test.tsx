import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PaymentRequiredModal from '../../../components/agents/PaymentRequiredModal';

// Mock the smart account batching hook
const mockSendBatch = vi.fn();
const mockResetBatch = vi.fn();
const mockUseSmartAccountBatching = vi.fn();

vi.mock('../../../hooks/useSmartAccountBatching', () => ({
  useSmartAccountBatching: (...args: unknown[]) => mockUseSmartAccountBatching(...args),
}));

// Mock wagmi hooks used directly by the modal
const mockApproveWrite = vi.fn();
const mockTransferWrite = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x43793B3d9F23FAC1df54d715Cb215b8A50e710c3',
    isConnected: true,
  }),
  useWriteContract: () => ({
    writeContract: mockApproveWrite,
    data: undefined,
    isPending: false,
    error: null,
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: false,
    isSuccess: false,
  }),
  useReadContract: () => ({
    data: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock('viem', () => ({
  formatUnits: (value: bigint, decimals: number) => {
    return (Number(value) / Math.pow(10, decimals)).toFixed(2);
  },
}));

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

    // Default: no batching support
    mockUseSmartAccountBatching.mockReturnValue({
      supportsBatching: false,
      sendBatch: mockSendBatch,
      sendBatchAsync: vi.fn(),
      isSending: false,
      batchError: null,
      batchStatus: undefined,
      batchTxHash: undefined,
      isWaitingForBatch: false,
      resetBatch: mockResetBatch,
    });
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

  it('renders "Approve & Pay" button when batching not supported', () => {
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

  describe('EIP-7702 Batching', () => {
    it('shows "Approve & Pay (1 click)" when supportsBatching=true', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: null,
        batchStatus: undefined,
        batchTxHash: undefined,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('Approve & Pay (1 click)')).toBeInTheDocument();
    });

    it('shows "Smart Account" badge when supportsBatching=true', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: null,
        batchStatus: undefined,
        batchTxHash: undefined,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('Smart Account')).toBeInTheDocument();
    });

    it('does not show "Smart Account" badge when supportsBatching=false', () => {
      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.queryByText('Smart Account')).not.toBeInTheDocument();
    });

    it('calls sendBatch with [approve, transfer] when batching supported and button clicked', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: null,
        batchStatus: undefined,
        batchTxHash: undefined,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      fireEvent.click(screen.getByText('Approve & Pay (1 click)'));

      expect(mockSendBatch).toHaveBeenCalledTimes(1);
      const calls = mockSendBatch.mock.calls[0][0];
      expect(calls).toHaveLength(2);
      expect(calls[0].functionName).toBe('approve');
      expect(calls[1].functionName).toBe('transfer');
    });

    it('shows batch tx hash with explorer link on completion', () => {
      const batchTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: null,
        batchStatus: 'success',
        batchTxHash,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('TX:')).toBeInTheDocument();
    });

    it('shows error when batch fails', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: new Error('User rejected the request'),
        batchStatus: undefined,
        batchTxHash: undefined,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('User rejected the request')).toBeInTheDocument();
    });

    it('shows "Batching..." button text when batch is sending', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: true,
        batchError: null,
        batchStatus: undefined,
        batchTxHash: undefined,
        isWaitingForBatch: false,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('Approve & Pay...')).toBeInTheDocument();
    });

    it('shows "Confirming Batch..." when waiting for batch result', () => {
      mockUseSmartAccountBatching.mockReturnValue({
        supportsBatching: true,
        sendBatch: mockSendBatch,
        sendBatchAsync: vi.fn(),
        isSending: false,
        batchError: null,
        batchStatus: 'pending',
        batchTxHash: undefined,
        isWaitingForBatch: true,
        resetBatch: mockResetBatch,
      });

      render(
        <PaymentRequiredModal
          isOpen={true}
          onClose={mockOnClose}
          onRetry={mockOnRetry}
          paymentTerms={mockPaymentTerms}
        />
      );

      expect(screen.getByText('Confirming Batch...')).toBeInTheDocument();
    });
  });
});
