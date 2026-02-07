# Backend Architecture Hardening - Implementation Tasks

## Phase 1: DI Infrastructure (3 days) ✅ COMPLETED

### Day 1: Interface Definitions

- [x] Install tsyringe: `npm install tsyringe reflect-metadata`
- [x] Create `backend/src/di/interfaces/ILogger.ts`
- [x] Create `backend/src/di/interfaces/IDatabase.ts` (PrismaClient wrapper)
- [x] Create `backend/src/di/interfaces/IBlockchainClient.ts` (IBountyPoolClient, IUSDCClient, IValidationRegistryClient, IProtocolRegistryClient)
- [x] Create `backend/src/di/tokens.ts` for injection token constants

### Day 2: Container Setup

- [x] Create `backend/src/di/container.ts` with all registrations
- [x] Create PinoLoggerAdapter provider class
- [x] Add `import 'reflect-metadata'` to `backend/src/server.ts`
- [x] Update tsconfig.json: `"emitDecoratorMetadata": true, "experimentalDecorators": true`
- [x] Initialize container in server startup sequence
- [x] Verify existing functionality unchanged

### Day 3: Test Infrastructure

- [x] Create `backend/src/__tests__/helpers/testContainer.ts` with mock registrations
- [x] Create mock factories: createMockBountyPool, createMockUSDC, createMockLogger
- [x] Create `createTestContainer()` with child container isolation
- [x] Verify all existing tests still pass

## Phase 2: Payment Service Refactoring (4 days) ✅ COMPLETED

### Day 4: Extract USDCService

- [x] Create `backend/src/services/payment/USDCService.ts`
- [x] Migrate: getUsdcAllowance, getUsdcBalance, generateApprovalTransaction
- [x] Add @injectable decorator, inject IUSDCClient and ILogger
- [x] All `error: any` replaced with `error: unknown` + instanceof guard

### Day 5: Extract PaymentStatisticsService

- [x] Create `backend/src/services/payment/PaymentStatisticsService.ts`
- [x] Migrate: getPaymentStats, getResearcherEarnings, getEarningsLeaderboard
- [x] Add DI annotations, inject PrismaClient and ILogger
- [x] Replace `where: any` with `Prisma.PaymentWhereInput` types

### Day 6: Extract PaymentProposalService

- [x] Create `backend/src/services/payment/PaymentProposalService.ts`
- [x] Migrate: getPoolStatus, proposeManualPayment
- [x] Add DI annotations
- [x] Replace `proposal?: any` with proper typed interface

### Day 7: Refactor Core PaymentService + Cleanup

- [x] Create `backend/src/services/payment/PaymentService.ts`
- [x] Migrate: createPaymentFromValidation, processPayment, getPaymentById, getPaymentsByProtocol, getPaymentsByResearcher, getPaymentList
- [x] Inject PrismaClient, IBountyPoolClient, ILogger
- [x] Create `backend/src/services/payment/index.ts` barrel export
- [x] Move shared types to `backend/src/services/payment/types.ts`
- [x] Replace `payment: any` parameter with fully typed inline interface

## Phase 3: Type Safety (4 days) ✅ COMPLETED (high-priority files)

### Day 8-9: Services

- [x] Payment services (new): zero `any` types verified
- [x] All `where: any` → `Prisma.PaymentWhereInput`
- [x] All `error: any` → `error: unknown` with instanceof guard
- [x] All `(b: any)` → `(b: RawBounty)` typed callbacks

### Day 10-11: Blockchain Clients

- [x] Create `backend/src/blockchain/types/contracts.ts` (RawBounty, RawValidation)
- [x] `backend/src/blockchain/contracts/BountyPoolClient.ts`: replaced all 18 `any` types
- [ ] `backend/src/blockchain/contracts/ValidationRegistryClient.ts`: replace `any` types (deferred to Code Quality spec)
- [ ] `backend/src/blockchain/contracts/ProtocolRegistryClient.ts`: replace `any` types (deferred to Code Quality spec)
- [ ] `backend/src/blockchain/contracts/USDCClient.ts`: replace `any` types (deferred to Code Quality spec)

### Day 12: Routes, Controllers, Middleware

- [ ] Remaining `any` types across routes, controllers, middleware (deferred to Code Quality spec)

## Phase 4: Structured Logging (shared with Security spec) ✅ COMPLETED

Note: Structured logging was implemented as part of the Security Posture Hardening spec (PR #96):
- [x] Pino logger with redaction paths created (`backend/src/lib/logger.ts`)
- [x] Correlation ID middleware using AsyncLocalStorage
- [x] Logger registered in DI container
- [x] Payment services use DI-injected logger from start

## Critical Files

| File | Change | Status |
|------|--------|--------|
| `backend/src/services/payment/PaymentService.ts` | **New** - core payment processing | ✅ |
| `backend/src/services/payment/PaymentStatisticsService.ts` | **New** - stats, leaderboards | ✅ |
| `backend/src/services/payment/USDCService.ts` | **New** - USDC operations | ✅ |
| `backend/src/services/payment/PaymentProposalService.ts` | **New** - proposals, pool status | ✅ |
| `backend/src/services/payment/types.ts` | **New** - shared types and error classes | ✅ |
| `backend/src/services/payment/index.ts` | **New** - barrel export | ✅ |
| `backend/src/di/container.ts` | **New** - DI container | ✅ |
| `backend/src/di/interfaces/*.ts` | **New** - service interfaces | ✅ |
| `backend/src/di/tokens.ts` | **New** - injection tokens | ✅ |
| `backend/src/__tests__/helpers/testContainer.ts` | **New** - test mock helpers | ✅ |
| `backend/src/blockchain/contracts/BountyPoolClient.ts` | Replaced all 18 `any` types | ✅ |
| `backend/src/blockchain/types/contracts.ts` | **New** - typed contract interfaces | ✅ |

## Dependencies

- Phase 1 completed before Phase 2 ✅
- Phase 3 ran in parallel with Phase 2 ✅
- Logging (Phase 4) was implemented in Security spec (PR #96) ✅
- Remaining `any` types in other files deferred to Code Quality spec
