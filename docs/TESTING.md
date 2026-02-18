# Testing Strategy: Autonomous Bug Bounty Orchestrator

## Overview

This document defines the Quality Assurance (QA) strategy for ensuring the reliability, security, and correctness of the platform. Current enforcement is performed by repository test scripts and GitHub Actions workflows.

---

## 1. Testing Pyramid & Matrix

### 1.1 Support Matrix

| Layer | Framework | Coverage Target | Key Focus |
|-------|-----------|-----------------|-----------|
| **Smart Contracts** | Foundry (`forge test`) | 100% Branch | Reentrancy, Math, Access Control, Payment Logic |
| **Backend API** | Vitest / Supertest | 90% Stmt | Auth Middleware, Input Validation, DB Operations |
| **Agents (AI)** | Custom Eval Suite | N/A (Pass/Fail) | Reasoning accuracy, Hallucination checks, JSON validity |
| **Frontend** | Vitest / React Testing Lib | 80% Component | User Flows, Realtime Updates, Wallet Connection |
| **E2E Integration** | Synpress / Playwright | Critical Paths | Full Registration -> Scan -> Pay Flow |

---

## 2. Automated Test Generation (Planned Pattern)

The repository does **not** currently ship an enabled pre-push auto-test-generation hook. The following pattern is an optional workflow design reference.

### 2.1 Example Workflow
**Trigger**: `git push` or CI Pipeline detected new functional code (e.g., new function in `*.sol` or `*.ts`).

**Logic Flow**:
1.  **Detection**: Script analyzes git diff for new exported functions or components.
2.  **Verification**: Checks for existence of corresponding `*.test.ts` or `*.t.sol` file covering the new entity.
3.  **Action - Missing Test**:
    *   **Block**: Validation fails.
    *   **Delegation**: Calls **QA Subagent** (see Subagents.md).
    *   **Generation**: QA Agent reads the new code + Context -> Generates Unit/Integration Test.
    *   **Validation**: Runs the generated test.
    *   **Commit**: If passed, adds the test file to the commit.
4.  **Action - Existing Test**:
    *   **Run**: Runs existing tests.
    *   **Pass**: Allows push.

### 2.2 Hook Template (Pseudo-code)

```bash
# .husky/pre-push
# 1. Analyze changes
CHANGED_FILES=$(git diff --name-only HEAD remote/main)
NEW_FUNCTIONS=$(analyze_code $CHANGED_FILES)

# 2. Check coverage
MISSING_TESTS=$(check_missing_tests $NEW_FUNCTIONS)

if [ ! -z "$MISSING_TESTS" ]; then
  echo "⚠️  Untested code detected: $MISSING_TESTS"
  echo "🤖 Invoking QA Subagent..."
  
  # 3. Generate Tests
  npx skills run qa-agent --generate-tests-for "$MISSING_TESTS"
  
  # 4. Verify & Append
  npm test
  if [ $? -eq 0 ]; then
    git add tests/generated/
    git commit --amend --no-edit
    echo "✅ Tests generated and verified. Pushing..."
  else
    echo "❌ Auto-generated tests failed. Please review manually."
    exit 1
  fi
fi
```

---

## 3. Unit Testing Guidelines

### 3.1 Smart Contracts (Foundry)
-   **Fuzz Testing**: All public functions must be fuzzed with `testFuzz_`.
-   **Invariant Testing**: Critical invariants (e.g., `BountyPool balance >= Reserved`) must be defined in `invariant_` tests.
-   **Fork Testing**: Tests must run against a forked Anvil state of Base Sepolia for realistic dependency mocking.

### 3.2 Backend & Agents
-   **Mocking**: External services (Supabase, Blockchain RPC, Kimi AI) must be mocked for unit tests.
-   **AI Determinism**: For Agent tests, use "Fixed Prompts" and "Mocked LLM Responses" to test the *logic* surrounding the AI, not the AI itself (which is non-deterministic).

---

## 4. Integration & E2E Testing

### 4.1 "FirstFlight" Simulation
The `FirstFlightDemonstration.md` script is converted into an automated test suite runs daily.

**Scenario**:
1.  **Spin Up**: Local Docker environment (Supabase + Kimi AI + Anvil).
2.  **Register**: Programmatically register a "VulnerableVault" via API.
3.  **Scan**: Trigger Researcher Agent scan.
4.  **Assert**:
    *   Vulnerability found?
    *   Submission recorded on Chain?
    *   Validator confirms?
    *   Payment released?
5.  **Teardown**: Clean environment.

### 4.2 Capability-Based Testing
When a new **Capability** (e.g., "Front-Running Protection") is added, an Acceptance Test must be defined.

**Example: Anti-MEV Acceptance Test**
1.  **Setup**: Valid proof generated.
2.  **Action**: Malicious actor (Test Script) copies proof data but changes `msg.sender` to itself.
3.  **Expected Result**: `ValidatorRegistry` rejects transaction or logic marks it as invalid.
4.  **Verification**: Malicious actor balance unchanged; Original researcher paid (after resubmission) or transaction fails.

---

## 5. Continuous Integration (CI) Pipeline

PR validation is enforced via `.github/workflows/pr-validation.yml` and broader test coverage runs via `.github/workflows/test.yml`.

1.  **PR Validation (required for PRs to main)**: backend type-check/tests/build, frontend type-check/build, PR size check, and docs command parity (`cd backend && npm run check:docs-parity`).
2.  **Backend Unit**: `cd backend && npm test` (with workflow-level include/exclude flags).
3.  **Backend Integration**: `cd backend && npm run test:integration` where integration suites are present.
4.  **Smart Contracts**: `cd backend/contracts && forge test`.
5.  **Frontend Unit**: `cd frontend && npx vitest run --coverage`.
6.  **AI Integration**: `cd backend && npm run test:ai` (requires secrets and longer runtime).

---
