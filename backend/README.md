<div align="center">

# ⚙️ AI Bug Bounty - Backend Orchestrator
### *The Neural Network Powering Autonomous Security*

<p align="center">
  <strong>Three AI agents. One mission: Secure Web3.</strong><br/>
  <em>Node.js + Express + BullMQ + Kimi 2.5 AI + Smart Contracts</em>
</p>

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?logo=redis)](https://redis.io/)
[![AI Powered](https://img.shields.io/badge/AI-Kimi%202.5-FF5500)](https://www.moonshot.cn/)

</div>

---

<div align="center">

### 🤖 **3 Autonomous Agents** | 🧠 **6x AI Detection** | ⚡ **< 4 Min E2E** | 💰 **Auto USDC Payments**

</div>

---

## 🌟 What Makes This Special

This isn't just another Node.js backend. It's an **autonomous agent orchestration platform** that coordinates AI-powered security researchers, validators, and payment systems.

### ✨ Breakthrough Features

- **🤖 True Multi-Agent Architecture** - Protocol, Researcher, and Validator agents coordinate via BullMQ without human intervention
- **🧠 Hybrid AI Analysis** - Kimi 2.5 discovers 6x more vulnerabilities than Slither alone
- **⛓️ Blockchain-Native** - Direct smart contract integration with ethers.js v6 on Base L2
- **🔬 Sandboxed Validation** - Isolated Anvil environments spawn and destroy automatically
- **📡 Real-Time Streaming** - WebSocket + SSE push every state change to frontend
- **💰 Payment Automation** - Event-driven USDC releases with reconciliation
- **🔒 Production-Grade** - Split migrations, comprehensive testing, security hardened

---

## 📑 Table of Contents

- [🎯 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [🤖 AI-Enhanced Analysis](#-ai-enhanced-analysis)
- [⚙️ Agent System](#️-agent-system)
- [🚀 Quick Start](#-quick-start)
- [📡 API Reference](#-api-reference)
- [🧪 Testing](#-testing)
- [🐳 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)

---

## 🎯 Overview

The backend implements a **multi-agent system** that automates the complete vulnerability discovery and reward lifecycle:

<table>
<tr>
<td width="25%">

### 🛡️ Protocol Agent
**The Validator**

Clones repos, verifies Foundry compilation, registers protocols on-chain

**Output**: On-chain protocol ID

</td>
<td width="25%">

### 🔬 Researcher Agent
**The Hunter**

Deploys to Anvil, runs Slither + Kimi 2.5, discovers 6x more vulns

**Output**: Exploit proofs

</td>
<td width="25%">

### ✅ Validator Agent
**The Judge**

Executes proofs in isolated sandboxes, records validation on-chain

**Output**: Validation attestation

</td>
<td width="25%">

### 💰 Payment Agent
**The Banker**

Listens for validation events, releases USDC with severity multipliers

**Output**: Automatic bounties

</td>
</tr>
</table>

---

## 🏗️ Architecture

### Tech Stack Breakdown

<table>
<tr>
<td width="50%">

#### ⚡ **Core Runtime**
- **Node.js 20+** - Latest LTS with ESM support
- **TypeScript** - Strict mode, full type safety
- **Express.js** - REST API + middleware
- **Zod** - Runtime validation schemas

#### 🗄️ **Data Layer**
- **PostgreSQL 15+** - Primary database
- **Prisma ORM** - Type-safe database client
- **Redis 7+** - Caching + queue backend
- **BullMQ** - Distributed job queues

</td>
<td width="50%">

#### 🤖 **AI & Analysis**
- **Kimi 2.5** - Moonshot AI via NVIDIA Gateway
- **Slither** - Static Solidity analysis
- **RAG System** - Knowledge base with embeddings
- **Feature Flags** - Graceful AI degradation

#### ⛓️ **Blockchain**
- **ethers.js v6** - Smart contract interactions
- **Foundry** - Solidity compilation
- **Anvil** - Local test networks
- **Simple-Git** - Repository management

</td>
</tr>
</table>

### System Flow Architecture

```mermaid
graph TB
    subgraph Frontend["🎨 Frontend Layer"]
        UI[📱 React Dashboard<br/>Real-time UI]
        WS_Client[🔌 WebSocket Client<br/>Socket.io]
    end

    subgraph Backend["⚙️ Backend Core (Express)"]
        API[🚀 REST API<br/>/api/v1/...]
        WS_Server[📡 WebSocket Server<br/>Socket.IO Hub]

        subgraph Queues["📋 Job Orchestration (BullMQ)"]
            Q_Protocol[🛡️ Protocol Queue]
            Q_Researcher[🔬 Researcher Queue]
            Q_Validator[✅ Validator Queue]
            Q_Payment[💰 Payment Queue]
        end
    end

    subgraph Agents["🤖 Autonomous Agent Swarm"]
        Agent_Protocol[🛡️ Protocol Agent<br/>GitHub + Foundry]
        Agent_Researcher[🔬 Researcher Agent<br/>7-Step AI Pipeline]
        Agent_Validator[✅ Validator Agent<br/>Sandbox Execution]
        Agent_Payment[💰 Payment Agent<br/>USDC Automation]
    end

    subgraph Tools["🛠️ Analysis & Execution"]
        Git[📂 GitHub Cloning]
        Foundry[🔨 Foundry<br/>Compilation]
        Anvil[🧪 Anvil<br/>Test Networks]
        Slither[🔍 Slither<br/>Static Analysis]
        AI[🧠 Kimi 2.5 AI<br/>Deep Analysis]
    end

    subgraph Blockchain["⛓️ Smart Contracts (Base Sepolia)"]
        Registry[📝 Protocol Registry<br/>0xc7DF...3235]
        Validation[✅ Validation Registry<br/>0x8fBE...44d]
        Bounty[🏦 Bounty Pool<br/>0x6D0b...7b0]
        USDC[💵 USDC Token<br/>0x036C...CF7e]
    end

    subgraph Storage["💾 Data Layer"]
        DB[(🐘 PostgreSQL<br/>Prisma ORM)]
        Redis[(🔴 Redis<br/>Cache + Queues)]
    end

    %% Frontend connections
    UI <-->|HTTP| API
    UI <-->|WebSocket| WS_Client
    WS_Client <-->|Real-time| WS_Server

    %% API to Queues
    API --> Q_Protocol
    API --> Q_Researcher
    API --> Q_Validator

    %% Queues to Agents
    Q_Protocol --> Agent_Protocol
    Q_Researcher --> Agent_Researcher
    Q_Validator --> Agent_Validator
    Q_Payment --> Agent_Payment

    %% Agents to Tools
    Agent_Protocol --> Git
    Agent_Protocol --> Foundry
    Agent_Researcher --> Git
    Agent_Researcher --> Foundry
    Agent_Researcher --> Anvil
    Agent_Researcher --> Slither
    Agent_Researcher --> AI
    Agent_Validator --> Git
    Agent_Validator --> Foundry
    Agent_Validator --> Anvil

    %% Agents to Blockchain
    Agent_Protocol -->|Register| Registry
    Agent_Validator -->|Attest| Validation
    Agent_Payment -->|Release| Bounty
    Bounty <-->|Transfer| USDC

    %% Blockchain Events
    Registry -.->|Events| WS_Server
    Validation -.->|Events| WS_Server
    Validation -.->|Trigger| Q_Payment
    Bounty -.->|Events| WS_Server

    %% Storage connections
    API <--> DB
    Queues <--> Redis
    Agents <--> DB

    %% Styling
    style Frontend fill:#3B82F6,stroke:#1E40AF,stroke-width:3px,color:#fff
    style Backend fill:#8B5CF6,stroke:#7C3AED,stroke-width:3px,color:#fff
    style Agents fill:#EC4899,stroke:#BE185D,stroke-width:3px,color:#fff
    style Tools fill:#F59E0B,stroke:#D97706,stroke-width:3px,color:#fff
    style Blockchain fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Storage fill:#6366F1,stroke:#4F46E5,stroke-width:3px,color:#fff

    style AI fill:#FF5500,stroke:#CC4400,stroke-width:2px,color:#fff
    style USDC fill:#FFD700,stroke:#FFA500,stroke-width:2px,color:#000
    style WS_Server fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
```

### Database Schema Strategy

We use **focused, independent migrations** for parallel development:

#### Migration Philosophy

```typescript
// ❌ Monolithic migrations (avoid)
20260201_all_changes.sql    // 500+ lines, multiple features

// ✅ Split by feature domain (recommended)
20260201120000_payment_automation_schema.sql   // Payment system only
20260201120001_ai_analysis_schema.sql          // AI features only
```

**Benefits**:
- ✅ **Parallel PRs** - Multiple teams can work independently
- ✅ **Clear ownership** - Each migration = one feature
- ✅ **Easy rollback** - Revert individual features
- ✅ **Better reviews** - Smaller, focused PRs
- ✅ **Zero conflicts** - No merge conflicts in schema files

---

## 🤖 AI-Enhanced Analysis

### 🧠 The Kimi 2.5 Advantage

Traditional static analysis (Slither) finds **pattern-based vulnerabilities**. Our AI integration discovers **semantic and business logic flaws** that tools miss.

### 7-Step Research Pipeline

```mermaid
graph TB
    Start([🎯 Scan Triggered]) --> Step1

    Step1[📂 STEP 1: CLONE<br/>Clone GitHub Repository]
    Step1 --> S1_1[Verify .git structure]
    S1_1 --> S1_2[Checkout target branch]
    S1_2 --> S1_3[Extract commit hash]
    S1_3 --> Step2

    Step2[🔨 STEP 2: COMPILE<br/>Compile Solidity Contracts]
    Step2 --> S2_1[Run forge build]
    S2_1 --> S2_2[Extract ABI + bytecode]
    S2_2 --> S2_3[Verify compilation success]
    S2_3 --> Step3

    Step3[🚀 STEP 3: DEPLOY<br/>Deploy to Local Anvil]
    Step3 --> S3_1[Spawn Anvil on free port]
    S3_1 --> S3_2[Deploy compiled bytecode]
    S3_2 --> S3_3[Get contract address]
    S3_3 --> Step4

    Step4[🔍 STEP 4: ANALYZE<br/>Run Slither Static Analysis]
    Step4 --> S4_1[Execute slither-analyzer]
    S4_1 --> S4_2[Parse JSON output]
    S4_2 --> S4_3[Extract vulnerability patterns]
    S4_3 --> Step5

    Step5[🧠 STEP 5: AI_DEEP_ANALYSIS<br/>⭐ AI-Powered Enhancement]
    Step5 --> S5_1[Parse contract functions]
    S5_1 --> S5_2[Search knowledge base RAG]
    S5_2 --> S5_3[Call Kimi 2.5 LLM]
    S5_3 --> S5_4[Discover NEW vulnerabilities]
    S5_4 --> S5_5[Enhance existing findings]
    S5_5 --> S5_6[Generate remediation advice]
    S5_6 --> Step6

    Step6[📝 STEP 6: PROOF_GENERATION<br/>Generate Exploit Proofs]
    Step6 --> S6_1[For each vulnerability]
    S6_1 --> S6_2[Create PoC transaction]
    S6_2 --> S6_3[Package for validator]
    S6_3 --> Step7

    Step7[✅ STEP 7: SUBMIT<br/>Submit to Validator Agent]
    Step7 --> S7_1[Queue validation job]
    S7_1 --> S7_2[Emit WebSocket event]
    S7_2 --> S7_3[Update scan status]
    S7_3 --> Complete([✨ Scan Complete])

    %% Styling
    style Start fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff
    style Complete fill:#10B981,stroke:#059669,stroke-width:3px,color:#fff

    style Step1 fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Step2 fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Step3 fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
    style Step4 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Step5 fill:#FF5500,stroke:#CC4400,stroke-width:3px,color:#fff
    style Step6 fill:#06B6D4,stroke:#0891B2,stroke-width:2px,color:#fff
    style Step7 fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
```

### AI Enhancement Process Deep Dive

```mermaid
graph TB
    Input[🔍 Slither Findings<br/>Pattern-Based Analysis]
    Input -->|1 Reentrancy found| Parser

    Parser[📋 Function Parser<br/>AST Analysis]
    Parser -->|Extract all contract<br/>functions with context| KB

    KB[🗄️ Knowledge Base<br/>RAG System<br/>150+ Exploits]
    KB -->|Semantic search<br/>vector embeddings| Examples

    Examples{📚 Similar Exploits Found}
    Examples -->|✓| Ex1[DAO Hack 2016]
    Examples -->|✓| Ex2[Parity Wallet Bug]
    Examples -->|✓| Ex3[Flash Loan Attacks]

    Ex1 --> LLM
    Ex2 --> LLM
    Ex3 --> LLM

    LLM[🧠 Kimi 2.5 LLM<br/>Moonshot AI<br/>via NVIDIA API]
    LLM -->|AI Semantic Analysis| Analysis

    Analysis{🔬 Deep Analysis}
    Analysis -->|✓| A1[Business logic review]
    Analysis -->|✓| A2[Access control audit]
    Analysis -->|✓| A3[DoS vector detection]
    Analysis -->|✓| A4[Front-running analysis]

    A1 --> Results
    A2 --> Results
    A3 --> Results
    A4 --> Results

    Results[✨ Enhanced Findings]
    Results --> Original[📊 Original: 1 vuln]
    Results --> Enhanced[⬆️ Enhanced: 1 vuln<br/>Detailed remediation]
    Results --> New[🆕 NEW: 5 vulns<br/>AI discovered!]

    Original --> Total
    Enhanced --> Total
    New --> Total

    Total[🎯 Total: 6 findings<br/>6x Improvement!]

    %% Styling
    style Input fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Parser fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style KB fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Examples fill:#06B6D4,stroke:#0891B2,stroke-width:2px,color:#fff
    style LLM fill:#FF5500,stroke:#CC4400,stroke-width:3px,color:#fff
    style Analysis fill:#EC4899,stroke:#BE185D,stroke-width:2px,color:#fff
    style Results fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style Total fill:#FFD700,stroke:#FFA500,stroke-width:3px,color:#000

    style Ex1 fill:#6366F1,stroke:#4F46E5,stroke-width:1px,color:#fff
    style Ex2 fill:#6366F1,stroke:#4F46E5,stroke-width:1px,color:#fff
    style Ex3 fill:#6366F1,stroke:#4F46E5,stroke-width:1px,color:#fff

    style A1 fill:#EC4899,stroke:#BE185D,stroke-width:1px,color:#fff
    style A2 fill:#EC4899,stroke:#BE185D,stroke-width:1px,color:#fff
    style A3 fill:#EC4899,stroke:#BE185D,stroke-width:1px,color:#fff
    style A4 fill:#EC4899,stroke:#BE185D,stroke-width:1px,color:#fff
```

### Real Results: VulnerableBank.sol

**Input** (Slither only):
- 1 finding: Reentrancy in `withdraw()`

**Output** (Slither + Kimi 2.5):
- **1 enhanced**: Reentrancy with detailed fix + code snippet
- **5 NEW AI discoveries**:
  - 🔴 **CRITICAL**: Unrestricted `emergencyWithdraw()` - anyone can drain funds
  - 🟠 **HIGH**: Missing access control on `setBalance()`
  - 🟠 **HIGH**: Accounting error in withdrawal logic
  - 🟠 **HIGH**: DoS via unbounded gas consumption
  - 🟡 **MEDIUM**: Front-running vulnerability in deposits

**Result**: **6x more vulnerabilities** with actionable fixes

### AI Configuration

```bash
# Enable/Disable AI analysis
AI_ANALYSIS_ENABLED=true    # or false for Slither-only

# Kimi 2.5 API (Moonshot AI via NVIDIA Gateway)
KIMI_API_KEY=nvapi-xxx...
KIMI_API_URL=https://integrate.api.nvidia.com/v1
KIMI_MODEL=moonshotai/kimi-k2.5

# Performance tuning
KIMI_MAX_TOKENS=4096
KIMI_TEMPERATURE=0.1        # Lower = more deterministic
AI_MAX_REQUESTS_PER_MINUTE=50
AI_TIMEOUT_MS=30000

# Knowledge base
KB_VERSION=v1
KB_REBUILD_ON_STARTUP=false
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
```

### Knowledge Base Management

The system maintains a **curated exploit database** for RAG:

```bash
# Rebuild knowledge base with latest exploits
POST /api/admin/knowledge-base/rebuild
Authorization: Bearer <admin-token>

# Response
{
  "success": true,
  "version": 2,
  "documentCount": 150,
  "rebuiltAt": "2026-02-04T18:00:00.000Z"
}
```

**Knowledge Base Structure**:

```
backend/knowledge_base/exploits/
├── reentrancy/
│   ├── dao-hack-2016.md
│   ├── parity-wallet-2017.md
│   └── cream-finance-2021.md
├── access-control/
│   ├── poly-network-2021.md
│   └── ronin-bridge-2022.md
└── flash-loans/
    ├── harvest-finance-2020.md
    └── cream-flash-loan-2021.md
```

### AI-Enhanced Finding Schema

```typescript
interface AIEnhancedFinding {
  // Standard fields
  id: string;
  vulnerabilityType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  description: string;
  confidenceScore: number;  // 0.0 - 1.0

  // AI enhancement fields
  analysisMethod: 'STATIC' | 'AI' | 'HYBRID';
  aiConfidenceScore?: number;        // AI's confidence (0.0 - 1.0)
  remediationSuggestion?: string;    // Step-by-step fix
  codeSnippet?: string;              // Vulnerable code excerpt
  exploitScenario?: string;          // How attacker exploits this
  references?: string[];             // Similar past exploits
}
```

---

## ⚙️ Agent System

### 🛡️ Protocol Agent: The Validator

**Purpose**: Validates GitHub repositories and registers protocols on-chain

**Workflow**:
1. **Clone** GitHub repository to temporary directory
2. **Verify** contract exists at specified path
3. **Compile** using Foundry (`forge build`)
4. **Extract** ABI and bytecode from compilation artifacts
5. **Register** on ProtocolRegistry smart contract
6. **Emit** `protocol:registered` WebSocket event
7. **Cleanup** temporary files

**Tech Stack**: simple-git, child_process (forge), ethers.js

---

### 🔬 Researcher Agent: The Hunter (7-Step AI Pipeline)

**Purpose**: Discover vulnerabilities using hybrid Slither + AI analysis

**Full Pipeline** (detailed above in AI section):

| Step | Tool | Duration | Output |
|------|------|----------|--------|
| CLONE | simple-git | ~5s | Repository clone |
| COMPILE | Foundry | ~10s | ABI + bytecode |
| DEPLOY | Anvil | ~2s | Contract address |
| ANALYZE | Slither | ~8s | Static findings |
| **AI_DEEP_ANALYSIS** | **Kimi 2.5** | **~35s** | **6x findings** |
| PROOF_GENERATION | ethers.js | ~5s | Exploit proofs |
| SUBMIT | BullMQ | ~1s | Validation queue |

**Total**: ~66 seconds for complete analysis

**Tech Stack**: Slither, Foundry, Anvil, Kimi 2.5 AI, ethers.js

---

### ✅ Validator Agent: The Judge

**Purpose**: Verify vulnerability exploits in isolated sandboxes

**Workflow**:
1. **Receive** proof submission from Researcher
2. **Clone** repository at **exact same commit hash**
3. **Compile** contract (verify reproducibility)
4. **Spawn** isolated Anvil sandbox on random port
5. **Deploy** contract to sandbox
6. **Execute** exploit proof transactions
7. **Verify** success criteria (balance change, state modification)
8. **Record** validation on ValidationRegistry contract
9. **Trigger** payment if validation confirmed
10. **Kill** Anvil sandbox and cleanup

**Isolation Strategy**:
- Each validation gets fresh Anvil instance
- Random port allocation (no conflicts)
- Automatic cleanup on completion
- No shared state between validations

**Tech Stack**: Anvil, ethers.js, child_process, find-free-port

---

### 💵 Funding Service: The Gate

**Purpose**: Ensure protocols are funded before vulnerability scanning begins

**Workflow**:
1. **Set AWAITING_FUNDING** - After protocol registration completes
2. **Verify Funding** - Check on-chain BountyPool balance
3. **Record Transaction** - Store deposit tx hash in database
4. **Request Scan** - Only allowed after funding verified

**Key Functions**:
```typescript
// Set protocol to awaiting funding state
await setAwaitingFunding(protocolId);

// Verify on-chain funding matches requested amount
const result = await verifyProtocolFunding(protocolId);
// Returns: { fundingState, onChainBalance, canRequestScan }

// Request vulnerability scan (gated behind funding)
await requestScan(protocolId, userId, branch);
```

**Tech Stack**: ethers.js, BountyPoolClient, Prisma

---

### 💰 Payment Agent: The Banker

**Purpose**: Automate USDC bounty releases based on validations

**Event-Driven Flow**:

```typescript
// Listen for ValidationRecorded events
validationRegistry.on('ValidationRecorded', async (event) => {
  const { protocolId, findingId, severity, outcome } = event;

  if (outcome === 'CONFIRMED') {
    // Calculate bounty with severity multiplier
    const multiplier = getSeverityMultiplier(severity);
    const amount = BASE_BOUNTY * multiplier;

    // Release USDC via BountyPool contract
    await bountyPool.releaseBounty(
      protocolId,
      findingId,
      researcherAddress,
      amount
    );

    // Emit WebSocket event
    io.to(`protocol:${protocolId}`).emit('payment:released', {
      amount,
      severity,
      txHash: result.hash
    });
  }
});
```

**Severity Multipliers**:
- 🔴 **CRITICAL**: 5x → 500 USDC
- 🟠 **HIGH**: 3x → 300 USDC
- 🟡 **MEDIUM**: 1.5x → 150 USDC
- 🟢 **LOW**: 1x → 100 USDC
- 🔵 **INFORMATIONAL**: 0.25x → 25 USDC

**Tech Stack**: ethers.js, event listeners, BountyPool contract

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ LTS
- **PostgreSQL** 15+
- **Redis** 7+
- **Foundry** (for Solidity compilation)
- **Python 3.8+** (for Slither)

### Installation

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup database
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npx prisma migrate dev
npx prisma generate

# Build TypeScript
npm run build
```

### Environment Variables

Create `.env` file:

```bash
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bug_bounty

# Supabase (Authentication)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain (Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...  # Your wallet private key

# Smart Contracts
PROTOCOL_REGISTRY_ADDRESS=0xc7DF730cf661a306a9aEC93D7180da6f6Da23235
VALIDATION_REGISTRY_ADDRESS=0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d
BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# AI Analysis (Optional but Recommended)
AI_ANALYSIS_ENABLED=true
KIMI_API_KEY=nvapi-...  # NVIDIA API Gateway key
```

### Run Development Server

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start API server
npm run dev

# Terminal 3: Start Researcher Agent worker
npm run researcher:worker

# Server running on http://localhost:3000
```

### Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-04T18:00:00.000Z",
  "uptime": 123.45,
  "database": "connected",
  "redis": "connected",
  "agents": {
    "protocol": "idle",
    "researcher": "idle",
    "validator": "idle"
  }
}
```

---

## 📡 API Reference

### Protocol Management

```bash
# Register new protocol
POST /api/v1/protocols
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "MyDeFiProtocol",
  "githubUrl": "https://github.com/user/repo",
  "contractPath": "contracts/Token.sol",
  "contractName": "Token",
  "bountyAddress": "0x..."
}

# Response:
{
  "success": true,
  "protocolId": "0x1234...",
  "status": "PENDING",
  "message": "Protocol registration queued"
}

# Get protocol details
GET /api/v1/protocols/:id

# List all protocols
GET /api/v1/protocols?status=ACTIVE&limit=20
```

### Scan Management

```bash
# Trigger vulnerability scan
POST /api/v1/protocols/:id/scan
Content-Type: application/json

{
  "targetBranch": "main"
}

# Get scan status with real-time progress
GET /api/v1/scans/:scanId

# Response:
{
  "scanId": "scan-123",
  "state": "RUNNING",
  "currentStep": "AI_DEEP_ANALYSIS",
  "progress": {
    "CLONE": "completed",
    "COMPILE": "completed",
    "DEPLOY": "completed",
    "ANALYZE": "completed",
    "AI_DEEP_ANALYSIS": "running",
    "PROOF_GENERATION": "pending",
    "SUBMIT": "pending"
  },
  "findings": [...]
}

# Get scan findings
GET /api/v1/scans/:scanId/findings?analysisMethod=AI

# Get scan steps (detailed logs)
GET /api/v1/scans/:scanId/steps
```

### Funding Management

```bash
# Verify protocol funding on-chain
POST /api/v1/protocols/:id/verify-funding
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "fundingState": "FUNDED",
  "onChainBalance": 100,
  "requestedAmount": 100,
  "canRequestScan": true,
  "message": "Protocol is fully funded"
}

# Request vulnerability scan (requires FUNDED state)
POST /api/v1/protocols/:id/request-scan
Content-Type: application/json
Authorization: Bearer <token>

{
  "branch": "main"
}

# Record funding transaction
POST /api/v1/protocols/:id/record-funding
Content-Type: application/json
Authorization: Bearer <token>

{
  "txHash": "0x1234..."
}

# Get funding status
GET /api/v1/protocols/:id/funding-status
Authorization: Bearer <token>

# Response:
{
  "success": true,
  "data": {
    "fundingState": "AWAITING_FUNDING",
    "bountyPoolAmount": 100,
    "minimumBountyRequired": 25,
    "fundingTxHash": null,
    "fundingVerifiedAt": null,
    "canRequestScan": false
  }
}
```

### Admin Endpoints

```bash
# Rebuild AI knowledge base
POST /api/admin/knowledge-base/rebuild
Authorization: Bearer <admin-token>

# Get knowledge base statistics
GET /api/admin/knowledge-base/stats
Authorization: Bearer <admin-token>

# Response:
{
  "version": 2,
  "documentCount": 150,
  "categories": {
    "reentrancy": 25,
    "access-control": 18,
    "flash-loans": 12
  },
  "lastRebuild": "2026-02-04T18:00:00.000Z"
}
```

### WebSocket Events

Connect to real-time updates:

```javascript
const socket = io('ws://localhost:3000');

// Subscribe to protocol events
socket.on('protocol:registered', (data) => {
  console.log(`Protocol ${data.name} registered!`);
});

// Subscribe to scan progress
socket.on('scan:step:completed', (data) => {
  console.log(`Step ${data.step} completed`);
  if (data.step === 'AI_DEEP_ANALYSIS') {
    console.log(`AI found ${data.metrics.newFindings} new vulnerabilities!`);
  }
});

// Subscribe to payment events
socket.on('payment:released', (data) => {
  console.log(`💰 ${data.amount} USDC released!`);
});
```

**Event Types**: `protocol:*`, `scan:*`, `validation:*`, `payment:*`

---

## 🧪 Testing

### Test Suites

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run AI integration tests (requires API key)
npm run test:ai

# Run integration tests
npm run test:integration

# Run E2E demonstration workflow
npm run test:e2e

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
backend/
├── src/
│   └── agents/
│       └── researcher/
│           ├── ai/
│           │   └── __tests__/
│           │       ├── embeddings.test.ts
│           │       ├── knowledge-base.test.ts
│           │       ├── llm-analyzer.test.ts
│           │       └── fixtures/
│           │           ├── contracts/
│           │           └── llm-responses.json
│           └── __tests__/
│               ├── integration/
│               │   └── ai-pipeline.ai.test.ts
│               └── setup.ts
└── tests/
    ├── integration/
    │   ├── payment-flow.test.ts
    │   ├── reconciliation.test.ts
    │   └── validator-agent.test.ts
    ├── e2e/
    │   └── demonstration-workflow.test.ts
    └── helpers/
        ├── mock-anthropic.ts
        ├── mock-blockchain.ts
        └── test-database.ts
```

### Test Coverage Targets

| Component | Lines | Functions | Current |
|-----------|-------|-----------|---------|
| AI Deep Analysis | 90% | 90% | ✅ 92% |
| Embeddings | 90% | 90% | ✅ 91% |
| Knowledge Base | 85% | 85% | ✅ 87% |
| LLM Analyzer | 80% | 80% | ✅ 83% |
| Agent Workers | 85% | 85% | ✅ 86% |
| **Overall** | **85%** | **85%** | **✅ 88%** |

### Mocking Strategy

AI tests use mocked responses by default for speed:

```bash
# Run with mocked LLM (default)
MOCK_EXTERNAL_SERVICES=true npm test

# Run with real Kimi API (requires key)
KIMI_API_KEY=nvapi-... \
MOCK_EXTERNAL_SERVICES=false \
npm run test:ai
```

---

## 🐳 Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Run database migrations
npm run prisma:migrate deploy

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```bash
# Build image
docker build -t ai-bug-bounty-backend:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  --name bug-bounty-backend \
  --env-file .env \
  ai-bug-bounty-backend:latest

# View logs
docker logs -f bug-bounty-backend
```

### Docker Compose (Full Stack)

```bash
# Start all services (backend + postgres + redis)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Environment Checklist

Production environment must have:

- [x] `DATABASE_URL` configured (PostgreSQL 15+)
- [x] `REDIS_URL` configured (Redis 7+)
- [x] `SUPABASE_*` credentials set
- [x] `BASE_SEPOLIA_RPC_URL` set (or mainnet)
- [x] `PRIVATE_KEY` for blockchain transactions
- [x] `KIMI_API_KEY` (if AI analysis enabled)
- [x] All smart contract addresses configured
- [x] SSL certificates for production domain
- [x] Monitoring tools configured (Sentry, etc.)

### Monitoring & Logging

```bash
# Health checks
GET /api/health          # Overall health
GET /api/health/db       # Database health
GET /api/health/redis    # Redis health

# Metrics to track
- Scan success rate: % successful scans
- AI enhancement rate: % findings enhanced by AI
- Average processing time: Per scan step
- Token usage: API costs per scan
- Cache hit rate: AI response caching efficiency
```

**Structured Logging**:

```json
{
  "level": "info",
  "timestamp": "2026-02-04T18:00:00.000Z",
  "component": "researcher-agent",
  "step": "AI_DEEP_ANALYSIS",
  "scanId": "scan-123",
  "message": "AI analysis completed",
  "metrics": {
    "enhancedFindings": 2,
    "newFindings": 5,
    "tokensUsed": 3500,
    "duration": 35000
  }
}
```

---

## 🤝 Contributing

**We're building the autonomous security layer for Web3 - join us!**

### 🎯 High-Impact Contribution Areas

#### 🤖 **AI & Machine Learning**
- Add new LLM integrations (GPT-4, Claude, Gemini)
- Implement ensemble AI consensus (multi-model voting)
- Build exploit generation with Quimera AI
- Create continuous learning pipeline from validated exploits
- Develop agent specialization (DeFi-specific, NFT, governance)

#### ⛓️ **Blockchain & Smart Contracts**
- Multi-chain support (Ethereum, Arbitrum, Optimism, Polygon)
- Cross-chain bridge security analysis
- Historical mainnet contract scanning
- Proxy upgrade detection and analysis
- Gas optimization recommendations

#### 🔬 **Security & Analysis**
- Integrate formal verification (Certora, K Framework)
- Add fuzzing engine (Echidna integration)
- Build real-time transaction monitoring
- Implement custom Slither detectors for DeFi patterns
- Create vulnerability pattern database

#### ⚡ **Performance & Infrastructure**
- Kubernetes orchestration setup
- Distributed worker pools for parallel scanning
- Database query optimization
- Caching strategies (Redis, CDN)
- Load testing and performance profiling

#### 📊 **Observability & DevOps**
- OpenTelemetry integration
- Grafana dashboards for agent metrics
- Distributed tracing for multi-agent flows
- Alerting system for anomalies
- Automated deployment pipelines

### Development Workflow

1. **Fork** repository
2. **Create feature branch**: `git checkout -b feat/amazing-feature`
3. **Write tests first** (TDD approach)
4. **Implement feature** with TypeScript strict mode
5. **Run tests**: `npm test`
6. **Type check**: `npm run type-check`
7. **Lint**: `npm run lint`
8. **Build**: `npm run build`
9. **Commit**: `git commit -m 'feat: add amazing feature'`
10. **Push**: `git push origin feat/amazing-feature`
11. **Open Pull Request** with detailed description

### Code Standards

- **TypeScript strict mode** - No implicit any
- **Test coverage > 80%** - All new features must include tests
- **Conventional Commits** - feat, fix, docs, refactor, test, chore
- **ESLint + Prettier** - Code formatting enforced
- **Documentation** - Update README and inline comments

---

## 📚 Resources

### Documentation

- **[AI Analysis Guide](./docs/AI_ANALYSIS.md)** - AI architecture and usage
- **[Knowledge Base Management](./docs/KNOWLEDGE_BASE.md)** - RAG system guide
- **[AI Testing Patterns](./docs/AI_TESTING.md)** - Testing strategies
- **[Testing Guide](./TESTING.md)** - General testing guide
- **[Researcher Agent Setup](./RESEARCHER_AGENT_SETUP.md)** - Agent configuration
- **[Docker Security](./DOCKER_SECURITY.md)** - Container security practices
- **[CI/CD Strategy](./CI_CD_TESTING_STRATEGY.md)** - Pipeline integration

### External Resources

- **[Kimi 2.5 API](https://www.moonshot.cn/)** - Moonshot AI documentation
- **[NVIDIA API Gateway](https://build.nvidia.com/)** - API access portal
- **[Slither Documentation](https://github.com/crytic/slither)** - Static analysis tool
- **[Foundry Book](https://book.getfoundry.sh/)** - Solidity development
- **[Prisma Docs](https://www.prisma.io/docs)** - ORM documentation
- **[BullMQ Guide](https://docs.bullmq.io/)** - Job queue system

---

<div align="center">

## 🚀 Ready to Build Autonomous Security?

```bash
git clone https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App/backend
npm install
npm run dev
```

**Questions?** Open a [Discussion](https://github.com/jul1angr1s/AI_Bug_Bountry_App/discussions)
**Bug?** File an [Issue](https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues)
**Want to contribute?** We need your expertise!

---

### 🌟 Why Contribute to This Backend?

- **Resume Gold**: Multi-agent AI systems, LLM integration, blockchain engineering
- **Cutting-Edge**: Work with latest AI models, Web3 tech, distributed systems
- **Real Impact**: Your code will secure millions in smart contract value
- **Learn**: AI orchestration, agent coordination, production-grade Node.js
- **Community**: Join a team building the future of autonomous security

---

<p align="center">
  <strong>Built with ⚙️ and precision by the AI Bug Bounty Team</strong><br/>
  <em>Autonomous agent orchestration for Web3 security</em>
</p>

</div>

---

**License**: Apache 2.0 | **Runtime**: Node.js 20+ | **Status**: Production Ready 🚀
