<div align="center">

# 🛡️ AI Bug Bounty Platform
### *The Future of Smart Contract Security is Autonomous*

<p align="center">
  <strong>Swarms of AI agents autonomously discover, validate, and reward vulnerabilities</strong><br/>
  <em>From registration to payment in < 4 minutes. Zero human intervention.</em>
</p>

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?cache=1)](https://www.apache.org/licenses/LICENSE-2.0)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF)](https://sepolia.basescan.org/)
[![Powered by Kimi AI](https://img.shields.io/badge/AI-Kimi%202.5-FF5500)](https://www.moonshot.cn/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)](https://www.typescriptlang.org/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-00C851)](https://github.com/jul1angr1s/AI_Bug_Bountry_App)
[![Tests](https://img.shields.io/badge/Tests-302%20Unit%20%2B%2087%20Contract-brightgreen)](https://github.com/jul1angr1s/AI_Bug_Bountry_App)
[![Smart Contracts](https://img.shields.io/badge/Contracts-Verified-success)](https://sepolia.basescan.org/address/0xc7DF730cf661a306a9aEC93D7180da6f6Da23235)

</div>

---

<div align="center">

### ⚡ **6x More Vulnerabilities** | 🤖 **4 Autonomous AI Agents** | 💰 **Automatic USDC Payments** | ⏱️ **< 4 Minute E2E** | 🪪 **ERC-8004 Agent Identity** | 💳 **x.402 Payment Gating**

</div>

---

## 📑 Table of Contents

- [🚀 Why This is Revolutionary](#-why-this-is-revolutionary)
- [🎬 See It In Action](#-see-it-in-action)
- [🎯 Overview](#-overview)
- [🔥 Tech Stack](#-tech-stack)
- [🏗️ Architecture](#️-architecture)
- [🔄 End-to-End Workflow](#-end-to-end-workflow)
- [📦 Deployed Contracts](#-deployed-contracts-base-sepolia)
- [🚀 Quick Start](#-quick-start)
- [🧪 Testing](#-testing)
- [🤖 AI-Enhanced Analysis](#-ai-enhanced-analysis)
- [💳 Payment Automation](#-payment-automation)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [🗺️ Roadmap](#️-roadmap)

---

## 📸 System in Action

<div align="center">

### Real-Time Agent Coordination

```mermaid
graph LR
    subgraph Protocol["🛡️ Protocol Agent"]
        P1[Validates Repo]
        P2[Registers On-Chain]
        P3[✅ REGISTERED<br/>Block 12345]
    end

    subgraph Researcher["🔬 Researcher Agent"]
        R1[Discovers 6 Vulns]
        R2[Generates Proofs]
        R3[✅ VULNERABILITIES<br/>FOUND IN 2m 15s]
    end

    subgraph Validator["✅ Validator Agent"]
        V1[Confirms Exploits]
        V2[Records Validation]
        V3[✅ VALIDATED<br/>Exploit Confirmed]
    end

    subgraph Payment["💰 Payment Agent"]
        PM1[Calculates Bounty]
        PM2[Releases USDC]
        PM3[✅ PAYMENT COMPLETE<br/>500 USDC]
    end

    P1 --> P2 --> P3
    P3 --> R1
    R1 --> R2 --> R3
    R3 --> V1
    V1 --> V2 --> V3
    V3 --> PM1
    PM1 --> PM2 --> PM3

    style Protocol fill:#3B82F6,stroke:#1E40AF,stroke-width:3px,color:#fff
    style Researcher fill:#8B5CF6,stroke:#7C3AED,stroke-width:3px,color:#fff
    style Validator fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Payment fill:#F59E0B,stroke:#D97706,stroke-width:3px,color:#fff

    style P3 fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style R3 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style V3 fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style PM3 fill:#FFD700,stroke:#FFA500,stroke-width:2px,color:#000
```

### 7-Step Real-Time Progress Tracking

Every protocol registration shows live progress:

```mermaid
graph LR
    S1[1️⃣ CLONE<br/>✅ Repository cloned<br/>and verified]
    S2[2️⃣ COMPILE<br/>✅ Foundry compilation<br/>successful]
    S3[3️⃣ DEPLOY<br/>✅ Deployed to Anvil<br/>0x742d...]
    S4[4️⃣ ANALYZE<br/>✅ Slither found<br/>1 vulnerability]
    S5[5️⃣ AI_ANALYSIS<br/>✅ Kimi 2.5 discovered<br/>5 additional vulns]
    S6[6️⃣ PROOF<br/>✅ Generated<br/>6 exploit proofs]
    S7[7️⃣ SUBMIT<br/>✅ Submitted to<br/>Validator Agent]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    style S1 fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style S2 fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style S3 fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
    style S4 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style S5 fill:#FF5500,stroke:#CC4400,stroke-width:3px,color:#fff
    style S6 fill:#06B6D4,stroke:#0891B2,stroke-width:2px,color:#fff
    style S7 fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
```

### Dashboard
Real-time overview with agent status, bounty pool, and recent vulnerabilities.

![Dashboard](project/UI/dashboard1.png)

### Protocols
Protocol list with security scores, status filters, and one-click registration.

![Protocols](project/UI/protocols1.png)

### Agents
AI agent management with researcher and validator registration, reputation scoring, and escrow balances.

![Agents](project/UI/agents1.png)

### Scan Findings
AI-discovered vulnerabilities with severity badges, confidence scores, and detailed descriptions.

![Scan Findings](project/UI/scans1.png)

![Scan Details](project/UI/scans2.png)

### Validations
Proof validation results powered by Kimi 2.5 LLM — VALIDATED or REJECTED per finding.

![Validations](project/UI/validations1.png)

### USDC Payments & Rewards
Bounty tracking with payout distribution by severity, top earners leaderboard, and recent payouts.

![Payments Overview](project/UI/payments1.png)

![Payment Details](project/UI/payments2.png)

### x.402 Payment Gating
HTTP 402 protocol registration gate with Coinbase x.402 facilitator integration for instant USDC payments.

![x.402 Payments](project/UI/x402paymets.png)

</div>

---

## 🚀 Why This is Revolutionary

**Traditional bug bounties** require weeks of manual auditing, coordination, and payment processing. Smart contracts sit vulnerable during this entire window.

**Our AI-powered platform** changes everything:

| Traditional Approach | AI Bug Bounty Platform |
|---------------------|------------------------|
| 👥 Manual security reviews | 🤖 **Autonomous AI agent swarms** |
| ⏳ 2-4 weeks for results | ⚡ **< 4 minutes end-to-end** |
| 💰 $50K+ audit costs | 🎯 **Pay only for real vulnerabilities** |
| 📊 Static analysis only | 🧠 **AI + Slither = 6x more findings** |
| 📧 Manual coordination | 🔄 **Fully automated workflow** |
| 💸 Slow manual payments | 💰 **Instant USDC on validation** |

### 🎯 What Makes This Special

- **🤖 True Agent Autonomy**: Four specialized AI agents (Protocol, Researcher, Validator, Payment) coordinate through BullMQ queues with zero human intervention
- **🪪 ERC-8004 Agent Identity**: Soulbound NFT registration with on-chain reputation scoring tied to validation outcomes
- **💳 x.402 Payment Gating**: Coinbase x.402 facilitator gates protocol registration with HTTP 402 USDC payment flows
- **🧠 Hybrid AI Analysis**: Kimi 2.5 discovers business logic flaws, access control issues, and DoS vectors that static analysis misses
- **⛓️ Blockchain-Native**: 6 smart contracts on Base L2 — platform registry, agent identity, reputation, and escrow
- **🔬 Sandboxed Validation**: Isolated Anvil environments ensure exploit verification without risk
- **📡 Real-Time Everything**: WebSocket + SSE streaming for live vulnerability feeds and payment tracking
- **🔒 Typed Messaging**: BullMQ + Zod schemas for type-safe, validated inter-agent communication

---

## 🎉 Production Ready!

**Status**: ✅ **100% Complete** - Ready for mainnet deployment after security audit

This platform has completed all development phases including comprehensive testing, documentation, and production readiness preparations. All 8 major PRs have been merged, 49+ E2E test cases pass successfully, and 11,600+ lines of documentation cover every aspect of deployment and operation.

### Recent Achievements (February 2026)

- ✨ **Security Hardening**: CSRF protection, Helmet security headers, Pino structured logging with PII redaction, secrets management abstraction, auth bypass removal, atomic payment locking with idempotency keys
- ✨ **Dependency Injection**: tsyringe DI framework with injectable services, typed interfaces, and test container with mock factories
- ✨ **Payment Service Decomposition**: 1,394-line god service split into 4 focused services (PaymentService, PaymentStatisticsService, USDCService, PaymentProposalService)
- ✨ **Code Splitting**: React.lazy/Suspense for 13 page components with ErrorBoundary and chunk load error recovery
- ✨ **Type Safety**: 131 `any` types eliminated across 28 files, centralized error hierarchy, ESLint with `@typescript-eslint/no-explicit-any` enforcement
- ✨ **302 Unit Tests**: Full test coverage for payment, protocol, escrow services + all 5 blockchain clients (BountyPool, ValidationRegistry, USDC, ProtocolRegistry, PlatformEscrow)
- ✨ **CI/CD Pipeline**: 5 parallel GitHub Actions jobs (backend-unit, backend-integration, smart-contracts, frontend-unit, ai-tests) with Codecov integration
- ✨ **ERC-8004 Agent Identity**: Soulbound NFT registration with on-chain reputation scoring
- ✨ **x.402 Payment Gating**: HTTP 402 protocol registration gate using Coinbase x.402 facilitator with USDC payments
- ✨ **Platform Escrow**: USDC escrow with on-chain deposit verification, replay prevention, and atomic fee deduction
- ✨ **6 Smart Contracts**: ProtocolRegistry, ValidationRegistry, BountyPool + AgentIdentityRegistry, AgentReputationRegistry, PlatformEscrow
- ✨ **AI Integration**: Kimi 2.5 (Moonshot AI) achieving 6x vulnerability detection improvement
- ✨ **SIWE Server-Side Verification**: ethers.js `verifyMessage()` with JWT tokens (1h access / 7d refresh), eliminating client-only trust
- ✨ **BullMQ Validator Migration**: Redis Pub/Sub → BullMQ queue consumer for LLM validator, guaranteed delivery with retries (PR #118)
- ✨ **Redis-Backed Rate Limiting**: Per-endpoint limits (60-300 req/min), `X-RateLimit-*` response headers, fail-open degradation
- ✨ **Post-Registration Flow Fixes**: Resolved 401 spam, false scan modal, and missing funding redirect (PR #117)

---

## 🎯 Overview

The AI Bug Bounty Platform automates the complete vulnerability discovery and reward lifecycle using AI agents:

### The Four-Agent System

<table>
<tr>
<td width="25%" align="center">

### 🛡️ Protocol Agent
**The Gatekeeper**

Validates repository structure, compiles Solidity contracts, registers protocols on-chain

**Tech**: GitHub API, Foundry, ethers.js

</td>
<td width="25%" align="center">

### 🔬 Researcher Agent
**The Detective**

Deploys contracts to Anvil, runs Slither + Kimi 2.5 AI, discovers 6x more vulnerabilities

**Tech**: Slither, Kimi AI, Docker

</td>
<td width="25%" align="center">

### ✅ Validator Agent
**The Judge**

Spawns isolated sandboxes, executes exploit proofs, records validation on-chain

**Tech**: Anvil, ethers.js, AI proof analysis

</td>
<td width="25%" align="center">

### 💰 Payment Agent
**The Banker**

Listens for validation events, calculates severity multipliers, releases USDC bounties automatically

**Tech**: BullMQ, ethers.js, USDC

</td>
</tr>
</table>

### 🔄 Automated Payment Pipeline

```mermaid
graph LR
    A[✅ Vulnerability<br/>Confirmed]
    B[💰 USDC<br/>Released]
    C[🎉 Researcher<br/>Paid]

    A -->|< 1 Second| B -->|Instant| C

    style A fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style B fill:#FFD700,stroke:#FFA500,stroke-width:3px,color:#000
    style C fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
```

**Platform Contracts**: ProtocolRegistry • ValidationRegistry • BountyPool
**Agent Contracts**: AgentIdentityRegistry • AgentReputationRegistry • PlatformEscrow
**Network**: Base Sepolia (testnet) → Base Mainnet (soon)
**Token**: USDC with severity-based multipliers (0.25x - 5x)

### 💰 Funding Gate Flow

Protocols must be funded before vulnerability scanning begins:

```mermaid
graph LR
    R[📝 Register<br/>Protocol]
    F1[1️⃣ Approve<br/>USDC]
    F2[2️⃣ Fund<br/>Protocol]
    F3[3️⃣ Verify<br/>On-Chain]
    S[🔍 Request<br/>Scanning]

    R -->|AWAITING_FUNDING| F1
    F1 -->|MetaMask| F2
    F2 -->|depositBounty| F3
    F3 -->|FUNDED| S

    style R fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style F1 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style F2 fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style F3 fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style S fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
```

**Why Funding Gate?** Prevents payment failures by ensuring bounty pool has USDC before researchers find vulnerabilities.

### 🪪 ERC-8004 Agent Economy

AI agents are first-class on-chain citizens with identity, reputation, and escrow balances:

```mermaid
graph LR
    subgraph Identity["🪪 Agent Identity"]
        REG[Register Agent<br/>Soulbound NFT]
        NFT[TokenID Assigned<br/>RESEARCHER or VALIDATOR]
    end

    subgraph Reputation["⭐ Reputation"]
        FB[Record Feedback<br/>After Validation]
        SCORE[Score Updated<br/>confirmed / total]
    end

    subgraph Escrow["🏦 Escrow"]
        DEP[Deposit USDC<br/>Verified On-Chain]
        FEE[Deduct 0.5 USDC<br/>Per Submission]
    end

    REG --> NFT
    NFT --> DEP
    DEP --> FEE
    FEE --> FB
    FB --> SCORE

    style Identity fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Reputation fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Escrow fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
```

**x.402 Protocol Registration**: Protocol owners pay a 1 USDC registration fee via Coinbase's x.402 facilitator (HTTP 402 → USDC transfer → cryptographic receipt → access granted).

### 🔥 Tech Stack

<table>
<tr>
<td width="25%">

#### 🎨 **Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- TanStack Query
- Wagmi/Viem
- Socket.io Client

</td>
<td width="25%">

#### ⚙️ **Backend**
- Node.js 20+
- Express
- TypeScript
- Prisma ORM
- BullMQ + Redis
- Zod Schemas
- Socket.io
- PostgreSQL

</td>
<td width="25%">

#### 🤖 **AI & Analysis**
- Kimi 2.5 (Moonshot)
- Slither
- Foundry
- Anvil
- GitHub API
- Simple-Git
- Ethers.js v6

</td>
<td width="25%">

#### ⛓️ **Blockchain**
- Solidity 0.8.20
- OpenZeppelin v5
- Base L2 (Sepolia)
- USDC Token
- Foundry
- @x402/express
- Viem / Ethers.js v6

</td>
</tr>
</table>

### ✨ Key Features

<table>
<tr>
<td width="50%">

#### 🔬 **Security & Analysis**
- ✅ **AI-Enhanced Discovery** - Hybrid Slither + Kimi 2.5 analysis
- ✅ **6x Vulnerability Detection** - Business logic, access control, DoS
- ✅ **Sandboxed Validation** - Isolated Anvil environments
- ✅ **ERC-8004 Agent Identity** - Soulbound NFT registration + on-chain reputation
- ✅ **Comprehensive Testing** - 302 unit tests + 87 contract tests + CI/CD

</td>
<td width="50%">

#### 💰 **Payments & Blockchain**
- ✅ **x.402 Payment Gating** - Coinbase facilitator for protocol registration fees
- ✅ **Platform Escrow** - USDC escrow with on-chain verification + replay prevention
- ✅ **Automated USDC Payments** - Event-driven releases with severity multipliers
- ✅ **6 Smart Contracts** - Platform + Agent registries on Base Sepolia
- ✅ **Funding Gate** - 3-step wizard ensures pool funding before scans
- ✅ **Reconciliation Engine** - Sync on-chain ↔ database

</td>
</tr>
<tr>
<td width="50%">

#### 🖥️ **User Experience**
- ✅ **Real-Time Dashboard** - WebSocket + SSE streaming
- ✅ **7 Major Pages** - Protocols, Scans, Validations, Payments
- ✅ **Web3 Auth** - SIWE (Sign-In with Ethereum)
- ✅ **Live Agent Feed** - Watch AI agents work in real-time
- ✅ **Mobile Responsive** - Works on all devices

</td>
<td width="50%">

#### 🏗️ **Production Ready**
- ✅ **Security Hardened** - CSRF, Helmet CSP/HSTS, Pino logging, secrets management
- ✅ **Dependency Injection** - tsyringe with typed interfaces and test containers
- ✅ **Type Safe** - 131 `any` types eliminated, ESLint enforcement
- ✅ **CI/CD Pipeline** - 5 parallel GitHub Actions jobs with Codecov
- ✅ **OpenSpec Framework** - 16+ changes archived and documented

</td>
</tr>
</table>

---

## 🎬 See It In Action

### Watch AI Agents Work

Register a protocol and watch in real-time as three autonomous AI agents orchestrate a complete security audit:

```bash
# 1. Start the backend orchestrator
cd backend
npm install
npm run dev

# In a new terminal: Start the researcher agent
npm run researcher:worker

# 2. Launch the frontend dashboard
cd ../frontend
npm install
npm run dev

# 3. Open http://localhost:5173 and witness the magic!
```

### What You'll See

1. **🛡️ Protocol Agent** clones your GitHub repo, verifies compilation, registers on-chain
2. **🔬 Researcher Agent** deploys to Anvil, runs Slither + Kimi AI, discovers 6x more vulnerabilities
3. **✅ Validator Agent** spawns isolated sandbox, executes exploit proofs, records validation on-chain
4. **💰 Payment System** automatically releases USDC bounties with severity multipliers

**Real-Time Dashboard Updates**: Every step streamed via WebSocket
**Full demonstration guide**: [docs/DEMONSTRATION.md](./docs/DEMONSTRATION.md)
**Expected End-to-End Time**: ⚡ **< 4 minutes** from registration to payment complete ✅

### Try With Thunder Loan

We include a vulnerable DeFi protocol (Thunder Loan by Cyfrin) perfect for testing:

```bash
# The agent will discover 6+ vulnerabilities including:
# 🔴 CRITICAL: Unrestricted emergency withdraw (anyone can drain funds)
# 🔴 CRITICAL: Reentrancy attack vector
# 🟠 HIGH: Access control weakness
# 🟠 HIGH: Business logic accounting error
# 🟠 HIGH: DoS via gas manipulation
# 🟡 MEDIUM: Front-running vulnerability
```

### 🎯 Live Demonstration - Real On-Chain Payments

**Verified on Base Sepolia** - This is not a simulation. Real USDC was transferred on-chain.

#### Proof of Real Payment

| Field | Value |
|-------|-------|
| **Transaction Hash** | [`0x5159763e0a2ed9ccd848a996f26d0d13eb9e5a15bcc2515194a67f803cfbc1ee`](https://sepolia.basescan.org/tx/0x5159763e0a2ed9ccd848a996f26d0d13eb9e5a15bcc2515194a67f803cfbc1ee) |
| **Network** | Base Sepolia |
| **Amount** | 3 USDC |
| **Researcher** | `0x6b26F796b7C494a65ca42d29EF13E9eF1CeCE166` |
| **BountyPool Contract** | [`0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`](https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0) |

#### Replicate the Full E2E Flow

```bash
# 1. Start backend and frontend
cd backend && npm run dev
# In new terminal:
cd frontend && npm run dev

# 2. Register protocol via frontend UI
#    Navigate to http://localhost:5173
#    Register: https://github.com/Cyfrin/2023-11-Thunder-Loan

# 3. Fund the bounty pool (50 USDC)
cd backend
npx tsx scripts/fund-bounty-pool.ts 50

# 4. Wait for scan to complete or force-validate a finding
npx tsx scripts/force-validate-finding.ts

# 5. Watch backend logs for PRODUCTION MODE payment:
#    [PaymentWorker] PRODUCTION MODE: Executing real on-chain payment
#    [PaymentWorker] Bounty released successfully!
#    TX Hash: 0x... (real blockchain TX)
```

#### What Happens Behind the Scenes

```mermaid
sequenceDiagram
    participant Script as 📜 Validate Script
    participant DB as 🗄️ Database
    participant Queue as 📋 BullMQ
    participant Worker as ⚙️ PaymentWorker
    participant Pool as 💰 BountyPool
    participant USDC as 💵 USDC Token

    Script->>DB: Update Finding → VALIDATED
    DB->>Queue: Enqueue payment job
    Queue->>Worker: Dequeue job
    Worker->>Pool: Check protocol balance
    Pool-->>Worker: 50 USDC available
    Note over Worker: PRODUCTION MODE ✅
    Worker->>Pool: releaseBounty()
    Pool->>USDC: transfer(researcher, 3 USDC)
    USDC-->>Pool: Success
    Pool-->>Worker: TX: 0x5159...bc1ee
    Worker->>DB: Update Payment → COMPLETED
    Note over DB: Real TX hash stored!
```

**Result**: The researcher wallet receives real USDC on Base Sepolia. View the transaction on [Basescan](https://sepolia.basescan.org/tx/0x5159763e0a2ed9ccd848a996f26d0d13eb9e5a15bcc2515194a67f803cfbc1ee).

---

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
    subgraph Frontend["🎨 Frontend Layer"]
        UI[React Dashboard<br/>Protocol Registration]
        WS[WebSocket Client]
    end

    subgraph Backend["⚙️ Backend Layer (Node.js/Express)"]
        API[REST API]
        WSServer[WebSocket Server]

        subgraph Agents["🤖 AI Agents"]
            PA[🛡️ Protocol Agent<br/>Validation & Registration]
            RA[🔬 Researcher Agent<br/>Vulnerability Discovery]
            VA[✅ Validator Agent<br/>Exploit Verification]
            PMA[💰 Payment Agent<br/>USDC Automation]
        end

        Queue[📋 BullMQ Queues<br/>Redis]

        subgraph Tools["🛠️ Analysis Tools"]
            GH[GitHub Cloning]
            SL[Slither Analysis]
            AV[Anvil Sandbox]
        end
    end

    subgraph Blockchain["⛓️ Smart Contracts (Base Sepolia)"]
        PR[Protocol Registry<br/>0xc7DF...3235]
        VR[Validation Registry<br/>0x8fBE...44d]
        BP[Bounty Pool<br/>0x6D0b...7b0]
        AIR[🪪 Agent Identity<br/>0x5993...942d]
        ARR[⭐ Agent Reputation<br/>0x8160...b850]
        PE[🏦 Platform Escrow<br/>0x33e5...D1ab]
        USDC[💵 USDC Token<br/>0x036C...CF7e]
    end

    UI -->|HTTP/REST| API
    UI <-->|Real-time Events| WS
    WS <--> WSServer

    API --> Queue
    Queue --> PA
    Queue --> RA
    Queue --> VA
    Queue --> PMA

    PA --> GH
    RA --> GH
    RA --> SL
    VA --> GH
    VA --> AV

    PA -->|ethers.js| PR
    VA -->|ethers.js| VR
    PMA -->|Release| BP
    API -->|Agent Reg| AIR
    VA -->|Feedback| ARR
    API -->|Escrow| PE
    BP <--> USDC
    PE <--> USDC

    PR -.->|Events| WSServer
    VR -.->|Events| WSServer
    VR -.->|Trigger| Queue
    BP -.->|Events| WSServer

    style Frontend fill:#3B82F6,stroke:#1E40AF,stroke-width:3px,color:#fff
    style Backend fill:#8B5CF6,stroke:#7C3AED,stroke-width:3px,color:#fff
    style Blockchain fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Agents fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
    style Tools fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style USDC fill:#FFD700,stroke:#FFA500,stroke-width:2px,color:#000
```

### Database Schema

```mermaid
graph LR
    Protocol[(🏢 Protocol<br/>+ fundingState<br/>+ bountyPoolAmount)]
    Scan[(🔍 Scan)]
    Finding[(🐛 Finding)]
    Proof[(📝 Proof)]
    Validation[(✅ Validation)]
    Payment[(💰 Payment)]
    ScanStep[(📊 ScanStep)]
    Agent[(🪪 AgentIdentity<br/>+ walletAddress<br/>+ agentNftId)]
    Rep[(⭐ AgentReputation<br/>+ reputationScore)]
    Escrow[(🏦 AgentEscrow<br/>+ balance)]
    Feedback[(📋 AgentFeedback)]

    Protocol -->|1:N| Scan
    Scan -->|1:N| Finding
    Scan -->|1:N| ScanStep
    Finding -->|1:1| Proof
    Proof -->|1:1| Validation
    Proof -->|1:1| Payment

    Agent -->|1:1| Rep
    Agent -->|1:1| Escrow
    Agent -->|1:N| Feedback

    style Protocol fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Scan fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Finding fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff
    style Proof fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style Validation fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Payment fill:#FFD700,stroke:#FFA500,stroke-width:2px,color:#000
    style Agent fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Rep fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Escrow fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style Feedback fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
```

**Agent Identity Fields**:
- `walletAddress` - Unique Ethereum address (lowercase)
- `agentType` - RESEARCHER | VALIDATOR
- `agentNftId` - On-chain soulbound NFT token ID
- `isActive` - Agent activation status
- `reputationScore` - Calculated from confirmed/total submissions
- `balance` - USDC escrow balance for submission fees

---

## 🔄 End-to-End Workflow

### Complete Vulnerability Discovery & Reward Cycle

```mermaid
graph TB
    subgraph Registration["📋 Phase 1: Protocol Registration"]
        A[👤 Protocol Owner]
        B[🛡️ Protocol Agent]
        C[📂 GitHub Repository]
        D[🔨 Foundry Compile]
        E[📝 ProtocolRegistry]
    end

    subgraph Discovery["🔍 Phase 2: Vulnerability Discovery"]
        F[🎯 Trigger Scan]
        G[🔬 Researcher Agent]
        H[🧪 Local Anvil]
        I[🔎 Slither Analysis]
        J[📄 Generate Proof]
    end

    subgraph Validation["✅ Phase 3: Validation"]
        K[🔐 Validator Agent]
        L[🏗️ Isolated Sandbox]
        M[⚡ Execute Exploit]
        N[📋 ValidationRegistry]
    end

    subgraph Reward["💰 Phase 4: Bounty Payment"]
        O[🏦 BountyPool]
        P[📊 Severity Multiplier]
        Q[💵 Researcher Wallet]
    end

    R[📊 Dashboard]

    A -->|1. Register| B
    B -->|2. Clone & Verify| C
    B -->|3. Compile| D
    B -->|4. Register On-Chain| E

    F -->|5. Queue Job| G
    G -->|6. Clone| C
    G -->|7. Compile| D
    G -->|8. Deploy| H
    G -->|9. Analyze| I
    I -->|10. Vulnerabilities Found| J
    J -->|11. Submit| K

    K -->|12. Clone Same Commit| C
    K -->|13. Deploy| L
    K -->|14. Verify Exploit| M
    M -->|15. Record| N

    N -->|16. CONFIRMED ✅| O
    O -->|17. Calculate| P
    P -->|18. Transfer USDC| Q

    E -.->|Events| R
    N -.->|Events| R
    O -.->|Events| R

    style Registration fill:#3B82F6,stroke:#1E40AF,stroke-width:3px,color:#fff
    style Discovery fill:#8B5CF6,stroke:#7C3AED,stroke-width:3px,color:#fff
    style Validation fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Reward fill:#F59E0B,stroke:#D97706,stroke-width:3px,color:#fff
    style Q fill:#FFD700,stroke:#FFA500,stroke-width:3px,color:#000
    style R fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
```

### E2E Test Executed on Base Sepolia

**Actual test results from integration test:**

```mermaid
sequenceDiagram
    autonumber
    participant User as 🧪 Test Script
    participant PR as 📝 ProtocolRegistry
    participant VR as ✅ ValidationRegistry
    participant BP as 🏦 BountyPool
    participant USDC as 💵 USDC Token

    rect rgb(59, 130, 246, 0.1)
        Note over User: 👤 Deployer: 0x4379...0c3<br/>💰 Balance: 61 USDC
        Note over User,USDC: Phase 1: Protocol Registration
        User->>PR: registerProtocol("Thunder Loan")
        activate PR
        PR-->>User: ✅ Protocol ID: 0x8420...ead6
        deactivate PR
        Note over PR: Status: PENDING<br/>Owner: 0x4379...0c3
    end

    rect rgb(139, 92, 246, 0.1)
        Note over User,USDC: Phase 2: Fund Bounty Pool
        User->>USDC: approve(BountyPool, 50 USDC)
        activate USDC
        USDC-->>User: ✅ Approved
        deactivate USDC

        User->>BP: depositBounty(protocol, 50 USDC)
        activate BP
        BP->>USDC: transferFrom(user, pool, 50 USDC)
        activate USDC
        USDC-->>BP: ✅ Success
        deactivate USDC
        BP-->>User: ✅ Deposited
        deactivate BP
        Note over BP: 💰 Pool Balance: 50 USDC
    end

    rect rgb(16, 185, 129, 0.1)
        Note over User,USDC: Phase 3: Record Validation
        User->>VR: recordValidation(CRITICAL, CONFIRMED)
        activate VR
        VR-->>User: ✅ Validation ID: 0x4815...bcb3
        deactivate VR
        Note over VR: 🔴 Severity: CRITICAL<br/>✅ Outcome: CONFIRMED
    end

    rect rgb(245, 158, 11, 0.1)
        Note over User,USDC: Phase 4: Release Bounty
        User->>BP: releaseBounty(INFORMATIONAL, 25 USDC)
        activate BP
        BP->>USDC: transfer(researcher, 25 USDC)
        activate USDC
        USDC-->>BP: ✅ Success
        deactivate USDC
        BP-->>User: ✅ Bounty ID: 0x6dad...b78
        deactivate BP
        Note over User: 💰 Received: 25 USDC<br/>⛽ Net Cost: Gas only
    end

    rect rgb(236, 72, 153, 0.1)
        Note over User,USDC: Phase 5: Verification Queries
        User->>VR: getProtocolValidations()
        VR-->>User: 1 validation
        User->>VR: getConfirmedValidations()
        VR-->>User: 1 confirmed
        User->>BP: getResearcherBounties()
        BP-->>User: 1 bounty (25 USDC)
    end

    Note over User,USDC: ✅ All Tests Passed • ⏱️ ~2 minutes • ⛽ Gas fees only
```

---

## 📦 Deployed Contracts (Base Sepolia)

### Platform Contracts

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| **ProtocolRegistry** | [`0xc7DF730cf661a306a9aEC93D7180da6f6Da23235`](https://sepolia.basescan.org/address/0xc7DF730cf661a306a9aEC93D7180da6f6Da23235) | ✅ | Protocol registration & management |
| **ValidationRegistry** | [`0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d`](https://sepolia.basescan.org/address/0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d) | ✅ | ERC-8004 validation attestation |
| **BountyPool** | [`0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`](https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0) | ✅ | USDC bounty management |

### Agent Contracts (ERC-8004)

| Contract | Address | Purpose |
|----------|---------|---------|
| **AgentIdentityRegistry** | [`0x59932bDf3056D88DC07cb320263419B8ec1e942d`](https://sepolia.basescan.org/address/0x59932bDf3056D88DC07cb320263419B8ec1e942d) | Soulbound NFT agent registration |
| **AgentReputationRegistry** | [`0x8160ab516366ffaab6c239524d35963058feb850`](https://sepolia.basescan.org/address/0x8160ab516366ffaab6c239524d35963058feb850) | On-chain reputation scoring |
| **PlatformEscrow** | [`0x33e5ee00985f96b482370c948d1c63c0aa4bd1ab`](https://sepolia.basescan.org/address/0x33e5ee00985f96b482370c948d1c63c0aa4bd1ab) | USDC escrow for submission fees |

### Tokens

| Token | Address | Purpose |
|-------|---------|---------|
| **USDC (Testnet)** | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | Base Sepolia USDC |

### Bounty Multipliers

| Severity | Multiplier | Base (100 USDC) | Amount |
|----------|-----------|-----------------|---------|
| 🔴 CRITICAL | 5x | 100 | **500 USDC** |
| 🟠 HIGH | 3x | 100 | **300 USDC** |
| 🟡 MEDIUM | 1.5x | 100 | **150 USDC** |
| 🟢 LOW | 1x | 100 | **100 USDC** |
| 🔵 INFORMATIONAL | 0.25x | 100 | **25 USDC** |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Foundry** (for smart contracts)
- **PostgreSQL** 14+
- **Redis** 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App

# Install backend dependencies
cd backend
npm install
npx prisma generate

# Install frontend dependencies
cd ../frontend
npm install

# Install contract dependencies
cd ../backend/contracts
forge install
```

### Environment Setup

**Backend** (`backend/.env`):
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bug_bounty"

# Redis
REDIS_URL="redis://localhost:6379"

# Blockchain (Base Sepolia)
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
PRIVATE_KEY="0x..."  # Your wallet private key

# Platform Contracts
PROTOCOL_REGISTRY_ADDRESS="0xc7DF730cf661a306a9aEC93D7180da6f6Da23235"
VALIDATION_REGISTRY_ADDRESS="0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d"
BOUNTY_POOL_ADDRESS="0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0"

# Agent Contracts (ERC-8004)
AGENT_IDENTITY_REGISTRY_ADDRESS="0x59932bDf3056D88DC07cb320263419B8ec1e942d"
AGENT_REPUTATION_REGISTRY_ADDRESS="0x8160ab516366ffaab6c239524d35963058feb850"
PLATFORM_ESCROW_ADDRESS="0x33e5ee00985f96b482370c948d1c63c0aa4bd1ab"

# x.402 Payment Gating
X402_FACILITATOR_URL="https://www.x402.org/facilitator"
X402_NETWORK="eip155:84532"
PLATFORM_WALLET_ADDRESS="0x..."

# API Keys
BASESCAN_API_KEY="..."  # For contract verification
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_URL="http://localhost:3000/api/v1"
VITE_WS_URL="ws://localhost:3000"
```

### Run with Docker

```bash
# Start all services
bash scripts/dev.sh

# Or manually with Docker Compose
docker-compose up -d
```

**Services:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Run Database Migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

---

## 🧪 Testing

### Unit Tests (Foundry)

```bash
cd backend/contracts

# Run all tests
forge test

# Run with verbosity
forge test -vv

# Run specific test file
forge test --match-path test/ProtocolRegistry.t.sol

# Gas report
forge test --gas-report
```

**Test Coverage:**
- **ProtocolRegistry**: 314 lines (registration, status, duplicates, access control)
- **ValidationRegistry**: 385 lines (validation recording, roles, ERC-8004, immutability)
- **BountyPool**: 513 lines (USDC deposits, bounty releases, severity multipliers)
- **Integration**: 469 lines (full end-to-end workflow testing)

**Total**: 1,681 lines of comprehensive tests | 87 test functions | 100% function coverage

### Integration Test (Base Sepolia)

```bash
cd backend/contracts

# Simulation only (no broadcast)
forge script script/TestIntegration.s.sol:TestIntegration \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --legacy

# Execute on testnet (requires 50+ USDC)
forge script script/TestIntegration.s.sol:TestIntegration \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy
```

See [`backend/contracts/INTEGRATION_TEST_GUIDE.md`](backend/contracts/INTEGRATION_TEST_GUIDE.md) for detailed instructions.

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run unit tests only (302 tests)
npm run test:unit

# Run integration tests (36 test cases)
npm run test:integration

# Run E2E demonstration workflow test
npm run test:e2e

# Run regression tests against live server (46 tests)
npm run test:regression

# Run AI tests only (requires API keys)
npm run test:ai

# Lint TypeScript code
npm run lint
```

**Backend Test Coverage:**
- **Unit Tests**: 302 tests across 8 test files (all passing)
  - Payment service (55), Protocol service (58), Escrow service (34)
  - BountyPoolClient (37), ValidationRegistryClient (32), USDCClient (29), ProtocolRegistryClient (29), PlatformEscrowClient (28)
- **Integration Tests**: 36 test cases (payment flow, reconciliation, USDC approval, validator agent, WebSocket events)
- **E2E Tests**: Complete demonstration workflow test with mocked blockchain and LLM
- **Regression Tests**: 46 HTTP-level tests using native `fetch()` against a running backend (see below)
- **AI Integration Tests**: Kimi 2.5 API + full pipeline (100% pass rate)
- **Test Infrastructure**: Mock database (Prisma), mock blockchain (ethers.js), mock Redis (in-memory), payment + protocol fixtures

### Regression E2E Tests (Vitest + fetch)

HTTP-level regression tests that validate API response shapes against a live backend at `http://localhost:3000`. These catch serialization bugs (BigInt as `{}`, Date as `[object Object]`), missing CSRF enforcement, and broken auth guards.

```bash
# Requires backend + Redis + Postgres running
cd backend
npm run test:regression
```

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `health.test.ts` | 5 | `/health`, `/health/detailed`, `/health/services`, `/metrics`, `X-API-Version` header |
| `csrf.test.ts` | 6 | CSRF token fetch, cookie setting, format validation, POST rejection |
| `agent-identities.test.ts` | 10 | List, get by ID, wallet lookup, type filter, leaderboard, BigInt/Date serialization |
| `reputation.test.ts` | 5 | Reputation shape, feedback history, Date/BigInt serialization |
| `escrow.test.ts` | 5 | Escrow balance (BigInt fields), transaction history |
| `x402-payments.test.ts` | 8 | Payment amounts (BigInt), status enums, txHash, Date serialization |
| `auth-protection.test.ts` | 7 | 401 on protected routes, 200 on public agent-identity routes |

**Key regression guards:**
- BigInt fields serialized as strings (catches `Do not know how to serialize a BigInt`)
- Date fields as ISO 8601 strings (catches `{}` serialization)
- No `[object Object]` in any response field
- All tests are **read-only** and safe to run against a seeded dev stack

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run E2E tests (13 test cases)
npm test -- e2e

# Run with coverage
npm test -- --coverage
```

**Frontend Test Coverage:**
- **E2E Tests**: 13 comprehensive test cases for demonstration workflow
- **Component Tests**: UI component testing with mocked APIs
- **Integration Tests**: WebSocket and API integration testing

### Playwright E2E Tests (with Screenshots)

Browser-based E2E tests with automatic screenshot capture on every test run.

```bash
# Run all Playwright tests (3 spec files, 19 tests across 3 browsers)
npx playwright test

# Run with visible browser
npx playwright test --headed

# View HTML report with screenshots
npx playwright show-report
```

**Screenshot capture:**
- **Automatic**: `screenshot: 'on'` captures a screenshot after every test (saved in `test-results/`)
- **Explicit**: Named screenshots at key UI states (e.g., `login-page.png`, `react-app-initialized.png`)
- **Video**: Captured on first retry for debugging flaky tests
- **Trace**: Playwright trace viewer available on first retry

Screenshots are saved to `test-results/screenshots/` with descriptive names for visual regression verification.

---

## 🤖 AI-Enhanced Analysis

### Overview

Phase 4.5 introduces AI-powered vulnerability analysis using **Kimi 2.5** (Moonshot AI via NVIDIA API Gateway) to enhance traditional Slither static analysis with deep semantic understanding.

### 7-Step Research Pipeline

```
1. CLONE              → Clone repository from GitHub
2. COMPILE            → Compile Solidity with Foundry
3. DEPLOY             → Deploy to local Anvil testnet
4. ANALYZE            → Run Slither static analysis
5. AI_DEEP_ANALYSIS   → Kimi 2.5 AI-powered enhancement ⭐ NEW
6. PROOF_GENERATION   → Generate exploit proofs
7. SUBMIT             → Submit to Validator Agent
```

### AI Capabilities

- **Hybrid Analysis**: Combines Slither pattern matching with Kimi 2.5 semantic understanding
- **6x More Vulnerabilities**: Discovers critical issues missed by static analysis
- **Enhanced Findings**: Detailed remediation suggestions, confidence scores, exploit paths
- **New Vulnerability Discovery**: Detects business logic flaws, access control issues, DoS vectors, front-running
- **Graceful Degradation**: Falls back to Slither-only on API failures
- **Feature Flag Control**: `AI_ANALYSIS_ENABLED=true/false`
- **Fast Processing**: ~35 seconds per contract analysis

### Proven Results

**Test Case** (VulnerableBank.sol):
- **Input**: 1 Slither finding (reentrancy)
- **Output**: 6 total findings
  - 1 enhanced with detailed remediation
  - 5 NEW AI-discovered vulnerabilities

**AI-Discovered Issues**:
- 🔴 **CRITICAL**: Unrestricted emergency withdraw (anyone can drain all funds)
- 🟠 **HIGH**: Access control weaknesses
- 🟠 **HIGH**: Business logic accounting errors
- 🟠 **HIGH**: DoS via gas manipulation
- 🟡 **MEDIUM**: Front-running vulnerability

### Configuration

```bash
# Enable AI analysis
AI_ANALYSIS_ENABLED=true
KIMI_API_KEY=nvapi-...  # NVIDIA API Gateway key

# Optional configuration
KIMI_API_URL=https://integrate.api.nvidia.com/v1
KIMI_MODEL=moonshotai/kimi-k2.5
```

**Documentation**:
- [Kimi API Setup Guide](backend/KIMI_API_SETUP.md) - Complete setup instructions
- [AI Deep Analysis](backend/AI_DEEP_ANALYSIS_COMPLETE.md) - Feature documentation
- [Changes Summary](backend/CHANGES_SUMMARY.md) - Implementation details

---

## 💳 Payment Automation

### Features

- **Event-Driven Triggers**: Automatic payment on ValidationRecorded events
- **USDC Integration**: Direct USDC bounty releases via BountyPool contract
- **Reconciliation**: BountyReleased event listener syncs on-chain state with database
- **Payment Dashboard**: Real-time earnings leaderboard and payment history
- **Two-Wallet Testing**: Support for separate deployer/researcher wallets

### Payment Flow

```mermaid
graph TB
    Start([⚡ ValidationRecorded<br/>CONFIRMED])

    Start --> Step1[📝 Payment Record<br/>Created]
    Step1 --> Step2[📋 BullMQ Job<br/>Queued]
    Step2 --> Step3[💰 BountyPool<br/>releaseBounty]
    Step3 --> Step4[📡 BountyReleased<br/>Event Emitted]
    Step4 --> Step5[🔄 Payment<br/>Reconciliation]
    Step5 --> Step6[💾 Database<br/>Updated]

    Step6 --> Complete([✅ Payment Complete])

    style Start fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Step1 fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Step2 fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Step3 fill:#FFD700,stroke:#FFA500,stroke-width:3px,color:#000
    style Step4 fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
    style Step5 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Step6 fill:#06B6D4,stroke:#0891B2,stroke-width:2px,color:#fff
    style Complete fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
```

See payment dashboard at `http://localhost:5173/payments` during development.

---

## 📚 Documentation

### Getting Started

- [**Demonstration Guide**](docs/DEMONSTRATION.md) - Complete workflow demonstration with Thunder Loan (enhanced with troubleshooting)
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Step-by-step deployment instructions (local, Docker, Railway, Vercel)
- [**Architecture Overview**](docs/ARCHITECTURE.md) - System architecture, data flows, and technology stack with 8 Mermaid diagrams

### API & Integration

- [**API Documentation**](docs/API.md) - Complete REST API reference with 50+ endpoints and examples
- [**WebSocket Events**](docs/WEBSOCKET_EVENTS.md) - Real-time event system documentation (15+ event types)

### Production & Operations

- [**Production Setup**](docs/PRODUCTION.md) - Production environment configuration, monitoring, performance tuning
- [**Security Guide**](docs/SECURITY.md) - Security best practices with 21/21 checklist items complete
- [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions (15+ documented problems)
- [**Backup & Recovery**](docs/BACKUP_RECOVERY.md) - Disaster recovery procedures (RTO: 4h, RPO: 1h)

### Smart Contracts

- [**Contract Deployment**](backend/contracts/DEPLOYMENT_GUIDE.md) - How to deploy contracts to Base Sepolia
- [**Integration Testing**](backend/contracts/INTEGRATION_TEST_GUIDE.md) - Running E2E tests on testnet

### Backend Services

- [**Backend README**](backend/README.md) - Complete backend documentation with migration strategy
- [**Kimi API Setup**](backend/KIMI_API_SETUP.md) - Complete setup instructions for AI integration
- [**AI Deep Analysis**](backend/AI_DEEP_ANALYSIS_COMPLETE.md) - Feature documentation and proven results
- [**Backend E2E Tests**](backend/tests/e2e/README.md) - Comprehensive E2E testing documentation

### Testing Documentation

- [**Backend Integration Tests**](backend/tests/integration/TEST_COVERAGE.md) - 36 test cases documented
- [**Frontend E2E Tests**](frontend/src/__tests__/e2e/) - 13 demonstration workflow tests
- [**Testing Guide**](backend/TESTING.md) - General testing guide

### OpenSpec Framework

All project changes are tracked and archived using the [OpenSpec framework](https://openspec.dev):

- [**Archive**](openspec/changes/archive/) - 16+ completed changes properly archived
- [**Main Specs**](openspec/specs/) - Project specifications (agents, API, database, workflows)
- [**PR Guidelines**](openspec/specs/pr-guidelines.md) - Automated PR size enforcement

### Complete Documentation Stats

- **Total Documentation**: 11,600+ lines
- **API Endpoints**: 50+ documented
- **WebSocket Events**: 15+ event types
- **Mermaid Diagrams**: 8 architecture diagrams
- **Code Examples**: 40+ working examples
- **Shell Commands**: 60+ tested commands
- **Production Checklists**: Complete security, deployment, and recovery checklists

---

## 🛠️ Development

### Project Structure

```
AI_Bug_Bountry_App/
├── backend/                    # Node.js/Express backend
│   ├── contracts/              # Foundry smart contracts
│   │   ├── src/                # Contract source files (3 platform)
│   │   ├── test/               # Comprehensive test suite
│   │   ├── script/             # Deployment & integration scripts
│   │   └── lib/                # OpenZeppelin & forge-std
│   ├── src/
│   │   ├── agents/             # AI agents (Protocol, Researcher, Validator)
│   │   ├── blockchain/         # Smart contract integration layer
│   │   │   └── contracts/      # Typed client abstractions (5 clients)
│   │   ├── di/                 # tsyringe dependency injection (container, tokens, interfaces)
│   │   ├── errors/             # Centralized error hierarchy (payment, blockchain, validation, protocol)
│   │   ├── messages/           # Zod schemas for inter-agent messaging
│   │   ├── middleware/         # Auth, CSRF, Helmet, x.402 payment gate
│   │   ├── queues/             # BullMQ job queues
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Decomposed services (payment/*, protocol, escrow, etc.)
│   │   ├── utils/              # Shared utilities (error-handler, query-builder)
│   │   └── websocket/          # Real-time events
│   ├── prisma/                 # Database schema & migrations
│   └── test-blockchain-integration.mjs
├── frontend/                   # React/TypeScript frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── agents/         # PaymentRequiredModal, agent UI
│   │   │   └── payments/       # Payment proposal components
│   │   ├── pages/              # Dashboard, Protocol, Agent pages
│   │   └── lib/                # API client, utilities
├── openspec/                   # OpenSpec framework
│   ├── changes/                # Feature implementations
│   └── specs/                  # Project specifications
├── scripts/                    # Development scripts
└── docs/                       # Additional documentation
```

### Agent Development

Each agent follows a consistent pattern:

```typescript
// Agent structure
export async function start{Agent}Agent(): Promise<void> {
  // Subscribe to Redis events
  // Process jobs asynchronously
}

export async function stop{Agent}Agent(): Promise<void> {
  // Cleanup and shutdown
}

// Worker implementation
async function process{Agent}Job(job: Job): Promise<void> {
  // Step 1: Preparation
  // Step 2: Execution
  // Step 3: Validation
  // Step 4: On-chain recording (if applicable)
  // Step 5: Cleanup
}
```

**Example: Validator Agent**

```typescript
// backend/src/agents/validator/worker.ts
async function processValidation(submission: ProofSubmissionMessage) {
  // 1. Decrypt proof
  const proof = await decryptProof(submission);

  // 2. Clone repository at same commit
  const repoPath = await cloneRepository(protocolId, commitHash);

  // 3. Compile contracts
  const { bytecode, abi } = await compileContract(repoPath, contractPath);

  // 4. Deploy to isolated Anvil sandbox
  const { provider, contractAddress } = await spawnSandbox();

  // 5. Execute exploit from proof
  const result = await executeExploit(provider, contractAddress, proof);

  // 6. Record validation on-chain
  const validationId = await validationRegistry.recordValidation(
    protocolId, findingId, severity, outcome
  );

  // 7. Update database
  await prisma.proof.update({ onChainValidationId: validationId });

  // 8. Cleanup
  await killSandbox(anvilProcess);
  await cleanupRepository(repoPath);
}
```

### Smart Contract Integration

All blockchain interactions use type-safe TypeScript wrappers:

```typescript
import { ProtocolRegistryClient } from '../blockchain';

const registryClient = new ProtocolRegistryClient();

// Register protocol
const result = await registryClient.registerProtocol(
  githubUrl,
  contractPath,
  contractName,
  bountyTerms
);

console.log(`Protocol ID: ${result.protocolId}`);
console.log(`TX Hash: ${result.txHash}`);
console.log(`Block: ${result.blockNumber}`);
```

---

## 🔒 Security

### Security Patterns Implemented

**Smart Contracts:**
✅ **ReentrancyGuard** - All state-changing functions protected
✅ **SafeERC20** - Secure USDC transfers
✅ **AccessControl** - Role-based permissions (VALIDATOR_ROLE, PAYOUT_ROLE)
✅ **Custom Errors** - Gas-optimized error handling
✅ **Immutable Records** - Validation records cannot be modified

**Backend:**
✅ **CSRF Protection** - Double-submit cookie pattern with `crypto.randomBytes(32)`, timing-safe comparison via `crypto.timingSafeEqual()`
✅ **Helmet Security Headers** - CSP, HSTS, X-Frame-Options, Permissions-Policy
✅ **Pino Structured Logging** - PII redaction paths, correlation IDs, no console.log
✅ **Secrets Management** - Abstracted provider (EnvSecretsProvider in dev, AWS Secrets Manager in prod)
✅ **Atomic Payment Locking** - Idempotency keys prevent race conditions and double payments
✅ **Auth Bypass Removed** - DEV_AUTH_BYPASS eliminated from all middleware
✅ **Sandboxed Execution** - Isolated Anvil environments with path traversal prevention, code pattern detection, and resource limits
✅ **Redis-Backed Rate Limiting** - Per-endpoint limits (60-300 req/min), `X-RateLimit-*` headers, fail-open degradation on Redis failure
✅ **Zod Input Validation** - Runtime schema validation on all API inputs with field-level error responses
✅ **SIWE Server-Side Verification** - ethers.js `verifyMessage()` with JWT tokens (1h access / 7d refresh), race condition handling for concurrent auth flows
✅ **Sandbox Security Hardening** - Path traversal prevention, dangerous code pattern detection, process resource limits

### Audit Status

- **OpenZeppelin v5.0.0** - Using latest audited contracts
- **Slither Analysis** - Static analysis on all contracts
- **Comprehensive Tests** - 100% function coverage
- **Testnet Deployment** - Verified on Base Sepolia

**⚠️ Important**: This platform is currently deployed on **Base Sepolia testnet only**. A full security audit is required before mainnet deployment.

### Environment Security

**Never commit:**
- ❌ Private keys
- ❌ API keys (Basescan, Alchemy)
- ❌ Database credentials
- ❌ RPC URLs with embedded API keys

All sensitive values are in `.env` files (gitignored).

---

## 🗺️ Roadmap to Mainnet & Beyond

### ✅ Phase 1-5: Foundation → Production (COMPLETED)

<details>
<summary><strong>Click to see our journey</strong> (95/95 tasks completed ✅)</summary>

**Phase 1: Foundation**
- [x] Researcher Agent with Slither integration
- [x] Vulnerable test contracts
- [x] Backend service layer

**Phase 2: Integration**
- [x] Frontend dashboard with real-time updates
- [x] Protocol Agent with GitHub verification
- [x] WebSocket event system

**Phase 3: Smart Contracts**
- [x] Protocol, Validation, and Bounty Pool contracts
- [x] Base Sepolia deployment
- [x] Validator Agent with sandboxed testing
- [x] Comprehensive test suite (1,681 lines)
- [x] E2E verification on testnet

**Phase 4: Payment Automation**
- [x] Automatic bounty release on validation
- [x] USDC integration and reconciliation
- [x] Payment dashboard with earnings leaderboard
- [x] Two-wallet testing infrastructure

**Phase 4.5: AI-Enhanced Analysis**
- [x] Kimi 2.5 integration (6x more vulnerabilities)
- [x] Hybrid Slither + AI analysis
- [x] AI-powered validator agent
- [x] Feature flag control

**Phase 5: Production Readiness**
- [x] 85%+ test coverage, 11,600+ lines of docs
- [x] Security hardening (21/21 checklist)
- [x] Docker deployment, monitoring, backup/recovery

</details>

---

### 🎯 Phase 6: Mainnet Launch (Q2 2026) - **IN PROGRESS**

<table>
<tr>
<td width="33%">

#### 🔒 Security Audit
- [ ] Professional audit firm engagement
- [ ] Comprehensive contract review
- [ ] Agent system security assessment
- [ ] Penetration testing
- [ ] Bug bounty program (meta!)

</td>
<td width="33%">

#### 🚀 Base Mainnet
- [ ] Mainnet contract deployment
- [ ] Production infrastructure setup
- [ ] Monitoring & alerting
- [ ] Incident response plan
- [ ] Gradual rollout strategy

</td>
<td width="33%">

#### 👥 Community & Agent Economy
- [x] Reputation system v1 (ERC-8004 on-chain scoring)
- [x] Agent identity (soulbound NFT registration)
- [x] Platform escrow (USDC submission fees)
- [ ] Researcher onboarding portal
- [ ] Governance token design

</td>
</tr>
</table>

---

### 🚀 Phase 7: Scale & Enhance (Q3-Q4 2026)

#### 🤖 **AI Agent Evolution**
- [ ] **Quimera AI** - Automatic exploit code generation
- [ ] **Multi-model ensemble** - GPT-4, Claude, Gemini for consensus
- [ ] **Agent specialization** - DeFi-specific, NFT, governance agents
- [ ] **Continuous learning** - Agents learn from validated exploits
- [ ] **Agent marketplace** - Community-contributed analysis plugins

#### ⛓️ **Multi-Chain Expansion**
- [ ] **Ethereum Mainnet** - High-value DeFi protocols
- [ ] **Arbitrum & Optimism** - L2 ecosystems
- [ ] **Polygon** - Gaming & NFT protocols
- [ ] **Avalanche** - Subnet security
- [ ] **Cross-chain bridge security** - LayerZero, Axelar analysis

#### 🔬 **Advanced Analysis**
- [ ] **Formal verification** - Integration with Certora, K Framework
- [ ] **Fuzzing engine** - Echidna, Foundry invariant tests
- [ ] **Historical scanning** - Analyze all deployed mainnet contracts
- [ ] **Upgrade detection** - Monitor proxy upgrades for new vulnerabilities
- [ ] **Real-time monitoring** - Live transaction analysis for exploits

#### 💎 **DeFi Integration**
- [ ] **Protocol insurance** - Automatic coverage for audited contracts
- [ ] **Staking mechanism** - Stake tokens to run validator nodes
- [ ] **Governance token** - Decentralized platform governance
- [ ] **NFT credentials** - On-chain reputation as NFTs
- [ ] **Liquidity mining** - Rewards for protocol owners & researchers

#### 🌐 **Developer Experience**
- [ ] **SDK & API** - Integrate security scanning in CI/CD
- [ ] **IDE plugins** - Real-time vulnerability detection in VS Code
- [ ] **GitHub App** - Automatic PR security checks
- [ ] **Documentation site** - Dedicated docs portal
- [ ] **Video tutorials** - Complete walkthrough series

---

### 🌟 Long-Term Vision (2027+)

**The Autonomous Security Layer for Web3**

Imagine a world where:
- Every smart contract deployed is automatically analyzed within minutes
- AI agents coordinate globally to protect billions in TVL
- Researchers earn passive income from continuous security monitoring
- Exploits are discovered and patched before attackers strike
- Security becomes automatic, transparent, and community-driven

**We're building that world. Join us.**

---

---

## 📊 Statistics

### Current Metrics

**Code:**
- Smart Contracts: 6 deployed (3 platform + 3 agent)
- TypeScript Backend: ~17,000 lines (agents + AI + payments + agent economy)
- React Frontend: ~9,000 lines (7+ pages + agent components + E2E tests)
- Documentation: 11,600+ lines of comprehensive documentation
- Test Coverage: 12,000+ lines (contracts + backend + frontend + E2E tests)

**Blockchain:**
- Network: Base Sepolia (Chain ID: 84532)
- Contracts Deployed: 6 (3 platform verified + 3 agent)
- Agent Economy: ERC-8004 identity + reputation + escrow
- USDC Base Amount: 100 USDC
- Real Transactions: Verified on testnet

**Testing:**
- Backend Unit Tests: 302 tests across 8 files (services + blockchain clients)
- Contract Tests: 87 functions (1,681 lines) - 100% function coverage
- Backend Integration Tests: 36 test cases (payment flow, reconciliation, validator, WebSocket)
- Backend E2E Tests: Complete demonstration workflow with mocked blockchain/LLM
- Backend Regression Tests: 46 HTTP-level tests (health, CSRF, agent-identities, escrow, x402, auth guards)
- Playwright E2E Tests: 19 browser tests across 3 browsers with automatic screenshot capture
- Frontend E2E Tests: 13 test cases for full user journey
- AI Integration Tests: Kimi 2.5 API + full pipeline (100% pass rate)
- CI/CD: 5 parallel GitHub Actions jobs with Codecov integration
- Test Infrastructure: 3 mock helpers (database, blockchain, Redis) + 2 fixture files

**Documentation:**
- API Reference: 50+ endpoints documented
- WebSocket Events: 15+ event types
- Architecture Diagrams: 8 Mermaid diagrams
- Deployment Guides: Complete (Docker, Railway, manual)
- Security Checklist: 21/21 items complete
- Production Guides: 4 comprehensive documents (Production, Security, Troubleshooting, Backup/Recovery)

**Development Quality:**
- PRs Merged: 118+ PRs (implementation phases + security hardening)
- PR Size Limit: 1,500 lines (enforced via GitHub Actions)
- Automated Size Checks: ✅ Active
- OpenSpec Changes: 16+ archived (100% complete)
- ESLint: TypeScript rules with `no-explicit-any` enforcement
- `any` Types: 131 eliminated (152 → 21 in deprecated file only)
- Split Migrations: Database changes by feature domain
- Code Reviews: All PRs reviewed and tested before merge

**Project Completion:**
- Implementation: 100% (95/95 tasks complete)
- Testing: 100% (all critical paths covered)
- Documentation: 100% (all features documented)
- Production Readiness: 100% (security, deployment, operations guides complete)

---

## 🤝 Contributing

**We're building the future of autonomous security - and we want YOU to be part of it!**

This is a rare opportunity to work on cutting-edge tech that combines:
- 🤖 **AI Agent Orchestration** (BullMQ, Redis, multi-agent coordination)
- 🧠 **Large Language Models** (Kimi 2.5, AI-powered security analysis)
- ⛓️ **Smart Contract Engineering** (Solidity, Foundry, Base L2)
- ⚡ **Real-Time Systems** (WebSocket, SSE, event-driven architecture)
- 💰 **DeFi Integration** (USDC payments, automated bounties)

### 🎯 High-Impact Contribution Areas

We're actively looking for contributors in these areas:

#### 🤖 AI & Agents
- **Add new AI models** - Integrate GPT-4, Claude, or other LLMs for vulnerability analysis
- **Multi-agent communication** - Implement agent-to-agent messaging protocols
- **Exploit generation** - Integrate Quimera AI for automatic exploit code generation
- **Reputation system** - Build ML-powered researcher credibility scoring

#### ⛓️ Blockchain & Smart Contracts
- **Multi-chain support** - Extend to Ethereum, Arbitrum, Optimism, Polygon
- **Gas optimization** - Reduce deployment and transaction costs
- **Advanced bounty mechanics** - Time-based rewards, staking, governance tokens
- **Cross-chain bridges** - Enable bounty payments across multiple networks

#### 🖥️ Frontend & UX
- **Data visualization** - Build interactive vulnerability graphs and agent activity timelines
- **Protocol analytics** - Dashboard for security metrics and trends
- **Mobile app** - React Native companion app for mobile monitoring
- **3D visualization** - Three.js contract architecture explorer

#### 🔬 Security & Analysis
- **New analysis tools** - Integrate Mythril, Echidna, formal verification
- **Custom detectors** - Build specialized Slither detectors for DeFi patterns
- **Fuzzing integration** - Automated fuzzing for discovered vulnerabilities
- **Historical analysis** - Scan existing deployed contracts on mainnet

#### 🏗️ Infrastructure
- **Kubernetes deployment** - Production-grade orchestration setup
- **Observability** - OpenTelemetry, Grafana, distributed tracing
- **Performance** - Database optimization, caching strategies, load testing
- **Multi-region** - Geographic distribution for global agent coordination

### 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/AI_Bug_Bountry_App.git`
3. **Setup** local environment (see Quick Start above)
4. **Find an issue** labeled `good-first-issue` or `help-wanted`
5. **Create a branch**: `git checkout -b feature/your-amazing-feature`
6. **Code** with tests and documentation
7. **Submit PR** following our guidelines

### 📏 Development Standards

We maintain high code quality standards:

- ✅ **TypeScript strict mode** - All code must be type-safe
- ✅ **Test coverage > 80%** - Unit + integration + E2E tests required
- ✅ **PR size limit: 1,500 lines** - Automated checks enforce clean PRs
- ✅ **OpenSpec documentation** - All changes documented in OpenSpec framework
- ✅ **Security first** - All smart contract changes require security review

See [`openspec/specs/pr-guidelines.md`](openspec/specs/pr-guidelines.md) for detailed guidelines.

### 🌟 Why Contribute?

- **Resume gold**: Work on production AI + blockchain systems
- **Learn cutting-edge tech**: AI agents, LLMs, DeFi, L2 scaling
- **Real impact**: Your code will secure millions in smart contract value
- **Open source cred**: Build your GitHub profile with advanced projects
- **Future equity**: Early contributors may receive governance tokens (planned)
- **Mentorship**: Learn from experienced blockchain + AI engineers

### 💬 Community

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Discord** (coming soon): Real-time chat with contributors

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenZeppelin** - Audited smart contract libraries
- **Foundry** - Fast, portable, and modular toolkit for Ethereum development
- **Slither** - Static analysis framework for Solidity
- **Base** - Low-cost, builder-friendly Ethereum L2
- **Cyfrin** - Thunder Loan test case for vulnerability scanning

---

## 📞 Support

- **Documentation**: [Full docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jul1angr1s/AI_Bug_Bountry_App/discussions)

---

## 🎯 Quick Links

- [**Live Dashboard**](http://localhost:5173) (Local development)
- [**API Documentation**](http://localhost:3000/api-docs) (Swagger)
- [**Contract Explorer**](https://sepolia.basescan.org/address/0xc7DF730cf661a306a9aEC93D7180da6f6Da23235) (Base Sepolia)
- [**OpenSpec Framework**](openspec/) (Project specifications)

---

<div align="center">

## 🎯 Ready to Build the Future?

**The smart contract security landscape is changing. Fast.**

Traditional audits can't keep pace with the explosion of DeFi protocols. We're building the solution: autonomous AI agents that never sleep, never miss vulnerabilities, and reward researchers instantly.

### 🚀 Get Started Now

```bash
git clone https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App
# Follow Quick Start guide above
```

### 💡 Have Questions?

- 📖 Read the [Full Documentation](docs/)
- 💬 Open a [GitHub Discussion](https://github.com/jul1angr1s/AI_Bug_Bountry_App/discussions)
- 🐛 Report a [Bug](https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues)
- ⭐ Star this repo to follow development

---

### 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/jul1angr1s/AI_Bug_Bountry_App?style=social)
![GitHub forks](https://img.shields.io/github/forks/jul1angr1s/AI_Bug_Bountry_App?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/jul1angr1s/AI_Bug_Bountry_App?style=social)

**Code**: 26,000+ lines (TypeScript + Solidity)
**Tests**: 302 unit + 87 contract + 36 integration + 46 regression + 49 E2E
**CI/CD**: 5 parallel GitHub Actions jobs with Codecov
**Smart Contracts**: 6 deployed on Base Sepolia (3 platform + 3 agent)
**Architecture**: tsyringe DI, decomposed services, ESLint enforced

---

### 🙏 Acknowledgments & Tech Credits

- **[OpenZeppelin](https://openzeppelin.com/)** - Audited smart contract libraries (v5.0.0)
- **[Foundry](https://getfoundry.sh/)** - Fast, portable Ethereum development toolkit
- **[Kimi AI](https://www.moonshot.cn/)** - Moonshot AI's Kimi 2.5 for semantic vulnerability analysis
- **[Slither](https://github.com/crytic/slither)** - Static analysis framework for Solidity
- **[Base](https://base.org/)** - Low-cost, builder-friendly Ethereum L2 by Coinbase
- **[Cyfrin](https://www.cyfrin.io/)** - Thunder Loan test case for vulnerability scanning
- **[BullMQ](https://bullmq.io/)** - Redis-based queue for agent orchestration
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM for Node.js
- **[Socket.io](https://socket.io/)** - Real-time bidirectional event-based communication

---

<p align="center">
  <strong>Built with ❤️ and ☕ by the AI Bug Bounty Platform Team</strong><br/>
  <em>Democratizing smart contract security through autonomous AI agents</em>
</p>

<p align="center">
  <a href="#-ready-to-build-the-future">⬆ Back to Top</a>
</p>

</div>

---

**License**: Apache 2.0 | **Network**: Base Sepolia → Mainnet (soon) | **Status**: Production Ready 🚀
