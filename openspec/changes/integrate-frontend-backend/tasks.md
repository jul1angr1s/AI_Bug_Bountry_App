## 1. Backend Auth + Agent Status Surface

- [x] 1.1 Backend: defer to `openspec/changes/protocol-agent/tasks.md` (Tasks 1.4–1.5) for agent routes/auth alignment
- [x] 1.2 Backend: defer to `openspec/changes/dashboard-api-endpoints/tasks.md` (Tasks 5.1–5.7) for researcher agent status surface
- [x] 1.3 Backend: defer to `openspec/changes/backend-api-foundation/tasks.md` (Tasks 15.7–15.9) for API docs and auth expectations

## 2. Frontend API Client + Auth

- [x] 2.1 Frontend: defer to `openspec/changes/backend-api-foundation/tasks.md` (Tasks 14.1–14.8) for API client/auth/WebSocket wiring
- [x] 2.2 Frontend: defer to `openspec/changes/backend-api-foundation/tasks.md` (Tasks 14.2–14.4, 14.8) for error states and auth UX
- [x] 2.3 Frontend: defer to `openspec/changes/backend-api-foundation/tasks.md` (Task 14.1) for `VITE_API_URL` wiring

## 3. Protocol Registration Flow

- [x] 3.1 Frontend: defer to `openspec/changes/protocol-agent/tasks.md` (Tasks 4.1–4.2) for protocol registration UI wiring
- [x] 3.2 Frontend: defer to `openspec/changes/protocol-agent/tasks.md` (Tasks 4.1–4.2) for status display after creation

## 4. Agent Status Monitoring

- [x] 4.1 Frontend: defer to `openspec/changes/protocol-agent/tasks.md` (Task 4.3) and `openspec/changes/dashboard-api-endpoints/tasks.md` (Task 5.1+) for agent status UI + data
- [x] 4.2 Frontend: defer to `openspec/changes/protocol-agent/tasks.md` (Task 5.2) for Socket.io agent status updates

## 5. Local Dev Orchestration

- [x] 5.1 DevOps: create root-level script/command to run full stack (docker services + backend + frontend + agents) using `backend/docker-compose.yml` as base
- [x] 5.2 DevOps: ensure idempotent startup and simple readiness output (health checks/logs) per `openspec/changes/integrate-frontend-backend/specs/local-dev-orchestration/spec.md`
- [x] 5.3 Docs: update `SETUP_INSTRUCTIONS.md` with the new single-command dev workflow
