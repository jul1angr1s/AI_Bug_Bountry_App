# Frontend Architecture Optimization - Design Document

## 1. Code Splitting

### Current App.tsx Routing (static imports)

All page components are imported at the top of App.tsx and loaded eagerly.

### Target: React.lazy with Suspense

```typescript
// frontend/src/App.tsx
import React, { Suspense } from 'react';
import { LoadingSpinner } from './components/shared/LoadingSpinner';

const DashboardModern = React.lazy(() => import('./pages/DashboardModern'));
const Protocols = React.lazy(() => import('./pages/Protocols'));
const ProtocolRegistration = React.lazy(() => import('./pages/ProtocolRegistration'));
const ProtocolDetail = React.lazy(() => import('./pages/ProtocolDetail'));
const Scans = React.lazy(() => import('./pages/Scans'));
const ScanDetailRouter = React.lazy(() => import('./pages/ScanDetailRouter'));
const Validations = React.lazy(() => import('./pages/Validations'));
const Payments = React.lazy(() => import('./pages/Payments'));
const PaymentDashboard = React.lazy(() => import('./pages/PaymentDashboard'));

// Wrap routes in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<DashboardModern />} />
    {/* ... */}
  </Routes>
</Suspense>
```

### Loading Component

```typescript
// frontend/src/components/shared/LoadingSpinner.tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
}
```

Each page becomes a separate chunk, loaded on demand.

---

## 2. Component Decomposition

### PaymentHistory.tsx (674 lines) -> 4 components

**PaymentHistory.tsx (~150 lines) - Orchestrator:**
- TanStack Query data fetching
- WebSocket event handlers
- State coordination

**PaymentFilters.tsx (~120 lines):**
- Status filter dropdown
- Severity filter dropdown
- Date range inputs
- Filter reset button

**PaymentTable.tsx (~200 lines):**
- Table header with sort indicators
- Payment rows with status badges
- Loading skeleton
- Empty state

**PaymentPagination.tsx (~80 lines):**
- Page navigation
- Items per page selector
- Showing X of Y display

### ProtocolDetail.tsx (580 lines) -> 4 components

**ProtocolDetail.tsx (~150 lines) - Orchestrator:**
- Route params, data fetching, tab state

**ProtocolHeader.tsx (~100 lines):**
- Protocol name, status badge, owner address
- GitHub URL link, registration date

**ProtocolTabs.tsx (~150 lines):**
- Tab navigation (Overview, Scans, Findings, Payments)
- Tab content switching

**ProtocolScanSection.tsx (~150 lines):**
- FundingGate integration
- Terminal output for scan progress
- Scan trigger button

### FundingGate.tsx (527 lines) -> 3 components

**FundingGate.tsx (~150 lines) - Orchestrator:**
- Multi-step state machine (approve -> fund -> verify)
- Step transitions

**FundingForm.tsx (~120 lines):**
- Deposit amount input with validation
- USDC balance display
- Fund button

**FundingVerification.tsx (~100 lines):**
- On-chain balance check
- Verification status
- Scan request trigger

### BountyPoolStatus.tsx (435 lines) -> 3 components

**BountyPoolStatus.tsx (~120 lines) - Orchestrator:**
- TanStack Query, WebSocket updates

**PoolOverview.tsx (~150 lines):**
- Balance display, progress bar
- Deposit button (if protocol owner)

**PoolTransactions.tsx (~120 lines):**
- Recent transactions table
- Basescan links

### USDCApprovalFlow.tsx (418 lines) -> 3 components

**USDCApprovalFlow.tsx (~120 lines) - Orchestrator:**
- State machine (loading -> check -> approving -> approved)

**AllowanceCheck.tsx (~100 lines):**
- Current allowance display
- Required amount comparison

**ApprovalTransaction.tsx (~120 lines):**
- Approve button
- Transaction status (pending, confirmed, error)
- Retry mechanism

---

## 3. API Type Safety with Zod

### Schema Definitions

```typescript
// frontend/src/lib/schemas/protocol.schema.ts
import { z } from 'zod';

export const protocolSchema = z.object({
  id: z.string(),
  ownerAddress: z.string(),
  githubUrl: z.string(),
  status: z.string(),
  fundingState: z.string().nullable(),
  bountyPoolAmount: z.number().nullable(),
  createdAt: z.string(),
});

export type Protocol = z.infer<typeof protocolSchema>;
```

```typescript
// frontend/src/lib/schemas/payment.schema.ts
export const paymentSchema = z.object({
  id: z.string(),
  vulnerabilityId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
  txHash: z.string().nullable(),
  researcherAddress: z.string(),
  paidAt: z.string().nullable(),
});

export const fetchPaymentsResponseSchema = z.object({
  payments: z.array(paymentSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type FetchPaymentsResponse = z.infer<typeof fetchPaymentsResponseSchema>;
```

### API Function Pattern

```typescript
// frontend/src/lib/api.ts
export async function fetchPayments(params: FetchPaymentsParams): Promise<FetchPaymentsResponse> {
  const response = await fetch(`/api/v1/payments?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
  const data = await response.json();
  return fetchPaymentsResponseSchema.parse(data); // Runtime validation
}
```

In development, Zod throws detailed errors for response shape mismatches. In production, it provides a safety net against API contract violations.

---

## 4. Web3 Configuration Fix

### SIWE Chain ID Fix

```typescript
// frontend/src/lib/siwe.ts (line 24)
// Before:
chainId: 1,

// After:
import { baseSepolia } from 'wagmi/chains';
chainId: baseSepolia.id,  // 84532
```

### WalletConnect Project ID Fix

```typescript
// frontend/src/lib/wagmi.ts
// Before:
walletConnect({ projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id' })

// After:
walletConnect({
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ??
    (() => { console.warn('VITE_WALLETCONNECT_PROJECT_ID not set'); return ''; })()
})
```

Remove silent fallback to `'demo-project-id'` which masks configuration errors.

---

## 5. State Management Fix

### Dashboard Store Optimistic Updates

```typescript
// frontend/src/stores/dashboardStore.ts
// Before (line 92):
optimisticUpdates: new Map(),

// After:
optimisticUpdates: {} as Record<string, OptimisticUpdate>,

// Before (Map operations):
state.optimisticUpdates.set(updateId, { ... });

// After (object operations):
state.optimisticUpdates = {
  ...state.optimisticUpdates,
  [updateId]: { ... },
};

// Before (Map deletion):
state.optimisticUpdates.delete(updateId);

// After:
const { [updateId]: _, ...rest } = state.optimisticUpdates;
state.optimisticUpdates = rest;
```

Plain objects trigger Zustand's shallow comparison correctly, ensuring React re-renders.

---

## 6. Performance Optimization

### React.memo for Presentational Components

After decomposition, wrap presentational (stateless, props-only) components:

```typescript
export const PaymentTable = React.memo(function PaymentTable({ payments, onSelect }: Props) {
  // ... render table
});

export const PoolOverview = React.memo(function PoolOverview({ balance, progress }: Props) {
  // ... render overview
});
```

### Memoization Strategy

- **useMemo:** Expensive computations (filtering, sorting, formatting)
- **useCallback:** Event handlers passed to memoized children
- **React.memo:** Presentational components that receive stable props

---

## Dependencies

- Component decomposition (Phase 2) is independent of other specs
- API type safety (Phase 3) depends on knowing backend response shapes
- Web3 fix (Phase 4) is independent and can be done immediately
- Performance (Phase 5) should follow decomposition
