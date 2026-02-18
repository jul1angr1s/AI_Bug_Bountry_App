## Context

The platform is a modular monolith with coupled API + worker startup and large route/client files. Security posture is partially hardened but SIWE validation, session storage strategy, and CSRF/SSE behavior still permit avoidable risk. Documentation breadth is strong, but operational trust is reduced by examples and commands that do not match executable scripts/config.

Stakeholders:
- Product/demo owners who need stable Railway deployments
- Security reviewers and auditors
- Contributors who rely on docs, CI, and PR workflows

Constraints:
- Keep current stack (Node/Express/Prisma/React/Vite/Railway)
- Preserve current user-visible workflow behavior unless explicitly hardened
- Implement via isolated, testable workstreams

## Goals / Non-Goals

**Goals:**
- Deliver explicit security requirements for SIWE/session/CSRF/SSE behavior.
- Reduce architecture risk by splitting oversized modules and separating worker concerns where required.
- Enforce TDD plus deterministic verification gates on local and Railway paths.
- Make docs/CI/runtime mutually consistent and trustworthy.
- Enable parallel implementation using isolated git worktrees and background agents.

**Non-Goals:**
- Full platform re-architecture to microservices.
- Migration off Supabase, BullMQ, or Railway.
- Broad UI redesign unrelated to security/architecture/governance concerns.

## Decisions

### Decision 1: Use one umbrella hardening change with capability deltas
- **Why**: Findings are cross-cutting; one governing change gives shared acceptance criteria while still enabling parallel execution.
- **Alternative considered**: Multiple tiny changes. Rejected due to cross-dependencies and inconsistent acceptance boundaries.

### Decision 2: Implement in parallel streams using isolated git worktrees
- **Why**: Minimizes merge conflict and allows independent validation.
- **Pattern**:
  - Stream A: Auth and security middleware hardening
  - Stream B: Architecture decomposition and precision model cleanup
  - Stream C: Docs/CI/professionalization parity
- **Alternative considered**: Single branch serial work. Rejected due to slower cycle time and larger integration risk.

### Decision 3: TDD is mandatory per stream
- **Why**: Security and financial behavior changes require executable proof before implementation.
- **Definition of done per task**:
  - add/adjust failing tests first
  - implement minimal fix
  - run focused suite, then relevant regression suite
  - update spec/tasks checkboxes only after green tests
- **Alternative considered**: Post-implementation tests. Rejected due to regression risk.

### Decision 4: Railway validation as merge gate for production-facing paths
- **Why**: Local-only confidence is insufficient; repo is currently operated through Railway CLI.
- **Gate**: for changed flows, verify deploy health, targeted API behavior, and key logs using Railway CLI before merge.
- **Alternative considered**: CI-only checks. Rejected because environment drift can hide issues.

### Decision 5: Background agent coordination model
- **Why**: Requested higher execution efficiency with parallelism.
- **Model**:
  - one owning engineer per stream
  - background agents execute scoped test/doc checks and produce evidence artifacts
  - owner integrates and resolves conflicts in integration worktree
- **Alternative considered**: unrestricted parallel edits across same files. Rejected due to high merge risk.

## Risks / Trade-offs

- **[Risk] Cross-stream integration conflicts** -> **Mitigation**: strict file ownership map per stream and integration branch rebases twice daily.
- **[Risk] Security hardening breaks demo flows** -> **Mitigation**: preserve explicit compatibility tests for existing login/scan/payment flows.
- **[Risk] Added process overhead from TDD/worktrees** -> **Mitigation**: limit to high-risk paths; keep tasks atomic.
- **[Risk] Railway checks slow delivery** -> **Mitigation**: run targeted smoke gates only for impacted routes/services.

## Migration Plan

1. Create three worktrees from main, one per stream.
2. For each stream, write/enable failing tests first.
3. Implement smallest change to pass tests.
4. Run stream-local suites and mandatory shared regression suites.
5. Update stream tasks and capability spec deltas with completion evidence.
6. Merge streams into integration worktree; rerun full affected suite.
7. Execute Railway CLI validation gates for impacted components.
8. Merge to main only when all stream and integration gates are green.

Rollback strategy:
- Revert stream-specific merge commit(s) independently.
- For Railway deployment regressions, roll back to last successful deployment and reopen stream tasks.

## Open Questions

- Should session storage move entirely to HttpOnly cookie flow (no localStorage fallback) in this cycle or as a phased follow-up?
- Do we enforce separate deploy units for API vs workers now, or first enforce startup guards in the monolith?
- Which Railway environment (staging vs production) is the required gate for this hardening cycle?
