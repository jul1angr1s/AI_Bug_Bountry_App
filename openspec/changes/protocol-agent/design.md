## Context

The platform already defines Protocol Agent responsibilities (protocol registration, bounty terms, pool funding) and exposes protocol APIs, but there is no dedicated feature surface tying UI, backend, and agent workflows together with reliable state tracking. This change adds a cohesive Protocol Agent feature that bridges dashboard UX, REST/WebSocket APIs, agent job orchestration (BullMQ), and on-chain interactions on Base Sepolia while keeping local Anvil for scan/validation flows.

## Goals / Non-Goals

**Goals:**
- Provide a unified Protocol Agent workflow for protocol registration, bounty term management, and pool funding across UI, API, and agent services.
- Persist protocol registration lifecycle and agent actions for auditability and recovery.
- Surface Protocol Agent status, queue progress, and funding events in the dashboard via REST + WebSocket.
- Integrate with existing ProtocolRegistry/BountyPool contracts on Base Sepolia without introducing new contracts.

**Non-Goals:**
- Implement new smart contracts or change on-chain protocol semantics.
- Replace existing Researcher/Validator workflows or local Anvil validation pipelines.
- Build advanced governance or multi-sig approval flows for protocol onboarding.

## Decisions

- **Decision: Use existing REST routes and extend payloads rather than add a new Protocol Agent namespace.**
  - *Rationale:* Existing API routes already map to protocol registration and funding; extending them minimizes surface area and preserves compatibility with the dashboard routing in `project/APIRoutes.md`.
  - *Alternatives Considered:* New `/protocol-agent/*` endpoints. Rejected to avoid redundancy and extra auth policy complexity.

- **Decision: Persist protocol-agent lifecycle and funding events in PostgreSQL via Prisma.**
  - *Rationale:* Enables auditability, retries, and reconciliation with on-chain state (Base Sepolia) using the existing database stack in `project/DatabaseSchema.md`.
  - *Alternatives Considered:* Store in Redis or only on-chain. Rejected because Redis is volatile and on-chain-only lacks UI-friendly query surfaces.

- **Decision: Queue Protocol Agent actions with BullMQ and emit WebSocket events for dashboard updates.**
  - *Rationale:* Consistent with current agent job architecture and real-time updates in `project/Workflows.md`.
  - *Alternatives Considered:* Direct synchronous execution from API. Rejected due to latency and failure handling constraints.

- **Decision: Keep chain interactions scoped to Base Sepolia for registration/funding and Local Anvil for validation.**
  - *Rationale:* Aligns with the hybrid deployment model described in `project/Architecture.md` and avoids widening the chain surface.
  - *Alternatives Considered:* Add Base Mainnet support in this change. Rejected to reduce complexity and risk.

## Risks / Trade-offs

- **[Risk] Agent task failures could leave protocol records in intermediate states** → *Mitigation:* Introduce explicit state transitions (PENDING → ACTIVE/FAILED) and retry policies; record failure reasons for recovery.
- **[Risk] On-chain funding events and DB state can drift** → *Mitigation:* Background reconciliation job to confirm tx receipts and update DB statuses.
- **[Risk] API abuse of protocol registration/funding routes** → *Mitigation:* Enforce auth, rate limiting, and input validation per `project/Security.md`.
- **[Risk] WebSocket event storms during bulk onboarding** → *Mitigation:* Debounce or batch agent status events and cap update frequency in the server.
