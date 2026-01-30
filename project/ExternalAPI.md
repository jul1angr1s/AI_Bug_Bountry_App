# External APIs & Services: Autonomous Bug Bounty Orchestrator

## Overview

This document catalogs all external API keys, subscriptions, and third-party services required to build, deploy, and operate the Autonomous Bug Bounty Orchestrator platform.

**Key Changes:**
- **LLM Provider**: Switched to **Kimi AI** (Local Inference) for zero-cost AI.
- **Database Provider**: Switched to **Supabase** (BaaS) for Database, Auth, and Realtime.

## Cost Summary

| Category | Service | Tier | Estimated Monthly Cost |
|----------|---------|------|------------------------|
| AI/Agents | **Kimi AI** (Moonshot) | Pay-as-you-go | **$2-10/mo** |
| Database/Auth | **Supabase** | Free/Pro | $0-$25/mo |
| Blockchain RPC | Alchemy | Growth | Free → $49/mo |
| Contract Verification | Basescan | Free | $0 |
| IPFS Storage | Pinata | Free/Pro | $0-20/mo |
| Deployment | Railway | Pro | $5-50/mo |
| x402 Payments | Coinbase CDP | Usage | $0 (testnet) |
| GitHub | GitHub API | Free | $0 |
| **Total (Dev/Testnet)** | | | **~$5-50/mo** |
| **Total (Production)** | | | **~$50-150/mo** |

---

## 1. AI & Agent Services (Moonshot AI)

### Kimi AI (Moonshot) 🚀

**Purpose**: Powers MCP agents (Protocol, Researcher, Validator) with high-performance reasoning via Kimi k.25.

| Field | Value |
|-------|-------|
| **Provider** | Moonshot AI |
| **URL** | https://api.moonshot.cn/v1 |
| **Auth Type** | Bearer Token (API Key) |
| **Env Variable** | `MOONSHOT_API_KEY`, `KIMI_MODEL` |
| **Required For** | MCP Agent Subagent, All agent operations |
| **Recommended Models** | `kimi-k.25` |

**Setup Steps**:
1. Sign up at [Moonshot AI Platform](https://platform.moonshot.cn/)
2. Create an API Key in the dashboard
3. Ensure the `kimi-k.25` model is available to your account

**Environment Configuration**:
```bash
# .env
MOONSHOT_API_KEY=your_moonshot_api_key_here
KIMI_MODEL=kimi-k.25
```

**SDK Integration**:
```typescript
import OpenAI from 'openai';

const moonshot = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

const response = await moonshot.chat.completions.create({
  model: process.env.KIMI_MODEL,
  messages: [{ role: 'user', content: 'Analyze this smart contract...' }]
});
```

---

## 2. Database & Auth Services

### Supabase (Backend-as-a-Service) ⚡

**Purpose**: PostgreSQL Database, Authentication, Realtime subscriptions, and Storage.

| Field | Value |
|-------|-------|
| **Provider** | Supabase |
| **URL** | https://supabase.com |
| **Auth Type** | API Keys (Anon/Service Role) |
| **Env Variables** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Required For** | Backend Subagent, Frontend Subagent |

**Pricing Tiers**:

| Tier | Database Size | Monthly Active Users | Price |
|------|---------------|----------------------|-------|
| Free | 500MB | 50,000 | $0 |
| Pro | 8GB | 100,000 | $25/mo |

**Setup Steps**:
```bash
# 1. Create project at supabase.com
# 2. Get Project URL and Keys from Settings > API
# 3. Configure Auth providers (GitHub, Email)
```

**Environment Configuration**:
```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
```

**SDK Installation**:
```bash
npm install @supabase/supabase-js
```

---

## 3. Blockchain RPC Services

### Alchemy 🔗

**Purpose**: Reliable RPC endpoints for Base Sepolia and Base Mainnet

| Field | Value |
|-------|-------|
| **Provider** | Alchemy |
| **URL** | https://dashboard.alchemy.com |
| **Auth Type** | API Key in URL |
| **Env Variables** | `BASE_SEPOLIA_RPC_URL`, `BASE_RPC_URL` |
| **Required For** | Smart Contract Subagent, Backend Subagent |

*(Same as previous configuration)*

---

## 4. IPFS & Storage Services

### Pinata 📌

**Purpose**: Store encrypted vulnerability proofs on IPFS

*(Same as previous configuration)*

---

## 5. x402 Payment Infrastructure

### Coinbase Developer Platform (CDP) 💰

**Purpose**: x402 payment protocol validation and USDC transactions

*(Same as previous configuration)*

---

## 6. GitHub Integration

### GitHub API 🐙

**Purpose**: Clone repositories for vulnerability scanning

*(Same as previous configuration)*

---

## 7. Deployment

### Railway 🚂

**Purpose**: Deploy Backend (Node.js API) and custom MCP Agents. Note that Database is now offloaded to Supabase.

| Field | Value |
|-------|-------|
| **Provider** | Railway |
| **URL** | https://railway.app |
| **Auth Type** | API Token |
| **Env Variable** | `RAILWAY_TOKEN` |

**Reduced Usage**: Since Supabase handles the Database and Redis (optional, Supabase has Realtime), Railway is only needed for the Node.js API logic and running the Agent processes.

---

## Complete .env Template

```bash
# ============================================
# .env.example
# Autonomous Bug Bounty Orchestrator
# ============================================

# ============ AI & AGENTS (KIMI AI) ============
MOONSHOT_API_KEY=your_key_here
KIMI_MODEL=kimi-k.25

# ============ DATABASE (SUPABASE) ============
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_ANON_KEY=public-anon-key...
SUPABASE_SERVICE_ROLE_KEY=private-service-key...
# Supabase DB Connection String (for Prisma/Direct access if needed)
DATABASE_URL=postgres://postgres:password@db.xyz.supabase.co:5432/postgres

# ============ BLOCKCHAIN RPC ============
# Local Anvil - Target Contracts
ANVIL_RPC_URL=http://127.0.0.1:8545
ANVIL_CHAIN_ID=31337
ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Local Anvil - Validation Sandbox
ANVIL_SANDBOX_URL=http://127.0.0.1:8546
ANVIL_SANDBOX_CHAIN_ID=31338

# Base Sepolia - Payment Infrastructure
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
PAYMENT_CHAIN_ID=84532

# Base Mainnet - Production
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/...

# ============ CONTRACT VERIFICATION ============
BASESCAN_API_KEY=...

# ============ USDC ADDRESSES ============
USDC_SEPOLIA_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
USDC_MAINNET_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ============ x402 PAYMENTS ============
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_NETWORK=base-sepolia
CDP_WEBHOOK_SECRET=...

# ============ IPFS STORAGE ============
PINATA_API_KEY=...
PINATA_SECRET_KEY=...

# ============ GITHUB ============
GITHUB_TOKEN=ghp_...

# ============ REDIS (Optional if using Supabase Realtime) ============
# Usage depends on if Supabase Realtime replaces BullMQ
REDIS_URL=redis://localhost:6379

# ============ DEPLOYMENT ============
RAILWAY_TOKEN=...
RAILWAY_PROJECT_ID=...

# ============ FRONTEND ============
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_ANVIL_RPC_URL=http://localhost:8545
VITE_ANVIL_CHAIN_ID=31337
VITE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_PAYMENT_CHAIN_ID=84532
```
