import { useCallback } from 'react';
import {
  useAccount,
  useCapabilities,
  useSendCalls,
  useCallsStatus,
} from 'wagmi';

// Base Sepolia chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

export function useSmartAccountBatching() {
  const { isConnected } = useAccount();

  // Query wallet capabilities (ERC-5792)
  // retry: false prevents noisy retries for wallets that don't support wallet_getCapabilities
  const { data: capabilities, isError: capabilitiesError } = useCapabilities({
    query: { retry: false, gcTime: Infinity },
  });

  // Check if atomicBatch is supported on Base Sepolia
  const supportsBatching =
    isConnected &&
    !capabilitiesError &&
    !!capabilities?.[BASE_SEPOLIA_CHAIN_ID]?.atomicBatch?.supported;

  // sendCalls mutation
  const {
    sendCalls,
    sendCallsAsync,
    data: sendCallsId,
    isPending: isSending,
    error: batchError,
    reset: resetSendCalls,
  } = useSendCalls();

  // Poll for batch completion once we have a sendCalls ID
  const { data: callsStatus, isLoading: isPollingStatus } = useCallsStatus({
    id: sendCallsId ?? '',
    query: {
      enabled: !!sendCallsId,
      refetchInterval: (data) => {
        if (data.state.data?.status === 'success' || data.state.data?.status === 'failure') {
          return false; // stop polling
        }
        return 1000; // poll every second
      },
    },
  });

  // Extract batch status and tx hash from the last receipt
  const batchStatus = callsStatus?.status;
  const receipts = callsStatus?.receipts;
  const batchTxHash =
    batchStatus === 'success' && receipts?.length
      ? (receipts[receipts.length - 1].transactionHash as `0x${string}`)
      : undefined;

  const isWaitingForBatch = !!sendCallsId && isPollingStatus;

  // Wrapper to send a batch of calls
  const sendBatch = useCallback((calls: readonly unknown[]) => {
    sendCalls({ calls } as Parameters<typeof sendCalls>[0]);
  }, [sendCalls]);

  const sendBatchAsync = useCallback((calls: readonly unknown[]) => {
    return sendCallsAsync({ calls } as Parameters<typeof sendCallsAsync>[0]);
  }, [sendCallsAsync]);

  const resetBatch = useCallback(() => {
    resetSendCalls();
  }, [resetSendCalls]);

  return {
    supportsBatching,
    sendBatch,
    sendBatchAsync,
    isSending,
    batchError,
    batchStatus,
    batchTxHash,
    isWaitingForBatch,
    resetBatch,
  };
}
