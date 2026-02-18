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

- [ ] 3.1 (Docs/CI, TDD) Add a parity check script/test that fails when documented commands are missing from `package.json` scripts; wire it in CI workflow.
- [ ] 3.2 (Docs) Correct mismatched command/config claims in `README.md`, `CONTRIBUTING.md`, `docs/TESTING.md`, `docs/ARCHITECTURE.md`, and deployment docs to match executable behavior.
- [ ] 3.3 (CI) Update `.github/workflows/pr-validation.yml` and/or `.github/workflows/test.yml` so documented required checks match actual enforced checks.
- [ ] 3.4 (PR process) Add worktree-based implementation guidance and evidence requirements in `docs/pr-guidelines`-related docs with references to this change.

## 4. Worktree, Background Agent, and Integration Orchestration

- [ ] 4.1 (Process) Create isolated worktrees for Stream A, B, and C from `main`, with explicit owners and file-scope boundaries documented in change notes.
- [ ] 4.2 (Process) Run stream work in parallel using background agents for bounded tasks (tests/docs/parity checks), with integration owner resolving merges in a dedicated integration worktree.
- [ ] 4.3 (Integration) Merge streams into integration worktree, run full affected suites (`backend`, `frontend`, `e2e` as applicable), and record evidence links in this task file.

## 5. Railway Validation Gates and Final Spec Sync

- [ ] 5.1 (Railway) For auth/session and runtime-affecting changes, run Railway CLI validation (`railway status`, `railway logs`, targeted health/API checks) and capture evidence.
- [ ] 5.2 (Railway/API) Validate impacted request/response schemas against deployed behavior for critical endpoints (auth, scan, payment) and update `docs/API_ROUTES.md`.
- [x] 5.3 (OpenSpec) After each implemented stream, update this change’s spec/task checkboxes and ensure `openspec status --change repository-security-architecture-hardening` remains consistent.
- [ ] 5.4 (Release gate) Mark change ready for apply only after tests pass, Railway validations pass, and all capability deltas are satisfied with traceable evidence.
