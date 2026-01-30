## 1. Database & Persistence

- [ ] 1.1 (Backend) Add Prisma models/migrations for scans, findings, proofs, and agent run metadata; update `project/DatabaseSchema.md`-aligned schema in `backend/prisma/schema.prisma`.
- [ ] 1.2 (Backend) Implement data access layer for scan lifecycle updates and proof storage in `backend/src/db/` (or existing repository layer), per `project/DatabaseSchema.md`.

## 2. Backend API & Realtime

- [ ] 2.1 (Backend) Implement POST `/api/v1/scans` with Zod validation (request: { protocolId, branch?, commitHash? }) and response `{ scanId, state }` in `backend/src/routes/scans.ts`, per `project/APIRoutes.md`.
- [ ] 2.2 (Backend) Implement GET `/api/v1/scans/:id` response `{ id, state, currentStep, startedAt?, finishedAt?, findingsSummary }` in `backend/src/routes/scans.ts`, per `project/APIRoutes.md`.
- [ ] 2.3 (Backend) Implement GET `/api/v1/scans/:id/progress` (SSE) and emit step updates `{ scanId, step, status, timestamp }` in `backend/src/routes/scans.ts`, per `project/APIRoutes.md`.
- [ ] 2.4 (Backend) Implement DELETE `/api/v1/scans/:id` to cancel scans (response `{ id, state: "canceled" }`) and propagate cancel signal to workers via Redis in `backend/src/routes/scans.ts` and queue layer, per `project/APIRoutes.md`.
- [ ] 2.5 (Backend) Emit WebSocket events `scan:started`, `scan:progress`, `scan:completed` from worker updates in `backend/src/ws/` (or existing socket layer), per `project/APIRoutes.md`.

## 3. Researcher Agent Worker

- [ ] 3.1 (Agents/Backend) Implement Researcher Agent worker process with job loop, queue consumption, and lifecycle state updates in `backend/src/agents/researcher/` and queue workers in `backend/src/queues/`, per `project/Workflows.md`.
- [ ] 3.2 (Agents) Implement scan pipeline steps (clone, compile, deploy to Anvil, static analysis, proof generation) using existing tooling wrappers in `backend/src/agents/researcher/steps/`, per `project/Workflows.md` and `project/Subagents.md`.
- [ ] 3.3 (Agents) Implement proof submission to Validator Agent via Redis PubSub `PROOF_SUBMISSION` with payload `{ scanId, protocolId, commitHash, proofRef, signature }` in `backend/src/agents/researcher/transport/`, per `project/Subagents.md`.
- [ ] 3.4 (Agents/Backend) Add structured error codes, retry policy, and timeouts in worker config (BullMQ), and persist failures to scan records, per `project/Workflows.md`.

## 4. Security & Audit

- [ ] 4.1 (Backend/Agents) Implement proof encryption + researcher signing flow and store key metadata in `backend/src/agents/researcher/crypto/`, per `project/Security.md`.
- [ ] 4.2 (Backend) Add audit logging for scan creation, step transitions, proof submissions, and cancellations in `backend/src/audit/`, per `project/Security.md`.
- [ ] 4.3 (Agents) Sanitize repository inputs and enforce sandboxed execution boundaries in `backend/src/agents/researcher/sandbox/`, per `project/Security.md`.

## 5. Frontend Updates

- [ ] 5.1 (Frontend) Add scan status UI and progress indicators in `frontend/src/pages/` and `frontend/src/components/` consuming `/scans/:id` and SSE updates, per `project/Workflows.md`.
- [ ] 5.2 (Frontend) Add findings list view tied to scan results and validation status in `frontend/src/pages/` and `frontend/src/components/`, per `project/APIRoutes.md`.
