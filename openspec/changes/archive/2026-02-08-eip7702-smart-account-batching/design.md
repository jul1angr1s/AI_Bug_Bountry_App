# Design: EIP-7702 Smart Account Transaction Batching

## Architecture Overview

A new `useSmartAccountBatching` hook encapsulates all ERC-5792 logic, keeping the existing payment flow untouched for wallets that do not support batching. The hook is consumed by `PaymentRequiredModal`, which branches between the batched 1-click flow and the existing sequential 2-step flow based on capability detection.

```
PaymentRequiredModal
  |
  +-- useSmartAccountBatching (new)
  |     |-- useCapabilities (wagmi)     -- detect atomicBatch support
  |     |-- useSendCalls (wagmi)        -- submit atomic batch
  |     |-- useCallsStatus (wagmi)      -- poll for batch completion
  |
  +-- existing approve/transfer logic   -- fallback path (unchanged)
```

## Hook: useSmartAccountBatching

### Location

`frontend/src/hooks/useSmartAccountBatching.ts`

### Parameters

```typescript
interface UseSmartAccountBatchingParams {
  recipientAddress: `0x${string}`;   // x.402 payment recipient
  amountInWei: bigint;               // USDC amount (6 decimals)
  usdcAddress: `0x${string}`;       // USDC contract address
  chainId: number;                   // Target chain (84532 for Base Sepolia)
  enabled?: boolean;                 // Opt-in flag (default: true)
}
```

### Return Value

```typescript
interface UseSmartAccountBatchingReturn {
  supportsBatching: boolean;         // true if wallet supports atomicBatch
  sendBatch: () => void;             // fire-and-forget batch submission
  sendBatchAsync: () => Promise<string>; // async batch submission returning call ID
  isSending: boolean;                // true while batch is being submitted
  batchError: Error | null;          // error from batch submission or polling
  batchStatus: string | undefined;   // 'PENDING' | 'CONFIRMED' | undefined
  batchTxHash: string | undefined;   // transaction hash from final receipt
  isWaitingForBatch: boolean;        // true while polling for batch completion
  resetBatch: () => void;            // reset all batch state for retry
}
```

## Capability Detection

The hook uses wagmi's `useCapabilities` to determine if the connected wallet supports atomic batching on the target chain.

```typescript
const { data: capabilities } = useCapabilities({
  query: {
    retry: false,       // Do not retry -- non-ERC-5792 wallets will throw
    gcTime: Infinity,   // Cache the result forever (capability won't change mid-session)
  },
});

const supportsBatching = useMemo(() => {
  if (!capabilities || !chainId) return false;
  const chainCaps = capabilities[chainId];
  return chainCaps?.atomicBatch?.supported === true;
}, [capabilities, chainId]);
```

### Why `retry: false`?

Non-ERC-5792 wallets (e.g., wallets without EIP-7702 delegation) respond to `wallet_getCapabilities` with an RPC error. Without `retry: false`, wagmi's default retry logic would fire the failing RPC call 3 times with exponential backoff, generating noisy console errors. Setting `retry: false` ensures a single clean failure that is silently caught.

### Why `gcTime: Infinity`?

Wallet capabilities do not change during a session. Once detected, the result is cached indefinitely to avoid redundant RPC calls.

## Batch Transaction Flow

When `supportsBatching` is `true`, the modal calls `sendBatch()` or `sendBatchAsync()` to submit the atomic batch:

```typescript
const { sendCalls, sendCallsAsync, data: callsId } = useSendCalls();

// The batch contains two calls: approve + transfer
const calls = [
  {
    to: usdcAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [recipientAddress, amountInWei],
    }),
  },
  {
    to: usdcAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [recipientAddress, amountInWei],
    }),
  },
];

sendCalls({ calls });
```

### Batch Status Polling

After the batch is submitted, `useCallsStatus` polls for completion:

```typescript
const { data: callsStatus } = useCallsStatus({
  id: callsId,
  query: {
    enabled: !!callsId,
    refetchInterval: (data) => {
      // Stop polling once we reach a terminal state
      if (data?.state?.data?.status === 'CONFIRMED') return false;
      return 1000; // Poll every 1 second
    },
  },
});
```

The transaction hash is extracted from the last receipt in the `callsStatus.receipts` array.

## Integration with PaymentRequiredModal

The modal detects batching support and branches accordingly:

```typescript
// Inside PaymentRequiredModal
const {
  supportsBatching,
  sendBatchAsync,
  isSending,
  batchStatus,
  batchTxHash,
  batchError,
  resetBatch,
} = useSmartAccountBatching({
  recipientAddress: recipientAddr,
  amountInWei: amountWei,
  usdcAddress: USDC_ADDRESS,
  chainId: 84532,
  enabled: isOpen,
});

// Branch on batching support
const handleBatchedPayment = async () => {
  try {
    await sendBatchAsync();
    // Status polling happens automatically via useCallsStatus
  } catch (err) {
    // Error is captured in batchError
  }
};
```

### Button Rendering Logic

| Condition | Button Text | Handler |
|-----------|-------------|---------|
| Has sufficient allowance | "Pay Now" | `handleTransfer()` |
| Supports batching, needs approval | "Approve & Pay (1 click)" | `handleBatchedPayment()` |
| No batching, needs approval | "Approve & Pay" | `handleApprove()` |

## State Machine

### Batched Flow (5 states)

```
idle --> batching --> confirming --> complete
  |         |             |
  +----<----+------<------+--> error
```

1. **idle**: Waiting for user action
2. **batching**: `sendCalls` submitted, waiting for wallet confirmation
3. **confirming**: Batch accepted by wallet, polling `useCallsStatus`
4. **complete**: `callsStatus.status === 'CONFIRMED'`, transaction hash available
5. **error**: Any failure -- user rejection, RPC error, on-chain revert

### Sequential Flow (7 states, existing -- unchanged)

```
idle --> approving --> waiting-approval --> transferring --> waiting-transfer --> complete
  |         |               |                   |                 |
  +----<----+-------<-------+--------<----------+--------<--------+--> error
```

## Fallback Strategy

The fallback is fully transparent to the user:

1. `useSmartAccountBatching` hook is always called (React hooks cannot be conditional).
2. If `useCapabilities` throws or returns `atomicBatch.supported !== true`, `supportsBatching` is `false`.
3. The modal renders the existing 2-step UI with "Approve & Pay" button text.
4. The existing `handleApprove()` --> `handleTransfer()` flow executes without modification.
5. No error messages are shown for the lack of batching support.

This means users with standard EOAs (no EIP-7702 delegation) see exactly the same UX as before this change.

## UI Changes

### Smart Account Badge

When `supportsBatching` is `true`, a small badge is rendered near the wallet address:

```
Connected: 0x1234...5678  [Smart Account]
```

This provides visual feedback that the wallet has enhanced capabilities.

### Button Text

- Batching supported + needs approval: **"Approve & Pay (1 click)"**
- Batching not supported + needs approval: **"Approve & Pay"**
- Sufficient allowance (either wallet type): **"Pay Now"**

### Transaction Hash Display

After a successful batched payment, the modal shows the batch transaction hash with a link to BaseScan:

```
Payment Complete
Transaction: 0xabcd...ef01  [View on BaseScan]
```

The link format is `https://sepolia.basescan.org/tx/{batchTxHash}`.

## Testing Strategy

### Unit Tests (useSmartAccountBatching)

- Mock `useCapabilities` to return supported/unsupported/error states
- Mock `useSendCalls` to verify correct calls array construction
- Mock `useCallsStatus` to simulate polling and completion
- Verify `supportsBatching` flag under various capability responses
- Verify error handling for wallet rejection, RPC errors

### Integration Tests (PaymentRequiredModal)

- Verify button text changes based on `supportsBatching`
- Verify `handleBatchedPayment` is called when batching is supported
- Verify existing `handleApprove` flow when batching is not supported
- Verify transaction hash display after successful batch
- Verify error display and retry after failed batch

### Manual Testing

- Test with MetaMask DeleGator-enabled wallet on Base Sepolia
- Test with standard MetaMask wallet (non-delegated) for fallback
- Test with pre-existing USDC allowance (direct pay path)
