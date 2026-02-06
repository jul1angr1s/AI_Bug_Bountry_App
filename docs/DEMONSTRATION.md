# AI Bug Bounty Platform - Demonstration Guide

## Overview

This guide walks you through the complete end-to-end workflow of the AI Bug Bounty Platform. The flow now includes **ERC-8004 agent identity/reputation scoring** and **x.402 payment gating** — agents must register on-chain before operating, researchers must fund escrow before submitting findings, and protocol registration requires a USDC payment.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Register    │────▶│ x.402 Gate   │────▶│ Protocol      │────▶│ Scan Created │
│  Protocol    │     │ (1 USDC fee) │     │ Registered    │     │ Automatically│
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬───────┘
                                                                      │
┌─────────────┐     ┌──────────────┐     ┌───────────────┐           │
│ Researcher   │────▶│ Escrow Gate  │────▶│ Finding       │◀──────────┘
│ Agent Scans  │     │ (0.5 USDC)   │     │ Submitted     │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌───────▼───────┐
│ Validator    │────▶│ AI Validates │────▶│ Reputation    │
│ Agent        │     │ + Score      │     │ Updated       │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌───────▼───────┐
│ Payment      │────▶│ BountyPool   │────▶│ USDC Paid     │
│ Worker       │     │ releaseBounty│     │ On-Chain      │
└─────────────┘     └──────────────┘     └───────────────┘
```

## Prerequisites

- Node.js >= 20
- PostgreSQL database
- Redis server (with auth: `redis-cli -a redis_dev_2024 ping`)
- Kimi 2.5 API key (Moonshot AI)
- Base Sepolia testnet access
- Foundry installed (`forge`, `cast`, `anvil`)
- Payer wallet funded with ETH (>= 0.01 ETH for gas)
- BountyPool funded with USDC (>= 50 USDC for demo)

## Deployed Contracts (Base Sepolia - Chain 84532)

| Contract | Address | Purpose |
|----------|---------|---------|
| AgentIdentityRegistry | `0x59932bDf3056D88DC07cb320263419B8ec1e942d` | ERC-8004 soulbound agent NFTs |
| AgentReputationRegistry | `0x8160aB516366FfaAb6C239524D35963058Feb850` | On-chain reputation scoring |
| PlatformEscrow | `0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab` | Escrow deposits + fee deduction |
| BountyPool | `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0` | Bounty payouts to researchers |
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Payment token |

## Environment Setup

### Backend `.env`

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bugbounty

# Server
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development

# Blockchain (Base Sepolia)
PRIVATE_KEY=0x...your_private_key
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
BASESCAN_API_KEY=your_basescan_key

# ERC-8004 Agent Contracts
AGENT_IDENTITY_REGISTRY_ADDRESS=0x59932bDf3056D88DC07cb320263419B8ec1e942d
AGENT_REPUTATION_REGISTRY_ADDRESS=0x8160aB516366FfaAb6C239524D35963058Feb850

# x.402 Payment Gating
PLATFORM_ESCROW_ADDRESS=0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab
PLATFORM_WALLET_ADDRESS=0x...your_platform_wallet
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
SKIP_X402_PAYMENT_GATE=true  # Set to 'false' for full payment enforcement

# BountyPool
BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
SKIP_ONCHAIN_REGISTRATION=true  # Set to 'false' for on-chain protocol registration

# AI/LLM (Kimi 2.5)
MOONSHOT_API_KEY=your_moonshot_api_key
KIMI_API_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-32k

# Redis
REDIS_URL=redis://:redis_dev_2024@localhost:6379
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

## Starting the Application

### Terminal 1: Backend

```bash
cd backend
npm install
npx prisma migrate dev    # Creates all tables including ERC-8004/x402 models
npm run dev
```

### Terminal 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

### Terminal 3: Redis (verify)

```bash
redis-cli -a redis_dev_2024 ping
# Expected: PONG
```

## End-to-End Demonstration

### Step 1: Register Agent Identities

Before any operations, register the researcher and validator agents in the ERC-8004 registry.

#### Via Frontend

1. Navigate to `http://localhost:5173/agents`
2. Click **"Register Agent"** button
3. Fill in:
   - **Wallet Address**: `0x...researcher_wallet` (the wallet that will scan)
   - **Agent Type**: `RESEARCHER`
4. Click **"Register Agent"**
5. Repeat for the validator:
   - **Wallet Address**: `0x...validator_wallet`
   - **Agent Type**: `VALIDATOR`

#### Via API (cURL)

```bash
# Register researcher agent
curl -X POST http://localhost:3000/api/v1/agent-identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYOUR_RESEARCHER_WALLET",
    "agentType": "RESEARCHER",
    "registerOnChain": true
  }'

# Register validator agent
curl -X POST http://localhost:3000/api/v1/agent-identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYOUR_VALIDATOR_WALLET",
    "agentType": "VALIDATOR",
    "registerOnChain": true
  }'
```

#### Verify Registration

```bash
# Check all registered agents
curl http://localhost:3000/api/v1/agent-identities

# Check on-chain registration
cast call 0x59932bDf3056D88DC07cb320263419B8ec1e942d \
  "isRegistered(address)(bool)" \
  0xYOUR_RESEARCHER_WALLET \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

**Frontend**: Navigate to `/agents` to see both agents in the registry table with their NFT IDs, type badges, and active status.

### Step 2: Fund Researcher Escrow

The researcher needs USDC in escrow to submit findings (0.5 USDC per submission).

#### Via Frontend

1. Navigate to `http://localhost:5173/agents/:researcher_id/escrow`
2. Click **"Deposit"**
3. Enter amount (e.g., `5` USDC for 10 submissions)
4. Confirm the deposit

#### Via API

```bash
# Deposit 5 USDC (5000000 in 6-decimal USDC units) to researcher escrow
curl -X POST http://localhost:3000/api/v1/agent-identities/RESEARCHER_ID/escrow/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "5000000",
    "txHash": "0x...optional_onchain_tx_hash"
  }'
```

#### Verify Escrow Balance

```bash
# Check escrow balance
curl http://localhost:3000/api/v1/agent-identities/RESEARCHER_ID/escrow

# Expected response:
# {
#   "balance": "5000000",
#   "totalDeposited": "5000000",
#   "totalDeducted": "0",
#   "remainingSubmissions": 10,
#   "submissionFee": "500000"
# }
```

**Frontend**: The Escrow Dashboard at `/agents/:id/escrow` shows balance, remaining submissions, deposit history, and transaction list.

### Step 3: Register Protocol (x.402 Payment Gate)

Protocol registration is gated by the x.402 payment protocol. When `SKIP_X402_PAYMENT_GATE=false`, registering a protocol requires a 1 USDC payment.

#### With Payment Gate Disabled (Demo Mode)

If `SKIP_X402_PAYMENT_GATE=true` in `.env`, the gate is skipped and registration proceeds normally:

1. Navigate to `http://localhost:5173/protocols/register`
2. Fill in:
   - **Protocol Name**: Thunder Loan Protocol
   - **GitHub URL**: `https://github.com/Cyfrin/2023-11-Thunder-Loan`
   - **Branch**: main
   - **Contract Path**: `src/protocol/ThunderLoan.sol`
3. Click **"Register Protocol"**

#### With Payment Gate Enabled

When `SKIP_X402_PAYMENT_GATE=false`:

1. The initial `POST /api/v1/protocols` returns **HTTP 402 Payment Required**
2. The response body contains x.402 payment terms:
   ```json
   {
     "error": "Payment Required",
     "x402": {
       "version": "1.0",
       "amount": "1000000",
       "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
       "chain": "base-sepolia",
       "recipient": "0xYOUR_PLATFORM_WALLET",
       "memo": "Protocol registration fee",
       "expiresAt": "2026-02-05T..."
     },
     "instructions": {
       "step1": "Approve USDC spending for the platform escrow contract",
       "step2": "Include X-Payment-Receipt header with transaction hash",
       "step3": "Retry the request with payment proof"
     }
   }
   ```
3. The frontend's **PaymentRequiredModal** intercepts the 402 and displays the payment terms
4. User pays 1 USDC on-chain (USDC transfer to platform wallet)
5. Retry the request with the transaction hash:
   ```bash
   curl -X POST http://localhost:3000/api/v1/protocols \
     -H "Content-Type: application/json" \
     -H "X-Payment-Receipt: 0xYOUR_TX_HASH" \
     -d '{ "name": "Thunder Loan", "githubUrl": "..." }'
   ```
6. The middleware verifies the tx on-chain (parses USDC Transfer event, checks recipient and amount)
7. Registration proceeds

**Frontend**: The payment event appears in the x.402 Payment Timeline at `/x402-payments`.

### Step 4: Automated Scanning (Researcher Agent)

After protocol registration, the scan pipeline starts automatically.

The Researcher Agent:
1. Clones the GitHub repository
2. Deploys to a local Anvil fork
3. Runs Slither static analysis
4. Performs AI deep analysis
5. Generates exploit proof-of-concept code
6. Creates Finding records

**x.402 Finding Submission Gate**: Each finding submission checks the researcher's escrow balance. If `SKIP_X402_PAYMENT_GATE=false` and balance < 0.5 USDC, the submission returns HTTP 402 with instructions to deposit more funds.

After each successful scan, 0.5 USDC is deducted from the researcher's escrow:

```
[Scans] Submission fee deducted for researcher 0x..., scan abc-123
```

**Monitor Progress**:
- Navigate to `/scans` to see real-time scan progress
- Navigate to `/agents/:researcher_id/escrow` to see SUBMISSION_FEE deductions in the transaction list
- Backend console shows scan stages and fee deductions

**Expected Duration**: < 60 seconds

### Step 5: Proof Validation (Validator Agent + Reputation)

The Validator Agent automatically:
1. Fetches proof from Finding record
2. Analyzes proof with Kimi 2.5 LLM
3. Evaluates technical correctness, attack vector validity, severity
4. Calculates confidence score (0-100%)
5. Updates Finding status (VALIDATED/REJECTED)
6. **Records reputation feedback** for the researcher agent

#### Reputation Update Flow

When validation completes, the system:
1. Dynamically resolves researcher and validator identities from the `AgentIdentity` table
2. Calls `reputationService.recordFeedback()` with the validation outcome
3. Maps severity to feedback type:
   - `CRITICAL` → `CONFIRMED_CRITICAL`
   - `HIGH` → `CONFIRMED_HIGH`
   - `MEDIUM` → `CONFIRMED_MEDIUM`
   - `LOW` → `CONFIRMED_LOW`
   - `INFO` → `CONFIRMED_INFORMATIONAL`
   - Rejected → `REJECTED`
4. Updates the researcher's on-chain reputation score

**Monitor Progress**:
- Navigate to `/agents/:researcher_id/reputation` to see:
  - Reputation score (0-100) with circular progress
  - Confirmed/rejected counts
  - Feedback history with severity badges
- Navigate to `/agents` to see the **Reputation Leaderboard** (ranked by score)

**Expected Duration**: < 60 seconds

### Step 6: Payment Processing (BountyPool)

If the finding is validated, the Payment Worker:
1. Validates payment eligibility
2. Checks BountyPool balance
3. Submits `releaseBounty()` transaction on Base Sepolia
4. Monitors transaction confirmation
5. Updates Payment record with txHash

**Monitor Progress**:
- Navigate to `/payments` to see status: PENDING → PROCESSING → COMPLETED
- Transaction hash links directly to Basescan

**Expected Duration**: < 30 seconds

### Step 7: Verify Results End-to-End

#### 7.1 Frontend Pages

| Page | URL | What to Check |
|------|-----|---------------|
| Dashboard | `/` | Total protocols, vulnerabilities, payments, agent status |
| Agent Registry | `/agents` | Both agents registered, NFT IDs, reputation scores, leaderboard |
| Escrow Dashboard | `/agents/:id/escrow` | Balance after fee deductions, transaction history |
| Reputation Tracker | `/agents/:id/reputation` | Score, confirmed/rejected counts, feedback events |
| x.402 Payments | `/x402-payments` | Payment requests (PENDING/COMPLETED), tx hashes |
| Protocols | `/protocols` | Protocol card with ACTIVE status |
| Scans | `/scans` | Scan progress and findings |
| Payments | `/payments` | USDC payouts with Basescan links |

#### 7.2 On-Chain Verification

```bash
# Check researcher's USDC balance (bounty received)
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0xRESEARCHER_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check BountyPool remaining balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check agent is registered on-chain (ERC-8004)
cast call 0x59932bDf3056D88DC07cb320263419B8ec1e942d \
  "isRegistered(address)(bool)" \
  0xRESEARCHER_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check PlatformEscrow balance for researcher
cast call 0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab \
  "getEscrowBalance(address)(uint256)" \
  0xRESEARCHER_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

#### 7.3 Basescan Links

| What | URL Pattern |
|------|------------|
| Transaction | `https://sepolia.basescan.org/tx/<TX_HASH>` |
| Agent Wallet | `https://sepolia.basescan.org/address/<WALLET>#tokentxns` |
| AgentIdentityRegistry | `https://sepolia.basescan.org/address/0x59932bDf3056D88DC07cb320263419B8ec1e942d#events` |
| AgentReputationRegistry | `https://sepolia.basescan.org/address/0x8160aB516366FfaAb6C239524D35963058Feb850#events` |
| PlatformEscrow | `https://sepolia.basescan.org/address/0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab#events` |
| BountyPool | `https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0#events` |

#### 7.4 Database Verification

```bash
# Open Prisma Studio to inspect all tables
cd backend && npx prisma studio

# Tables to inspect:
# - AgentIdentity: registered agents with wallet, type, NFT ID
# - AgentReputation: score, confirmed/rejected counts
# - AgentFeedback: individual validation feedback events
# - AgentEscrow: current escrow balance per agent
# - EscrowTransaction: deposit/submission_fee/withdrawal records
# - X402PaymentRequest: all 402 payment events (PENDING/COMPLETED)
# - Protocol, Scan, Finding, Validation, Payment: core workflow tables
```

## Payment Amounts

### Bounty Payouts (BountyPool → Researcher)

| Severity | USDC Amount |
|----------|-------------|
| CRITICAL | 10 USDC |
| HIGH | 5 USDC |
| MEDIUM | 3 USDC |
| LOW | 1 USDC |
| INFO | 0.25 USDC |

### Platform Fees (x.402)

| Action | USDC Amount | Mechanism |
|--------|-------------|-----------|
| Protocol Registration | 1 USDC | Direct USDC transfer to platform wallet (x.402) |
| Finding Submission | 0.5 USDC | Deducted from researcher escrow balance |

## Quick Demo Mode vs Full Mode

| Setting | Demo Mode (default) | Full Mode |
|---------|--------------------:|----------:|
| `SKIP_X402_PAYMENT_GATE` | `true` | `false` |
| Protocol registration | Free | 1 USDC via x.402 |
| Finding submission | Free | 0.5 USDC from escrow |
| Receipt verification | Skipped | On-chain USDC Transfer event parsing |
| `SKIP_ONCHAIN_REGISTRATION` | `true` | `false` |
| Protocol on-chain ID | Derived from DB ID | Real on-chain registration |

To run the full payment-gated flow:

```bash
# In backend/.env, set:
SKIP_X402_PAYMENT_GATE=false
PLATFORM_WALLET_ADDRESS=0xYOUR_WALLET  # Must be set for receipt verification
```

## API Endpoints

### Agent Identities (ERC-8004)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agent-identities` | List all agents |
| POST | `/api/v1/agent-identities/register` | Register new agent |
| GET | `/api/v1/agent-identities/leaderboard` | Reputation leaderboard |
| GET | `/api/v1/agent-identities/wallet/:address` | Get agent by wallet |
| GET | `/api/v1/agent-identities/type/:type` | Get agents by type |
| GET | `/api/v1/agent-identities/:id` | Get agent by ID |
| GET | `/api/v1/agent-identities/:id/reputation` | Agent reputation score |
| GET | `/api/v1/agent-identities/:id/feedback` | Agent feedback history |
| POST | `/api/v1/agent-identities/:id/deactivate` | Deactivate agent |

### Escrow

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agent-identities/:id/escrow` | Get escrow balance |
| POST | `/api/v1/agent-identities/:id/escrow/deposit` | Deposit USDC |
| GET | `/api/v1/agent-identities/:id/escrow/transactions` | Transaction history |

### x.402 Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agent-identities/x402-payments` | All x.402 payment events |
| GET | `/api/v1/agent-identities/:id/x402-payments` | Per-agent payment events |

### Core Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/protocols` | Register protocol (x.402 gated) |
| GET | `/api/v1/protocols` | List protocols |
| GET | `/api/v1/protocols/:id` | Protocol details |
| POST | `/api/v1/scans` | Create scan (escrow gated) |
| GET | `/api/v1/scans` | List scans |
| GET | `/api/v1/scans/:id` | Scan details |
| GET | `/api/v1/scans/:id/progress` | Real-time progress (SSE) |
| GET | `/api/v1/validations` | List validations |
| GET | `/api/v1/payments` | List payments |
| GET | `/api/v1/payments/:id` | Payment details |
| GET | `/api/v1/payments/stats` | Payment statistics |
| POST | `/api/v1/payments/:id/retry` | Retry failed payment |

## Troubleshooting

### x.402 Payment Gate Issues

#### "Payment Required" (402) on Protocol Registration

**Cause**: `SKIP_X402_PAYMENT_GATE=false` and no valid payment receipt provided.

**Solutions**:
```bash
# Option 1: Skip the gate for demo
# In backend/.env:
SKIP_X402_PAYMENT_GATE=true

# Option 2: Provide a valid USDC payment
# 1. Transfer 1 USDC to PLATFORM_WALLET_ADDRESS on Base Sepolia
# 2. Include tx hash in the retry request:
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "X-Payment-Receipt: 0xYOUR_TX_HASH" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

#### "Insufficient Escrow Balance" (402) on Scan Creation

**Cause**: Researcher's escrow balance < 0.5 USDC.

**Solutions**:
```bash
# Option 1: Skip the gate
SKIP_X402_PAYMENT_GATE=true

# Option 2: Deposit to escrow
curl -X POST http://localhost:3000/api/v1/agent-identities/AGENT_ID/escrow/deposit \
  -H "Content-Type: application/json" \
  -d '{ "amount": "5000000" }'
```

#### "Researcher wallet address is required" (400)

**Cause**: `POST /scans` called without `researcherAddress` when payment gate is active.

**Solution**: Include `researcherAddress` in the request body:
```bash
curl -X POST http://localhost:3000/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "...",
    "researcherAddress": "0xYOUR_RESEARCHER_WALLET"
  }'
```

### Agent Registration Issues

#### "Agent already registered with wallet"

**Cause**: Wallet address already has an AgentIdentity record.

**Solution**:
```bash
# Check existing registration
curl http://localhost:3000/api/v1/agent-identities/wallet/0xYOUR_WALLET
```

### Common Infrastructure Issues

#### Database Connection

```bash
pg_isready -h localhost -p 5432
# If not running: brew services start postgresql@14
```

#### Redis Connection

```bash
redis-cli -a redis_dev_2024 ping
# Expected: PONG
# If not running: brew services start redis
```

#### Insufficient Gas

```bash
cast balance 0xYOUR_WALLET --rpc-url $BASE_SEPOLIA_RPC_URL
# Need >= 0.01 ETH
# Faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
```

#### BountyPool Not Funded

```bash
# Check pool balance
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Fund pool if needed
cd backend && npx tsx scripts/fund-bounty-pool.ts 50
```

## Pre-Flight Checklist

```bash
# Run diagnostic script
./scripts/diagnose-payment.sh

# Or verify manually:
```

- [ ] PostgreSQL running (`pg_isready`)
- [ ] Redis running with auth (`redis-cli -a redis_dev_2024 ping`)
- [ ] Database migrations applied (`npx prisma migrate dev`)
- [ ] Backend `.env` configured with all contract addresses
- [ ] Payer wallet has ETH for gas (>= 0.01 ETH)
- [ ] BountyPool funded with USDC (>= 50 USDC)
- [ ] Agent identities registered (researcher + validator)
- [ ] Researcher escrow funded (if `SKIP_X402_PAYMENT_GATE=false`)
- [ ] Backend health check passes (`curl http://localhost:3000/health/detailed`)

## Performance Benchmarks

| Step | Duration |
|------|----------|
| Agent Registration | < 10s |
| Escrow Deposit | < 10s |
| Protocol Registration (with x.402) | < 30s |
| Protocol Analysis | < 60s |
| Vulnerability Scan + Fee Deduction | < 60s |
| Proof Validation + Reputation Update | < 60s |
| Payment Processing | < 30s |
| **Total End-to-End** | **< 5 minutes** |

## Recommended Demo Flow

1. **Start services** (backend + frontend + Redis)
2. **Register agents** at `/agents` (researcher + validator)
3. **Fund escrow** at `/agents/:id/escrow` (5 USDC = 10 submissions)
4. **Register protocol** at `/protocols/register` (Thunder Loan)
5. **Watch scan** progress at `/scans`
6. **Check reputation** updates at `/agents/:id/reputation`
7. **Verify payment** at `/payments` (click Basescan link)
8. **Review x.402 events** at `/x402-payments`
9. **Check leaderboard** at `/agents` (reputation ranking)
10. **Verify on-chain** with `cast` commands above
