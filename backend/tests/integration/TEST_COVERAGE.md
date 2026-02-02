# Integration Test Coverage - Phase 4 Payment Flow

## Overview

This document provides a comprehensive overview of the integration test coverage for the Phase 4 payment automation system.

## Test Files Summary

| Test File | Test Cases | Coverage Areas | Status |
|-----------|------------|----------------|--------|
| `payment-flow.test.ts` | 4 | Full payment workflow, error handling, retries | ✅ Enabled |
| `reconciliation-flow.test.ts` | 6 | Payment reconciliation, discrepancy detection | ✅ Enabled |
| `usdc-approval-flow.test.ts` | 11 | USDC approvals, balance queries, validations | ✅ Enabled |
| `validator-agent.test.ts` | 5 | Validator agent LLM validation flow, error handling | ✅ New |
| `websocket-events.test.ts` | 10 | WebSocket event emissions for all event types | ✅ New |
| **Total** | **36** | **All Phase 4 + Agent/WebSocket requirements** | ✅ Complete |

## Detailed Test Coverage

### 1. Payment Flow Tests (payment-flow.test.ts)

#### Test Case 1: Full Payment Flow
**Description:** End-to-end payment from ValidationRecorded event to USDC transfer

**Steps Tested:**
1. ✅ Set up test environment (protocols, vulnerabilities)
2. ✅ Deploy/connect to test contracts
3. ✅ Emit ValidationRecorded event with CONFIRMED outcome
4. ✅ Verify Payment record created in database
5. ✅ Verify payment job added to queue
6. ✅ Verify payment worker processes job
7. ✅ Verify BountyPool.releaseBounty() called
8. ✅ Verify Payment updated with txHash and status=COMPLETED
9. ✅ Verify WebSocket event emitted
10. ✅ Verify USDC transferred to researcher

**Assertions:**
- Payment status transitions: PENDING → COMPLETED
- Transaction hash recorded
- On-chain bounty ID recorded
- USDC balance increase matches payment amount
- Payment reconciled flag set

#### Test Case 2: Insufficient Pool Funds
**Description:** Handles insufficient pool balance gracefully

**Steps Tested:**
1. ✅ Create protocol with zero available bounty
2. ✅ Create validation and payment
3. ✅ Attempt to process payment
4. ✅ Verify payment marked as FAILED
5. ✅ Verify failure reason indicates insufficient funds

**Assertions:**
- Payment status = FAILED
- Failure reason contains "Insufficient"
- No retry attempted (permanent failure)

#### Test Case 3: Duplicate Payment Prevention
**Description:** Prevents duplicate payments for same validation

**Steps Tested:**
1. ✅ Create completed payment
2. ✅ Attempt to create payment from same validation
3. ✅ Verify existing payment returned
4. ✅ Verify no new payment created

**Assertions:**
- Same payment ID returned
- Payment status unchanged
- No duplicate records in database

#### Test Case 4: Network Error Retry
**Description:** Retries payment on network errors

**Steps Tested:**
1. ✅ Create payment with invalid validation ID
2. ✅ Attempt to process payment
3. ✅ Verify retry count increases
4. ✅ Verify BullMQ retry logic triggered

**Assertions:**
- Retry count > 0
- Payment status remains PENDING during retries
- Eventually fails after max retries

---

### 2. Reconciliation Flow Tests (reconciliation-flow.test.ts)

#### Test Case 1: BountyReleased Event Reconciliation
**Description:** Updates Payment with reconciled flag when BountyReleased event detected

**Steps Tested:**
1. ✅ Create Payment with COMPLETED status but missing txHash
2. ✅ Emit BountyReleased event
3. ✅ Simulate reconciliation process
4. ✅ Verify Payment updated with reconciled=true

**Assertions:**
- Payment.reconciled = true
- Payment.txHash set
- Payment.reconciledAt timestamp set
- Payment.onChainBountyId matches event

#### Test Case 2: Orphaned Payment Detection
**Description:** Detects BountyReleased event without corresponding Payment record

**Steps Tested:**
1. ✅ Emit BountyReleased event without creating Payment first
2. ✅ Check for existing Payment (should be null)
3. ✅ Create PaymentReconciliation record with status=ORPHANED

**Assertions:**
- No matching Payment found
- PaymentReconciliation.status = ORPHANED
- PaymentReconciliation.paymentId is null

#### Test Case 3: Amount Mismatch Detection
**Description:** Detects discrepancy between database amount and blockchain amount

**Steps Tested:**
1. ✅ Create Payment with incorrect amount (500 vs 1000)
2. ✅ Emit BountyReleased event with correct amount
3. ✅ Detect mismatch
4. ✅ Create PaymentReconciliation record with status=AMOUNT_MISMATCH

**Assertions:**
- Database amount ≠ blockchain amount
- PaymentReconciliation.status = AMOUNT_MISMATCH
- Notes describe the discrepancy

#### Test Case 4: Missing Payment Detection
**Description:** Detects Payment marked COMPLETED without on-chain confirmation

**Steps Tested:**
1. ✅ Create Payment with fake txHash and bountyId
2. ✅ Attempt to verify on-chain (should fail)
3. ✅ Create PaymentReconciliation record with status=MISSING_PAYMENT

**Assertions:**
- Payment status = COMPLETED in database
- No corresponding on-chain transaction
- PaymentReconciliation created

#### Test Case 5: Periodic Reconciliation Job
**Description:** Runs reconciliation job to find all discrepancies

**Steps Tested:**
1. ✅ Create multiple Payments with different states
2. ✅ Run reconciliation job
3. ✅ Find unreconciled completed payments
4. ✅ Create reconciliation records

**Assertions:**
- Only unreconciled COMPLETED payments flagged
- Reconciliation records created for each
- Failed payments not reconciled

#### Test Case 6: Reconciliation Resolution
**Description:** Resolves discrepancy and marks as RESOLVED

**Steps Tested:**
1. ✅ Create PaymentReconciliation with status=DISCREPANCY
2. ✅ Resolve discrepancy
3. ✅ Update status to RESOLVED
4. ✅ Update Payment as reconciled

**Assertions:**
- PaymentReconciliation.status = RESOLVED
- PaymentReconciliation.resolvedAt set
- Payment.reconciled = true

---

### 3. USDC Approval Flow Tests (usdc-approval-flow.test.ts)

#### Test Case 1: Initial Allowance Query
**Description:** Query USDC allowance returns zero initially

**Assertions:**
- Service returns success=true
- Allowance and formatted values returned
- Initial allowance is 0 or small value

#### Test Case 2: Generate Approval Transaction
**Description:** Generate unsigned approval transaction via API

**Assertions:**
- Transaction object returned
- Transaction.to = USDC address
- Transaction.chainId = 84532 (Base Sepolia)
- Transaction.data contains approve() call
- Gas limit estimated

#### Test Case 3: Submit Approval Transaction
**Description:** Sign and submit approval, verify allowance updated

**Steps Tested:**
1. ✅ Check initial allowance
2. ✅ Generate approval transaction
3. ✅ Sign and submit transaction
4. ✅ Verify allowance updated on-chain

**Assertions:**
- Allowance before < allowance after
- Final allowance matches approved amount

#### Test Case 4: Balance Query
**Description:** Query USDC balance endpoint

**Assertions:**
- Service returns success=true
- Balance returned (should be 100,000 from setup)
- Balance formatted correctly

#### Test Case 5: Invalid Spender
**Description:** Test invalid spender address (zero address)

**Assertions:**
- Transaction may succeed but is flagged as suspicious
- Warning logged for zero address

#### Test Case 6: Zero Amount Rejection
**Description:** Generate approval with zero amount

**Assertions:**
- Service returns success=false
- Error code = INVALID_AMOUNT
- Error message describes issue

#### Test Case 7: Negative Amount Rejection
**Description:** Generate approval with negative amount

**Assertions:**
- Service returns success=false
- Error returned

#### Test Case 8: Multiple Approvals
**Description:** Multiple approvals update allowance correctly

**Steps Tested:**
1. ✅ Approve 1000 USDC
2. ✅ Verify allowance = 1000
3. ✅ Approve 2000 USDC (replaces)
4. ✅ Verify allowance = 2000
5. ✅ Approve 0 (revoke)
6. ✅ Verify allowance = 0

**Assertions:**
- Each approval replaces previous
- Revoke sets allowance to 0

#### Test Case 9: Balance After Transfer
**Description:** Check balance updates after USDC transfer

**Steps Tested:**
1. ✅ Check initial balance
2. ✅ Transfer 100 USDC
3. ✅ Verify sender balance decreased
4. ✅ Verify recipient balance increased

**Assertions:**
- Sender balance = initial - transfer amount
- Recipient balance increased

#### Test Case 10: Gas Estimation
**Description:** Approval transaction includes gas estimate

**Assertions:**
- Gas limit > 0
- Gas limit < 1,000,000 (reasonable)

#### Test Case 11: Non-existent Spender Allowance
**Description:** Query allowance for random spender

**Assertions:**
- Service returns success=true
- Allowance = 0 (no approval)

#### Test Case 12: Empty Address Balance
**Description:** Query balance for address with no USDC

**Assertions:**
- Service returns success=true
- Balance = 0

---

### 4. Validator Agent Tests (validator-agent.test.ts)

#### Test Case 1: Validator Agent Initialization
**Description:** Validator agent starts and listens for proof submissions

**Steps Tested:**
1. ✅ Start validator agent LLM worker
2. ✅ Verify agent is listening on Redis pub/sub
3. ✅ Confirm agent is ready to process proofs

**Assertions:**
- Agent starts without errors
- Redis subscription established
- Agent is ready for proof processing

#### Test Case 2: Full Validator Agent Flow
**Description:** End-to-end proof validation using Kimi 2.5 LLM

**Steps Tested:**
1. ✅ Create protocol, scan, and finding
2. ✅ Create proof with encrypted exploit code
3. ✅ Publish proof submission to Redis
4. ✅ Agent receives and decrypts proof
5. ✅ Agent analyzes proof with Kimi 2.5 LLM
6. ✅ Agent updates finding validation status
7. ✅ Agent updates proof status

**Assertions:**
- Proof status changes to VALIDATED or REJECTED
- Finding status updated accordingly
- validatedAt timestamp set
- LLM analysis applied correctly

#### Test Case 3: Decryption Error Handling
**Description:** Handles invalid encrypted payloads gracefully

**Steps Tested:**
1. ✅ Create proof with invalid encrypted data
2. ✅ Publish proof submission
3. ✅ Agent attempts decryption
4. ✅ Agent handles error and rejects proof

**Assertions:**
- Proof status = REJECTED
- No crashes or unhandled errors
- Error logged appropriately

#### Test Case 4: LLM API Error Handling
**Description:** Handles LLM API failures gracefully

**Steps Tested:**
1. ✅ Mock LLM client to throw error
2. ✅ Create and submit valid proof
3. ✅ Agent attempts LLM analysis
4. ✅ Agent handles API error

**Assertions:**
- Proof marked as REJECTED on LLM failure
- Error logged
- Agent continues running (no crash)

#### Test Case 5: Agent Shutdown
**Description:** Validator agent stops cleanly

**Steps Tested:**
1. ✅ Start agent
2. ✅ Stop agent
3. ✅ Verify clean shutdown
4. ✅ Test idempotency (stop when already stopped)

**Assertions:**
- No errors on shutdown
- Redis subscription cleaned up
- Idempotent stop operations

---

### 5. WebSocket Events Tests (websocket-events.test.ts)

#### Test Case 1: Payment Released Event
**Description:** payment:released event emitted correctly

**Assertions:**
- Event delivered to protocol room subscribers
- Event type correct
- All payment data included (id, amount, txHash, etc.)
- Timestamp included

#### Test Case 2: Payment Failed Event
**Description:** payment:failed event emitted correctly

**Assertions:**
- Event delivered to protocol room
- Failure reason included
- Retry count included
- Validation ID included

#### Test Case 3: Scan Started Event
**Description:** scan:started event emitted correctly

**Assertions:**
- Event delivered to protocol and scans rooms
- Scan ID and protocol ID included
- Agent ID included
- Branch and commit hash included

#### Test Case 4: Scan Progress Event
**Description:** scan:progress event emitted correctly

**Assertions:**
- Event delivered to protocol room
- Current step and state included
- Progress percentage included
- Message included

#### Test Case 5: Scan Completed Event
**Description:** scan:completed event emitted correctly

**Assertions:**
- Event delivered to protocol room
- Final state included
- Findings count included
- Duration calculated correctly
- Error details included (if applicable)

#### Test Case 6: Agent Task Update Event
**Description:** agent:task_update event emitted correctly

**Assertions:**
- Event delivered to agents room
- Agent ID, task, and progress included
- Estimated completion time included

#### Test Case 7: Protocol Status Change Event
**Description:** protocol:status_changed event emitted correctly

**Assertions:**
- Event delivered to protocols room
- Status and registration state included
- Transaction hash included (if applicable)
- Risk score included

#### Test Case 8: Vulnerability Status Change Event
**Description:** vuln:status_changed event emitted correctly

**Assertions:**
- Event delivered to protocol room
- Old and new status included
- Severity included
- Payment amount included (if applicable)
- Rejection reason included (if applicable)

#### Test Case 9: Bounty Pool Update Event
**Description:** bounty_pool:updated event emitted correctly

**Assertions:**
- Event delivered to protocol room
- Total, available, and paid amounts included
- Change type correct (DEPOSIT, PAYMENT_RELEASED, etc.)
- Amount of change included

#### Test Case 10: Multiple Client Event Delivery
**Description:** Multiple clients in same room receive events

**Assertions:**
- Event delivered to all subscribed clients
- No duplicate deliveries
- Correct room targeting

---

## OpenSpec Requirements Coverage

### Task 21.1: Payment Flow Test
✅ **Status:** Complete
- Full ValidationRecorded → Payment → Queue → Worker → releaseBounty() → USDC transfer flow tested
- All 10 steps verified
- Success and failure scenarios covered

### Task 21.2: Reconciliation Flow Test
✅ **Status:** Complete
- BountyReleased event reconciliation tested
- Orphaned payment detection tested
- Amount mismatch detection tested
- Missing payment detection tested
- Periodic reconciliation job tested
- PaymentReconciliation records verified

### Task 21.3: USDC Approval Flow Test
✅ **Status:** Complete
- Allowance queries tested
- Approval transaction generation tested
- Transaction submission tested
- Balance queries tested
- Invalid input handling tested

### Task 21.4: Test Environment Setup
✅ **Status:** Complete
- Anvil fork of Base Sepolia configured
- Test database isolation implemented
- Test Redis instance configured
- Test wallets with funded ETH and USDC
- Contract connections established

### Task 21.5: Integration Test Configuration
✅ **Status:** Complete
- `jest.integration.config.js` created
- Setup and teardown files created
- Test environment isolation ensured
- CI/CD pipeline configured
- Coverage reporting enabled

---

## Test Execution Metrics

### Expected Runtime
- Payment Flow Tests: ~45 seconds
- Reconciliation Flow Tests: ~60 seconds
- USDC Approval Flow Tests: ~90 seconds
- **Total:** ~3 minutes

### Coverage Targets
- Line Coverage: > 80%
- Branch Coverage: > 75%
- Function Coverage: > 80%

### Test Isolation
- ✅ Each test has independent database state
- ✅ Each test has clean Redis queues
- ✅ Tests run sequentially (maxWorkers: 1)
- ✅ Anvil provides fresh blockchain state

---

## CI/CD Integration

### GitHub Actions Workflow
Location: `.github/workflows/integration-tests.yml`

**Triggers:**
- Push to main, develop, feature/** branches
- Pull requests to main, develop

**Services:**
- PostgreSQL 15
- Redis 7

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install Foundry/Anvil
4. Install dependencies
5. Generate Prisma client
6. Run migrations
7. Run integration tests
8. Upload coverage reports
9. Upload test artifacts

**Required Secrets:**
- `BASE_SEPOLIA_RPC_URL`
- `PROTOCOL_REGISTRY_ADDRESS`
- `VALIDATION_REGISTRY_ADDRESS`
- `BOUNTY_POOL_ADDRESS`

---

## Test Data & Fixtures

### Test Wallets (Anvil Defaults)
All pre-funded with 10,000 ETH and 100,000 USDC:

| Role | Address |
|------|---------|
| Payer (PAYER_ROLE) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| Researcher (receives payments) | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Protocol Owner (deposits bounty) | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| Validator (submits validations) | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |

### Contract Addresses
- **USDC:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **ProtocolRegistry:** From environment variable
- **ValidationRegistry:** From environment variable
- **BountyPool:** From environment variable

### Test Protocols
- Total Bounty Pool: 10,000 USDC
- Available Bounty: 10,000 USDC
- Status: ACTIVE

### Test Vulnerabilities
- Default Severity: HIGH
- Default Bounty: 1,000 USDC
- Status: ACKNOWLEDGED

---

## Documentation

### Primary Documents
1. [README.md](./README.md) - Full integration test documentation
2. [QUICKSTART.md](./QUICKSTART.md) - 5-minute quick start guide
3. [TEST_COVERAGE.md](./TEST_COVERAGE.md) - This document

### Code Documentation
- Inline comments in test files
- Setup helper function documentation
- Configuration file comments

### External References
- [OpenSpec Phase 4](../../openspec/changes/phase-4-payment-automation/)
- [Jest Documentation](https://jestjs.io/)
- [Foundry Book](https://book.getfoundry.sh/)

---

## Maintenance

### Adding New Tests
1. Create test file in `tests/integration/`
2. Import setup helpers from `setup.ts`
3. Follow existing test structure
4. Add test to this coverage document
5. Update package.json scripts if needed

### Updating Test Data
- Modify helper functions in `setup.ts`
- Update wallet addresses if needed
- Adjust test parameters in individual tests

### Troubleshooting
See [QUICKSTART.md](./QUICKSTART.md) for common issues and solutions.

---

## Verification Checklist

Before releasing, verify:

- [ ] All 21 test cases pass
- [ ] Coverage meets targets (>80% line coverage)
- [ ] CI/CD pipeline passes
- [ ] No hanging processes after tests
- [ ] Database cleaned up after tests
- [ ] Redis queues cleared after tests
- [ ] Anvil stopped after tests
- [ ] Documentation is up to date

---

**Last Updated:** 2026-02-01
**Phase:** 4 - Payment Automation
**Status:** ✅ Complete
