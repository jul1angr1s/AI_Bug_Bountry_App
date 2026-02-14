# Proposal: Fix Manual Payment On-Chain Execution

## Problem Statement

The "Propose Manual Payment" feature on the Payments page (`/payments`) was broken in two ways:

1. **500 Internal Server Error**: Creating a manual payment proposal failed with a Prisma validation error because `status: 'VALIDATED'` was used for the vulnerability record, but `VALIDATED` is not a valid member of the `VulnerabilityStatus` enum (valid values: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`).

2. **No On-Chain Execution**: Even after fixing the enum error, manual payment proposals only created database records (Vulnerability + Payment with `PENDING` status) without queuing the payment for on-chain USDC execution. The existing automated payment flow (triggered by the Validator Agent via `validation.service.ts`) correctly calls `addPaymentJob()` to queue payments for the payment worker, but the manual proposal path skipped this step entirely.

As a result, manual payments showed a "-" in the TX column (no blockchain transaction link) while automated payments correctly showed Base Sepolia transaction hashes.

## Affected Components

- `backend/src/services/payment.service.ts` — `proposeManualPayment()` function

## Solution

1. **Fix Prisma enum mismatch**: Change `status: 'VALIDATED'` to `status: 'ACKNOWLEDGED'` for manually submitted vulnerabilities. `ACKNOWLEDGED` is semantically correct — the vulnerability has been reviewed and acknowledged by the proposer.

2. **Queue payment for on-chain execution**: After creating the database records, call `addPaymentJob()` from `payment.queue.ts` to enqueue the payment for the payment worker. The payment worker then executes the on-chain USDC transfer via the BountyPool contract, updates the payment record with the transaction hash, and marks it as `COMPLETED`.

## Impact

- **User-facing**: Manual payment proposals now execute on-chain and display transaction links in the Payments dashboard
- **No breaking changes**: The fix aligns the manual flow with the existing automated flow
- **Risk**: Low — uses the same proven payment worker pipeline as automated payments

## References

- PR: https://github.com/jul1angr1s/AI_Bug_Bountry_App/pull/85
- Prisma schema: `backend/prisma/schema.prisma` (lines 25-30, VulnerabilityStatus enum)
- Payment worker: `backend/src/workers/payment.worker.ts`
- Payment queue: `backend/src/queues/payment.queue.ts`
