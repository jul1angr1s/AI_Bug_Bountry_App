# Subagents Orchestration: Autonomous Bug Bounty Orchestrator

## Overview

This document defines the specialized AI development subagents required to build the Autonomous Bug Bounty Orchestrator platform.

**Key Changes:**
- **AI Core**: Transitioned to **Ollama** for local, cost-efficient inference.
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
- **Ollama Integration (AI Service Layer)**
- Redis/BullMQ

**Required Skills**:
- `nodejs-backend-patterns`
- `prisma-expert`
- `typescript-expert`
- `x402-payments`

**Primary Responsibilities**:
- Express API server
- Prisma schema for Supabase Postgres
- **Ollama Service** for routing prompts to local LLM
- Supabase Auth middleware integration
- x402 payment processing logic

**Outputs**:
```
backend/src/services/
├── OllamaService.ts         # Handles local model inference
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
- **Ollama API / SDK**
- Agent-to-Agent Communication
- System Prompt Engineering for Local Models

**Required Skills**:
- `mcp-builder`
- `ollama`
- `typescript-expert`

**Assignments**:
- Build Protocol/Researcher/Validator agents using **Ollama** as the brain.
- Optimize context windows for local model constraints.

**Outputs**:
```
backend/src/agents/
├── core/
│   └── LocalLLMClient.ts    # Wrapper for Ollama
```

---

### 5. QA Subagent 🧪
*(Unchanged)*

### 6. DevOps Subagent 🚀

**Role**: Infrastructure Expert

**Expertise**:
- Docker & Docker Compose
- **Supabase Local Development** (CLI)
- **Ollama Docker Setup**

**Required Skills**:
- `docker-patterns`
- `supabase-cli-mastery`

**Primary Responsibilities**:
- Docker Compose including `ollama` service (or host networking).
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
| **Ollama Setup** | DevOps | None (Local Install) |
| Contract Interfaces | Smart Contract | None |
| UI Components | Frontend | None |

### Phase 2: Core Implementation
| Task | Subagent | Dependencies |
|------|----------|--------------|
| **Ollama Service** | Backend | Ollama Setup, Supabase DB |
| **Supabase Auth** | Frontend | Supabase Setup |
| Dashboard Pages | Frontend | UI Components |
| Agent Core | MCP Agent | Ollama Service |

---

## Skill Integration Matrix

| Subagent | AI Skills | Data Skills |
|----------|-----------|-------------|
| **Frontend** | - | ✅ supabase-client |
| **Backend** | ✅ ollama-sdk | ✅ supabase-admin<br>✅ prisma-postgres |
| **MCP Agent** | ✅ local-llm-prompting<br>✅ ollama-tools | - |
| **DevOps** | ✅ ollama-docker | ✅ supabase-cli |

---

## Acceptance Criteria

| Subagent | Acceptance Criteria |
|----------|---------------------|
| **Backend** | API routes working with **Supabase**, AI endpoints return responses from **Ollama**. |
| **MCP Agent** | Agents successfully reason using **Local LLM** (e.g. DeepSeek). |
| **DevOps** | Local stack spins up with `supabase start` and accessible `ollama`. |

---

## Quick Reference (New Commands)

```bash
# Activate Backend with Ollama
@backend-subagent: Implement OllamaService to chat with deepseek-coder-v2

# DevOps: Setup Local Stack
@devops-subagent: Create docker-compose with Supabase and Ollama services
```
