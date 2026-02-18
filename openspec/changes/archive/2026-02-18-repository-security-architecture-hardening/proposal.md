## Why

The repository has strong product ambition and broad coverage, but key gaps in authentication hardening, architecture boundaries, and docs-to-runtime consistency block production-grade confidence. This change standardizes those areas so the codebase can be operated and reviewed at professional standards.

## What Changes

- Harden SIWE/session security with strict server-side message validation, replay protection, and safer token handling.
- Enforce safer auth and CSRF/SSE patterns for browser and API paths.
- Decompose oversized route/client modules and separate worker execution concerns for cleaner architecture and scaling.
- Align docs, scripts, CI, and runtime behavior so repository claims are always executable and testable.
- Establish mandatory TDD workflow, isolated git worktrees per stream, and Railway validation gates before merge.
- Introduce implementation orchestration rules for parallel background agents with explicit ownership boundaries.

## Capabilities

### New Capabilities
- `repo-professionalization-governance`: Introduce repository-level governance requirements for documentation truthfulness, CI parity, and release readiness.

### Modified Capabilities
- `security`: Tighten authentication/session, CSRF, and SSE security requirements.
- `architecture`: Define process boundaries and decomposition requirements for high-risk large modules.
- `testing`: Enforce TDD-first development and required regression coverage for security/financial flows.
- `development-standards`: Require docs/commands/config parity with executable repository state.
- `pr-guidelines`: Require worktree-isolated change streams and staged merge sequencing.

## Impact

- **Backend**: `backend/src/routes/auth.routes.ts`, `backend/src/lib/auth-token.ts`, `backend/src/middleware/csrf.ts`, `backend/src/middleware/sse-auth.ts`, route decomposition under `backend/src/routes/`, worker startup topology in `backend/src/server.ts`.
- **Frontend**: `frontend/src/lib/backend-auth.ts`, `frontend/src/lib/api.ts`, auth/session flow in `frontend/src/lib/auth.tsx`.
- **Data**: monetary precision model updates in `backend/prisma/schema.prisma` and related services/tests.
- **CI/Docs**: `.github/workflows/*.yml`, `README.md`, `CONTRIBUTING.md`, `docs/*.md` parity fixes.
- **Infrastructure**: Railway CLI-based smoke/regression gates for staged deployments.
- **Chains affected**: **Both** (Anvil and Base Sepolia) due to payment/auth/testing workflow guarantees.

## Security Considerations

- Authentication hardening must prevent SIWE replay and domain/chain mismatch acceptance.
- Token persistence and SSE auth transport must minimize credential exposure surface.
- CSRF protection must not silently degrade on bearer-authenticated browser flows.
- Financial paths MUST keep idempotency and precision guarantees.

## Dependencies

- Existing capabilities in `openspec/specs/security.md`, `openspec/specs/architecture.md`, `openspec/specs/testing.md`, `openspec/specs/development-standards.md`, and `openspec/specs/pr-guidelines.md`.
- Existing Railway deployment model (`docs/deployment/railway.md`) and CI workflows (`.github/workflows/`).
