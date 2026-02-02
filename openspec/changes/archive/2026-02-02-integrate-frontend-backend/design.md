## Context

The frontend currently lacks wiring for protocol registration and agent status, and local development requires starting multiple services manually. Backend routes and queues exist (see `project/APIRoutes.md` and `project/Integration.md`), and auth is enforced via `requireAuth`. A design is needed to align frontend API usage, agent status updates, and a one-command dev bootstrap.

## Goals / Non-Goals

**Goals:**
- Provide a clear integration path for protocol registration and agent status in the frontend.
- Standardize auth flow: Supabase JWT passed to backend on protected routes.
- Deliver agent status updates in the UI (protocol + researcher) with a realtime-friendly option.
- Add a developer-friendly orchestration command to run the whole stack locally.

**Non-Goals:**
- No changes to smart contracts or chain interactions (Anvil/Sepolia unaffected).
- No redesign of backend business logic for protocol registration beyond integration needs.
- No new production deployment pipeline (local dev focus only).

## Decisions

1) **Frontend API client with JWT auth**
- **Decision:** Use Supabase session JWT in `Authorization: Bearer <token>` for protected backend routes.
- **Rationale:** Backend already uses `requireAuth`; aligns with `project/APIRoutes.md` auth model.
- **Alternatives:** Cookie-based sessions; backend-issued tokens. Rejected to avoid new auth system.

2) **Protocol registration flow uses existing REST endpoints**
- **Decision:** Frontend calls `POST /api/v1/protocols` for registration and reads status via `GET /api/v1/protocols/:id`.
- **Rationale:** Reuse existing API contract; avoids parallel flows.
- **Alternatives:** Direct agent commands or WebSocket-only registration. Rejected for higher complexity.

3) **Agent status via REST + optional Socket.io**
- **Decision:** Base UI on REST polling (`/api/v1/agents/:id/status`, and/or list endpoint) with an optional Socket.io channel for realtime updates.
- **Rationale:** REST is reliable for MVP; Socket.io provides realtime without blocking on backend event maturity.
- **Alternatives:** Only WebSocket. Rejected due to higher coupling and failure modes.

4) **Local dev orchestration script at repo root**
- **Decision:** Add a single command (e.g., `npm run dev:all` or `scripts/dev.sh`) that:
  - Starts docker services via `backend/docker-compose.yml` (Postgres/Redis)
  - Runs backend dev server (tsx watch) and frontend dev server (Vite)
  - Optionally starts agent processes if they are separate executables
- **Rationale:** Minimizes manual steps and creates a repeatable dev flow.
- **Alternatives:** Separate commands documented only. Rejected for low ergonomics.

## Risks / Trade-offs

- **[Auth mismatch or missing JWT]** → Provide clear env setup docs and surface 401s in UI with actionable messaging.
- **[Agent status incomplete for Researcher]** → Add backend support (DB-backed or worker heartbeat) and document limitations.
- **[Socket.io/event drift]** → Keep REST polling as the source of truth; use WS as a best-effort enhancer.
- **[Dev script fragility across OS]** → Prefer Node-based scripts (or npm-run-all) and keep Docker invocation minimal.

## Migration Plan

1) Add/confirm env vars for frontend (`VITE_API_URL`, Supabase keys) and backend (`SUPABASE_*`, `REDIS_URL`, `DATABASE_URL`).
2) Implement frontend API client and auth interceptor; wire protocol registration form to backend.
3) Implement agent status screens using REST; add WS subscription if available.
4) Create root orchestration command and update `SETUP_INSTRUCTIONS.md` or `project/Integration.md` with steps.
5) Verify end-to-end flow in dev and document any required seed data.

## Open Questions

- Where should researcher agent status be sourced (DB record, worker heartbeat, or queue health)?
- Is there an existing Socket.io event for agent status, or should one be added?
- Should the dev orchestration run backend in Docker or locally, and how should logs be streamed?

