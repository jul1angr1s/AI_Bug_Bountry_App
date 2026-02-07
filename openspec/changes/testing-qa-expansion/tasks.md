# Testing & QA Expansion - Implementation Tasks

## Phase 1: Service Layer Tests (2 weeks)

### Week 1: Payment Service Tests (P0)

- [ ] Create `backend/src/__tests__/helpers/test-database.ts`
- [ ] Create `backend/src/__tests__/helpers/test-blockchain.ts`
- [ ] Create `backend/src/__tests__/helpers/test-redis.ts`
- [ ] Create `backend/src/__tests__/fixtures/payment.fixtures.ts`
- [ ] Create `backend/src/__tests__/fixtures/protocol.fixtures.ts`
- [ ] Create `backend/src/services/__tests__/payment.service.test.ts` (50+ tests)
  - createPaymentFromValidation: 8 tests
  - processPayment: 8 tests
  - getPaymentById: 4 tests
  - getPaymentsByProtocol: 6 tests
  - getPaymentsByResearcher: 6 tests
  - getPaymentStats: 6 tests
  - USDC operations: 6 tests
  - proposeManualPayment: 6 tests
- [ ] Achieve 70%+ coverage for payment service

### Week 2: Protocol + Escrow Service Tests (P1)

- [ ] Create `backend/src/services/__tests__/protocol.service.test.ts` (30+ tests)
  - registerProtocol: 8 tests
  - getProtocolById: 4 tests
  - listProtocols: 6 tests
  - fundProtocol: 6 tests
  - updateProtocolRegistrationState: 6 tests
- [ ] Create `backend/src/services/__tests__/escrow.service.test.ts` (20+ tests)
  - depositEscrow: 5 tests
  - deductSubmissionFee: 5 tests
  - getEscrowBalance: 4 tests
  - canSubmitFinding: 3 tests
  - getTransactionHistory: 3 tests
- [ ] Achieve 70%+ coverage for both services

## Phase 2: Blockchain Client Tests (1 week)

### Week 3: All Blockchain Clients (P0)

- [ ] Create `backend/src/blockchain/contracts/__tests__/BountyPoolClient.test.ts` (25+ tests)
  - depositBounty: 5 tests
  - releaseBounty: 8 tests
  - getProtocolBalance: 3 tests
  - getProtocolBounties: 3 tests
  - getResearcherBounties: 3 tests
  - Error handling: 3 tests
- [ ] Create `backend/src/blockchain/contracts/__tests__/ValidationRegistryClient.test.ts` (20+ tests)
- [ ] Create `backend/src/blockchain/contracts/__tests__/USDCClient.test.ts` (15+ tests)
- [ ] Create `backend/src/blockchain/contracts/__tests__/ProtocolRegistryClient.test.ts` (15+ tests)
- [ ] Create `backend/src/blockchain/contracts/__tests__/PlatformEscrowClient.test.ts` (10+ tests)
- [ ] Achieve 80%+ coverage for all blockchain clients

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

## Phase 7: CI/CD Integration

- [ ] Create `.github/workflows/test.yml` with parallel jobs
  - backend-unit, backend-integration, smart-contracts, frontend-unit, e2e
- [ ] Configure coverage thresholds in vitest.config.ts (backend: 70%, frontend: 70%)
- [ ] Add Codecov integration for coverage tracking
- [ ] Verify total CI time <45 minutes
- [ ] Add coverage badge to README

## Critical Files (New)

| File | Purpose |
|------|---------|
| `backend/src/__tests__/helpers/test-database.ts` | Test database setup |
| `backend/src/__tests__/helpers/test-blockchain.ts` | Mock blockchain providers |
| `backend/src/__tests__/helpers/test-redis.ts` | Mock Redis |
| `backend/src/__tests__/fixtures/payment.fixtures.ts` | Payment test data |
| `backend/src/services/__tests__/payment.service.test.ts` | Payment service tests |
| `backend/src/blockchain/contracts/__tests__/BountyPoolClient.test.ts` | Blockchain client tests |
| `backend/src/__tests__/integration/payment-flow.integration.test.ts` | Payment flow integration |
| `frontend/src/__tests__/setup/msw-handlers.ts` | MSW mock API handlers |
| `frontend/src/lib/__tests__/api.test.ts` | API client tests |
| `frontend/src/__tests__/e2e/payment-flow.spec.ts` | Playwright E2E tests |
| `backend/contracts/test/unit/AgentIdentityRegistry.t.sol` | Agent contract tests |
| `.github/workflows/test.yml` | CI test pipeline |

## Dependencies

- Benefits greatly from Backend Architecture DI (Phase 1 enables proper mocking)
- Frontend component tests should follow Frontend Architecture decomposition
- Blockchain client tests need mock infrastructure (Phase 2) before service tests
- Smart contract tests are independent and can start in parallel
- E2E tests require both backend and frontend to be functional
