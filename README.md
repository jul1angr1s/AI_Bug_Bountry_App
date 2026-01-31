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
2. **Researcher Agent** - Discovers vulnerabilities using static analysis (Slither) and dynamic testing
3. **Validator Agent** - Verifies vulnerabilities in isolated sandboxes
4. **Automated Payments** - Releases USDC bounties based on severity

### Key Features

✅ **On-Chain Registry** - Immutable protocol and validation records on Base Sepolia
✅ **Automated Discovery** - AI-powered vulnerability scanning with Slither
✅ **Sandboxed Validation** - Isolated Anvil environments for exploit verification
✅ **Severity-Based Rewards** - 5x multiplier for CRITICAL, down to 0.25x for INFORMATIONAL
✅ **ERC-8004 Compliant** - Standardized validation attestation
✅ **Real-Time Updates** - WebSocket events for all agent activities
✅ **Comprehensive Testing** - 1,681 lines of test coverage (100% function coverage)

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│                  Dashboard, Protocol Registration                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────┴────────────────────────────────────────┐
│                    Backend (Node.js/Express)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  Protocol   │  │ Researcher  │  │  Validator   │            │
│  │   Agent     │  │   Agent     │  │    Agent     │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘            │
│         │                 │                 │                    │
│    ┌────┴─────────────────┴─────────────────┴────┐              │
│    │         BullMQ Queues (Redis)               │              │
│    └────┬─────────────────┬─────────────────┬────┘              │
│         │                 │                 │                    │
│    ┌────┴────┐      ┌─────┴──────┐    ┌────┴─────┐             │
│    │ GitHub  │      │   Slither  │    │  Anvil   │             │
│    │ Cloning │      │  Analysis  │    │ Sandbox  │             │
│    └─────────┘      └────────────┘    └──────────┘             │
└────────────────────────┬───────────────────────────────────────┘
                         │ ethers.js
┌────────────────────────┴────────────────────────────────────────┐
│              Smart Contracts (Base Sepolia)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Protocol    │  │ Validation   │  │   Bounty     │          │
│  │  Registry    │  │  Registry    │  │    Pool      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│                      USDC (Base Sepolia)                         │
└──────────────────────────────────────────────────────────────────┘
```

### Database Schema

```
Protocol ──┬──> Scan ──┬──> Finding ──┬──> Proof ──> Validation
           │           │              │
           │           └──> ScanStep  └──> Payment
           │
           └──> Funding
```

---

## 🔄 End-to-End Workflow

### Complete Vulnerability Discovery & Reward Cycle

```mermaid
graph TD
    A[Protocol Owner] -->|1. Register Protocol| B[Protocol Agent]
    B -->|2. Clone & Verify| C[GitHub Repository]
    B -->|3. Compile Contracts| D[Foundry]
    B -->|4. Register On-Chain| E[ProtocolRegistry]

    F[Trigger Scan] -->|5. Queue Job| G[Researcher Agent]
    G -->|6. Clone Repo| C
    G -->|7. Compile| D
    G -->|8. Deploy to Anvil| H[Local Testnet]
    G -->|9. Run Slither| I[Static Analysis]
    I -->|10. Findings Detected| J[Generate Proof]
    J -->|11. Submit Proof| K[Validator Agent]

    K -->|12. Clone Same Commit| C
    K -->|13. Deploy to Sandbox| L[Isolated Anvil]
    K -->|14. Execute Exploit| M[Validate Vulnerability]
    M -->|15. Record Validation| N[ValidationRegistry]

    N -->|16. CONFIRMED| O[BountyPool]
    O -->|17. Calculate Amount| P[Severity Multiplier]
    P -->|18. Release USDC| Q[Researcher Wallet]

    E -.->|Events| R[Dashboard]
    N -.->|Events| R
    O -.->|Events| R

    style E fill:#90EE90
    style N fill:#90EE90
    style O fill:#90EE90
    style Q fill:#FFD700
```

### E2E Test Executed on Base Sepolia

**Actual test results from integration test:**

```mermaid
sequenceDiagram
    participant User as Test Script
    participant PR as ProtocolRegistry
    participant VR as ValidationRegistry
    participant BP as BountyPool
    participant USDC as USDC Token

    Note over User: Deployer: 0x4379...0c3<br/>Balance: 61 USDC

    User->>PR: registerProtocol(Thunder Loan)
    PR-->>User: Protocol ID: 0x8420...ead6
    Note over PR: Status: PENDING<br/>Owner: 0x4379...0c3

    User->>USDC: approve(BountyPool, 50 USDC)
    USDC-->>User: Approved

    User->>BP: depositBounty(protocol, 50 USDC)
    BP->>USDC: transferFrom(user, pool, 50 USDC)
    USDC-->>BP: Success
    BP-->>User: Deposited
    Note over BP: Pool Balance: 50 USDC

    User->>VR: recordValidation(CRITICAL, CONFIRMED)
    VR-->>User: Validation ID: 0x4815...bcb3
    Note over VR: Validator: 0x4379...0c3<br/>Outcome: CONFIRMED<br/>Severity: CRITICAL

    User->>BP: releaseBounty(INFORMATIONAL, 25 USDC)
    BP->>USDC: transfer(researcher, 25 USDC)
    USDC-->>User: Success
    BP-->>User: Bounty ID: 0x6dad...b78
    Note over User: Received: 25 USDC<br/>Net Cost: Gas only

    User->>VR: getProtocolValidations()
    VR-->>User: 1 validation
    User->>VR: getConfirmedValidations()
    VR-->>User: 1 confirmed
    User->>BP: getResearcherBounties()
    BP-->>User: 1 bounty (25 USDC)

    Note over User,USDC: ✅ All Tests Passed<br/>Total Time: ~2 minutes<br/>Cost: Gas fees only
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
npm test
```

---

## 📚 Documentation

### Smart Contracts

- [**Deployment Guide**](backend/contracts/DEPLOYMENT_GUIDE.md) - How to deploy contracts to Base Sepolia
- [**Integration Test Guide**](backend/contracts/INTEGRATION_TEST_GUIDE.md) - Running E2E tests on testnet
- [**Contract Specifications**](openspec/changes/phase-3b-smart-contracts/specs/contracts/spec.md) - Detailed contract documentation

### Implementation Summaries

- [**Phase 3B Completion**](PHASE_3B_COMPLETION_SUMMARY.md) - Smart contract deployment summary
- [**Phase 3B Implementation**](PHASE_3B_IMPLEMENTATION_SUMMARY.md) - Technical implementation details
- [**Security Verification**](SECURITY_AND_OPENSPEC_VERIFICATION.md) - Security audit and OpenSpec status

### OpenSpec Framework

All project changes are tracked using the [OpenSpec framework](https://openspec.dev):

- [**Phase 3B Change**](openspec/changes/phase-3b-smart-contracts/) - Current implementation (100% complete)
- [**Tasks Tracker**](openspec/changes/phase-3b-smart-contracts/tasks.yaml) - All 12 tasks completed
- [**Main Specs**](openspec/specs/) - Project specifications (agents, API, database, workflows)

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

### 🚧 Phase 4: Payment Automation (In Progress)
- [ ] Automatic bounty release on validation
- [ ] USDC approval flow
- [ ] Payment reconciliation
- [ ] Payment dashboard

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
- TypeScript Backend: ~5,000 lines
- React Frontend: ~3,000 lines
- Test Coverage: 1,681 lines (87 test functions)

**Blockchain:**
- Network: Base Sepolia (Chain ID: 84532)
- Contracts Deployed: 3 (all verified)
- Gas Cost: ~0.014 ETH (~$50 USD)
- USDC Base Amount: 100 USDC

**Testing:**
- Unit Tests: 87 functions
- Integration Tests: Full workflow verified
- E2E Tests: Successful on Base Sepolia
- Function Coverage: 100%

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

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
