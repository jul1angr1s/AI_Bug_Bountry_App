# EIP-7702 Smart Account Batching - Specifications

## Scenario 1: Batched payment with EIP-7702 wallet

GIVEN user wallet has EIP-7702 delegation active on Base Sepolia
AND useCapabilities returns atomicBatch.supported=true for chain 84532
AND user has insufficient USDC allowance for recipient

WHEN user clicks "Approve & Pay (1 click)" button

THEN sendBatch is called with [approve, transfer] calls array
AND single MetaMask popup appears for batch approval

WHEN user confirms the batch transaction

THEN both approve and transfer execute atomically on-chain
AND batchStatus transitions to 'success'
AND onRetry is called with the batch transaction hash
AND modal shows "Payment Complete" with BaseScan link

## Scenario 2: Fallback to sequential flow

GIVEN user wallet does NOT have EIP-7702 delegation
AND useCapabilities returns atomicBatch.supported=false or throws error

WHEN user clicks "Approve & Pay" button

THEN handleApprove is called (existing sequential flow)
AND first MetaMask popup appears for USDC approve

WHEN approval confirms on-chain

THEN handleTransfer fires after approval confirmation
AND second MetaMask popup appears for USDC transfer

WHEN transfer confirms on-chain

THEN onRetry is called with transfer transaction hash

## Scenario 3: Direct payment with existing allowance

GIVEN user has sufficient USDC allowance for recipient
AND wallet is any type (7702 or not)

WHEN user clicks "Pay Now" button

THEN handleTransfer is called directly (no approve needed)
AND single MetaMask popup for transfer only

## Scenario 4: Batch failure with graceful recovery

GIVEN user wallet has EIP-7702 delegation active

WHEN user initiates batched payment
AND MetaMask batch transaction fails or is rejected

THEN batchStatus transitions to 'failure'
AND error message displayed in modal
AND user can click button again to retry
