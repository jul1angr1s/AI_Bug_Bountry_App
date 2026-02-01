# Archive Reason: phase-4-payment-automation

**Archived**: 2026-02-01
**Reason**: Major architectural mismatch with demonstration workflow requirements

## Why Archived

This OpenSpec change was created with the assumption of on-chain validation execution in sandboxed environments. However, the demonstration workflow specification (`/project/FirstFlightDemonstration.md`) requires a different approach:

### Original Approach (Archived)
- ValidationRegistry contract records validation results on-chain
- Validator Agent executes exploits in sandboxed Anvil instances
- On-chain validation triggers automatic payment
- Complex reconciliation between on-chain and off-chain states

### New Approach (Aligned with Demo)
- **Proof-based validation** using Kimi 2.5 local LLM for analysis
- NO sandbox execution required for MVP
- Validator analyzes proof logic instead of executing code
- Simpler payment flow: VALIDATED finding → Queue payment → Execute on-chain
- Focus on demonstration workflow speed (<3 minutes end-to-end)

## Key Misalignments

1. **LLM Integration**: Original spec doesn't mention Kimi 2.5 local LLM usage for validation
2. **Sandbox Complexity**: Original spec requires complex sandbox management, not needed for proof-based validation
3. **On-chain Validation**: Original spec assumes ValidationRegistry contract writes, but demo uses simpler off-chain validation
4. **Timeline**: Original spec is over-engineered for 14-day demo timeline

## Replacement Changes

The archived change is replaced by:
- `validator-proof-based` - Simplified proof analysis with Kimi 2.5 LLM
- `payment-worker-completion` - Streamlined payment automation without complex reconciliation
- `demonstration-workflow` - Orchestrates complete demo flow

## What Can Be Salvaged

From the original spec, these components are still valuable:
- ✅ Payment queue infrastructure (BullMQ setup)
- ✅ USDC client for balance checks
- ✅ BountyPool integration for payment execution
- ✅ Payment API endpoints (with minor modifications)
- ✅ Frontend payment history component

## What Should Be Redesigned

These components need major revision:
- ❌ ValidationRegistry on-chain integration (not needed for MVP)
- ❌ Sandbox deployment and execution logic (replaced by LLM proof analysis)
- ❌ Complex reconciliation service (simplified for proof-based approach)
- ❌ Event listener for ValidationRecorded (not using on-chain validation for MVP)

## Next Steps

1. Create `validator-proof-based` spec with LLM-based proof analysis
2. Create `payment-worker-completion` spec with simplified payment flow
3. Implement proof-based validation in Validator Agent worker
4. Integrate payment automation without on-chain validation dependencies

## References

- Source of truth: `/project/FirstFlightDemonstration.md`
- New orchestration: `/openspec/changes/demonstration-workflow/`
- Implementation plan: Phase 2 of demonstration workflow
