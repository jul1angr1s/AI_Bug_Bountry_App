# Design: Manual E2E Testing Workflow Specification

## Overview

This design document describes the structure, content, and approach for creating the Manual E2E Testing Workflow specification (`openspec/specs/manual-e2e-testing.md`).

## Problem Statement

The current Phase 4 manual E2E testing workflow is documented in validation reports but is not integrated into the formal OpenSpec framework. This makes it:
- Hard to discover
- Not easily updatable
- Disconnected from automated testing specs
- Not trackable as a formal specification

## Solution Approach

### 1. Specification Structure

The manual E2E testing specification will follow OpenSpec conventions with clear sections:

```markdown
# Manual E2E Testing Workflow Specification

## Overview
- Purpose: Pre-demonstration and pre-deployment validation
- Duration: 60-90 minutes
- When to run: Before demonstrations, before production deploys, after major changes
- Scope: End-to-end workflow including all services and agents

## Prerequisites Checklist
- Infrastructure ready (PostgreSQL, Redis, migrations)
- Backend health checks
- Contract balance verification
- Environment variables configured

## 8-Step Manual Workflow
1. Start all services (6 terminals)
2. Register agents
3. Fund researcher escrow
4. Register protocol
5. Monitor scan progress
6. Verify findings created
7. Watch validation
8. Verify payment & reputation

## Frontend UI Verification
- Lists all URLs to verify
- Expected states and data

## Success Criteria
- All services start
- Agents register
- Scan finds vulnerabilities
- Payment executes
- Reputation updates

## Troubleshooting Guide
- Common issues and solutions

## Integration with Automated Testing
- Note about future automation
- Link to testing.md
```

### 2. Content Structure

Each section will include:

#### Prerequisites Checklist
- PostgreSQL running and accessible
- Redis running with authentication
- All 4 database migrations applied
- Environment variables configured
- BountyPool has >= 50 USDC
- Payer wallet funded with ETH

#### Step-by-Step Workflow
- **Step 1**: Start all services (backend, frontend, Redis check)
  - Terminal 1: Backend API
  - Terminal 2: Frontend
  - Terminal 3: Researcher agent
  - Terminal 4: Validator agent
  - Terminal 5: Payment worker
  - Terminal 6: Monitoring
- **Step 2**: Register agents via API/Frontend
  - Researcher agent registration
  - Validator agent registration
  - Verification via API
- **Step 3**: Fund researcher escrow
  - Deposit 5 USDC (for 10 submissions)
  - Verify balance
- **Step 4**: Register protocol (Thunder Loan)
  - Protocol registration endpoint
  - x.402 payment handling
  - Verification
- **Step 5**: Monitor scan progress
  - GitHub clone
  - Slither analysis
  - AI analysis
  - Finding submission
- **Step 6**: Verify findings
  - Check database for findings
  - Verify PENDING_VALIDATION status
  - Count findings
- **Step 7**: Validator agent validates
  - Proof decryption
  - LLM validation
  - Reputation updates
- **Step 8**: Payment execution
  - BountyPool payment
  - On-chain USDC transfer
  - Reputation leaderboard update

#### Frontend Verification URLs
- `/agents` - Agent registry
- `/agents/:id/escrow` - Escrow dashboard
- `/agents/:id/reputation` - Reputation tracker
- `/protocols` - Protocol listing
- `/scans` - Scan monitoring
- `/payments` - Payment tracking
- `/x402-payments` - Payment timeline

#### Success Criteria
Specific, verifiable conditions:
- All services start without errors (logs show "listening" or "ready")
- Both agents register successfully (GET /api/v1/agent-identities returns both)
- Researcher escrow shows correct balance
- Protocol registered (GET /api/v1/protocols returns Thunder Loan)
- Scan completes and finds >= 1 vulnerability
- Findings created with PENDING_VALIDATION status
- Validator validates at least 1 finding
- Payment executes on-chain (cast call confirms transfer)
- Researcher reputation > 0 (GET /api/v1/agents/:id/reputation)
- Frontend displays all data correctly

#### Troubleshooting Section
- Redis connection errors
- Agent worker startup failures
- Payment contract reverts
- Insufficient pool balance
- Network timeouts
- Database migration issues

### 3. GIVEN-WHEN-THEN Scenarios

The specification will include scenarios for:

**Requirement: Manual E2E test completes successfully**
- Scenario: All services start and agents register
- Scenario: Protocol registration with x.402 payment
- Scenario: Researcher scans and finds vulnerabilities
- Scenario: Validator validates findings
- Scenario: Payment executes on-chain
- Scenario: Reputation updates correctly

**Requirement: Prerequisites validation passes**
- Scenario: Database migration check succeeds
- Scenario: Redis connection verification passes
- Scenario: Environment variables configured
- Scenario: Contract balances adequate

**Requirement: Troubleshooting guide covers common issues**
- Scenario: Redis connection fails
- Scenario: Agent worker fails to start
- Scenario: Payment contract revert
- Scenario: Insufficient pool balance

### 4. Source Material

Content will be extracted from:
- `DEMONSTRATION.md` (lines 100-300+): Detailed step-by-step workflow
- `VALIDATION_REPORT.md` (Phase 4, lines 234-393): Validation procedures
- `Improvement_plan.md` (Phase 4, same content): Detailed walkthrough
- `docs/DEMONSTRATION.md` (full file): Complete API reference

### 5. Integration Points

The specification will:
- Link to `openspec/specs/testing.md` in E2E Testing section
- Reference `openspec/specs/workflows.md` for workflow details
- Link to `openspec/specs/agents.md` for agent types
- Reference `openspec/specs/database.md` for data models
- Link to `docs/DEMONSTRATION.md` for complete API reference

### 6. File Organization

#### Change Directory Structure
```
openspec/changes/2026-02-07-manual-e2e-testing-workflow/
├─ .openspec.yaml              # Change metadata
├─ proposal.md                 # Problem & solution
├─ design.md                   # This document
├─ tasks.md                    # Implementation breakdown
└─ specs/manual-e2e-testing/
   └─ spec.md                  # GIVEN-WHEN-THEN scenarios
```

#### Final Output
```
openspec/specs/manual-e2e-testing.md   # New base specification
```

## Design Decisions

### Decision 1: Separate Specification
**Option A**: Add to existing `testing.md`
- Pro: All testing in one place
- Con: Makes testing.md too large, mixes manual and automated

**Option B**: Create new `manual-e2e-testing.md` ✅ **CHOSEN**
- Pro: Focused purpose, easy to reference
- Pro: Can be used standalone as checklist
- Pro: Natural place for manual testing procedures

### Decision 2: Change vs Direct Spec Creation
**Option A**: Create only the base spec
- Pro: Faster implementation
- Con: No tracking of the specification creation work

**Option B**: Create change first, then base spec ✅ **CHOSEN**
- Pro: Work is tracked and documented
- Pro: Can be reviewed and archived
- Pro: Follows standard OpenSpec workflow

### Decision 3: Content Level of Detail
**Option A**: High-level overview only
- Pro: Shorter document
- Con: Not actionable as standalone checklist

**Option B**: Complete step-by-step with curl commands ✅ **CHOSEN**
- Pro: Actionable checklist developers can follow
- Pro: Includes all API endpoints and examples
- Pro: Enables new team members to run tests

## Implementation Plan

### Phase 1: Change Structure (15 min)
- ✅ Create directory structure
- ✅ Create .openspec.yaml
- ✅ Create proposal.md
- → Create design.md (this document)
- → Create tasks.md

### Phase 2: Specification Content (75 min)
- → Create specs/manual-e2e-testing/spec.md with GIVEN-WHEN-THEN
- → Create openspec/specs/manual-e2e-testing.md base specification
- → Update openspec/specs/testing.md with reference

### Phase 3: Verification (15 min)
- → Review content for completeness
- → Verify curl commands
- → Check links and references
- → Ensure OpenSpec compliance

### Phase 4: Finalization (15 min)
- → Create git commit
- → Archive the change
- → Update CLAUDE.md with completion note

## Verification Checklist

After implementation, verify:

- ✅ `openspec/specs/manual-e2e-testing.md` exists
- ✅ Contains all 8 workflow steps
- ✅ Includes prerequisites checklist
- ✅ Has all curl examples and API endpoints
- ✅ Lists frontend verification URLs
- ✅ Includes success criteria
- ✅ Has troubleshooting section
- ✅ GIVEN-WHEN-THEN scenarios written
- ✅ Links to related specs
- ✅ testing.md updated with reference
- ✅ Change follows OpenSpec conventions

## Success Criteria

- The specification is used by developers before demonstrations
- New team members can follow the spec to validate system
- Developers reference the spec in pre-deployment checklists
- The specification is updated when system workflows change

## Next Steps

1. ✅ Review and approve this design
2. → Finalize tasks.md
3. → Write spec.md with GIVEN-WHEN-THEN scenarios
4. → Create openspec/specs/manual-e2e-testing.md
5. → Update openspec/specs/testing.md
6. → Archive this change
