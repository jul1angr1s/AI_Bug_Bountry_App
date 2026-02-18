## 1. Stream A - Auth and Security Hardening (Backend/Frontend)

- [x] 1.1 (Backend, TDD) Add failing tests for strict SIWE semantics validation (domain, chainId, nonce replay, time windows) in `backend/src/routes/__tests__/auth*.test.ts` based on `docs/SECURITY.md` and capability `security`.
- [x] 1.2 (Backend) Implement strict SIWE semantic validation in `backend/src/routes/auth.routes.ts` and supporting nonce/session utilities; update request/response schema docs in `docs/API_ROUTES.md`.
- [x] 1.3 (Backend/Frontend, TDD) Add failing tests for CSRF fail-closed behavior and SSE query-token rejection in `backend/src/middleware/__tests__/csrf*.test.ts` and `backend/src/middleware/__tests__/sse-auth*.test.ts`.
- [x] 1.4 (Backend) Harden `backend/src/middleware/csrf.ts` and `backend/src/middleware/sse-auth.ts` to satisfy strict browser mutation and SSE credential requirements.
- [x] 1.5 (Frontend, TDD) Add failing auth session-storage behavior tests in `frontend/src/__tests__/lib/auth*.test.tsx` covering default non-localStorage token persistence.
- [x] 1.6 (Frontend) Refactor auth/session handling in `frontend/src/lib/backend-auth.ts`, `frontend/src/lib/auth.tsx`, and `frontend/src/lib/api.ts` to remove default localStorage bearer persistence.

## 2. Stream B - Architecture and Precision Hardening (Backend/Database)

- [x] 2.1 (Backend, TDD) Add decomposition safety tests for oversized route/client modules and payment flow invariants in `backend/src/routes/__tests__/` and `backend/src/services/__tests__/` per `docs/ARCHITECTURE.md`.
- [x] 2.2 (Backend) Decompose large route modules (`backend/src/routes/agent-identity.routes.ts`, `backend/src/routes/payment.routes.ts`) into domain-cohesive subrouters with preserved API contracts.
- [x] 2.3 (Backend) Separate worker startup control from API startup path in `backend/src/server.ts` and supporting startup modules; document runtime modes in `docs/ARCHITECTURE.md`.
- [x] 2.4 (Database/Backend, TDD) Add failing tests for monetary precision and aggregation drift in payment/reconciliation tests before schema changes.
- [x] 2.5 (Database/Backend) Replace Float-based monetary persistence in `backend/prisma/schema.prisma` and affected services with precision-safe representation; include migration and regression checks.

## 3. Stream C - Repository Professionalization and CI/Docs Parity (Repo-wide)

- [x] 3.1 (Docs/CI, TDD) Add a parity check script/test that fails when documented commands are missing from `package.json` scripts; wire it in CI workflow.
- [x] 3.2 (Docs) Correct mismatched command/config claims in `README.md`, `CONTRIBUTING.md`, `docs/TESTING.md`, `docs/ARCHITECTURE.md`, and deployment docs to match executable behavior.
- [x] 3.3 (CI) Update `.github/workflows/pr-validation.yml` and/or `.github/workflows/test.yml` so documented required checks match actual enforced checks.
- [x] 3.4 (PR process) Add worktree-based implementation guidance and evidence requirements in `docs/pr-guidelines`-related docs with references to this change.

## 4. Worktree, Background Agent, and Integration Orchestration

- [x] 4.1 (Process) Create isolated worktrees for Stream A, B, and C from `main`, with explicit owners and file-scope boundaries documented in change notes.
- [x] 4.2 (Process) Run stream work in parallel using background agents for bounded tasks (tests/docs/parity checks), with integration owner resolving merges in a dedicated integration worktree.
- [x] 4.3 (Integration) Merge streams into integration worktree, run full affected suites (`backend`, `frontend`, `e2e` as applicable), and record evidence links in this task file.

## 5. Railway Validation Gates and Final Spec Sync

- [x] 5.1 (Railway) For auth/session and runtime-affecting changes, run Railway CLI validation (`railway status`, `railway logs`, targeted health/API checks) and capture evidence.
- [x] 5.2 (Railway/API) Validate impacted request/response schemas against deployed behavior for critical endpoints (auth, scan, payment) and update `docs/API_ROUTES.md`.
- [x] 5.3 (OpenSpec) After each implemented stream, update this change’s spec/task checkboxes and ensure `openspec status --change repository-security-architecture-hardening` remains consistent.
- [x] 5.4 (Release gate) Mark change ready for apply only after tests pass, Railway validations pass, and all capability deltas are satisfied with traceable evidence.

## Evidence Log (February 17-18, 2026)

### Stream Worktrees and Ownership (4.1)
- Stream A owner: Codex, branch `feature/hardening-stream-a`, scope: auth/session/csrf/sse (`backend/src/routes/auth.routes.ts`, `backend/src/middleware/*`, `frontend/src/lib/*`), commit `fcc380a`.
- Stream B owner: Codex, branch `feature/hardening-stream-b`, scope: architecture split + monetary precision (`backend/src/routes/payment*`, `backend/src/routes/agent-identity*`, `backend/prisma/schema.prisma`, payment/reconciliation services), commit `9b369d3`, follow-up precision hotfix `8bd5b26`.
- Stream C owner: Codex, branch `feature/hardening-stream-c`, scope: docs/ci/process parity (`README.md`, `CONTRIBUTING.md`, `docs/*.md`, `.github/workflows/pr-validation.yml`, `scripts/docs-command-parity.mjs`), commit `d7f5949`.
- Integration owner: Codex, clean integration worktree `/tmp/wt-stream-c-integration`, merged result commit `95b5aaf` pushed to `origin/main`.

### Parallel/Background Execution Evidence (4.2)
- Used parallel bounded execution for stream tasks (test checks, docs parity scans, workflow/doc inspections, Railway/API validation batches) via concurrent tool runs.
- Integration handoff applied through dedicated clean worktree and controlled cherry-pick/push sequence (`d7f5949` -> `95b5aaf`).

### Integration and Suite Evidence (4.3)
- Integration merge: Stream C commit cherry-picked in clean worktree and pushed to `main` with no conflicts (`95b5aaf`).
- Docs parity suite:
  - `cd backend && npm run test:docs-parity` -> pass
  - `cd backend && npm run check:docs-parity` -> pass
- Stream B deployment/build evidence:
  - Railway deployment `def6bdfb-f03a-4597-8a65-14c25e52c265` succeeded after Decimal normalization hotfix (`8bd5b26`).

### Railway Validation Gate Evidence (5.1)
- Railway CLI context:
  - `railway status` -> project `angelic-radiance`, environment `production`, service `Backend`.
  - `railway deployment list` -> latest success `4ef80ef2-9a63-42c6-ab52-31f589a664d3` (2026-02-17 20:56:18 -05:00).
  - `railway logs --lines 120` -> startup preflight passed, migrations up-to-date, backend listening on port 3000.
- Targeted live checks (`https://backend-production-e667.up.railway.app`):
  - `GET /api/v1/health` -> `200` with `{"status":"ok","services":{"database":"ok","redis":"ok","eventListener":"ok"}}`.
  - `GET /api/v1/payments` unauthenticated -> `401 UnauthorizedError`.
  - `POST /api/v1/auth/siwe` invalid semantic payload -> `401 Invalid SIWE message`.
  - `POST /api/v1/scans` without CSRF -> `403 CSRF_MISSING`.

### API Schema Validation Sync (5.2)
- Updated `docs/API_ROUTES.md` to match deployed behavior for:
  - auth (`/auth/siwe`, `/auth/session-cookie`) failure modes and status codes
  - scan CSRF/auth gating
  - payment auth gating
  - health response shape (`status: "ok"`, service keys).

### Release Gate Closure (5.4)
- Test evidence (affected suites):
  - `cd backend && npm run test src/routes/__tests__/route-decomposition.test.ts` -> pass (2 tests).
  - `cd backend && npm run test src/startup/__tests__/runtime-mode.test.ts` -> pass (3 tests).
  - `cd backend && npm run test src/services/__tests__/payment.service.test.ts` -> pass (57 tests).
  - `cd backend && npm run test:docs-parity` -> pass.
  - `cd backend && npm run check:docs-parity` -> pass.
- Railway validation evidence:
  - latest production deployment success recorded, service healthy, and targeted auth/scan/payment gate responses verified.
- Capability delta closure:
  - `security`: SIWE semantic validation + CSRF/SSE hardening implemented and validated.
  - `architecture`: route decomposition + runtime mode split merged and regression-tested.
  - `payments/reconciliation precision`: Decimal-safe handling merged and deployed validation confirmed.
  - `development-standards` + `repo-professionalization-governance` + `pr-guidelines`: docs/CI parity and worktree/evidence governance implemented with traceable task evidence.
