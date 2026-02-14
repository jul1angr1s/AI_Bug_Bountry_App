# Testing & QA Expansion - Implementation Tasks

## Phase 1: Service Layer Tests (2 weeks)

### Week 1: Payment Service Tests (P0) - DONE

- [x] Create `backend/src/__tests__/helpers/test-database.ts`
  - Mock PrismaClient factory with vi.fn() stubs for all model methods
  - Supports payment, vulnerability, protocol, proof, finding, scan, paymentReconciliation, eventListenerState
  - Also mocks $transaction, $disconnect, $connect
- [x] Create `backend/src/__tests__/helpers/test-blockchain.ts`
  - Mock ethers.js providers (Base Sepolia chainId 84532) and smart contract instances
  - Factories: createMockProvider(), createMockBountyPoolContract(), createMockValidationRegistryContract(), createMockUSDCContract()
  - BountyPool mock includes interface.parseLog for event parsing
- [x] Create `backend/src/__tests__/helpers/test-redis.ts`
  - Mock ioredis client with in-memory Map<string, string> backing store
  - Working get/set/del, queue ops (lpush, rpush, lpop, rpop, lrange), hash ops, pub/sub methods
  - Utility: _store (direct Map access) and _reset() for test isolation
- [x] Create `backend/src/__tests__/fixtures/payment.fixtures.ts`
  - Factory functions: createPaymentFixture(), createVulnerabilityFixture() with override support
  - Pre-built: completedPayment, failedPayment, processingPayment, criticalVulnerability, lowVulnerability
  - Relation helpers: createPaymentWithVulnerability(), createPaymentWithFullRelations()
  - Proof fixtures: mockProof, mockProofWithFinding
- [x] Create `backend/src/__tests__/fixtures/protocol.fixtures.ts`
  - Factory: createProtocolFixture() with override support
  - Pre-built: unfundedProtocol (no onChainProtocolId), activeProtocol
  - createProtocolWithScans() for Prisma include testing
- [x] Create `backend/src/services/__tests__/payment.service.test.ts` (55 tests, ALL PASSING)
  - getPaymentById: 6 tests
  - getPaymentsByProtocol: 6 tests
  - createPaymentFromValidation: 8 tests
  - processPayment: 8 tests
  - getPaymentStats: 4 tests
  - getPaymentList: 6 tests
  - proposeManualPayment: 5 tests
  - getResearcherEarnings: 3 tests
  - getEarningsLeaderboard: 6 tests
  - Custom Error Classes: 3 tests
  - Uses vi.hoisted() for mock objects accessible within vi.mock() factories
- [x] Achieve 70%+ coverage for payment service

### Week 2: Protocol + Escrow Service Tests (P1) - DONE

- [x] Create `backend/src/services/__tests__/protocol.service.test.ts` (58 tests, ALL PASSING)
- [x] Create `backend/src/services/__tests__/escrow.service.test.ts` (34 tests, ALL PASSING)
- [x] Achieve 70%+ coverage for both services

## Phase 2: Blockchain Client Tests (1 week)

### Week 3: All Blockchain Clients (P0) - DONE

- [x] Create `backend/src/blockchain/contracts/__tests__/BountyPoolClient.test.ts` (37 tests, ALL PASSING)
- [x] Create `backend/src/blockchain/contracts/__tests__/ValidationRegistryClient.test.ts` (32 tests, ALL PASSING)
- [x] Create `backend/src/blockchain/contracts/__tests__/USDCClient.test.ts` (29 tests, ALL PASSING)
- [x] Create `backend/src/blockchain/contracts/__tests__/ProtocolRegistryClient.test.ts` (29 tests, ALL PASSING)
- [x] Create `backend/src/blockchain/contracts/__tests__/PlatformEscrowClient.test.ts` (28 tests, ALL PASSING)
- [x] Achieve 80%+ coverage for all blockchain clients

## Phase 3: Integration Tests (1 week)

### Week 4: Multi-Service Integration (P0)

- [ ] Create `backend/src/__tests__/integration/payment-flow.integration.test.ts`
  - Full payment flow: Propose -> Queue -> Execute -> On-chain
  - Concurrent payment processing (race condition prevention)
  - Payment failure with retry
  - Demo mode fallback
  - Pool balance insufficient scenario
- [ ] Create `backend/src/__tests__/integration/protocol-registration.integration.test.ts`
  - Register protocol -> Fund -> Scan -> Payment
  - Duplicate GitHub URL prevention
- [ ] Create `backend/src/agents/payment/__tests__/worker.integration.test.ts`
  - Worker processes payment job
  - Worker retries on failure
  - Worker updates payment status correctly
- [ ] Fix existing test infrastructure issues (Redis auth, env vars)

## Phase 4: Frontend Component Tests (2 weeks)

### Week 5: API Client + MSW Setup (P0)

- [ ] Install MSW: `npm install -D msw`
- [ ] Create `frontend/src/__tests__/setup/msw-handlers.ts`
- [ ] Create `frontend/src/__tests__/setup/msw-server.ts`
- [ ] Create `frontend/src/lib/__tests__/api.test.ts` (50+ tests)
  - Test all 23 API functions
  - Auth header inclusion
  - Error handling (401, 500)
  - Response validation
- [ ] Achieve 70%+ coverage for lib/api.ts

### Week 6: Large Component Tests (P1)

- [ ] Create `frontend/src/components/Payment/__tests__/PaymentHistory.test.tsx` (30+ tests)
  - Rendering, filtering, pagination, WebSocket updates, error states
- [ ] Create `frontend/src/components/protocols/__tests__/FundingGate.test.tsx` (20+ tests)
  - Multi-step wizard, approval flow, deposit, verification
- [ ] Create `frontend/src/components/Payment/__tests__/BountyPoolStatus.test.tsx` (15+ tests)
  - Balance display, WebSocket updates, deposit button
- [ ] Create `frontend/src/components/Payment/__tests__/USDCApprovalFlow.test.tsx` (15+ tests)
  - State machine transitions, allowance checking, approval transaction
- [ ] Achieve 70%+ coverage for large components

## Phase 5: Smart Contract Tests (1 week)

### Week 7: Agent Contracts + Fuzz Tests (P1)

- [ ] Create `backend/contracts/test/unit/AgentIdentityRegistry.t.sol` (20+ tests)
  - registerAgent, updateAgent, deactivateAgent, getAgent
  - Access control, duplicate prevention, event emissions
- [ ] Create `backend/contracts/test/unit/AgentReputationRegistry.t.sol` (25+ tests)
  - recordValidation, recordFinding, getReputation, slashReputation
  - Score calculation, overflow protection
- [ ] Create `backend/contracts/test/fuzz/BountyPoolFuzz.t.sol`
  - Fuzz depositBounty with random amounts
  - Fuzz releaseBounty with random severities
  - Verify invariants hold under all inputs
- [ ] Create `backend/contracts/test/fuzz/ReputationFuzz.t.sol`
  - Fuzz reputation calculations
  - Verify score bounds
- [ ] Create `backend/contracts/test/integration/FullPaymentFlow.t.sol`
  - Register protocol -> Deposit -> Validate -> Release bounty
- [ ] Achieve 90%+ coverage for all contracts

## Phase 6: E2E Tests (1 week)

### Week 8: Playwright E2E (P0)

- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Create `frontend/playwright.config.ts`
- [ ] Create `frontend/src/__tests__/e2e/payment-flow.spec.ts`
  - Propose payment, verify in payment history
  - Check payment status transitions
- [ ] Create `frontend/src/__tests__/e2e/protocol-registration.spec.ts`
  - Register protocol, fund bounty pool, verify in dashboard
- [ ] Create `frontend/src/__tests__/e2e/agent-management.spec.ts`
  - Admin registers agent, view agent status
- [ ] Achieve 100% coverage of critical user flows

## Phase 7: CI/CD Integration - DONE

- [x] Create `.github/workflows/test.yml` with parallel jobs
  - backend-unit: No external dependencies, excludes AI/integration tests, 10min timeout
  - backend-integration: PostgreSQL 15 + Redis 7, Foundry/Anvil, 15min timeout
  - smart-contracts: Foundry/Forge only, 5min timeout
  - frontend-unit: Separate npm cache, 10min timeout
  - ai-tests: Depends on backend-unit, uses API keys, 45min timeout
  - test-summary: Per-job status reporting, AI tests non-blocking
- [x] Configure coverage thresholds in vitest.config.ts (backend: 70%, frontend: 70%)
- [x] Add Codecov integration for coverage tracking
- [x] Verify total CI time <45 minutes (parallel jobs)
- [ ] Add coverage badge to README

## Summary of Completed Work

| Metric | Before | After |
|--------|--------|-------|
| Payment service tests | 0 | 55 |
| Protocol service tests | 0 | 58 |
| Escrow service tests | 0 | 34 |
| BountyPoolClient tests | 0 | 37 |
| ValidationRegistryClient tests | 0 | 32 |
| USDCClient tests | 0 | 29 |
| ProtocolRegistryClient tests | 0 | 29 |
| PlatformEscrowClient tests | 0 | 28 |
| **Total new tests** | **0** | **302** |
| Test helper files | 1 (testContainer.ts) | 4 (+ test-database, test-blockchain, test-redis) |
| Fixture files | 0 | 2 (payment, protocol) |
| CI jobs | 2 serial | 5 parallel + summary |

### Test Infrastructure Created

1. **test-database.ts**: Mock PrismaClient factory with stubs for all model methods
2. **test-blockchain.ts**: Mock ethers.js providers and contract instances (BountyPool, ValidationRegistry, USDC)
3. **test-redis.ts**: Mock ioredis with in-memory backing store and full API
4. **payment.fixtures.ts**: Payment and vulnerability factories with override support
5. **protocol.fixtures.ts**: Protocol factories with scan relations

### CI/CD Improvements

1. **5 parallel jobs** instead of 2 serial jobs
2. **Foundry/Anvil** installed for blockchain integration tests
3. **Codecov** integration with per-job coverage flags
4. **Branch patterns** expanded: `impl/**`, `spec/**` triggers
5. **AI tests non-blocking** - core tests gate merges, AI tests are advisory
6. **Test summary** job with per-job pass/fail reporting in GitHub Step Summary

## Critical Files (New)

| File | Purpose |
|------|---------|
| `backend/src/__tests__/helpers/test-database.ts` | Test database setup |
| `backend/src/__tests__/helpers/test-blockchain.ts` | Mock blockchain providers |
| `backend/src/__tests__/helpers/test-redis.ts` | Mock Redis |
| `backend/src/__tests__/fixtures/payment.fixtures.ts` | Payment test data |
| `backend/src/__tests__/fixtures/protocol.fixtures.ts` | Protocol test data |
| `backend/src/services/__tests__/payment.service.test.ts` | Payment service tests (55) |
| `backend/src/blockchain/contracts/__tests__/BountyPoolClient.test.ts` | Blockchain client tests (37) |
| `.github/workflows/test.yml` | CI test pipeline (5 parallel jobs) |

## Dependencies

- Benefits greatly from Backend Architecture DI (Phase 1 enables proper mocking)
- Frontend component tests should follow Frontend Architecture decomposition
- Blockchain client tests need mock infrastructure (Phase 2) before service tests
- Smart contract tests are independent and can start in parallel
- E2E tests require both backend and frontend to be functional
