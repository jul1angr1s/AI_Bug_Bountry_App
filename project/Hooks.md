# Development & Swarm Hooks: Autonomous Bug Bounty Orchestrator

## Overview

This document defines the **Development Lifecycle Hooks** and **Agent Swarm Hooks** required to maintain system integrity during both rapid iteration (Dev) and complex operation (Runtime).

While `Integration.md` covers runtime system events (e.g., Blockchain events), this file focuses on:
1.  **Development Hooks**: Ensuring Frontend/Backend/Contracts stay in sync during coding.
2.  **Swarm Hooks**: Internal coordination signals between the Orchestrator and Subagents.

---

## 1. Development Lifecycle Hooks (The "Sync" Layer)

To satisfy the requirement: *"Change in front that affect backend must be detected and backend adjust changes"*.

### 1.1 Schema Synchronization (Prisma -> Frontend)
**Trigger**: Modification of `prisma/schema.prisma`
**Action**:
1.  `backend-subagent`: Detected change `db.push`.
2.  `devops-subagent`: Auto-runs `npx prisma generate`.
3.  `frontend-subagent`: Auto-runs script to regenerate TypeScript shared types (`shared/types/db.ts`).
4.  **Notification**: "⚠️ DB Schema changed. Frontend types updated. Please check for breaking changes."

### 1.2 Contract Synchronization (Solidity -> Agents)
**Trigger**: Modification of `contracts/*.sol`
**Action**:
1.  `smart-contract-subagent`: Compiles contract (`forge build`).
2.  `backend-subagent`: Regenerates ABI files in `backend/src/abis/`.
3.  `researcher-agent`: Invalidates previous scan cache for this contract.
4.  **Notification**: "📝 Contracts recompiled. ABIs updated across services."

### 1.3 API Contract Synchronization (Backend -> Frontend)
**Trigger**: Modification of Backend API Routes (Zod Schemas)
**Action**:
1.  `backend-subagent`: Updates OpenAPI/Swagger spec or tRPC router.
2.  `frontend-subagent`: Regenerates API client hooks (`useQuery`).
3.  **Check**: If Frontend code references a deleted field -> **Build Fail** (Self-Healing Trigger).

---

## 2. Swarm Orchestration Hooks (The "Conductor" Layer)

These hooks allow the **Swarm Orchestrator Agent** to manage the lifecycle of subagents dynamically.

### 2.1 Task Delegation Hooks
| Hook | Trigger | Action |
|------|---------|--------|
| `onTaskBlocked` | Subagent reports "I cannot proceed due to missing dependency" | Orchestrator pauses subagent, spawns a helper (e.g., "Missing Context" -> "Spawn Researcher to fetch docs"), then resumes. |
| `onAgentOverload` | Subagent queue > 5 items | Orchestrator spawns a **Replica Agent** (e.g., `Researcher-2`) to parallelize work. |

### 2.2 Consensus Hooks (Deduplication)
**Trigger**: Multiple Researchers submit findings for the same Protocol.
**Action**:
1.  **Stop**: Orchestrator halts immediate validation.
2.  **Synthesize**: Orchestrator runs `ConsensusCheck(Findings[])`.
    *   *Input*: 3 findings (A, B, C).
    *   *Logic*: finding A and B map to same `vulnerabilityHash`.
3.  **Decision**:
    *   Instruct Validator: "Verify Finding A".
    *   Mark Finding B as `DUPLICATE_OF(A)`.
4.  **Resume**: Orchestrator releases tasks to Validator.

### 2.3 Self-Healing Hooks
**Trigger**: Agent (Kimi AI process) stops responding or errors out repeatedly.
**Action**:
1.  **Detect**: Service Monitor sees heartbeat failure.
2.  **Restart**: `docker restart agent-container`.
3.  **Rollback**: Orchestrator resets task status from `IN_PROGRESS` to `PENDING`.
4.  **Reassign**: Task given to a healthy agent instance.

---

## 3. Implementation Matrix

| Hook Category | Implementation Tool | Responsible Agent |
|---------------|---------------------|-------------------|
| **Schema Sync** | Husky / `npm-watch` | DevOps |
| **Contract Sync** | Foundry Scripts | Smart Contract |
| **API Sync** | tRPC / GraphQL Codegen | Backend |
| **Swarm Hooks** | Redis Events / Node EventEmmiter | Orchestrator |
