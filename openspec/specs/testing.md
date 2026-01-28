# Testing Specification

## Overview

Zero-untested-code policy with automated test generation for new capabilities.

## Source Documentation
- **Primary**: [project/Testing.md](../../project/Testing.md)

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
- External services (Supabase, RPC, Ollama) mocked for unit tests
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

### FirstFlight Simulation (Daily)
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

## CI Pipeline

```
Build → Lint → Unit Tests → Integration Tests → E2E (Nightly) → Security Scan
```

- `npm run test:unit` + `forge test`
- `npm run test:integration`
- `slither .` (contracts) + `trivy` (images)
