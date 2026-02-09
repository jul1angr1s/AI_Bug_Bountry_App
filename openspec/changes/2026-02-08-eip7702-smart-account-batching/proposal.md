# Proposal: EIP-7702 Smart Account Transaction Batching

## Problem

The current x.402 payment flow in the AI Bug Bounty Platform requires two separate MetaMask popups to complete a single payment:

1. **Approve** -- The user must first approve the USDC spending allowance for the recipient address.
2. **Transfer** -- After approval confirms on-chain, a second popup triggers the actual USDC transfer.

This two-step process suffers from several issues:

- **Fragile timing**: A hardcoded `setTimeout(500)` hack separates the approve and transfer calls. If the approval has not confirmed by the time the transfer fires, the transfer reverts.
- **Orphaned approvals**: If the transfer fails (user rejects, gas estimation fails, network error), the approval remains on-chain. The user has granted a spending allowance with no corresponding transfer, creating a security concern.
- **Poor UX**: Two consecutive MetaMask popups are confusing. Users often reject the second popup thinking it is a duplicate, or close the browser tab between steps.
- **No atomicity**: The approve and transfer are independent transactions. There is no guarantee both succeed or both fail.

## Solution

Use **EIP-7702 transaction batching** via the **ERC-5792 (`wallet_sendCalls`)** standard to combine the approve and transfer into a single atomic batch transaction.

With EIP-7702, an Externally Owned Account (EOA) can temporarily delegate to a smart contract (e.g., MetaMask's DeleGator contract) that supports batched execution. The `wallet_sendCalls` RPC method sends multiple calls as a single atomic operation:

- **Single popup**: The user sees one MetaMask confirmation for both approve and transfer.
- **Atomic execution**: Both operations execute in a single transaction. If either reverts, the entire batch reverts -- no orphaned approvals.
- **No timing hacks**: No `setTimeout` needed. The batch is submitted as one unit.

The wagmi library (v3.4.1, already installed) ships with ERC-5792 hooks (`useSendCalls`, `useCapabilities`, `useCallsStatus`) that provide a clean React integration.

## Scope

This is a **frontend-only change**. No smart contracts or backend services are modified.

- **New**: `useSmartAccountBatching` React hook in `frontend/src/hooks/`
- **Modified**: `PaymentRequiredModal` component to detect batching support and branch to the 1-click flow
- **New**: Comprehensive test suite for the hook and modal integration

## Non-Goals

The following are explicitly out of scope for this change:

- **No smart contract changes**: The existing USDC and BountyPool contracts are unchanged.
- **No backend changes**: The x.402 payment verification and worker pipeline remain as-is.
- **No gas sponsorship**: ERC-5792 supports paymaster integration for gas abstraction, but this is deferred to future work.
- **No session keys**: EIP-7710 session keys for automated recurring payments are future work.
- **No multi-chain support**: This targets Base Sepolia (chain ID 84532) only for now.

## Prerequisites

- **Wallet with EIP-7702 delegation active**: The user's EOA must have delegated to a smart contract that supports `wallet_sendCalls` (e.g., MetaMask with the DeleGator contract enabled on Base Sepolia).
- **wagmi v3.4.1+**: Already installed in the project. This version ships the ERC-5792 hooks (`useSendCalls`, `useCapabilities`, `useCallsStatus`).
- **Connected to Base Sepolia**: The batching capability is checked for chain ID 84532 specifically.

## Risks

| Risk | Mitigation |
|------|------------|
| Wallet does not support EIP-7702 | Hook returns `supportsBatching=false`, modal falls back to existing 2-step flow. No user-visible error. |
| `useCapabilities` throws for non-ERC-5792 wallets | Configured with `retry: false` to avoid noisy retry loops. Error is caught and treated as "batching not supported". |
| MetaMask DeleGator UX changes | The hook is wallet-agnostic -- it uses the ERC-5792 standard, not MetaMask-specific APIs. Any wallet implementing `wallet_sendCalls` will work. |
| Batch transaction reverts | Both approve and transfer revert atomically. User sees an error message and can retry. No orphaned approvals. |
| `useCallsStatus` polling overhead | Polling interval is set conservatively. Polling stops when status reaches a terminal state (`success` or `failure`). |
