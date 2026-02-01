# Demonstration Workflow - Complete End-to-End Flow

**Status**: In Progress
**Created**: 2026-02-01
**Owner**: System
**Related**: FirstFlightDemonstration.md specification

## Overview

Transform the AI Bug Bounty Platform from mock data demonstration to full end-to-end workflow demonstration. This change orchestrates the complete journey: Protocol Owner visits site → Registers protocol → System triggers automated agents → Scanning → Validation → Payment.

## Goal

Enable the complete Thunder Loan vulnerability detection demonstration with:
- ✅ Real backend integration (no mock data)
- ✅ Automated agent workflow (Protocol → Researcher → Validator → Payment)
- ✅ Real-time dashboard updates via WebSocket
- ✅ Proof-based validation using Kimi 2.5 local LLM
- ✅ On-chain payment execution on Base Sepolia

## Key Constraints

- ✅ Reuse existing deployed contracts (BountyPool, Thunder Loan on Base Sepolia)
- ✅ No new smart contract deployments required
- ✅ Use Kimi 2.5 local LLM for AI analysis (no Quimera integration for MVP)
- ✅ Researcher agent already has solid LLM capabilities
- ✅ Validator uses proof-based validation (no contract execution in sandbox for MVP)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEMONSTRATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PROTOCOL REGISTRATION (Frontend → Backend → Protocol Agent) │
│     • User submits GitHub URL + contract details                │
│     • Backend creates Protocol record (status=PENDING)          │
│     • Protocol Agent queued automatically                        │
│                                                                  │
│  2. PROTOCOL ANALYSIS (Protocol Agent)                          │
│     • Clone repository from GitHub                              │
│     • Verify contract path exists                               │
│     • Compile with Foundry                                      │
│     • Calculate risk score                                      │
│     • Update status → ACTIVE, trigger Researcher Agent          │
│                                                                  │
│  3. VULNERABILITY SCANNING (Researcher Agent)                   │
│     • Deploy fresh contract to local Anvil                      │
│     • Analyze with Kimi 2.5 local LLM                          │
│     • Generate exploit proof-of-concept                         │
│     • Create Finding record                                     │
│     • Submit to Validator Agent queue                           │
│                                                                  │
│  4. PROOF VALIDATION (Validator Agent)                          │
│     • Fetch proof from researcher                               │
│     • Analyze proof logic with Kimi 2.5 LLM                    │
│     • Validate exploit steps against contract                   │
│     • Calculate confidence score                                │
│     • Update Finding (VALIDATED/INVALID)                        │
│     • Trigger Payment queue if validated                        │
│                                                                  │
│  5. PAYMENT PROCESSING (Payment Worker)                         │
│     • Validate payment eligibility                              │
│     • Check bounty pool balance                                 │
│     • Submit transaction to BountyPool contract                 │
│     • Monitor confirmation                                      │
│     • Update Payment record with txHash                         │
│     • Listen for BountyReleased event                           │
│                                                                  │
│  6. DASHBOARD UPDATES (WebSocket Real-time)                     │
│     • protocol:registered → Protocols list                      │
│     • scan:progress → Scans page                                │
│     • vuln:discovered → Dashboard stats                         │
│     • validation:complete → Validations page                    │
│     • payment:released → Payments page                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

This change orchestrates multiple sub-changes:

1. **`frontend-demonstration-pages`** - UI components for the demonstration
2. **`researcher-agent-completion`** - Complete researcher agent with Kimi 2.5
3. **`validator-proof-based`** - Validator agent using proof analysis
4. **`payment-worker-completion`** - Payment automation and reconciliation

## Success Metrics

- ✅ User can register Thunder Loan protocol in <30 seconds
- ✅ Protocol Agent completes analysis in <60 seconds
- ✅ Researcher Agent finds oracle manipulation vulnerability
- ✅ Validator Agent successfully validates exploit proof
- ✅ Payment processes and completes on-chain
- ✅ Dashboard updates in real-time throughout workflow
- ✅ Zero mock data in production build

## Files Modified

See individual sub-change specs for detailed file lists.

## Dependencies

**External:**
- Base Sepolia testnet access (for reading existing contracts)
- BountyPool smart contract (already deployed - 0x...)
- Thunder Loan contracts (already deployed - 0x...)
- Kimi 2.5 local LLM running on http://localhost:11434

**Internal:**
- Redis running for queues
- PostgreSQL database
- WebSocket server configured
- Frontend build pipeline

## Testing Strategy

1. **Unit Tests**: Each component tested independently
2. **Integration Tests**: Agent pipeline tested end-to-end
3. **E2E Test**: Full Thunder Loan demonstration
4. **Load Test**: Verify system handles multiple protocols

## Timeline

- **Phase 0** (Day 1): OpenSpec cleanup and alignment ← **CURRENT**
- **Phase 1** (Days 2-6): Core demonstration UI
- **Phase 2** (Days 7-9): Validation & payment integration
- **Phase 3** (Days 10-14): Testing & polish

## Related Changes

- `backend-api-foundation` - Foundation complete ✅
- `dashboard-api-endpoints` - Stats endpoints complete ✅
- `protocol-agent` - Protocol registration complete ✅
- `integrate-frontend-backend` - Integration complete ✅

## References

- `/project/FirstFlightDemonstration.md` - Source of truth for demonstration workflow
- `/project/Architecture.md` - System architecture
- `/project/Workflows.md` - Agent workflows
