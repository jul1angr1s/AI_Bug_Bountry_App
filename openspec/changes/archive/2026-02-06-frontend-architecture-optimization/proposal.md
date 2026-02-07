# Frontend Architecture Optimization

## Problem Statement

The React frontend has solid foundations (React 18, TanStack Query v5, Zustand v5, Tailwind, Wagmi v3) but suffers from performance, type safety, and architectural gaps:

### 1. Zero Code Splitting

All route pages are statically imported in `frontend/src/App.tsx`. Every page component (DashboardModern, ProtocolDetail, Payments, etc.) is loaded eagerly on initial app load, increasing bundle size and initial load time.

### 2. Five Components Over 400 Lines

| Component | Lines | Location |
|-----------|-------|----------|
| PaymentHistory.tsx | 674 | `components/Payment/PaymentHistory.tsx` |
| ProtocolDetail.tsx | 580 | `pages/ProtocolDetail.tsx` |
| FundingGate.tsx | 527 | `components/protocols/FundingGate.tsx` |
| BountyPoolStatus.tsx | 435 | `components/Payment/BountyPoolStatus.tsx` |
| USDCApprovalFlow.tsx | 418 | `components/Payment/USDCApprovalFlow.tsx` |

These monolithic components mix rendering, data fetching, state management, and business logic.

### 3. API Client Returns Unvalidated Data

`frontend/src/lib/api.ts` (922 lines) defines 23 typed functions, but several use `Promise<any>` or lack runtime validation. Backend response shape mismatches fail silently at runtime.

### 4. Web3 Configuration Mismatch

- **SIWE (siwe.ts:24):** Hardcoded `chainId: 1` (Ethereum Mainnet)
- **Wagmi (wagmi.ts):** Configured for `baseSepolia` (chain 84532)
- **FundingGate.tsx:** Correctly uses `BASE_SEPOLIA_CHAIN_ID = 84532`
- **WalletConnect:** Falls back to `'demo-project-id'` if env var missing

The SIWE chainId mismatch means Sign-In with Ethereum messages reference Mainnet while the app operates on Base Sepolia.

### 5. Map-Based Optimistic Updates

`frontend/src/stores/dashboardStore.ts` uses JavaScript `Map` for optimistic updates (line 92). Maps don't trigger React re-renders reliably and don't serialize to JSON for persistence.

### 6. No React.memo on Presentational Components

49 instances of useMemo/useCallback exist, but zero React.memo usage. Presentational components re-render on every parent update.

## Proposed Solution

1. **Code Splitting:** React.lazy/Suspense for all route pages
2. **Component Decomposition:** Split 5 components into 15-20 focused components
3. **API Type Safety:** Zod runtime validation for all API responses
4. **Web3 Fix:** Correct chainId in SIWE, remove demo project ID fallback
5. **State Management:** Replace Map with plain object for optimistic updates
6. **Performance:** React.memo for presentational components, optimize memoization

## Benefits

- **Faster initial load** - code splitting reduces bundle by ~40%
- **Maintainable components** - all under 250 lines
- **Runtime safety** - Zod catches backend response mismatches
- **Correct Web3** - SIWE messages match deployed chain
- **Reliable UI updates** - plain objects trigger re-renders correctly

## Success Criteria

- [ ] All route pages lazy-loaded with Suspense fallback
- [ ] No component exceeds 300 lines
- [ ] All API responses validated with Zod schemas
- [ ] SIWE chainId matches Base Sepolia (84532)
- [ ] WalletConnect uses environment variable (no demo fallback)
- [ ] Dashboard store uses plain objects for optimistic updates
- [ ] React.memo on all presentational components

## Impact

Frontend Architecture score: 3.2 -> 4.3

## PR Strategy

Single PR: `spec/frontend-architecture-optimization` -> `main`
Estimated size: ~800 lines (spec files only)
