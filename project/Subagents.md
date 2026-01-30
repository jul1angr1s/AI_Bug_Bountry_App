# Subagents Orchestration: Autonomous Bug Bounty Orchestrator

## Overview

This document defines the specialized AI development subagents required to build the Autonomous Bug Bounty Orchestrator platform.

**Key Changes:**
- **AI Core**: Transitioned to **Kimi AI (Moonshot)** for high-performance cloud-native inference.
- **Data Core**: Transitioned to **Supabase** for Backend-as-a-Service capabilities.

---

## Agent Architecture (Updated)
*(Manager Agent remains the same)*

---

## Subagent Definitions
## 1. Swarm Orchestrator Agent (The "Conductor") 🧠
**Role**: Central nervous system for agent coordination.
**Model**: `claude-3-5-sonnet-20241022` (High Intelligence)

### Primary Responsibilities
- **Task Delegation**: Decomposes high-level "Audit Protocol" requests into atomic tasks for specialized agents.
- **Resource Management**: meaningful allocation of Researcher Agents based on protocol complexity (e.g., "Spawn 3 Fuzzers for this complex DeFi protocol").
- **Consensus Synthesis**: Aggregates findings from multiple Researchers; if two find similar bugs, it instructs the Validator to verify the unique underlying issue.
- **Self-Healing**: Detects if a subagent is stuck or hallucinating and restarts/re-prompts it.

### Required Skills
- `swarm-management`: Patterns for map-reduce style task delegation.
- `state-reconciliation`: ensuring DB state matches Agent activities.

### Outputs
- **Task Graph**: A DAG of dependent tasks (Register -> Compile -> Scan -> Validate).
- **Audit Report**: Final synthesized report from all findings.

---

### 2. Frontend Subagent 🎨
*(Role & Expertise largely similar, added Supabase)*

**Expertise**:
- React 18, TailwindCSS, Shadcn
- **Supabase Client (Auth, Realtime, DB)**
- Web3 (Wagmi, Viem)

**Required Skills**:
- `react-best-practices`
- `web-design-guidelines`
- `supabase-postgres-best-practices` (Auth flows, RLS, Realtime)
- `typescript-expert`

**Outputs**:
- Standard React structure + Supabase client configuration.

---

### 2. Backend Subagent ⚙️

**Role**: Node.js/TypeScript API Expert

**Expertise**:
- Express.js / Node.js
- **Supabase Admin / Prisma Connectivity**
- **Kimi AI Integration (AI Service Layer)**
- Redis/BullMQ

**Required Skills**:
- `nodejs-backend-patterns`
- `prisma-expert`
- `typescript-expert`
- `x402-payments`

**Primary Responsibilities**:
- Express API server
- Prisma schema for Supabase Postgres
- **Kimi AI Service** for routing prompts to Moonshot API
- Supabase Auth middleware integration
- x402 payment processing logic

**Outputs**:
```
backend/src/services/
├── KimiService.ts              # Handles Moonshot API interaction
├── SupabaseService.ts       # Service role operations
```

---

### 3. Smart Contract Subagent 🔗
*(Unchanged - Solidity/Foundry expert)*

---

### 4. MCP Agent Subagent 🤖

**Role**: MCP Server & Local AI Agent Expert

**Expertise**:
- MCP SDK
- **Kimi AI API / SDK**
- Agent-to-Agent Communication
- Prompt Engineering for Kimi k.25

**Required Skills**:
- `mcp-builder`
- `openai-sdk-mastery`
- `typescript-expert`

**Assignments**:
- Build Protocol/Researcher/Validator agents using **Kimi AI** as the brain.
- Optimize prompts for `kimi-k.25` model characteristics.

**Outputs**:
```
backend/src/agents/
├── core/
│   └── KimiClient.ts        # Wrapper for Moonshot API
```

---

### 5. QA Subagent 🧪
*(Unchanged)*

### 6. DevOps Subagent 🚀

**Role**: Infrastructure Expert

**Expertise**:
- Docker & Docker Compose
- **Supabase Local Development** (CLI)
- **Kimi 2.5 Docker Setup**

**Required Skills**:
- `docker-patterns`
- `supabase-cli-mastery`

**Primary Responsibilities**:
- Supabase local setup (`supabase start`).
- Railway deployment config (connecting to managed Supabase).

---

### 7. Security Subagent 🔒
*(Unchanged)*

---

## Parallel Execution Matrix (Updated Dependencies)

### Phase 1: Foundation
| Task | Subagent | Dependencies |
|------|----------|--------------|
| **Supabase Setup** | DevOps | None |
| **Kimi 2.5 Setup** | DevOps | None (Local Install) |
| Contract Interfaces | Smart Contract | None |
| UI Components | Frontend | None |

### Phase 2: Core Implementation
| Task | Subagent | Dependencies |
|------|----------|--------------|
| **Kimi 2.5 Service** | Backend | Kimi 2.5 Setup, Supabase DB |
| **Supabase Auth** | Frontend | Supabase Setup |
| Dashboard Pages | Frontend | UI Components |
| Agent Core | MCP Agent | Kimi 2.5 Service |

---

## Skill Integration Matrix

| Subagent | AI Skills | Data Skills |
|----------|-----------|-------------|
| **Frontend** | - | ✅ supabase-client |
| **Backend** | ✅ kimi-ai-integration | ✅ supabase-admin<br>✅ prisma-postgres |
| **MCP Agent** | ✅ kimi-prompting | - |
| **DevOps** | ✅ cloud-infra | ✅ supabase-cli |

---

## Acceptance Criteria

| Subagent | Acceptance Criteria |
|----------|---------------------|
| **Backend** | API routes working with **Supabase**, AI endpoints return responses from **Kimi AI**. |
| **MCP Agent** | Agents successfully reason using **Kimi AI** (k.25). |
| **DevOps** | Local stack spins up with `supabase start` and accessible API. |

---

## Quick Reference (New Commands)

```bash
# Activate Backend with Kimi AI
@backend-subagent: Implement KimiService to chat with Moonshot API

# DevOps: Setup Local Stack
@devops-subagent: Create local dev environment with Supabase
```
