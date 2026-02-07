# Testing & QA Expansion

## Problem Statement

The platform has critically insufficient test coverage across all layers, creating unacceptable risk for a system that handles USDC payments and blockchain transactions.

### Current State

**Backend (15 test files):**
- **Coverage:** <30% (target: 70%+)
- **Unit tests:** 3 files (repositories, decrypt, ai-deep-analysis)
- **Integration tests:** 10 files (mostly agent-specific)
- **E2E tests:** 1 file (sse-protocol-progress)
- **ZERO tests for:**
  - payment.service.ts (1,393 lines) - core payment logic
  - protocol.service.ts (481 lines) - protocol registration
  - escrow.service.ts (237 lines) - escrow operations
  - payment.worker.ts (430 lines) - queue processing & retries
  - All 7 blockchain clients (BountyPoolClient, ValidationRegistryClient, etc.)

**Frontend (34 test files):**
- Comprehensive component tests but large components untested:
  - PaymentHistory.tsx (674 lines) - no tests
  - FundingGate.tsx (527 lines) - no tests
  - BountyPoolStatus.tsx (435 lines) - no tests
  - USDCApprovalFlow.tsx (418 lines) - no tests
- API client (lib/api.ts, 922 lines) - untested

**Smart Contracts (Foundry):**
- 6 existing test files (BountyPool, ProtocolRegistry, etc.)
- Missing: AgentIdentityRegistry, AgentReputationRegistry tests
- No fuzz testing for edge cases

**Infrastructure Issues:**
- 96/100 test files fail due to Redis authentication errors
- Test environment not configured for external dependencies
- Unit test failure in payment-amounts.test.ts (export issue)

### Risk Quantification

| Untested Component | Lines | Risk |
|-------------------|-------|------|
| payment.service.ts | 1,393 | Financial loss, incorrect payouts |
| payment.worker.ts | 430 | Payment failures, stuck payments |
| BountyPoolClient.ts | ~300 | Contract interaction failures |
| lib/api.ts (frontend) | 922 | Frontend-backend communication |
| All blockchain clients | ~1,200 | On-chain operation failures |

## Proposed Solution

TDD-based testing expansion with phased delivery:

1. **Service layer tests** (Weeks 1-2) - payment, protocol, escrow @ 70%+
2. **Blockchain client tests** (Week 3) - all 7 clients @ 80%+
3. **Integration tests** (Week 4) - payment flow, protocol registration, worker processing
4. **Frontend component tests** (Weeks 5-6) - large components + API client @ 70%+
5. **Smart contract tests** (Week 7) - agent contracts, fuzz tests @ 90%+
6. **E2E tests** (Week 8) - Playwright for critical user journeys

### Testing Pyramid

```
        E2E (5%)          Playwright - critical flows
      Integration (15%)   Multi-service, DB, Redis
    Unit Tests (80%)      Services, utils, components
```

## Benefits

- **Deployment confidence** - 100% of critical payment paths tested
- **Refactoring safety** - test net catches breaking changes
- **Regression prevention** - CI blocks deploys below thresholds
- **TDD workflow** - new features developed test-first

## Success Criteria

- [ ] Backend services: 70%+ coverage (from <10%)
- [ ] Blockchain clients: 80%+ coverage (from 0%)
- [ ] Smart contracts: 90%+ coverage
- [ ] Frontend components: 70%+ coverage
- [ ] E2E critical flows: 100% (payment, protocol registration)
- [ ] CI enforces coverage thresholds
- [ ] All tests run in <45 minutes total

## Impact

Testing score: 2.3 -> 4.2

## PR Strategy

Single PR: `spec/testing-qa-expansion` -> `main`
Estimated size: ~900 lines (spec files only)
