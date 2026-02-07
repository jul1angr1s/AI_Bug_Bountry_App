# Frontend Architecture Optimization - Implementation Tasks

## Phase 1: Code Splitting (2 days) - COMPLETED

### Day 1: React.lazy Setup

- [x] Create `frontend/src/components/shared/LoadingSpinner.tsx` fallback component
- [x] Convert all page imports in `frontend/src/App.tsx` to React.lazy (13 pages)
- [x] Wrap route content in Suspense with LoadingSpinner fallback
- [x] Handle named export (ScanDetailRouter) with `.then(m => ({ default: m.ScanDetailRouter }))`
- [x] Keep Login, DashboardLayout, ProtectedRoute as regular imports

### Day 2: Error Boundaries

- [x] Create `frontend/src/components/shared/ErrorBoundary.tsx`
- [x] Wrap each Suspense in ErrorBoundary for chunk load failures
- [x] Add retry mechanism (Try Again button) for non-chunk errors
- [x] Add reload mechanism for chunk load errors (Update Available message)
- [x] Detect chunk load errors via name/message pattern matching
- [x] Zero TypeScript errors in modified files

## Phase 2: Component Decomposition (3 days) - DEFERRED

Component decomposition deferred to a follow-up PR to keep this change focused.

## Phase 3: API Type Safety (2 days) - DEFERRED

Zod schema validation deferred to Code Quality spec.

## Phase 4: Web3 Configuration Fix (1 day) - COMPLETED

### Day 8: Chain ID + WalletConnect

- [x] Fix `frontend/src/lib/siwe.ts`: change `chainId: 1` to `baseSepolia.id` (84532)
- [x] Import `baseSepolia` from `wagmi/chains`
- [x] Fix `frontend/src/lib/wagmi.ts`: remove `'demo-project-id'` fallback
- [x] Only add WalletConnect connector when project ID is set
- [x] Add console.warn when VITE_WALLETCONNECT_PROJECT_ID is not set

## Phase 5: Performance Optimization (2 days) - PARTIALLY COMPLETED

### Day 9: State Management Fix

- [x] Replace `Map<string, OptimisticUpdate>` with `Record<string, OptimisticUpdate>` in dashboardStore.ts
- [x] Update all Map operations (set, get, delete) to object operations
- [x] Replace `new Map()` initialization with `{}`
- [x] Use destructuring rest `{ [key]: _, ...rest }` for delete operations
- [x] Verified zero remaining `Map` references in dashboardStore.ts

### Day 10: Memoization - DEFERRED

Memoization deferred to follow-up since component decomposition (Phase 2) is a prerequisite.

## Critical Files

| File | Change | Status |
|------|--------|--------|
| `frontend/src/App.tsx` | React.lazy, Suspense, ErrorBoundary for all routes | Done |
| `frontend/src/components/shared/LoadingSpinner.tsx` | **New** - Suspense fallback | Done |
| `frontend/src/components/shared/ErrorBoundary.tsx` | **New** - Chunk load error handling | Done |
| `frontend/src/lib/siwe.ts` | Fix chainId: 1 -> baseSepolia.id | Done |
| `frontend/src/lib/wagmi.ts` | Remove demo-project-id fallback | Done |
| `frontend/src/stores/dashboardStore.ts` | Map -> plain Record object | Done |

## Dependencies

- Component decomposition (Phase 2) deferred to follow-up
- API type safety (Phase 3) deferred to Code Quality spec
- Web3 fix (Phase 4) completed independently
- Memoization (Phase 5 Day 10) deferred until decomposition completes
