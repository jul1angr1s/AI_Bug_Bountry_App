# Code Quality Improvement - Implementation Tasks

## Phase 1: Error Infrastructure (2 days)

### Task 1.1: Create Error Class Files

- [ ] Create `backend/src/errors/payment.errors.ts`
  - PaymentNotFoundError, InsufficientFundsError, PaymentProcessingError, PaymentReconciliationError
- [ ] Create `backend/src/errors/blockchain.errors.ts`
  - ContractCallError, TransactionFailedError, EventParsingError, InsufficientGasError
- [ ] Create `backend/src/errors/validation.errors.ts`
  - ValidationNotFoundError, VulnerabilityNotFoundError, ProofValidationError
- [ ] Create `backend/src/errors/protocol.errors.ts`
  - ProtocolNotFoundError, CompilationError
- [ ] Create `backend/src/errors/index.ts` barrel export

### Task 1.2: Migrate Existing Errors

- [ ] Move error classes from `backend/src/services/payment.service.ts` to `errors/payment.errors.ts`
- [ ] Update imports in payment.service.ts (or new payment services)
- [ ] Update imports in `backend/src/controllers/payment.controller.ts`
- [ ] Update imports in `backend/src/agents/payment/worker.ts`
- [ ] Run tests to verify no breakage

## Phase 2: High-Priority Type Safety (3 days)

### Task 2.1: BountyPoolClient.ts (18 `any` instances)

- [ ] Create `backend/src/blockchain/types/contracts.ts` with typed interfaces
  - BountyReleasedEvent, ParsedEventLog, RawBounty, OnChainBounty
- [ ] Replace event log handling types (lines 126, 139, 153)
- [ ] Replace all `catch (error: any)` blocks (15 instances) with `catch (error: unknown)`
- [ ] Replace `bounties.map((b: any) => ...)` with typed RawBounty (lines 233, 255)
- [ ] Run existing tests, add type assertion tests

### Task 2.2: payment.service.ts (21 `any` instances)

- [ ] Create `backend/src/utils/query-builder.ts` with typed where clause builders
- [ ] Replace 4 `const where: any = {}` with Prisma.PaymentWhereInput (lines 428, 498, 569, 847)
- [ ] Replace all `catch (error: any)` blocks with proper error handling
- [ ] Type `payments?: any[]` in PaymentListResult (line 828)
- [ ] Run tests after each replacement

### Task 2.3: reconciliation.service.ts (11 `any` instances)

- [ ] Import blockchain types from contracts.ts
- [ ] Replace event query return types
- [ ] Replace all `catch (error: any)` blocks
- [ ] Run tests

### Task 2.4: event-listener.service.ts (12 `any` instances)

- [ ] Type event handler callbacks
- [ ] Replace `(log: any)` with proper EventLog type
- [ ] Replace all `catch (error: any)` blocks
- [ ] Run tests

### Task 2.5: ValidationRegistryClient.ts (11 `any` instances)

- [ ] Type contract return values
- [ ] Replace all `catch (error: any)` blocks
- [ ] Run tests

## Phase 3: Remaining Type Safety (2 days)

### Task 3.1: Controllers (10+ instances)

- [ ] `backend/src/controllers/payment.controller.ts`: 6 instances
- [ ] Other controllers as identified

### Task 3.2: Routes (10+ instances)

- [ ] `backend/src/routes/payment.routes.ts`
- [ ] `backend/src/routes/reconciliation.routes.ts`
- [ ] `backend/src/routes/validation.routes.ts`
- [ ] Other routes

### Task 3.3: Middleware (8 instances)

- [ ] `backend/src/middleware/auth.ts`
- [ ] `backend/src/middleware/errorHandler.ts`
- [ ] `backend/src/middleware/sse-auth.ts`
- [ ] `backend/src/middleware/x402-payment-gate.middleware.ts`

### Task 3.4: Agent Workers and Steps

- [ ] `backend/src/agents/researcher/worker.ts`
- [ ] `backend/src/agents/validator/worker.ts`
- [ ] `backend/src/agents/protocol/worker.ts`
- [ ] Step files in agents/researcher/steps/ and agents/validator/steps/

### Task 3.5: Scripts and Utilities

- [ ] `backend/scripts/*.ts` files
- [ ] Remaining utility files

### Task 3.6: Final Verification

- [ ] Run `grep -rn ": any" backend/src/ --include="*.ts"` - must return 0 matches
- [ ] Run `npm run build` - must complete with 0 errors
- [ ] Run `npm run test` - all tests pass

## Phase 4: Code Deduplication (2 days)

### Task 4.1: Error Handler Utility

- [ ] Create `backend/src/utils/error-handler.ts` with `toError()` function
- [ ] Replace repeated catch patterns in 5 highest-use files
- [ ] Write unit tests for utility

### Task 4.2: Query Builder Utility

- [ ] Create `backend/src/utils/query-builder.ts`
- [ ] Implement `buildDateRangeFilter()` and `buildPaymentWhereClause()`
- [ ] Replace 4 `where: any = {}` patterns with utility calls
- [ ] Write unit tests

### Task 4.3: Measure Impact

- [ ] Count lines of code before/after deduplication
- [ ] Document patterns eliminated

## Phase 5: TODO Migration (1 day)

### Task 5.1: Create TODO Inventory

- [ ] Run `grep -rn "TODO" backend/src/ --include="*.ts"` to catalog all TODOs
- [ ] Categorize: security (5), enhancement (4), authorization (2), tech-debt (7)

### Task 5.2: Create GitHub Issues

- [ ] Create issues for security TODOs (encryption, key management, signature verification)
- [ ] Create issues for authorization TODOs (admin role checks)
- [ ] Create issues for enhancement TODOs (event listeners, pool balance, agent ID)
- [ ] Create issues for tech-debt TODOs (metrics, schema changes)
- [ ] Label all issues appropriately (security, enhancement, tech-debt, authorization)

### Task 5.3: Replace Inline TODOs

- [ ] Replace each TODO comment with `// See GitHub Issue #NNN`
- [ ] Verify: `grep -rn "TODO" backend/src/ --include="*.ts"` returns 0 matches

## Phase 6: ESLint Enforcement (concurrent with Phase 5)

### Task 6.1: Configure ESLint

- [ ] Ensure `@typescript-eslint/eslint-plugin` is installed in backend
- [ ] Add `@typescript-eslint/no-explicit-any: error` rule
- [ ] Add `@typescript-eslint/no-unsafe-assignment: warn` rule
- [ ] Run `npm run lint` - must pass

### Task 6.2: Add Lint Scripts

- [ ] Add `"lint:strict"` script targeting `any` type detection
- [ ] Document lint commands in backend README
- [ ] Verify CI integration will fail on `any` types

## Critical Files

| File | Change |
|------|--------|
| `backend/src/errors/payment.errors.ts` | **New** - centralized payment errors |
| `backend/src/errors/blockchain.errors.ts` | **New** - blockchain errors |
| `backend/src/errors/validation.errors.ts` | **New** - validation errors |
| `backend/src/errors/protocol.errors.ts` | **New** - protocol errors |
| `backend/src/errors/index.ts` | **New** - barrel export |
| `backend/src/blockchain/types/contracts.ts` | **New** - typed contract interfaces |
| `backend/src/utils/error-handler.ts` | **New** - error utility |
| `backend/src/utils/query-builder.ts` | **New** - query utility |
| `backend/src/blockchain/contracts/BountyPoolClient.ts` | Replace 18 `any` types |
| `backend/src/services/payment.service.ts` | Replace 21 `any` types, migrate errors |
| `backend/src/services/reconciliation.service.ts` | Replace 11 `any` types |
| `backend/src/services/event-listener.service.ts` | Replace 12 `any` types |

## Dependencies

- Should execute after Backend Architecture Phase 1 (DI) so new services get proper types
- Error hierarchy (Phase 1) must complete before type replacements reference new error classes
- ESLint enforcement (Phase 6) should be added last to avoid blocking other work
- Overlaps with Backend Architecture type safety work - coordinate to avoid duplication
