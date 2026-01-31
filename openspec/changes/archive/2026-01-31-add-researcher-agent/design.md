## Context

The system defines a Researcher Agent in specs and workflows, but lacks a running implementation that schedules scans, executes analysis, and produces proofs for the Validator Agent. This change spans Agents, Backend, Database, and Frontend updates, and must integrate with Redis/BullMQ, Supabase/Postgres, Socket.io, and local Anvil (31337). No on-chain changes are expected; the scope is off-chain orchestration and storage.

## Goals / Non-Goals

**Goals:**
- Implement a Researcher Agent runtime that can continuously pull scan jobs, execute a deterministic scan pipeline, and submit encrypted proofs to the Validator Agent.
- Provide observable, resumable scan lifecycle states (queued, running, failed, succeeded) in the DB and real-time UI updates.
- Keep scan execution isolated and reproducible with local Anvil deployment per scan.
- Align agent-to-agent communication with the existing Redis PubSub message contract.

**Non-Goals:**
- Redesign the on-chain bounty/payment contracts or validation registry.
- Build new vulnerability detection engines beyond initial static analysis tooling.
- Replace the Validator Agent flow or its proof verification responsibilities.

## Decisions

- **Agent runtime hosted as a backend worker process.**
  - Rationale: BullMQ is already part of the stack; a worker process fits existing infra and deployment patterns.
  - Alternatives: long-lived MCP daemon outside the backend (more operational overhead), or in-process API worker (less isolation).

- **Scan pipeline modeled as an explicit job state machine in Postgres.**
  - Rationale: supports retries, auditability, and UI progress; avoids implicit state in queues.
  - Alternatives: queue-only tracking (harder to recover), or file-based logs (not queryable).

- **Per-worker Anvil instances with deterministic reset between scans.**
  - Rationale: balances isolation and speed; supports concurrency without port collisions.
  - Alternatives: single shared Anvil (risk of state bleed), or per-scan ephemeral Anvil (high startup overhead).

- **Proof storage as encrypted payload + metadata in DB, blob stored via existing IPFS/Pinata path.**
  - Rationale: keeps payload tamper-evident and portable; aligns with current IPFS usage.
  - Alternatives: Supabase Storage (simpler but less interoperable), or DB-only (costly, harder to stream).

- **Agent-to-agent handoff via Redis PubSub message types already defined.**
  - Rationale: avoids introducing a new messaging bus; consistent with agent contracts.
  - Alternatives: direct HTTP callbacks (tighter coupling) or new queue topics (duplicate routing logic).

## Risks / Trade-offs

- **[Resource contention on local Anvil]** → Mitigation: cap concurrent workers, allocate dedicated ports per worker, implement reset and health checks.
- **[Long-running scans blocking queue throughput]** → Mitigation: per-stage timeouts, progressive status updates, and backoff retries.
- **[Proof encryption key management ambiguity]** → Mitigation: define a concrete key exchange in specs, store key metadata alongside proof.
- **[False positives from static analysis]** → Mitigation: flag findings with confidence scores; require validator confirmation before any user-facing "confirmed" state.

## Migration Plan

1. Add DB schema changes (scan jobs, findings, proofs, agent runs) via Prisma migration.
2. Deploy backend with Researcher worker disabled behind a feature flag.
3. Validate end-to-end scan in a staging environment (one protocol, one worker).
4. Enable scheduler and scale worker replicas gradually.
5. Monitor queue depth, scan durations, and error rates; tune limits.

Rollback: disable scheduler/worker feature flag; existing DB changes are additive and can be left in place.

## Open Questions

- What is the authoritative key exchange mechanism for proof encryption (protocol key vs validator key)?
- What is the minimum scan cadence per protocol (fixed interval vs priority-based)?
- Should the Researcher Agent cache compiled artifacts between scans, and for how long?
- How should retries be capped to avoid repeated costly scans on failing repos?
