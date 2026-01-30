## 1. Backend API & Validation

- [ ] 1.1 Backend: Extend `POST /api/v1/protocols` request schema to accept repo/contract/bounty fields and persist PENDING protocol state (ref: `project/APIRoutes.md`)
- [ ] 1.2 Backend: Implement duplicate GitHub URL detection and return 409 with error payload (ref: `project/APIRoutes.md`)
- [ ] 1.3 Backend: Add `POST /api/v1/protocols/:id/fund` handler to record funding intent and tx hash (ref: `project/APIRoutes.md`)
- [ ] 1.4 Backend: Add `GET /api/v1/agents` fields for Protocol Agent status, heartbeat, and current task (ref: `project/APIRoutes.md`)
- [ ] 1.5 Backend: Add `POST /api/v1/agents/:id/command` command schema for PAUSE/RESUME with auth checks (ref: `project/APIRoutes.md`)

## 2. Agent Orchestration (BullMQ)

- [ ] 2.1 Agents: Create Protocol Agent job processor for registration flow (clone repo, verify contract path, compile) (ref: `project/Workflows.md`)
- [ ] 2.2 Agents: Implement on-chain registration via ProtocolRegistry on Base Sepolia and persist tx hash (ref: `project/Architecture.md`)
- [ ] 2.3 Agents: Implement failure handling to mark protocol status FAILED with reason and emit notifications (ref: `project/Workflows.md`)
- [ ] 2.4 Agents: Implement pause/resume command handling for Protocol Agent queue processing (ref: `project/Workflows.md`)

## 3. Database & Audit Logging

- [ ] 3.1 Backend: Extend Prisma models for protocol registration state, funding events, and audit log entries (ref: `project/DatabaseSchema.md`)
- [ ] 3.2 Backend: Record audit entries for registration attempts and funding submissions (include protocolId, action, txHash) (ref: `project/Security.md`)
- [ ] 3.3 Backend: Add reconciliation job to confirm Base Sepolia tx receipts and update protocol status (ref: `project/Architecture.md`)

## 4. Frontend Dashboard

- [ ] 4.1 Frontend: Add protocol onboarding UI form with GitHub URL, contract path/name, and bounty terms inputs (ref: `project/Workflows.md`)
- [ ] 4.2 Frontend: Add funding status and tx hash display to protocol details view (ref: `project/APIRoutes.md`)
- [ ] 4.3 Frontend: Add Protocol Agent status card with current task/heartbeat (ref: `project/Workflows.md`)

## 5. Real-time Events & Security

- [ ] 5.1 Backend: Emit WebSocket events for protocol status changes and agent status transitions (ref: `project/APIRoutes.md`)
- [ ] 5.2 Frontend: Subscribe to `agents` and `protocols` WebSocket rooms to refresh status in UI (ref: `project/Workflows.md`)
- [ ] 5.3 Backend: Enforce rate limiting and input validation on registration and funding routes (ref: `project/Security.md`)
