# Proposal: Manual E2E Testing Workflow OpenSpec

## Summary

Create a formal OpenSpec specification to consolidate the Phase 4 Manual End-to-End Testing Workflow currently documented in validation reports into a discoverable, reusable testing specification.

## Problem

The AI Bug Bounty Platform validation report (completed Feb 6, 2026) includes a comprehensive **Phase 4: Manual End-to-End Demonstration Test** (60-90 minutes) that walks through the complete system workflow with all services running. This critical testing procedure is documented in:

- `VALIDATION_REPORT.md` (Phase 4, lines 234-393)
- `Improvement_plan.md` (Phase 4, same content)
- `docs/DEMONSTRATION.md` (detailed step-by-step instructions)

### Current Issues

1. **Buried in Validation Documentation**: The testing workflow is embedded in validation reports rather than being a standalone specification
2. **Not Discoverable**: Developers cannot easily find the testing procedure before demonstrations
3. **Not Reusable**: The workflow is documented but not formalized as a testing specification
4. **Not Tracked**: This critical testing procedure has no formal specification in the OpenSpec framework
5. **Not Integrated**: The workflow exists separately from the automated testing specifications in `openspec/specs/testing.md`

### Impact

Without a formal specification:
- Developers may skip manual testing before demonstrations
- Testing procedures may be forgotten or evolve inconsistently
- Pre-demonstration readiness cannot be formally verified
- The workflow cannot evolve as the system changes

## Solution

Create a new OpenSpec specification (`openspec/specs/manual-e2e-testing.md`) that:

1. **Formalizes the Workflow**: Structure the Phase 4 manual testing as a proper specification with requirements and scenarios
2. **Makes it Discoverable**: Users can find and reference the testing spec within the OpenSpec framework
3. **Enables Reusability**: The spec can be used as a pre-demonstration checklist by any developer
4. **Tracks Evolution**: As a living specification, it can be updated as the system changes
5. **Integrates with Testing**: Links the manual E2E workflow with automated testing specs

### Structure

Create a new change that adds:

```
openspec/specs/manual-e2e-testing.md   # New base specification (primary output)
  ├─ Overview & Purpose
  ├─ When to Run (before demos, before deployment, after major changes)
  ├─ Duration (60-90 minutes)
  ├─ Prerequisites Checklist
  ├─ 8-Step Manual Workflow
  │  ├─ Step 1: Start all services (6 terminals)
  │  ├─ Step 2: Register agents (researcher, validator)
  │  ├─ Step 3: Fund researcher escrow
  │  ├─ Step 4: Register protocol
  │  ├─ Step 5: Monitor scan progress
  │  ├─ Step 6: Verify findings created
  │  ├─ Step 7: Watch validation
  │  ├─ Step 8: Verify payment & reputation
  ├─ Frontend UI Verification URLs
  ├─ Success Criteria
  ├─ Troubleshooting Guide
  └─ Integration with Automated E2E Testing
```

And a change structure with:

```
openspec/changes/2026-02-07-manual-e2e-testing-workflow/
├─ .openspec.yaml         # Change metadata
├─ proposal.md            # This document
├─ design.md              # How the spec will be structured
├─ tasks.md               # Implementation breakdown
└─ specs/manual-e2e-testing/
   └─ spec.md             # GIVEN-WHEN-THEN scenarios
```

## Benefits

### Immediate
- ✅ Formal testing specification ready for use before demonstrations
- ✅ Pre-demonstration checklist developers can reference
- ✅ Integrated into OpenSpec framework
- ✅ GIVEN-WHEN-THEN scenarios for all critical workflows

### Long-term
- ✅ Specification evolves with system changes
- ✅ Blueprint for future automated E2E test implementation
- ✅ Trackable testing procedures in version control
- ✅ Reduced pre-demonstration errors

## Scope

### In Scope
- ✅ Formalize Phase 4 manual testing workflow
- ✅ Create prerequisites checklist
- ✅ Document 8-step workflow with cURL examples
- ✅ List frontend UI verification URLs
- ✅ Include success criteria and troubleshooting guide
- ✅ Write GIVEN-WHEN-THEN scenarios
- ✅ Update testing.md with reference

### Out of Scope
- ❌ Automate the manual E2E test (future work)
- ❌ Create Docker Compose E2E automation (separate change)
- ❌ Implement Playwright tests (separate change)
- ❌ Modify any backend code
- ❌ Change demonstration workflow

## Success Criteria

- ✅ New base spec `openspec/specs/manual-e2e-testing.md` created
- ✅ Spec contains complete Phase 4 workflow from validation plan
- ✅ Includes all curl commands and API endpoints
- ✅ Has prerequisites checklist with verification steps
- ✅ Lists frontend verification URLs
- ✅ Includes success criteria and troubleshooting section
- ✅ GIVEN-WHEN-THEN scenarios written for all steps
- ✅ `openspec/specs/testing.md` updated with reference
- ✅ Change follows OpenSpec conventions

## Effort Estimate

| Phase | Task | Effort |
|-------|------|--------|
| 1 | Create change directory structure | 15 min |
| 2 | Write proposal.md | ✓ (this) |
| 3 | Write design.md | 15 min |
| 4 | Write tasks.md | 15 min |
| 5 | Write spec.md with GIVEN-WHEN-THEN | 30 min |
| 6 | Create base spec manual-e2e-testing.md | 45 min |
| 7 | Update testing.md reference | 15 min |
| 8 | Verify and finalize | 15 min |
| **Total** | **~2.5 hours** | |

## Risk Analysis

### Low Risk
- ✅ Pure documentation changes
- ✅ No code modifications
- ✅ No infrastructure changes
- ✅ Content sourced from existing documentation

### Mitigation
- Verify Phase 4 workflow content matches DEMONSTRATION.md
- Ensure all curl commands are tested
- Include troubleshooting for common issues

## Related Work

### Source Documentation
- `VALIDATION_REPORT.md` - Phase 4 manual test procedures
- `Improvement_plan.md` - Phase 4 detailed steps
- `docs/DEMONSTRATION.md` - Complete workflow guide
- `docs/ARCHITECTURE.md` - System architecture context

### Related Specifications
- `openspec/specs/testing.md` - Automated testing (unit, integration, E2E)
- `openspec/specs/workflows.md` - System workflows (registration, scanning, payment)
- `openspec/specs/development-standards.md` - Development practices

### Future Work
- Automated E2E tests using Playwright or similar
- Docker Compose-based FirstFlight simulation
- CI/CD integration for pre-deployment validation
- Monitoring and alerting for production deployments

## Next Steps

1. ✅ Approve this proposal
2. → Create design.md (architectural approach)
3. → Create tasks.md (implementation breakdown)
4. → Write spec.md with GIVEN-WHEN-THEN scenarios
5. → Create openspec/specs/manual-e2e-testing.md
6. → Update openspec/specs/testing.md reference
7. → Archive this change
