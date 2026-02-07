# Design: Fix Manual Payment On-Chain Execution

## Architecture Context

The payment system has two entry points that create payments:

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Creation Paths                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Automated (Validator Agent)          Manual (UI Proposal)    │
│  ┌──────────────────────┐            ┌──────────────────┐    │
│  │ validation.service.ts │            │ payment.service.ts│    │
│  │ processValidation()   │            │ proposeManual()   │    │
│  └──────────┬───────────┘            └────────┬─────────┘    │
│             │                                  │              │
│             ▼                                  ▼              │
│  ┌──────────────────────┐            ┌──────────────────┐    │
│  │ Create DB records     │            │ Create DB records │    │
│  │ (Vulnerability +      │            │ (Vulnerability +  │    │
│  │  Payment PENDING)     │            │  Payment PENDING) │    │
│  └──────────┬───────────┘            └────────┬─────────┘    │
│             │                                  │              │
│             ▼                                  ▼              │
│  ┌──────────────────────┐            ┌──────────────────┐    │
│  │ addPaymentJob() ✅    │            │ addPaymentJob() ❌│    │
│  │ (queues for worker)   │            │ (MISSING!)        │    │
│  └──────────┬───────────┘            └──────────────────┘    │
│             │                                                 │
│             ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │ payment.worker.ts     │                                    │
│  │ processPayment()      │                                    │
│  │ → BountyPool.payBounty│                                    │
│  │ → Update txHash       │                                    │
│  │ → Status: COMPLETED   │                                    │
│  └──────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

## Bug 1: Invalid VulnerabilityStatus Enum

### Root Cause

The `proposeManualPayment()` function used `status: 'VALIDATED'` when creating the vulnerability record. The Prisma `VulnerabilityStatus` enum does not include `VALIDATED`:

```prisma
enum VulnerabilityStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
  DISMISSED
}
```

### Fix

Replace `'VALIDATED'` with `'ACKNOWLEDGED'`. Manual submissions have been reviewed by the proposer, making `ACKNOWLEDGED` the correct semantic status.

```typescript
// Before (broken)
status: 'VALIDATED',

// After (fixed)
status: 'ACKNOWLEDGED',
```

## Bug 2: Missing Payment Queue Job

### Root Cause

After the database transaction, `proposeManualPayment()` returned immediately without queuing the payment for on-chain execution. Compare with the automated flow in `validation.service.ts:171-178`:

```typescript
// Automated flow (working) — validation.service.ts
const { addPaymentJob } = await import('../queues/payment.queue.js');
await addPaymentJob({
  paymentId: payment.id,
  validationId,
  protocolId: finding.scan.protocolId,
});
```

### Fix

Add the same `addPaymentJob()` call after the database transaction in `proposeManualPayment()`:

```typescript
// After DB transaction completes
const { addPaymentJob } = await import('../queues/payment.queue.js');
const { ethers } = await import('ethers');
const validationId = ethers.id(`manual-${result.payment.id}`);

await addPaymentJob({
  paymentId: result.payment.id,
  validationId,
  protocolId: data.protocolId,
});
```

The `validationId` is generated using `ethers.id()` (keccak256 hash) with a `manual-` prefix to distinguish it from validator-generated IDs. This ID is used for event tracking and logging in the payment worker but is not critical for the on-chain transaction itself.

## Payment Worker Flow (Existing, Unchanged)

Once queued, the payment worker (`payment.worker.ts`) handles:

1. Fetch payment record by `paymentId`
2. Check for duplicate (skip if already `COMPLETED`)
3. Verify researcher address
4. Determine payment mode (PRODUCTION vs DEMO)
5. Execute on-chain: `BountyPool.payBounty(protocolId, researcher, amount, validationId)`
6. Update payment record with `txHash` and `status: 'COMPLETED'`
7. Emit WebSocket events for UI updates

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/payment.service.ts` | Fix enum value + add `addPaymentJob()` call |
