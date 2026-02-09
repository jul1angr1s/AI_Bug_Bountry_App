import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock wagmi before importing the hook
const mockUseAccount = vi.fn();
const mockUseCapabilities = vi.fn();
const mockUseSendCalls = vi.fn();
const mockUseCallsStatus = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
  useCapabilities: (...args: unknown[]) => mockUseCapabilities(...args),
  useSendCalls: (...args: unknown[]) => mockUseSendCalls(...args),
  useCallsStatus: (...args: unknown[]) => mockUseCallsStatus(...args),
}));

import { useSmartAccountBatching } from '../useSmartAccountBatching';

// Base Sepolia chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

describe('useSmartAccountBatching', () => {
  const mockSendCalls = vi.fn();
  const mockSendCallsAsync = vi.fn();
  const mockResetSendCalls = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: wallet connected
    mockUseAccount.mockReturnValue({
      address: '0x43793B3d9F23FAC1df54d715Cb215b8A50e710c3',
      isConnected: true,
    });

    // Default: capabilities not supported
    mockUseCapabilities.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    });

    // Default: sendCalls idle
    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: undefined,
      isPending: false,
      error: null,
      reset: mockResetSendCalls,
    });

    // Default: no calls status
    mockUseCallsStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('returns supportsBatching=false when wallet is not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.supportsBatching).toBe(false);
  });

  it('returns supportsBatching=false when capabilities query fails', () => {
    mockUseCapabilities.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.supportsBatching).toBe(false);
  });

  it('returns supportsBatching=false when atomicBatch not in capabilities', () => {
    mockUseCapabilities.mockReturnValue({
      data: {
        [BASE_SEPOLIA_CHAIN_ID]: {
          // no atomicBatch key
        },
      },
      isError: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.supportsBatching).toBe(false);
  });

  it('returns supportsBatching=true when atomicBatch.supported is true', () => {
    mockUseCapabilities.mockReturnValue({
      data: {
        [BASE_SEPOLIA_CHAIN_ID]: {
          atomicBatch: { supported: true },
        },
      },
      isError: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.supportsBatching).toBe(true);
  });

  it('sendBatch dispatches sendCalls with correct call array', () => {
    mockUseCapabilities.mockReturnValue({
      data: {
        [BASE_SEPOLIA_CHAIN_ID]: {
          atomicBatch: { supported: true },
        },
      },
      isError: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    const calls = [
      {
        to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
        abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable' as const, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'approve' as const,
        args: ['0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab', BigInt(2000000)],
      },
      {
        to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
        abi: [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable' as const, inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'transfer' as const,
        args: ['0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab', BigInt(2000000)],
      },
    ];

    act(() => {
      result.current.sendBatch(calls);
    });

    expect(mockSendCalls).toHaveBeenCalledWith({
      calls,
    });
  });

  it('extracts batchTxHash from last receipt on success', async () => {
    const batchId = 'batch-123';
    const expectedTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    mockUseCapabilities.mockReturnValue({
      data: {
        [BASE_SEPOLIA_CHAIN_ID]: {
          atomicBatch: { supported: true },
        },
      },
      isError: false,
      isLoading: false,
    });

    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: batchId,
      isPending: false,
      error: null,
      reset: mockResetSendCalls,
    });

    mockUseCallsStatus.mockReturnValue({
      data: {
        status: 'success',
        receipts: [
          { transactionHash: '0x1111111111111111111111111111111111111111111111111111111111111111' },
          { transactionHash: expectedTxHash },
        ],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.batchStatus).toBe('success');
    expect(result.current.batchTxHash).toBe(expectedTxHash);
  });

  it('reports batchStatus=failure when batch fails', () => {
    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: 'batch-fail-123',
      isPending: false,
      error: null,
      reset: mockResetSendCalls,
    });

    mockUseCallsStatus.mockReturnValue({
      data: {
        status: 'failure',
        receipts: [],
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.batchStatus).toBe('failure');
    expect(result.current.batchTxHash).toBeUndefined();
  });

  it('resetBatch clears all batch state', () => {
    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: 'batch-reset-123',
      isPending: false,
      error: new Error('something failed'),
      reset: mockResetSendCalls,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    act(() => {
      result.current.resetBatch();
    });

    expect(mockResetSendCalls).toHaveBeenCalled();
  });

  it('handles useCapabilities throwing gracefully (non-ERC-5792 wallet)', () => {
    mockUseCapabilities.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.supportsBatching).toBe(false);
    expect(result.current.batchError).toBeNull();
  });

  it('reports isSending=true when sendCalls isPending', () => {
    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: undefined,
      isPending: true,
      error: null,
      reset: mockResetSendCalls,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.isSending).toBe(true);
  });

  it('reports isWaitingForBatch=true when callsStatus is loading', () => {
    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: 'batch-waiting-123',
      isPending: false,
      error: null,
      reset: mockResetSendCalls,
    });

    mockUseCallsStatus.mockReturnValue({
      data: { status: 'pending' },
      isLoading: true,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.isWaitingForBatch).toBe(true);
  });

  it('exposes batchError from sendCalls error', () => {
    const error = new Error('User rejected the request');

    mockUseSendCalls.mockReturnValue({
      sendCalls: mockSendCalls,
      sendCallsAsync: mockSendCallsAsync,
      data: undefined,
      isPending: false,
      error,
      reset: mockResetSendCalls,
    });

    const { result } = renderHook(() => useSmartAccountBatching());

    expect(result.current.batchError).toBe(error);
  });
});
