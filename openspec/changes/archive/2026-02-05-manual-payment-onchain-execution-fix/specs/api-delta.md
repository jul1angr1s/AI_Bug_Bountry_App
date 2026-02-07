# Delta Spec: Payment Service — Manual Payment On-Chain Execution

## Changed: `proposeManualPayment()` in `payment.service.ts`

### Before

```typescript
// Created vulnerability with invalid status
const vulnerability = await tx.vulnerability.create({
  data: {
    status: 'VALIDATED', // ❌ Not a valid VulnerabilityStatus
    // ...
  },
});

// Created payment record but did NOT queue for execution
return { vulnerability, payment };
// Function returned here — payment stayed PENDING forever
```

**Behavior**: 500 Internal Server Error (Prisma validation failure). If the enum issue were bypassed, payment would remain `PENDING` with no on-chain transaction.

### After

```typescript
// Fixed: Use valid enum value
const vulnerability = await tx.vulnerability.create({
  data: {
    status: 'ACKNOWLEDGED', // ✅ Valid VulnerabilityStatus
    // ...
  },
});

// NEW: Queue payment for on-chain execution after DB transaction
const { addPaymentJob } = await import('../queues/payment.queue.js');
const { ethers } = await import('ethers');
const validationId = ethers.id(`manual-${result.payment.id}`);

await addPaymentJob({
  paymentId: result.payment.id,
  validationId,
  protocolId: data.protocolId,
});
```

**Behavior**: Payment proposal succeeds, payment is queued, payment worker executes on-chain USDC transfer via BountyPool, transaction hash is recorded, UI shows blockchain explorer link.

## Unchanged

- `POST /api/v1/payments/propose` route handler — no changes needed
- `payment.worker.ts` — processes queued jobs as before
- `payment.queue.ts` — `addPaymentJob()` interface unchanged
- Frontend `ProposePaymentModal.tsx` — no changes needed
- BountyPool contract — no changes needed

## Validation

| Test Case | Expected Result |
|-----------|----------------|
| Submit manual payment proposal | 201 Created with payment ID |
| Payment worker processes job | On-chain USDC transfer via BountyPool |
| Payment record after processing | `status: COMPLETED`, `txHash: 0x...` |
| Payments dashboard TX column | Shows blockchain explorer link |
| Insufficient pool balance | Payment worker handles gracefully (FAILED status or DEMO mode) |
