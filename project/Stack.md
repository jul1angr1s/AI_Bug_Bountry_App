# Technology Stack: Autonomous Bug Bounty Orchestrator

## Stack Overview

```
┌────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│  React 18 · TypeScript · Tailwind CSS · Vite · Supabase Client │
│  (Auth, Realtime, Data)                                        │
├────────────────────────────────────────────────────────────────┤
│                        BACKEND                                  │
│  Node.js · Express · TypeScript · Prisma · Supabase (DB)       │
├────────────────────────────────────────────────────────────────┤
│                        AGENTS (LOCAL AI)                        │
│  Ollama (DeepSeek/Llama 3) · MCP SDK · Custom Tools            │
├────────────────────────────────────────────────────────────────┤
│                        BLOCKCHAIN                               │
│  Solidity · Foundry · Viem · Base L2 · USDC                    │
├────────────────────────────────────────────────────────────────┤
│                        INFRASTRUCTURE                           │
│  Supabase (Auth/DB/Rt) · Railway (API) · Redis · IPFS          │
└────────────────────────────────────────────────────────────────┘
```

---

## Frontend Stack

### Core Framework (Unchanged)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |

### State & Data
| Technology | Version | Purpose | Agent Skill |
|------------|---------|---------|-------------|
| **Supabase JS** | 2.x | Auth, Realtime, DB Client | `supabase-postgres-best-practices` |
| TanStack Query | 5.x | Server state management | - |
| Zustand | 4.x | Client state management | - |
| React Hook Form | 7.x | Form handling | - |

### Web3 Integration (Unchanged)
| Technology | Version | Purpose |
|------------|---------|---------|
| Viem | 2.x | TypeScript Ethereum library |
| Wagmi | 2.x | React hooks for Ethereum |
| ConnectKit | latest | Wallet connection UI |

---

## Backend Stack

### Core Framework
| Technology | Version | Purpose | Agent Skill |
|------------|---------|---------|-------------|
| Node.js | 20.x LTS | Runtime environment | `nodejs-backend-patterns` |
| Express | 4.x | HTTP server framework | - |
| TypeScript | 5.x | Type safety | `typescript-expert` |

### Database & Auth (Supabase)
| Technology | Version | Purpose | Agent Skill |
|------------|---------|---------|-------------|
| **Supabase Postgres** | 15.x | Primary Database | `supabase-postgres-best-practices` |
| **Supabase Auth** | - | User Management (GitHub/Wallet) | - |
| **Prisma** | 5.x | ORM (connected to Supabase PG) | `prisma-expert` |
| **Redis** | 7.x | Job Queues (BullMQ) | - |
| **x402** | - | Payments Layer | `x402-payments` |

### API Structure
```
backend/
├── src/
│   ├── api/                 # REST Endpoints
│   ├── services/
│   │   ├── AgentOrchestrator.ts
│   │   ├── OllamaService.ts  <-- NEW
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts       <-- NEW
│   │   └── prisma.ts
│   └── ...
```

---

## Agent Layer (Local AI)

### AI Model Provider
| Technology | Purpose | Agent Skill |
|------------|---------|-------------|
| **Ollama** | Local LLM Inference Engine | `ollama` |
| **DeepSeek Coder V2** | Primary Coding/Scanning Model | - |
| **Llama 3.1** | General Reasoning Model | - |

### Tools & SDKs
| Technology | Purpose | Agent Skill |
|------------|---------|-------------|
| `ollama-js` | Node.js Client for Ollama | `ollama` |
| @modelcontextprotocol/sdk | MCP implementation | `mcp-builder` |

---

## Infrastructure Stack

### Deployment
| Service | Config |
|---------|--------|
| **Frontend** | Vercel / Railway Static |
| **Backend API** | Railway Node.js |
| **Database** | **Supabase (Managed)** |
| **Agents** | Railway (Custom Docker with Ollama access*) |
| **Ollama** | **Local Machine** (Dev) / **GPU Cloud** (Prod) |

*> Note: For production, Ollama needs a GPU node. We may deploy Ollama on a GPU instance (e.g., Railway GPU service or separate provider) and expose the URL to the Backend.*

### Environment Variables (Updated)

```bash
# AI Provider
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder-v2

# Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgres://postgres:[PASSWORD]@db.xyz.supabase.co:6543/postgres?pgbouncer=true
```

### Package Dependencies

**Backend `package.json` updates:**
```json
{
  "dependencies": {
    "ollama": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "@prisma/client": "^5.10.0"
  },
  "remove": [
    "@anthropic-ai/sdk"
  ]
}
```

**Frontend `package.json` updates:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```
