# Frontend Architecture Optimization - Implementation Tasks

## Phase 1: Code Splitting (2 days)

### Day 1: React.lazy Setup

- [ ] Create `frontend/src/components/shared/LoadingSpinner.tsx` fallback component
- [ ] Convert all page imports in `frontend/src/App.tsx` to React.lazy
- [ ] Wrap route content in Suspense with LoadingSpinner fallback
- [ ] Ensure default exports on all page components (required for React.lazy)
- [ ] Test: each page loads on navigation (no upfront loading)

### Day 2: Error Boundaries

- [ ] Create `frontend/src/components/shared/ErrorBoundary.tsx`
- [ ] Wrap Suspense in ErrorBoundary for chunk load failures
- [ ] Add retry mechanism for failed chunk loads
- [ ] Test: simulate network error during lazy load shows error boundary
- [ ] Verify bundle size reduction (compare build output)

## Phase 2: Component Decomposition (3 days)

### Day 3: PaymentHistory.tsx (674 lines -> 4 components)

- [ ] Create `frontend/src/components/Payment/PaymentFilters.tsx` (~120 lines)
  - Status filter, severity filter, date range inputs
- [ ] Create `frontend/src/components/Payment/PaymentTable.tsx` (~200 lines)
  - Table rendering, loading skeleton, empty state
- [ ] Create `frontend/src/components/Payment/PaymentPagination.tsx` (~80 lines)
  - Page navigation, items per page selector
- [ ] Refactor `PaymentHistory.tsx` to orchestrator (~150 lines)
  - TanStack Query, WebSocket handlers, state coordination
- [ ] Verify: all payment history functionality unchanged

### Day 4: ProtocolDetail.tsx + FundingGate.tsx

**ProtocolDetail.tsx (580 lines -> 4 components):**
- [ ] Create `frontend/src/pages/protocol/ProtocolHeader.tsx`
- [ ] Create `frontend/src/pages/protocol/ProtocolTabs.tsx`
- [ ] Create `frontend/src/pages/protocol/ProtocolScanSection.tsx`
- [ ] Refactor `ProtocolDetail.tsx` to orchestrator

**FundingGate.tsx (527 lines -> 3 components):**
- [ ] Create `frontend/src/components/protocols/FundingForm.tsx`
- [ ] Create `frontend/src/components/protocols/FundingVerification.tsx`
- [ ] Refactor `FundingGate.tsx` to orchestrator

### Day 5: BountyPoolStatus.tsx + USDCApprovalFlow.tsx

**BountyPoolStatus.tsx (435 lines -> 3 components):**
- [ ] Create `frontend/src/components/Payment/PoolOverview.tsx`
- [ ] Create `frontend/src/components/Payment/PoolTransactions.tsx`
- [ ] Refactor `BountyPoolStatus.tsx` to orchestrator

**USDCApprovalFlow.tsx (418 lines -> 3 components):**
- [ ] Create `frontend/src/components/Payment/AllowanceCheck.tsx`
- [ ] Create `frontend/src/components/Payment/ApprovalTransaction.tsx`
- [ ] Refactor `USDCApprovalFlow.tsx` to orchestrator

## Phase 3: API Type Safety (2 days)

### Day 6: Zod Schema Definitions

- [ ] Create `frontend/src/lib/schemas/protocol.schema.ts`
- [ ] Create `frontend/src/lib/schemas/payment.schema.ts`
- [ ] Create `frontend/src/lib/schemas/scan.schema.ts`
- [ ] Create `frontend/src/lib/schemas/dashboard.schema.ts`
- [ ] Create `frontend/src/lib/schemas/funding.schema.ts`
- [ ] Define schemas for all 23 API response types

### Day 7: Apply Zod Validation to API Functions

- [ ] Update `fetchProtocols()` to validate response with Zod
- [ ] Update `fetchPayments()` to validate response
- [ ] Update `fetchBountyPoolStatus()` to validate response
- [ ] Update `fetchLeaderboard()` to validate response
- [ ] Update remaining API functions (19 total)
- [ ] Replace `Promise<any>` returns with `Promise<z.infer<typeof schema>>`
- [ ] Test: API calls with mocked invalid data throw Zod errors

## Phase 4: Web3 Configuration Fix (1 day)

### Day 8: Chain ID + WalletConnect

- [ ] Fix `frontend/src/lib/siwe.ts`: change `chainId: 1` to `baseSepolia.id` (84532)
- [ ] Fix `frontend/src/lib/wagmi.ts`: remove `'demo-project-id'` fallback
- [ ] Add console.warn when VITE_WALLETCONNECT_PROJECT_ID is not set
- [ ] Verify SIWE message generation uses correct chainId
- [ ] Test: MetaMask Sign-In with Ethereum on Base Sepolia

## Phase 5: Performance Optimization (2 days)

### Day 9: State Management Fix

- [ ] Replace `Map` with plain `Record<string, OptimisticUpdate>` in `frontend/src/stores/dashboardStore.ts`
- [ ] Update all Map operations (set, get, delete, has) to object operations
- [ ] Replace `Map()` initialization with `{}`
- [ ] Verify optimistic updates trigger React re-renders
- [ ] Fix `previousState: unknown` typing in OptimisticUpdate interface
- [ ] Test: optimistic update followed by confirmation updates UI correctly

### Day 10: Memoization

- [ ] Add React.memo to all decomposed presentational components:
  - PaymentTable, PaymentFilters, PaymentPagination
  - ProtocolHeader, ProtocolTabs
  - PoolOverview, PoolTransactions
  - AllowanceCheck, ApprovalTransaction
  - FundingForm, FundingVerification
- [ ] Audit existing useCallback/useMemo usage for correctness
- [ ] Add useMemo for expensive computations in decomposed components
- [ ] Remove 16 `any` type instances in frontend/src (mostly WebSocket handlers)
- [ ] Test: verify no unnecessary re-renders with React DevTools Profiler

## Critical Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | React.lazy, Suspense for all routes |
| `frontend/src/components/Payment/PaymentHistory.tsx` | Decompose -> 4 components |
| `frontend/src/pages/ProtocolDetail.tsx` | Decompose -> 4 components |
| `frontend/src/components/protocols/FundingGate.tsx` | Decompose -> 3 components |
| `frontend/src/components/Payment/BountyPoolStatus.tsx` | Decompose -> 3 components |
| `frontend/src/components/Payment/USDCApprovalFlow.tsx` | Decompose -> 3 components |
| `frontend/src/lib/api.ts` | Add Zod runtime validation |
| `frontend/src/lib/siwe.ts` | Fix chainId: 1 -> baseSepolia.id |
| `frontend/src/lib/wagmi.ts` | Remove demo-project-id fallback |
| `frontend/src/stores/dashboardStore.ts` | Map -> plain object |
| `frontend/src/lib/schemas/*.ts` | **New** - Zod API response schemas |
| `frontend/src/components/shared/LoadingSpinner.tsx` | **New** - Suspense fallback |
| `frontend/src/components/shared/ErrorBoundary.tsx` | **New** - Chunk load error handling |

## Dependencies

- Component decomposition (Phase 2) is independent of other specs
- API type safety (Phase 3) benefits from knowing exact backend response shapes
- Web3 fix (Phase 4) is independent and low-risk
- Performance (Phase 5) should follow decomposition (Phase 2)
