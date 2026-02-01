# OpenSpec Changes Archive

This directory contains archived OpenSpec changes that are no longer active. Changes are archived when they are:
- Completed and merged
- Superseded by new approaches
- Misaligned with current project direction
- Abandoned or deprecated

## Archive Format

Archived changes are stored in directories with the format: `YYYY-MM-DD-change-name/`

Each archived change should include an `ARCHIVE_REASON.md` file explaining:
- Why it was archived
- When it was archived
- What replaced it (if applicable)
- What components can be salvaged

## Active Archives

### 2026-02-01: phase-4-payment-automation
**Reason**: Major architectural mismatch with demonstration workflow
**Archived**: 2026-02-01
**Replaced By**:
- `validator-proof-based` - LLM-based proof validation
- `payment-worker-completion` - Simplified payment automation

**Summary**: Original spec assumed on-chain validation execution, but demonstration workflow requires proof-based validation with Kimi 2.5 LLM. Archived for major redesign.

### 2026-01-31: add-researcher-agent
**Reason**: Experimental iteration, superseded by new agent architecture
**Archived**: 2026-01-31

### 2026-01-30: dashboard-ui
**Reason**: Completed and merged, specs integrated into main
**Archived**: 2026-01-30

### 2026-01-31: phase-3b-smart-contracts
**Reason**: Smart contracts deployed and verified
**Archived**: 2026-01-31

## Retrieving Archived Changes

If you need to reference an archived change:
1. Navigate to the archived directory
2. Read the `ARCHIVE_REASON.md` for context
3. Check the original specs and tasks for implementation details
4. Review what can be salvaged before reimplementing

## Archival Process

When archiving a change:
1. Move directory to `openspec/changes/archive/YYYY-MM-DD-change-name/`
2. Create `ARCHIVE_REASON.md` with explanation
3. Update this README with archive entry
4. Commit with message: `docs(openspec): Archive [change-name] - [brief reason]`
