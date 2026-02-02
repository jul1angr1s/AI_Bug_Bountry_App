## Why

The frontend is not yet wired to the backend workflows that matter most (protocol registration, agent status, authenticated access), and manual startup makes local development slow and error-prone. This change aligns the UI with existing backend APIs and provides a one-command dev bootstrap so the system can be exercised end-to-end.

## What Changes

- Connect the frontend to backend API routes for protocol registration and agent status (Protocol + Researcher agents) in dev.
- Standardize frontend auth (Supabase JWT) to call backend routes that require authentication.
- Wire agent status updates from realtime channel(s) to the UI (WebSocket or existing status endpoints).
- Add a local-dev orchestration script to start frontend, backend, agents, database, and required services in one command.
- Clarify environment configuration for API base URL and auth in dev.

## Capabilities

### New Capabilities
- `protocol-registration-flow`: Frontend-to-backend integration for creating protocol registrations via the Protocol Agent.
- `agent-status-monitoring`: UI + realtime updates for Protocol and Researcher agent status.
- `local-dev-orchestration`: One-command startup for the full stack (frontend, backend, agents, database, Redis, etc.).

### Modified Capabilities
- `frontend`: Require authenticated API usage for protocol and agent features; add integration wiring and UI states.
- `api`: Document/confirm auth expectations and agent status endpoints used by the frontend.

## Impact

- Components: Frontend (React + TanStack Query + Zustand), Backend (Express routes, auth middleware), Agents status reporting, Dev tooling/scripts.
- APIs: `/api/v1/protocols`, `/api/v1/agents`, `/api/v1/health` (status surface), and WebSocket `/ws` if used for agent status. (See `project/APIRoutes.md`.)
- Realtime: Align with current integration/event model in `project/Integration.md` and `project/Workflows.md`.
- Chains: None (no Anvil/Sepolia changes).
- Dependencies: Requires existing Supabase auth setup and backend agent status reporting to be available for the UI.
- Dependencies (OpenSpec): Overlaps with `backend-api-foundation` (frontend auth/API wiring), `protocol-agent` (protocol onboarding + agent status UI), and `dashboard-api-endpoints` (agent status data). This change focuses on integration glue and local dev orchestration.
