# Testing Specification

## Overview

Zero-untested-code policy with automated test generation for new capabilities.

## Source Documentation
- **Primary**: [docs/TESTING.md](../../docs/TESTING.md)

## Testing Pyramid

| Layer | Framework | Coverage Target | Focus |
|-------|-----------|-----------------|-------|
| Smart Contracts | Foundry (`forge test`) | 100% Branch | Reentrancy, Math, Access Control |
| Backend API | Vitest + Supertest | 90% Statement | Auth, Validation, DB Ops |
| Agents (AI) | Custom Eval Suite | Pass/Fail | Reasoning accuracy, JSON validity |
| Frontend | Vitest + RTL | 80% Component | User flows, Realtime |
| E2E | Synpress + Playwright | Critical Paths | Full Registration → Payment |

## Smart Contract Testing (Foundry)

### Required Test Types
- **Unit Tests**: All public functions
- **Fuzz Tests**: `testFuzz_*` for boundary conditions
- **Invariant Tests**: `invariant_*` for critical properties
- **Fork Tests**: Against Base Sepolia for payment flows

### Key Invariants
```solidity
// BountyPool: total >= available + paid
function invariant_balanceConsistency() public {
    assertGe(info.totalDeposited, info.availableBalance + info.totalPaidOut);
}

// No double payments
function invariant_noDoublePay() public { ... }
```

## Backend Testing

### Mocking Strategy
- External services (Supabase, RPC, Kimi AI) mocked for unit tests
- Fixed prompts + mocked LLM responses for agent logic tests

### API Testing
- Supertest for HTTP endpoint testing
- Zod schema validation assertions
- Auth flow testing (wallet signature)

## Agent Testing

### Eval Suite
- Deterministic test cases with expected outputs
- Hallucination detection (unexpected JSON keys)
- Response time benchmarks

## E2E Testing

### Manual E2E Testing Workflow
Before demonstrations and production deployments, complete the **[Manual E2E Testing Workflow](./manual-e2e-testing.md)** (60-90 minutes):
- Prerequisites validation (database, Redis, contracts, environment)
- Service startup (backend, frontend, agents, workers)
- Agent registration and escrow funding
- Protocol registration and scan execution
- Validator testing and payment processing
- Reputation updates and frontend verification

This manual workflow is essential for pre-demonstration readiness and serves as the blueprint for automated E2E tests.

### FirstFlight Simulation (Daily) - Automated
1. Spin up Docker environment
2. Register VulnerableVault protocol
3. Trigger Researcher Agent scan
4. Assert: vulnerability found, submission recorded, validation, payment released
5. Teardown

### Capability-Based Tests
When new feature added (e.g., Anti-MEV), create acceptance test:
1. Setup: Valid proof generated
2. Action: Malicious actor copies proof with different address
3. Expected: Rejection, original researcher paid

## Current Test Coverage

| Category | Count | Details |
|----------|-------|---------|
| Backend Unit Tests | 302 | Across 8 test files (payment, protocol, escrow, blockchain clients) |
| Integration Tests | 36 | Service-level integration test cases |
| Frontend Regression | 46 | HTTP-level test cases |
| Playwright E2E | 19 | Browser tests across 3 browsers (Chromium, Firefox, WebKit) |
| Smart Contract Tests | 1,681 lines | Across 4 Foundry test files |

## CI Pipeline

**GitHub Actions**: 5 parallel jobs
- `backend-unit` — Vitest unit tests
- `backend-integration` — Integration test suite
- `smart-contracts` — Foundry forge test
- `frontend-unit` — Vitest + RTL component tests
- `ai-tests` — Agent eval suite

```
Build → Lint → Unit Tests → Integration Tests → E2E (Nightly) → Security Scan
```

- `npm run test:unit` + `forge test`
- `npm run test:integration`
- `slither .` (contracts) + `trivy` (images)

## Change Specifications

- [Testing & QA Expansion](../changes/archive/2026-02-06-testing-qa-expansion/) - 302 unit tests across 8 files, CI pipeline with 5 parallel jobs, mock infrastructure, Codecov integration
