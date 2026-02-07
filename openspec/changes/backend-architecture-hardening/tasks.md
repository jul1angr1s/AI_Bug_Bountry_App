# Backend Architecture Hardening - Implementation Tasks

## Phase 1: DI Infrastructure (3 days)

### Day 1: Interface Definitions

- [ ] Install tsyringe: `npm install tsyringe reflect-metadata`
- [ ] Create `backend/src/di/interfaces/ILogger.ts`
- [ ] Create `backend/src/di/interfaces/IDatabase.ts` (PrismaClient wrapper)
- [ ] Create `backend/src/di/interfaces/IBlockchainClient.ts` (IBountyPoolClient, IUSDCClient, IValidationRegistryClient, IProtocolRegistryClient)
- [ ] Create `backend/src/di/interfaces/IPaymentService.ts`
- [ ] Create `backend/src/di/tokens.ts` for injection token constants

### Day 2: Container Setup

- [ ] Create `backend/src/di/container.ts` with all registrations
- [ ] Create provider classes (PrismaClientProvider, LoggerProvider)
- [ ] Add `import 'reflect-metadata'` to `backend/src/server.ts`
- [ ] Update tsconfig.json: `"emitDecoratorMetadata": true, "experimentalDecorators": true`
- [ ] Initialize container in server startup sequence
- [ ] Verify existing functionality unchanged

### Day 3: Test Infrastructure

- [ ] Create `backend/src/__tests__/helpers/testContainer.ts` with mock registrations
- [ ] Create `backend/src/__tests__/helpers/mocks/MockBountyPoolClient.ts`
- [ ] Create `backend/src/__tests__/helpers/mocks/MockLogger.ts`
- [ ] Create `backend/src/__tests__/helpers/mocks/MockPrismaClient.ts`
- [ ] Write example service test demonstrating DI pattern
- [ ] Verify all existing tests still pass

## Phase 2: Payment Service Refactoring (4 days)

### Day 4: Extract USDCService

- [ ] Create `backend/src/services/payment/USDCService.ts`
- [ ] Migrate: getUsdcAllowance (from payment.service.ts lines 711-742)
- [ ] Migrate: getUsdcBalance (lines 743-776)
- [ ] Migrate: generateApprovalTransaction (lines 777-820)
- [ ] Add @injectable decorator, inject IUSDCClient and ILogger
- [ ] Write unit tests (target: 80% coverage)
- [ ] Update `backend/src/routes/payment.routes.ts` USDC endpoints

### Day 5: Extract PaymentStatisticsService

- [ ] Create `backend/src/services/payment/PaymentStatisticsService.ts`
- [ ] Migrate: getPaymentStats (lines 563-710)
- [ ] Migrate: getResearcherEarnings (lines 976-1073)
- [ ] Migrate: getEarningsLeaderboard (lines 1074-1149)
- [ ] Add DI annotations, inject PrismaClient and ILogger
- [ ] Write unit tests with mocked Prisma
- [ ] Update routes and `backend/src/controllers/payment.controller.ts`

### Day 6: Extract PaymentProposalService

- [ ] Create `backend/src/services/payment/PaymentProposalService.ts`
- [ ] Migrate: getPoolStatus (lines 1150-1262)
- [ ] Migrate: proposeManualPayment (lines 1263-1393)
- [ ] Add DI annotations
- [ ] Write unit tests
- [ ] Update routes

### Day 7: Refactor Core PaymentService + Cleanup

- [ ] Create `backend/src/services/payment/PaymentService.ts`
- [ ] Migrate: createPaymentFromValidation (lines 149-260)
- [ ] Migrate: processPayment (lines 261-385)
- [ ] Migrate: getPaymentById, getPaymentsByProtocol, getPaymentsByResearcher
- [ ] Inject PrismaClient, IBountyPoolClient, IValidationRegistryClient, ILogger
- [ ] Write unit tests for all methods
- [ ] Update `backend/src/agents/payment/worker.ts` to use new PaymentService
- [ ] Create `backend/src/services/payment/index.ts` barrel export
- [ ] Move shared types to `backend/src/services/payment/types.ts`
- [ ] Delete old `backend/src/services/payment.service.ts`
- [ ] Verify all API endpoints work unchanged

## Phase 3: Type Safety (4 days)

### Day 8-9: Services (50 instances)

- [ ] payment services (new): ensure zero `any` from start
- [ ] `backend/src/services/reconciliation.service.ts`: replace 11 `any` types
- [ ] `backend/src/services/event-listener.service.ts`: replace 12 `any` types
- [ ] `backend/src/services/dashboard.service.ts`: replace 2 `any` types
- [ ] `backend/src/services/protocol.service.ts`: replace 2 `any` types
- [ ] `backend/src/services/funding.service.ts`: replace 1 `any` type
- [ ] `backend/src/services/escrow.service.ts`: replace 6 `any` types
- [ ] Run `npm run test` and `npm run build` after each file

### Day 10-11: Blockchain Clients (40 instances)

- [ ] Create `backend/src/blockchain/types/contracts.ts` (BountyReleasedEvent, RawBounty, ParsedEventLog)
- [ ] `backend/src/blockchain/contracts/BountyPoolClient.ts`: replace 18 `any` types
- [ ] `backend/src/blockchain/contracts/ValidationRegistryClient.ts`: replace 11 `any` types
- [ ] `backend/src/blockchain/contracts/ProtocolRegistryClient.ts`: replace 8 `any` types
- [ ] `backend/src/blockchain/contracts/USDCClient.ts`: replace 5 `any` types
- [ ] Remaining blockchain clients
- [ ] Run `npm run build` to verify no type errors

### Day 12: Routes, Controllers, Middleware (54 instances)

- [ ] `backend/src/controllers/payment.controller.ts`: 6 `any` types
- [ ] `backend/src/routes/*.ts`: remaining `any` types
- [ ] `backend/src/middleware/*.ts`: remaining `any` types
- [ ] Agent workers and steps: remaining `any` types
- [ ] Final verification: `grep -r ": any" backend/src/ | wc -l` returns 0

## Phase 4: Structured Logging (3 days)

### Day 13: Pino Setup

- [ ] Install: `npm install pino` and `npm install -D pino-pretty`
- [ ] Create `backend/src/lib/logger.ts` with Pino configuration
- [ ] Configure redaction paths for sensitive fields
- [ ] Create `backend/src/middleware/correlation.ts` for correlation IDs
- [ ] Register logger in DI container
- [ ] Add correlation middleware to server.ts

### Day 14-15: Replace console.log (126 in services)

- [ ] `backend/src/services/reconciliation.service.ts`: 28 statements
- [ ] `backend/src/services/event-listener.service.ts`: 56 statements
- [ ] Payment services (new): use logger from DI (already done)
- [ ] `backend/src/services/protocol.service.ts`: 6 statements
- [ ] `backend/src/services/funding.service.ts`: 8 statements
- [ ] `backend/src/services/blockchain-events.service.ts`: 7 statements
- [ ] `backend/src/services/validation.service.ts`: 4 statements
- [ ] `backend/src/services/dashboard.service.ts`: 3 statements
- [ ] Remaining services
- [ ] Verify: `grep -r "console\." backend/src/services/` returns 0 matches
- [ ] Add appropriate log levels (error, warn, info, debug) per strategy

## Critical Files

| File | Change |
|------|--------|
| `backend/src/services/payment.service.ts` | **Delete** after decomposition |
| `backend/src/services/payment/PaymentService.ts` | **New** - core payment processing |
| `backend/src/services/payment/PaymentStatisticsService.ts` | **New** - stats, leaderboards |
| `backend/src/services/payment/USDCService.ts` | **New** - USDC operations |
| `backend/src/services/payment/PaymentProposalService.ts` | **New** - proposals, pool status |
| `backend/src/di/container.ts` | **New** - DI container |
| `backend/src/di/interfaces/*.ts` | **New** - service interfaces |
| `backend/src/lib/logger.ts` | **New** - Pino structured logging |
| `backend/src/middleware/correlation.ts` | **New** - correlation ID middleware |
| `backend/src/agents/payment/worker.ts` | Update to use new PaymentService |
| `backend/src/blockchain/contracts/BountyPoolClient.ts` | Add DI, replace 18 `any` types |
| `backend/src/blockchain/types/contracts.ts` | **New** - typed contract interfaces |

## Dependencies

- Phase 1 must complete before Phase 2
- Phases 3 and 4 can run in parallel after Phase 1
- Payment refactoring (Phase 2) should coordinate with Security spec payment race condition fix
- Logging (Phase 4) shares implementation with Security spec log sanitization
