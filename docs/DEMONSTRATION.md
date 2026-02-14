# AI Bug Bounty Platform - Demonstration Guide

## Overview

This guide walks you through the complete end-to-end workflow of the AI Bug Bounty Platform (Thunder Security). The platform uses **ERC-8004 agent identity/reputation scoring** and **X.402 payment gating** with live on-chain USDC transactions on Base Sepolia. Every transaction is verifiable on the blockchain explorer.

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Register    │────>│ X.402 Gate   │────>│ Protocol      │────>│ Scan Created │
│  Protocol    │     │ (1 USDC fee) │     │ Registered    │     │ Automatically│
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬───────┘
                                                                      │
┌─────────────┐     ┌──────────────┐     ┌───────────────┐           │
│ Researcher   │────>│ Escrow Gate  │────>│ Finding       │<──────────┘
│ Agent Scans  │     │ (0.5 USDC)   │     │ Submitted     │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌───────v───────┐
│ Validator    │────>│ AI Validates │────>│ Reputation    │
│ Agent        │     │ + Score      │     │ Updated       │
└─────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌───────v───────┐
│ Payment      │────>│ BountyPool   │────>│ USDC Paid     │
│ Worker       │     │ releaseBounty│     │ On-Chain      │
└─────────────┘     └──────────────┘     └───────────────┘
```

## Agent Types

The platform runs 4 BullMQ agent workers:

| Agent | Purpose | Capabilities |
|-------|---------|-------------|
| **Protocol** | Manages smart contract registrations | GitHub integration, on-chain registration, status tracking |
| **Researcher** | Autonomous vulnerability scanner | Slither analysis, AI deep analysis, exploit proof generation |
| **Validator** | Independent exploit verification | Sandbox deployment, proof replay, reputation scoring |
| **Payment** | Processes USDC bounty payments | USDC transfers, bounty calculation, on-chain settlement |

## Prerequisites

- Node.js >= 20
- PostgreSQL database running
- Redis via Docker (`docker ps | grep redis`)
- Base Sepolia testnet access (Alchemy RPC)
- MetaMask wallet with Base Sepolia USDC + ETH for gas
- Foundry installed (`forge`, `cast`, `anvil`)

## Deployed Contracts (Base Sepolia - Chain 84532)

| Contract | Address | Purpose |
|----------|---------|---------|
| ProtocolRegistry | `0xc7DF730cf661a306a9aEC93D7180da6f6Da23235` | Protocol registration |
| ValidationRegistry | `0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d` | Validation records |
| BountyPool | `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0` | Bounty payouts |
| AgentIdentityRegistry | `0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b` | ERC-8004 soulbound agent NFTs |
| AgentReputationRegistry | `0x53f126F6F79414d8Db4cd08B05b84f5F1128de16` | On-chain reputation scoring |
| PlatformEscrow | `0x1EC275172C191670C9fbB290dcAB31A9784BC6eC` | Escrow deposits + fee deduction |
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | Payment token |

## Wallet Configuration (Two-Wallet Setup)

The backend uses two wallets to separate concerns:

| Wallet | Env Var | Address | Role |
|--------|---------|---------|------|
| Deployer/Payer | `PRIVATE_KEY` | `0x43793B3d9F23FAC1df54d715Cb215b8A50e710c3` | Contract admin, has PAYOUT_ROLE on BountyPool |
| Platform Receiver | `PRIVATE_KEY2` | `0x6b26F796b7C494a65ca42d29EF13E9eF1CeCE166` | Receives X.402 protocol registration fees |

**Important**: `PLATFORM_WALLET_ADDRESS` must be set to the `PRIVATE_KEY2` wallet (not the deployer). This ensures the payer (user's MetaMask) and receiver are always different wallets for valid on-chain transfers.

```
User's MetaMask (payer) --[1 USDC]--> PLATFORM_WALLET (0x6b26...166)
                                      ^
                                      |
                        Coinbase Facilitator verifies transfer
                                      |
                                      v
                        Backend records X402PaymentRequest with real txHash
                        Frontend shows payment on /x402-payments with BaseScan link
```

## Starting the Application

### Terminal 1: Redis (Docker)

```bash
# Redis runs via Docker - verify it's up
docker ps | grep thunder-redis
# Expected: thunder-redis ... Up ... (healthy)

# Test connection
docker exec thunder-redis redis-cli -a <your-redis-password> ping
# Expected: PONG
```

### Terminal 2: Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
# Verify: curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","services":{"database":"ok","redis":"ok","eventListener":"ok"}}
```

### Terminal 3: Frontend

```bash
cd frontend
npm install
npm run dev
# Open: http://localhost:5173
```

## Quick Start with Demo Data

To populate the platform with realistic demo data for management presentations:

```bash
npx tsx backend/scripts/seed-demo-data.ts
```

**Note**: The seed script performs real on-chain transactions (agent registration, reputation feedback). The deployer wallet needs Base Sepolia ETH for gas (~0.01 ETH). If on-chain calls fail, it falls back to database-only mode.

This creates:
- 2 agent identities (1 RESEARCHER, 1 VALIDATOR) registered on-chain with real tx hashes
- Reputation records with on-chain feedback (real BaseScan-verifiable transactions)
- 4 feedback entries (3 on-chain with real txHash, 1 off-chain)
- 3 X.402 payment records (2 COMPLETED, 1 PENDING)
- 1 escrow account with 5 USDC balance and 2 transactions

Verify seeded data:
```bash
# Agent identities with reputation
curl -s http://localhost:3000/api/v1/agent-identities | python3 -m json.tool

# X.402 payment records
curl -s http://localhost:3000/api/v1/agent-identities/x402-payments | python3 -m json.tool

# Leaderboard
curl -s http://localhost:3000/api/v1/agent-identities/leaderboard | python3 -m json.tool
```

## Authentication

The platform uses **SIWE (Sign-In with Ethereum)** authentication:

1. Connect MetaMask wallet on the `/login` page
2. Sign a message to prove wallet ownership
3. Backend verifies signature and issues a JWT session
4. All protected routes require authentication (redirects to `/login` with return URL)

**CSRF Protection**: All state-changing requests (POST, PUT, DELETE) require a CSRF token. The frontend handles this automatically by fetching a token from `GET /api/v1/csrf-token` and including it in the `x-csrf-token` header plus the `X-CSRF-Token` cookie.

## End-to-End Demonstration

### Step 1: Register Agent Identities (ERC-8004)

Navigate to `/agents` and click **"Register Agent"**.

The registration modal includes an **on-chain toggle**:
- **Off**: Agent is registered in the database only ("Database only" indicator)
- **On**: Agent is registered on-chain via ERC-8004, minting a soulbound NFT ("Verified on blockchain" indicator with BaseScan link)

The Agent Registry page shows:
- **4 stat cards**: Total Agents, Active Agents, On-Chain Verified, Average Reputation Score
- **Table columns**: Wallet, Type, Status (with verification indicator), Verification (BaseScan link), Actions (Reputation/Escrow links)
- **Verification indicators**: Green "Verified on blockchain" for on-chain agents, gray "Database only" otherwise

#### Via API

```bash
# Register researcher agent (with on-chain ERC-8004)
curl -X POST http://localhost:3000/api/v1/agent-identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYOUR_RESEARCHER_WALLET",
    "agentType": "RESEARCHER",
    "registerOnChain": true
  }'

# Verify registration
curl -s http://localhost:3000/api/v1/agent-identities | python3 -m json.tool
```

### Step 2: Fund Researcher Escrow

Navigate to `/agents/:researcher_id/escrow`.

The Escrow Dashboard shows:
- Current balance, total deposited, total deducted
- Remaining submissions (balance / 0.5 USDC submission fee)
- Transaction history with "Verify on chain" links for each transaction

```bash
# Deposit 5 USDC (= 10 submissions)
curl -X POST http://localhost:3000/api/v1/agent-identities/AGENT_ID/escrow/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": "5000000", "txHash": "0x...optional_onchain_tx_hash"}'

# Check balance
curl -s http://localhost:3000/api/v1/agent-identities/AGENT_ID/escrow | python3 -m json.tool
# Expected: {"balance":"5000000","totalDeposited":"5000000","remainingSubmissions":10,...}
```

### Step 3: Register Protocol (X.402 Payment Gate)

Navigate to `/protocols/register` and fill in the protocol details.

**Current configuration**: `SKIP_X402_PAYMENT_GATE=false` (live payment gate enabled).

When you submit the registration:

1. Backend returns **HTTP 402 Payment Required** with payment terms
2. Frontend catches the 402 and displays the **PaymentRequiredModal**
3. The modal shows:
   - Payment amount: 1.00 USDC
   - Network: Base Sepolia
   - Recipient: Platform wallet address
4. User clicks **"Approve USDC"** (ERC-20 approval via MetaMask)
5. User clicks **"Pay"** (USDC transfer via MetaMask)
6. Modal shows the transaction hash with a "Verify on chain" BaseScan link
7. Frontend retries the protocol registration with the `payment-signature` header
8. Backend verifies the payment via the Coinbase X.402 facilitator
9. `X402PaymentRequest` record is created with the real txHash
10. Protocol registration proceeds

The payment appears on the `/x402-payments` page with:
- **4 stat cards**: Total Payments, Total Volume (USDC), Confirmed, Processing
- **Payment timeline**: Each payment shows type, plain-language description, amount, status label, and "Verify on chain" link

#### Demo Mode (skip payment gate)

To skip the payment gate for testing:
```bash
# In backend/.env:
SKIP_X402_PAYMENT_GATE=true
```

### Step 4: Automated Scanning (Researcher Agent)

After protocol registration, the scan pipeline starts automatically.

The Researcher Agent:
1. Clones the GitHub repository
2. Deploys to a local Anvil fork
3. Runs Slither static analysis
4. Performs AI deep analysis (Kimi k.25)
5. Generates exploit proof-of-concept code
6. Creates Finding records
7. Deducts 0.5 USDC from researcher escrow per submission

**Monitor**: Navigate to `/scans` for real-time progress. Check `/agents/:id/escrow` for SUBMISSION_FEE deductions.

### Step 5: Proof Validation (Validator Agent + Reputation)

The Validator Agent automatically:
1. Analyzes proof with Kimi k.25 LLM
2. Evaluates technical correctness, attack vector, severity
3. Calculates confidence score (0-100%)
4. Updates Finding status (VALIDATED/REJECTED)
5. Records reputation feedback for the researcher

The Reputation Tracker at `/agents/:id/reputation` shows:
- Reputation score (0-100) with circular progress indicator
- "Score verified on blockchain" badge when agent has on-chain registration
- Confirmed/rejected/inconclusive counts
- Feedback history with on-chain/off-chain verification indicators:
  - Green dot + "On-chain" for feedback recorded on the blockchain
  - Gray dot + "Off-chain" for database-only feedback

### Step 6: Payment Processing (BountyPool)

If the finding is validated, the Payment Worker:
1. Validates payment eligibility
2. Checks BountyPool balance
3. Submits `releaseBounty()` transaction on Base Sepolia
4. Monitors transaction confirmation
5. Updates Payment record with txHash

**Monitor**: Navigate to `/payments` to see status progression and BaseScan links.

### Step 7: Verify Results

#### Frontend Verification Pages

| Page | URL | What to Verify |
|------|-----|----------------|
| Dashboard | `/` | Agent cards with capabilities, all 4 agent types displayed |
| Agent Registry | `/agents` | Stat cards, verification indicators, "Verify on chain" links |
| Reputation Tracker | `/agents/:id/reputation` | Score, on-chain badge, feedback with on-chain/off-chain indicators |
| Escrow Dashboard | `/agents/:id/escrow` | Balance, transaction history with "Verify on chain" links |
| X.402 Payments | `/x402-payments` | Stat cards, payment timeline with plain-language descriptions |
| Protocols | `/protocols` | Protocol list with ACTIVE status |
| Scans | `/scans` | Scan progress and findings |
| Payments | `/payments` | USDC payouts with BaseScan links |

All "Verify on chain" links open the transaction on `sepolia.basescan.org` for independent verification.

#### On-Chain Verification

```bash
# Check agent is registered on-chain (ERC-8004)
cast call 0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b \
  "isRegistered(address)(bool)" \
  0xRESEARCHER_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL

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
```

#### BaseScan Links

| What | URL Pattern |
|------|------------|
| Transaction | `https://sepolia.basescan.org/tx/<TX_HASH>` |
| Agent Wallet | `https://sepolia.basescan.org/address/<WALLET>` |
| AgentIdentityRegistry | `https://sepolia.basescan.org/address/0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b` |
| BountyPool | `https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0` |

#### Database Verification

```bash
cd backend && npx prisma studio
# Tables: AgentIdentity, AgentReputation, AgentFeedback, AgentEscrow,
#          EscrowTransaction, X402PaymentRequest, Protocol, Scan, Finding, Payment
```

## E2E Testing

Playwright tests verify the full stack. Run with:

```bash
# All workstream verification tests (19 tests)
npx playwright test e2e/workstream-verification.spec.ts --project=chromium

# CSRF tests
npx playwright test e2e/protocol-registration-csrf.spec.ts --project=chromium

# All E2E tests
npx playwright test --project=chromium
```

**Test coverage**:
- Backend API endpoints (health, agent identities, X.402 payments, reputation, feedback, escrow, leaderboard)
- BigInt/Date serialization correctness
- X.402 payment gate (auth-before-gate, CSRF token flow)
- Protected route redirects (all pages redirect to `/login` with `returnUrl`)
- Frontend build verification (HTML serving, no JS errors, React initialization)

## Payment Amounts

### Bounty Payouts (BountyPool -> Researcher)

| Severity | USDC Amount |
|----------|-------------|
| CRITICAL | 10 USDC |
| HIGH | 5 USDC |
| MEDIUM | 3 USDC |
| LOW | 1 USDC |
| INFO | 0.25 USDC |

### Platform Fees (X.402)

| Action | USDC Amount | Mechanism |
|--------|-------------|-----------|
| Protocol Registration | 1 USDC | USDC transfer to platform wallet via X.402 facilitator |
| Finding Submission | 0.5 USDC | Deducted from researcher escrow balance |

## Configuration Modes

| Setting | Current Default | Alternative |
|---------|:--------------:|:-----------:|
| `SKIP_X402_PAYMENT_GATE` | `false` (live) | `true` (skip) |
| `SKIP_ONCHAIN_REGISTRATION` | `true` | `false` |
| `SKIP_CSRF` | `false` | `true` (testing only) |

## API Endpoints

### Authentication & Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/siwe` | Sign-In with Ethereum |
| GET | `/api/v1/csrf-token` | Get CSRF token |
| GET | `/api/v1/health` | Service health check |

### Agent Identities (ERC-8004)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agent-identities` | List all agents with reputation |
| GET | `/api/v1/agent-identities/metadata/:tokenId` | ERC-721 metadata JSON (public, no auth) |
| POST | `/api/v1/agent-identities/register` | Register new agent (optional on-chain) |
| GET | `/api/v1/agent-identities/x402-payments` | All X.402 payment records |
| GET | `/api/v1/agent-identities/leaderboard` | Reputation leaderboard |
| GET | `/api/v1/agent-identities/wallet/:address` | Get agent by wallet |
| GET | `/api/v1/agent-identities/type/:type` | Get agents by type |
| GET | `/api/v1/agent-identities/:id` | Get agent details |
| GET | `/api/v1/agent-identities/:id/reputation` | Reputation score and stats |
| GET | `/api/v1/agent-identities/:id/feedback` | Feedback history (on-chain/off-chain) |
| GET | `/api/v1/agent-identities/:id/escrow` | Escrow balance |
| POST | `/api/v1/agent-identities/:id/escrow/deposit` | Deposit USDC to escrow |
| GET | `/api/v1/agent-identities/:id/escrow/transactions` | Escrow transaction history |
| GET | `/api/v1/agent-identities/:id/x402-payments` | Agent's X.402 payments |
| POST | `/api/v1/agent-identities/:id/deactivate` | Deactivate agent |

### Protocols (X.402 gated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/protocols` | Register protocol (returns 402 if gate enabled) |
| GET | `/api/v1/protocols` | List protocols (auth required) |
| GET | `/api/v1/protocols/:id` | Protocol details |
| POST | `/api/v1/protocols/:id/fund` | Fund bounty pool |
| GET | `/api/v1/protocols/:id/registration-progress` | SSE progress stream |

### Scans, Validations & Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scans` | Create scan (escrow gated) |
| GET | `/api/v1/scans` | List scans |
| GET | `/api/v1/scans/:id` | Scan details |
| GET | `/api/v1/scans/:id/progress` | Real-time progress (SSE) |
| GET | `/api/v1/validations` | List validations |
| GET | `/api/v1/payments` | List payments |
| GET | `/api/v1/payments/:id` | Payment details |
| POST | `/api/v1/payments/:id/retry` | Retry failed payment |

## Troubleshooting

### X.402 Payment Gate Issues

**"Payment Required" (402) on Protocol Registration**

This is expected behavior when `SKIP_X402_PAYMENT_GATE=false`. The frontend handles this with the PaymentRequiredModal. If testing via curl:

```bash
# Skip the gate for API testing
# In backend/.env: SKIP_X402_PAYMENT_GATE=true
```

**Self-payment error**: If the user's MetaMask address matches `PLATFORM_WALLET_ADDRESS`, the USDC transfer will fail. Ensure they are different wallets.

### Agent Registration Issues

**"Agent already registered with wallet"**: The wallet already has an AgentIdentity record.

```bash
curl -s http://localhost:3000/api/v1/agent-identities/wallet/0xYOUR_WALLET | python3 -m json.tool
```

### Infrastructure Issues

```bash
# Check all services
curl -s http://localhost:3000/api/v1/health | python3 -m json.tool

# Redis via Docker
docker exec thunder-redis redis-cli -a <your-redis-password> ping

# Database
pg_isready -h localhost -p 5432

# BountyPool balance
npx tsx backend/scripts/check-pool-balance.ts

# Fund pool if needed
npx tsx backend/scripts/fund-bounty-pool.ts 50
```

## Pre-Flight Checklist

- [ ] Docker Redis running (`docker ps | grep thunder-redis`)
- [ ] PostgreSQL running (`pg_isready`)
- [ ] Database migrations applied (`cd backend && npx prisma migrate dev`)
- [ ] Backend running (`curl http://localhost:3000/api/v1/health`)
- [ ] Frontend running (`http://localhost:5173`)
- [ ] `PLATFORM_WALLET_ADDRESS` set to PRIVATE_KEY2 wallet in `backend/.env`
- [ ] `SKIP_X402_PAYMENT_GATE=false` for live X.402 demo
- [ ] Demo data seeded (`npx tsx backend/scripts/seed-demo-data.ts`)
- [ ] User's MetaMask has Base Sepolia USDC + ETH for gas
- [ ] User's MetaMask address differs from `PLATFORM_WALLET_ADDRESS`
- [ ] E2E tests pass (`npx playwright test e2e/workstream-verification.spec.ts --project=chromium`)

## Recommended Demo Flow

1. **Start services** (Redis Docker, backend, frontend)
2. **Seed demo data** (`npx tsx backend/scripts/seed-demo-data.ts`)
3. **Connect wallet** on `/login` page (SIWE authentication)
4. **Show Agent Registry** at `/agents` -- stat cards, verification indicators, "Verify on chain" links
5. **Show Reputation** at `/agents/:id/reputation` -- score, on-chain badge, feedback history
6. **Show Escrow** at `/agents/:id/escrow` -- balance, transaction history with chain verification
7. **Show X.402 Payments** at `/x402-payments` -- stat cards, payment timeline, plain-language descriptions
8. **Register protocol** at `/protocols/register` -- PaymentRequiredModal appears, pay 1 USDC, verify on BaseScan
9. **Watch scan** progress at `/scans`
10. **Verify payment** at `/payments` -- click BaseScan link for on-chain proof
11. **Show Dashboard** at `/` -- all 4 agent types with capabilities and descriptions
