# AI Bug Bounty Platform

An intelligent, automated bug bounty platform that uses AI agents to discover, validate, and reward smart contract vulnerabilities on Base Sepolia.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-blue)](https://sepolia.basescan.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-orange)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## 🎯 Overview

The AI Bug Bounty Platform automates the complete vulnerability discovery and reward lifecycle using AI agents:

1. **Protocol Agent** - Validates and registers smart contracts on-chain
2. **Researcher Agent** - Discovers vulnerabilities using Slither + AI-powered deep analysis
3. **Validator Agent** - Verifies vulnerabilities in isolated sandboxes
4. **Payment Automation** - Automatic USDC bounty releases with reconciliation

### Key Features

✅ **On-Chain Registry** - Immutable protocol and validation records on Base Sepolia
✅ **AI-Enhanced Discovery** - Hybrid analysis combining Slither + Claude Sonnet 4.5 for deep inspection
✅ **Sandboxed Validation** - Isolated Anvil environments for exploit verification
✅ **Automated Payments** - Event-driven USDC bounty releases with reconciliation and dashboard
✅ **Severity-Based Rewards** - 5x multiplier for CRITICAL, down to 0.25x for INFORMATIONAL
✅ **ERC-8004 Compliant** - Standardized validation attestation
✅ **Real-Time Updates** - WebSocket events for all agent activities
✅ **Comprehensive Testing** - 1,681+ lines of contract tests + extensive integration tests
✅ **Professional PR Workflow** - Automated PR size checks (1,500 line limit)

---

## 🎬 Demonstration

Try the complete workflow using the Thunder Loan protocol:

```bash
# 1. Start backend
cd backend
npm install
npm run dev

# 2. Start frontend
cd frontend
npm install
npm run dev

# 3. Navigate to http://localhost:5173/protocols/register
# 4. Register Thunder Loan protocol
# 5. Watch automated scanning, validation, and payment!
```

**Full demonstration guide**: [docs/DEMONSTRATION.md](./docs/DEMONSTRATION.md)

**Expected End-to-End Time**: < 4 minutes from registration to payment complete ✅

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
        USDC[💵 USDC Token<br/>0x036C...CF7e]
    end

    UI -->|HTTP/REST| API
    UI <-->|Real-time Events| WS
    WS <--> WSServer

    API --> Queue
    Queue --> PA
    Queue --> RA
    Queue --> VA

    PA --> GH
    RA --> GH
    RA --> SL
    VA --> GH
    VA --> AV

    PA -->|ethers.js| PR
    VA -->|ethers.js| VR
    VA -->|ethers.js| BP
    BP <--> USDC

    PR -.->|Events| WSServer
    VR -.->|Events| WSServer
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
    Protocol[(🏢 Protocol)]
    Scan[(🔍 Scan)]
    Finding[(🐛 Finding)]
    Proof[(📝 Proof)]
    Validation[(✅ Validation)]
    Payment[(💰 Payment)]
    ScanStep[(📊 ScanStep)]
    Funding[(💵 Funding)]

    Protocol -->|1:N| Scan
    Protocol -->|1:N| Funding
    Scan -->|1:N| Finding
    Scan -->|1:N| ScanStep
    Finding -->|1:1| Proof
    Proof -->|1:1| Validation
    Proof -->|1:1| Payment

    style Protocol fill:#3B82F6,stroke:#1E40AF,stroke-width:2px,color:#fff
    style Scan fill:#8B5CF6,stroke:#7C3AED,stroke-width:2px,color:#fff
    style Finding fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff
    style Proof fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff
    style Validation fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Payment fill:#FFD700,stroke:#FFA500,stroke-width:2px,color:#000
```

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

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| **ProtocolRegistry** | [`0xc7DF730cf661a306a9aEC93D7180da6f6Da23235`](https://sepolia.basescan.org/address/0xc7DF730cf661a306a9aEC93D7180da6f6Da23235) | ✅ | Protocol registration & management |
| **ValidationRegistry** | [`0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d`](https://sepolia.basescan.org/address/0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d) | ✅ | ERC-8004 validation attestation |
| **BountyPool** | [`0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`](https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0) | ✅ | USDC bounty management |
| **USDC (Testnet)** | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | ✅ | Base Sepolia USDC |

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

# Deployed Contracts
PROTOCOL_REGISTRY_ADDRESS="0xc7DF730cf661a306a9aEC93D7180da6f6Da23235"
VALIDATION_REGISTRY_ADDRESS="0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d"
BOUNTY_POOL_ADDRESS="0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0"

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

# Run AI tests only (requires ANTHROPIC_API_KEY)
npm run test:ai

# Run payment integration tests (requires Anvil)
npm run test:integration
```

---

## 🤖 AI-Enhanced Analysis

### Overview

Phase 4.5 introduces AI-powered vulnerability analysis using **Claude Sonnet 4.5** to enhance traditional Slither static analysis.

### 7-Step Research Pipeline

```
1. CLONE              → Clone repository from GitHub
2. COMPILE            → Compile Solidity with Foundry
3. DEPLOY             → Deploy to local Anvil testnet
4. ANALYZE            → Run Slither static analysis
5. AI_DEEP_ANALYSIS   → AI-powered enhancement ⭐ NEW
6. PROOF_GENERATION   → Generate exploit proofs
7. SUBMIT             → Submit to Validator Agent
```

### AI Features

- **Hybrid Analysis**: Combines Slither pattern matching with LLM semantic understanding
- **Enhanced Findings**: AI adds remediation suggestions, code snippets, confidence scores
- **Knowledge Base**: RAG with FAISS vector store (ConsenSys, SWC Registry, Solidity docs)
- **Graceful Degradation**: Falls back to Slither-only on API failures
- **Feature Flag Control**: `AI_ANALYSIS_ENABLED=true/false`

### Configuration

```bash
# Enable AI analysis
AI_ANALYSIS_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-...

# AI Configuration
AI_CONCURRENCY_LIMIT=3
AI_RATE_LIMIT_RPM=100
KNOWLEDGE_BASE_TOP_K=5
```

See [`backend/docs/AI_ANALYSIS.md`](backend/docs/AI_ANALYSIS.md) for complete documentation.

---

## 💳 Payment Automation

### Features

- **Event-Driven Triggers**: Automatic payment on ValidationRecorded events
- **USDC Integration**: Direct USDC bounty releases via BountyPool contract
- **Reconciliation**: BountyReleased event listener syncs on-chain state with database
- **Payment Dashboard**: Real-time earnings leaderboard and payment history
- **Two-Wallet Testing**: Support for separate deployer/researcher wallets

### Payment Flow

```
ValidationRecorded (CONFIRMED)
    ↓
Payment Record Created
    ↓
BullMQ Job Queued
    ↓
BountyPool.releaseBounty()
    ↓
BountyReleased Event
    ↓
Payment Reconciliation
    ↓
Database Updated
```

See payment dashboard at `http://localhost:5173/payments` during development.

---

## 📚 Documentation

### Smart Contracts

- [**Deployment Guide**](backend/contracts/DEPLOYMENT_GUIDE.md) - How to deploy contracts to Base Sepolia
- [**Integration Test Guide**](backend/contracts/INTEGRATION_TEST_GUIDE.md) - Running E2E tests on testnet
- [**Contract Specifications**](openspec/changes/phase-3b-smart-contracts/specs/contracts/spec.md) - Detailed contract documentation

### Backend Services

- [**Backend README**](backend/README.md) - Complete backend documentation with migration strategy
- [**AI Analysis**](backend/docs/AI_ANALYSIS.md) - AI-enhanced vulnerability analysis architecture
- [**Knowledge Base**](backend/docs/KNOWLEDGE_BASE.md) - RAG knowledge base management
- [**AI Testing**](backend/docs/AI_TESTING.md) - AI testing patterns and strategies
- [**Testing Guide**](backend/TESTING.md) - General testing guide

### Implementation Summaries

- [**Phase 3B Completion**](docs/PHASE_3B_COMPLETION_SUMMARY.md) - Smart contract deployment summary
- [**Phase 3B Implementation**](docs/PHASE_3B_IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [**Security Verification**](docs/SECURITY_AND_OPENSPEC_VERIFICATION.md) - Security audit and OpenSpec status

### Development Guidelines

- [**PR Size Guidelines**](openspec/specs/pr-guidelines.md) - PR size limits and split strategies
- [**Database Migration Strategy**](backend/README.md#migration-strategy) - Split migrations by feature domain

### OpenSpec Framework

All project changes are tracked using the [OpenSpec framework](https://openspec.dev):

- [**Phase 3B**](openspec/changes/phase-3b-smart-contracts/) - Smart contracts (100% complete)
- [**Phase 4**](openspec/changes/phase-4-payment-automation/) - Payment automation (100% complete)
- [**Main Specs**](openspec/specs/) - Project specifications (agents, API, database, workflows)
- [**PR Guidelines**](openspec/specs/pr-guidelines.md) - Automated PR size enforcement

---

## 🛠️ Development

### Project Structure

```
AI_Bug_Bountry_App/
├── backend/                    # Node.js/Express backend
│   ├── contracts/              # Foundry smart contracts
│   │   ├── src/                # Contract source files
│   │   ├── test/               # Comprehensive test suite
│   │   ├── script/             # Deployment & integration scripts
│   │   └── lib/                # OpenZeppelin & forge-std
│   ├── src/
│   │   ├── agents/             # AI agents (Protocol, Researcher, Validator)
│   │   ├── blockchain/         # Smart contract integration layer
│   │   ├── queues/             # BullMQ job queues
│   │   ├── routes/             # API endpoints
│   │   └── websocket/          # Real-time events
│   ├── prisma/                 # Database schema & migrations
│   └── test-blockchain-integration.mjs
├── frontend/                   # React/TypeScript frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── pages/              # Dashboard, Protocol pages
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

✅ **ReentrancyGuard** - All state-changing functions protected
✅ **SafeERC20** - Secure USDC transfers
✅ **AccessControl** - Role-based permissions (VALIDATOR_ROLE, PAYOUT_ROLE)
✅ **Custom Errors** - Gas-optimized error handling
✅ **Immutable Records** - Validation records cannot be modified
✅ **Input Validation** - All edge cases covered
✅ **Sandboxed Execution** - Isolated Anvil environments for exploit testing

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

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (Completed)
- [x] Researcher Agent with Slither integration
- [x] Vulnerable test contracts
- [x] Backend service layer

### ✅ Phase 2: Integration (Completed)
- [x] Frontend dashboard with real-time updates
- [x] Protocol Agent with GitHub verification
- [x] WebSocket event system

### ✅ Phase 3: Smart Contracts (Completed)
- [x] Protocol, Validation, and Bounty Pool contracts
- [x] Base Sepolia deployment
- [x] Validator Agent with sandboxed testing
- [x] Comprehensive test suite (1,681 lines)
- [x] E2E verification on testnet

### ✅ Phase 4: Payment Automation (Completed)
- [x] Automatic bounty release on validation (event-driven)
- [x] USDC approval flow (frontend component)
- [x] Payment reconciliation (BountyReleased event listener)
- [x] Payment dashboard (real-time with earnings leaderboard)
- [x] Two-wallet testing infrastructure
- [x] Event listener state management

### ✅ Phase 4.5: AI-Enhanced Analysis (Completed)
- [x] AI deep analysis step (7-step pipeline)
- [x] Hybrid analysis (Slither + Claude Sonnet 4.5)
- [x] Knowledge base with RAG (FAISS vector store)
- [x] Enhanced findings with remediation suggestions
- [x] Feature flag control (AI_ANALYSIS_ENABLED)
- [x] Comprehensive AI testing infrastructure
- [x] CI/CD integration for AI tests

### 📋 Phase 5: Production (Planned)
- [ ] Security audit
- [ ] Mainnet deployment (Base)
- [ ] Researcher reputation system
- [ ] Multi-protocol support at scale

### 🚀 Future Enhancements
- [ ] Quimera AI integration for exploit generation
- [ ] IPFS proof storage (Pinata)
- [ ] Proof encryption (Lit Protocol)
- [ ] Agent-to-agent messaging
- [ ] Advanced analytics dashboard

---

## 📊 Statistics

### Current Metrics

**Code:**
- Smart Contracts: 3 files, ~1,000 lines
- TypeScript Backend: ~12,000 lines (expanded with payment automation + AI analysis)
- React Frontend: ~5,500 lines (added payment dashboard)
- Test Coverage: 8,000+ lines (contracts + backend + integration)

**Blockchain:**
- Network: Base Sepolia (Chain ID: 84532)
- Contracts Deployed: 3 (all verified)
- Gas Cost: ~0.014 ETH (~$50 USD)
- USDC Base Amount: 100 USDC

**Testing:**
- Contract Tests: 87 functions (1,681 lines)
- Backend Unit Tests: 45+ test suites
- Integration Tests: Payment flow + AI pipeline
- E2E Tests: Successful on Base Sepolia
- Coverage: 85%+ across codebase

**Development Quality:**
- PR Size Limit: 1,500 lines (enforced via GitHub Actions)
- Automated Size Checks: ✅ Active
- OpenSpec Tracked: All major features documented
- Split Migrations: Database changes by feature domain

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. **Create OpenSpec Change** - Document your feature/fix
2. **Implement** - Write code with tests
3. **Test** - Unit tests + integration tests
4. **Document** - Update README and OpenSpec specs
5. **PR** - Create pull request with detailed description

### PR Size Guidelines

**IMPORTANT**: This project enforces PR size limits to maintain code quality:

- **Maximum PR size**: 1,500 lines of code
- **Maximum with tests**: 2,000 lines total
- **Automated checks**: PRs >1,500 lines trigger warnings with split suggestions

See [`openspec/specs/pr-guidelines.md`](openspec/specs/pr-guidelines.md) for:
- Split strategies (by layer, by feature, feature flags)
- Database migration best practices
- Examples of successful PR splits

**Automated enforcement**: GitHub Actions automatically labels PRs by size and posts warnings for oversized PRs.

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

**Built with ❤️ by the AI Bug Bounty Platform Team**

*Automated vulnerability discovery and rewards, powered by AI agents on Base.*
