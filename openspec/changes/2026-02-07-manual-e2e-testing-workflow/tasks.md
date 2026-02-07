# Tasks: Manual E2E Testing Workflow Implementation

## Overview

These tasks break down the implementation of the Manual E2E Testing Workflow OpenSpec into atomic, verifiable steps. Each task includes success criteria and verification steps.

---

## Phase 1: GIVEN-WHEN-THEN Specification (Est. 30 min)

### Task 1.1: Write Manual E2E Prerequisites Scenario
**Description**: Create GIVEN-WHEN-THEN scenarios for prerequisites validation

**Steps**:
1. Create `specs/manual-e2e-testing/spec.md`
2. Write scenario: "Manual E2E test prerequisites pass before test starts"
   - GIVEN: PostgreSQL is running on localhost:5432
   - GIVEN: Redis is running with authentication (redis_dev_2024)
   - GIVEN: All 4 database migrations applied
   - WHEN: Tester verifies prerequisites
   - THEN: Database connection confirmed
   - THEN: Redis PING returns PONG
   - THEN: All environment variables set

**Verification**:
- [ ] File created: `specs/manual-e2e-testing/spec.md`
- [ ] Scenario documented with GIVEN-WHEN-THEN format
- [ ] All preconditions specified

---

### Task 1.2: Write Service Startup Scenario
**Description**: Document scenarios for starting all required services

**Steps**:
1. Write scenario: "All services start and become ready"
   - GIVEN: Prerequisites validated
   - GIVEN: 6 terminal windows available
   - WHEN: Backend API started (terminal 1)
   - WHEN: Frontend started (terminal 2)
   - WHEN: Researcher agent started (terminal 3)
   - WHEN: Validator agent started (terminal 4)
   - WHEN: Payment worker started (terminal 5)
   - WHEN: Monitoring terminal ready (terminal 6)
   - THEN: Backend logs show "listening on port 3000"
   - THEN: Frontend logs show "Local: http://localhost:5173"
   - THEN: Researcher agent shows "Agent started, waiting for tasks"
   - THEN: Validator agent shows "Agent started, waiting for tasks"
   - THEN: Payment worker shows "Worker ready"
   - THEN: Redis connection verified in all services

**Verification**:
- [ ] Scenario documented with specific log messages
- [ ] All 6 services listed
- [ ] Startup verification criteria specified

---

### Task 1.3: Write Agent Registration Scenario
**Description**: Document scenarios for registering researcher and validator agents

**Steps**:
1. Write scenario: "Agents register successfully via API"
   - GIVEN: All services running
   - WHEN: POST /api/v1/agent-identities/register with researcher wallet
   - WHEN: POST /api/v1/agent-identities/register with validator wallet
   - THEN: Response HTTP 200 with agentId and nftId
   - THEN: GET /api/v1/agent-identities returns both agents
   - THEN: Researcher agent shows type=RESEARCHER, status=ACTIVE
   - THEN: Validator agent shows type=VALIDATOR, status=ACTIVE

2. Write scenario: "Frontend displays registered agents"
   - GIVEN: Agents registered
   - WHEN: Navigate to http://localhost:5173/agents
   - THEN: Agent table shows 2 rows (researcher, validator)
   - THEN: Both agents show NFT IDs
   - THEN: Type badges display correctly
   - THEN: Status shows ACTIVE

**Verification**:
- [ ] Both API and UI scenarios documented
- [ ] curl command examples included
- [ ] Expected API response structure specified

---

### Task 1.4: Write Escrow Funding Scenario
**Description**: Document researcher escrow funding workflow

**Steps**:
1. Write scenario: "Researcher deposits USDC to escrow"
   - GIVEN: Researcher agent registered
   - GIVEN: Researcher has 5+ USDC
   - WHEN: POST /api/v1/agent-identities/:researcherId/escrow/deposit with amount=5000000
   - THEN: Response HTTP 200 with balance=5000000
   - THEN: GET /api/v1/agent-identities/:researcherId/escrow shows:
     - balance: 5000000
     - totalDeposited: 5000000
     - remainingSubmissions: 10
     - submissionFee: 500000

2. Write scenario: "Frontend shows escrow dashboard"
   - GIVEN: Researcher funded escrow
   - WHEN: Navigate to http://localhost:5173/agents/:researcherId/escrow
   - THEN: Dashboard shows balance=5 USDC
   - THEN: Shows remaining submissions=10
   - THEN: Shows deposit history with transaction
   - THEN: Shows submission fee deductions (initially empty)

**Verification**:
- [ ] API endpoint documented with request/response format
- [ ] Decimal handling documented (6-decimal USDC units)
- [ ] Frontend verification URLs included

---

### Task 1.5: Write Protocol Registration Scenario
**Description**: Document Thunder Loan protocol registration with x.402 payment

**Steps**:
1. Write scenario: "Protocol registration with x.402 payment gate"
   - GIVEN: Escrow funded (for payment processing)
   - GIVEN: BountyPool funded (for findings)
   - WHEN: POST /api/v1/protocols without payment
   - THEN: Response HTTP 402 Payment Required
   - THEN: Response body includes x402 payment terms:
     - amount: 1000000 (1 USDC)
     - asset: USDC contract address
     - chain: base-sepolia
     - memo: "Protocol registration fee"
   - WHEN: Pay 1 USDC on-chain via USDC transfer
   - WHEN: POST /api/v1/protocols with X-Payment-Receipt header (txHash)
   - THEN: Response HTTP 201
   - THEN: Response includes protocolId and registeredAt timestamp
   - THEN: GET /api/v1/protocols returns protocol in list

2. Write scenario: "Protocol registration without payment gate (demo mode)"
   - GIVEN: SKIP_X402_PAYMENT_GATE=true
   - WHEN: POST /api/v1/protocols with name, githubUrl, branch, contractPath
   - THEN: Response HTTP 201 (no 402)
   - THEN: Protocol registered immediately
   - THEN: Scan triggered automatically

**Verification**:
- [ ] Both demo and payment modes documented
- [ ] x.402 response structure specified
- [ ] API curl examples included

---

### Task 1.6: Write Scan Progress Scenario
**Description**: Document scan execution and progress monitoring

**Steps**:
1. Write scenario: "Scan executes and creates findings"
   - GIVEN: Protocol registered
   - WHEN: Scan triggered automatically
   - WHEN: Monitor /scans endpoint
   - THEN: Scan shows status=IN_PROGRESS
   - THEN: Scan shows stage=CLONING_REPO, then DEPLOYING, then ANALYZING, then VALIDATING
   - THEN: Frontend shows terminal output in real-time (/scans page)
   - THEN: After ~5 minutes, scan status=COMPLETED
   - THEN: GET /api/v1/findings?protocolId=X returns created findings
   - THEN: Findings have status=PENDING_VALIDATION
   - THEN: Researcher escrow balance reduced by 0.5 USDC per finding submitted

2. Write scenario: "Frontend displays scan progress"
   - GIVEN: Scan running
   - WHEN: Navigate to http://localhost:5173/scans
   - THEN: Scan appears in list with protocol name
   - THEN: Progress bar shows 0% → 100%
   - THEN: Current stage displays (Cloning, Deploying, etc.)
   - THEN: Terminal output section shows live logs
   - THEN: After completion, findings count shown
   - THEN: Findings appear in findings list

**Verification**:
- [ ] Scan stages documented
- [ ] Finding submission fee deductions documented
- [ ] Frontend verification URLs included
- [ ] Expected timeline (5 min) documented

---

### Task 1.7: Write Validation Scenario
**Description**: Document validator agent validation workflow

**Steps**:
1. Write scenario: "Validator agent validates findings"
   - GIVEN: Findings created with status=PENDING_VALIDATION
   - GIVEN: Validator agent running
   - WHEN: Validator agent checks for pending findings
   - WHEN: Validator decrypts proof (if x.402 enabled)
   - WHEN: Validator agent uses LLM to validate findings
   - WHEN: Validator agent submits validation with confidence scores
   - THEN: Finding status changes to VALIDATED or REJECTED
   - THEN: Validator escrow balance updated (fee deducted, reward added)
   - THEN: Agent reputation score updated (finding:validator_reputation)

2. Write scenario: "Frontend displays validation results"
   - GIVEN: Findings validated
   - WHEN: Navigate to http://localhost:5173/scans/:scanId
   - THEN: Findings list shows validated findings
   - THEN: Each finding shows validation status badge
   - THEN: Shows validator agent address and score
   - THEN: Shows on-chain reputation link

**Verification**:
- [ ] Validation workflow steps documented
- [ ] Reputation scoring explained
- [ ] Frontend verification URLs included

---

### Task 1.8: Write Payment Scenario
**Description**: Document payment execution workflow

**Steps**:
1. Write scenario: "Payment executes and researcher receives USDC"
   - GIVEN: Findings validated
   - GIVEN: Payer wallet funded with ETH
   - GIVEN: BountyPool funded with >= 50 USDC
   - WHEN: Payment worker processes bounty payment
   - WHEN: BountyPool.releaseBounty() called on-chain
   - THEN: USDC transferred to researcher wallet on-chain
   - THEN: Payment status=COMPLETED with txHash
   - THEN: On-chain confirmation via cast call shows balance increased
   - THEN: Researcher reputation score increased

2. Write scenario: "Frontend displays payment completion"
   - GIVEN: Payment executed
   - WHEN: Navigate to http://localhost:5173/payments
   - THEN: Payment appears in list with COMPLETED status
   - THEN: Shows amount, recipient, and txHash
   - THEN: Navigate to http://localhost:5173/x402-payments
   - THEN: Payment timeline shows all x.402 transactions
   - WHEN: Click payment in list
   - THEN: Details show researcher, validator, amount, txHash

3. Write scenario: "Reputation updates correctly"
   - GIVEN: Payment completed
   - WHEN: GET /api/v1/agents/:researcherId/reputation
   - THEN: reputation > 0
   - THEN: totalEarnings shows payment amount
   - THEN: validationCount increased
   - WHEN: Navigate to http://localhost:5173/agents/:researcherId/reputation
   - THEN: Dashboard shows reputation score
   - THEN: Shows earnings leaderboard position
   - THEN: Shows finding history with payments

**Verification**:
- [ ] On-chain verification step included
- [ ] Frontend verification URLs specified
- [ ] Reputation calculation explained

---

## Phase 2: Base Specification (Est. 45 min)

### Task 2.1: Create Manual E2E Testing Base Spec
**Description**: Create the main specification file `openspec/specs/manual-e2e-testing.md`

**Steps**:
1. Create file: `/openspec/specs/manual-e2e-testing.md`
2. Add sections:
   - Overview (purpose, duration, when to run, scope)
   - Source Documentation (links to DEMONSTRATION.md, VALIDATION_REPORT.md)
   - Prerequisites Checklist (9 items with verification commands)
   - 8-Step Manual Workflow (with curl commands and expected outputs)
   - Frontend UI Verification (7 URLs with expected states)
   - Success Criteria (9 specific, verifiable conditions)
   - Troubleshooting Guide (common issues and solutions)
   - Integration with Automated Testing (future roadmap)

**Content Sources**:
- `DEMONSTRATION.md` - Step details and API examples
- `VALIDATION_REPORT.md` - Phase 4 procedures
- `Improvement_plan.md` - Detailed walkthrough
- `docs/ARCHITECTURE.md` - Context for workflows

**Verification**:
- [ ] File created at correct path
- [ ] All 8 steps documented
- [ ] Prerequisites section complete
- [ ] All curl examples included and tested
- [ ] Frontend URLs verified
- [ ] Success criteria specific and measurable

---

### Task 2.2: Update Testing Specification Reference
**Description**: Update `openspec/specs/testing.md` to reference the new manual E2E spec

**Steps**:
1. Read current `openspec/specs/testing.md`
2. Find "E2E Testing" or "End-to-End" section
3. Add reference to manual-e2e-testing.md:
   ```markdown
   ### Manual End-to-End Testing Workflow
   See [Manual E2E Testing Specification](./manual-e2e-testing.md) for pre-demonstration and pre-deployment validation procedures.
   ```
4. Add to "Change Specifications" section:
   ```markdown
   - Manual E2E Testing (openspec/specs/manual-e2e-testing.md)
   ```
5. Update E2E section to clarify relationship:
   - Automated E2E: Docker Compose, FirstFlight simulation, CI/CD integration
   - Manual E2E: Pre-demo checklist, team validation, system readiness

**Verification**:
- [ ] testing.md updated with reference
- [ ] Link format matches other OpenSpec links
- [ ] Clarification added on manual vs automated E2E

---

## Phase 3: Verification (Est. 15 min)

### Task 3.1: Verify Specification Completeness
**Description**: Verify the specification is complete and usable

**Steps**:
1. Read through manual-e2e-testing.md completely
2. Verify all 8 steps documented
3. Verify all curl commands present
4. Verify all frontend URLs listed
5. Verify success criteria are measurable
6. Verify troubleshooting section covers common issues
7. Check all links to related specifications work

**Verification Checklist**:
- [ ] All sections present (9 required sections)
- [ ] All curl examples provided
- [ ] All frontend URLs documented
- [ ] Success criteria are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- [ ] Troubleshooting covers >=5 common issues
- [ ] Links to DEMONSTRATION.md, testing.md, workflows.md
- [ ] Duration estimate (60-90 min) documented

---

### Task 3.2: Verify OpenSpec Conventions
**Description**: Ensure specification follows OpenSpec standards

**Steps**:
1. Verify change structure follows conventions:
   - .openspec.yaml present with required fields
   - proposal.md, design.md, tasks.md present
   - specs/manual-e2e-testing/spec.md with GIVEN-WHEN-THEN
2. Verify spec follows naming conventions:
   - File name: manual-e2e-testing.md
   - Header structure consistent
   - Section ordering logical
3. Verify links use relative paths:
   - Links to other specs use ./spec-name.md format
   - Links to files use proper paths
4. Verify formatting:
   - Headers use proper hierarchy (# ## ### ####)
   - Code blocks use proper syntax highlighting
   - Tables formatted correctly

**Verification Checklist**:
- [ ] .openspec.yaml complete
- [ ] All required markdown files present
- [ ] GIVEN-WHEN-THEN format used in spec.md
- [ ] Relative links correct
- [ ] Markdown formatting valid
- [ ] No broken links

---

## Phase 4: Finalization (Est. 15 min)

### Task 4.1: Create Git Commit
**Description**: Commit the new specification to version control

**Steps**:
1. Stage files:
   ```bash
   git add openspec/specs/manual-e2e-testing.md
   git add openspec/changes/2026-02-07-manual-e2e-testing-workflow/
   git add openspec/specs/testing.md
   ```
2. Create commit message:
   ```
   docs(openspec): add manual E2E testing workflow specification

   Create new OpenSpec specification for Manual End-to-End Testing Workflow,
   consolidating Phase 4 validation procedures into a discoverable, reusable
   specification for pre-demonstration and pre-deployment validation.

   - Add openspec/specs/manual-e2e-testing.md with complete workflow
   - Include 8-step procedure with all curl commands and API examples
   - Add prerequisites checklist and success criteria
   - Include troubleshooting guide for common issues
   - Update openspec/specs/testing.md with reference
   - Create change structure for proper tracking
   ```
3. Push to feature branch
4. Create PR if following pull request workflow

**Verification**:
- [ ] All files staged correctly
- [ ] Commit message clear and descriptive
- [ ] No unrelated changes included

---

### Task 4.2: Update Completion Status
**Description**: Mark change as completed

**Steps**:
1. Update .openspec.yaml:
   - status: completed
   - completed: 2026-02-07
   - artifacts all marked completed: true
2. (Optional) Create ARCHIVE_REASON.md:
   ```markdown
   # Archive Reason

   This change is complete. The Manual E2E Testing Workflow specification
   has been created as a base specification at openspec/specs/manual-e2e-testing.md
   and is now a living document in the OpenSpec framework.

   ## Outputs
   - openspec/specs/manual-e2e-testing.md (main specification)
   - openspec/changes/2026-02-07-manual-e2e-testing-workflow/ (change tracking)
   - Updated openspec/specs/testing.md with reference

   ## Status
   - ✅ Specification created and integrated
   - ✅ GIVEN-WHEN-THEN scenarios documented
   - ✅ Ready for use by development team
   ```

**Verification**:
- [ ] .openspec.yaml updated
- [ ] Status set to "completed"
- [ ] Date recorded

---

## Success Criteria

All tasks complete when:

✅ **Specification Created**
- Manual E2E testing spec created at openspec/specs/manual-e2e-testing.md
- All 8 steps documented with curl examples
- Prerequisites checklist complete
- Success criteria defined
- Troubleshooting guide included

✅ **GIVEN-WHEN-THEN Scenarios Written**
- Task 1.1-1.8 all completed with formal scenarios
- Scenarios cover prerequisites, startup, registration, escrow, protocol, scan, validation, and payment

✅ **Integration Complete**
- testing.md updated with reference
- Links to related specifications work
- Change follows OpenSpec conventions

✅ **Ready for Use**
- Developers can follow spec as pre-demo checklist
- New team members can use to understand system
- Specification is discoverable in OpenSpec framework
- All curl commands tested and working

---

## Timeline

| Phase | Duration | Target |
|-------|----------|--------|
| 1: GIVEN-WHEN-THEN | 30 min | Task 1.1-1.8 |
| 2: Base Spec | 45 min | Task 2.1-2.2 |
| 3: Verification | 15 min | Task 3.1-3.2 |
| 4: Finalization | 15 min | Task 4.1-4.2 |
| **Total** | **~2.5 hours** | **Complete** |

---

## Notes

- All curl commands reference localhost:3000 (backend) and localhost:5173 (frontend)
- Wallet addresses should be replaced with actual test wallets
- USDC amounts use 6-decimal format (1 USDC = 1000000)
- Terminal output expectations match actual service logs
- Troubleshooting covers Redis, database, agent startup, and contract issues
