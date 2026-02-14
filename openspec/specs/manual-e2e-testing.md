# Manual E2E Testing Workflow Specification

## Overview

The Manual End-to-End Testing Workflow is a comprehensive, hands-on validation procedure that walks through the complete AI Bug Bounty Platform workflow with all services running. This specification documents the formal procedure for pre-demonstration and pre-production validation.

### Purpose

- **Pre-Demonstration Validation**: Ensure the system is fully functional before client demonstrations
- **Pre-Deployment Checklist**: Verify all components work correctly before production release
- **Team Onboarding**: Enable new team members to understand the complete system workflow
- **Post-Change Validation**: Validate system integrity after significant updates

### Duration

60-90 minutes for complete workflow execution

### When to Run

1. **Before Major Demonstrations** (required)
2. **Before Production Deployments** (required)
3. **After Major Feature Additions** (recommended)
4. **After Critical Bug Fixes** (recommended)
5. **For Team Onboarding** (recommended)

### Scope

End-to-end workflow covering:
- Infrastructure validation (database, Redis, contracts)
- Service startup (backend, frontend, agents, workers)
- Agent registration (researcher, validator on-chain)
- Escrow funding (researcher deposit for finding submissions)
- Protocol registration (with optional x.402 payment gating)
- Automated scanning (vulnerability detection and reporting)
- Validation workflow (validator agent assessment)
- Payment processing (on-chain USDC transfer)
- Reputation updates (agent scoring and leaderboard)
- Frontend verification (UI displays all data correctly)

---

## Source Documentation

Complete details and API reference:
- **Primary Guide**: [docs/DEMONSTRATION.md](../../docs/DEMONSTRATION.md)
- **Architecture**: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)

---

## Prerequisites Checklist

✅ **Required before starting any testing**

### 1. Infrastructure Validation
```bash
# Verify PostgreSQL is running
psql -U user -d bugbounty -c "SELECT version();"
# Expected: PostgreSQL version output

# Verify Redis with authentication
redis-cli -a <your-redis-password> ping
# Expected: PONG

# Verify all migrations applied
cd backend && npx prisma migrate status
# Expected: All 4 migrations show as "Applied"
```

**Success Criteria**:
- PostgreSQL responds with version
- Redis responds with PONG
- All migrations: ✓ Applied

### 2. Environment Configuration
Verify backend `.env` has these variables:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/bugbounty
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
AGENT_IDENTITY_REGISTRY_ADDRESS=0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b
AGENT_REPUTATION_REGISTRY_ADDRESS=0x53f126F6F79414d8Db4cd08B05b84f5F1128de16
PLATFORM_ESCROW_ADDRESS=0x1EC275172C191670C9fbB290dcAB31A9784BC6eC
BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
MOONSHOT_API_KEY=your_moonshot_api_key
REDIS_URL=redis://:<your-redis-password>@localhost:6379
SKIP_X402_PAYMENT_GATE=true  # or false for full payment enforcement
SKIP_ONCHAIN_REGISTRATION=true  # or false for on-chain protocol registration
```

Verify frontend `.env`:
```bash
VITE_API_URL=http://localhost:3000/api/v1
```

**Success Criteria**:
- All required environment variables are set
- Database, Redis, and RPC URLs are valid
- API keys are configured

### 3. Contract Balances
```bash
# Fund researcher wallet with ETH (for gas) - needs >= 0.01 ETH

# Fund BountyPool with USDC (for bounty payments)
npx tsx backend/scripts/fund-bounty-pool.ts

# Verify pool has >= 50 USDC
cast call $BOUNTY_POOL_ADDRESS "balanceOf(address)(uint256)" $BOUNTY_POOL_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL
# Expected: >= 50000000 (50 USDC in 6-decimal format)
```

**Success Criteria**:
- BountyPool funded with >= 50 USDC
- Researcher wallet funded with >= 0.01 ETH for gas

### 4. Dependencies Installed
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

**Success Criteria**:
- No installation errors
- All node_modules present
- npm ci or npm install completes successfully

---

## 8-Step Manual Workflow

### Step 1: Start All Services (Duration: 2 minutes)

Open 6 terminal windows and start services in this order:

**Terminal 1: Backend API**
```bash
cd backend
npm run dev
```
Expected output:
```
listening on port 3000
Connected to database: bugbounty
Redis connected
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```
Expected output:
```
Local: http://localhost:5173
ready in X ms
```

**Terminal 3: Researcher Agent Worker**
```bash
cd backend
npm run agent:researcher
```
Expected output:
```
Agent started, waiting for tasks
```

**Terminal 4: Validator Agent Worker**
```bash
cd backend
npm run agent:validator
```
Expected output:
```
Agent started, waiting for tasks
```

**Terminal 5: Payment Worker**
```bash
cd backend
npm run worker:payment
```
Expected output:
```
Worker ready, monitoring queue
```

**Terminal 6: Monitoring (optional)**
```bash
# Use this for monitoring logs, running curl commands, or watching database
cd backend
```

**Verification**:
```bash
# Verify backend is ready
curl -s http://localhost:3000/api/v1/health | jq .

# Expected response:
# {"status":"ok"}

# Verify frontend loads
curl -s http://localhost:5173 | head -20
# Should see HTML with React app
```

### Step 2: Register Agents (Duration: 2 minutes)

**Via API (Recommended for consistency)**:

Register Researcher Agent:
```bash
curl -X POST http://localhost:3000/api/v1/agent-identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xRESEARCHER_WALLET",
    "agentType": "RESEARCHER",
    "registerOnChain": true
  }' | jq .

# Save the agentId from response for later use
RESEARCHER_ID="agent-xxx"
```

Register Validator Agent:
```bash
curl -X POST http://localhost:3000/api/v1/agent-identities/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xVALIDATOR_WALLET",
    "agentType": "VALIDATOR",
    "registerOnChain": true
  }' | jq .

VALIDATOR_ID="agent-yyy"
```

**Verification**:
```bash
# List all agents
curl -s http://localhost:3000/api/v1/agent-identities | jq '.'

# Expected: Array with 2 agent objects (researcher + validator)
```

**Via Frontend** (Alternative):
1. Navigate to `http://localhost:5173/agents`
2. Click "Register Agent" button
3. Fill in wallet address and select agent type
4. Confirm registration

### Step 3: Fund Researcher Escrow (Duration: 1 minute)

Deposit 5 USDC (supports 10 finding submissions at 0.5 USDC each):

```bash
curl -X POST http://localhost:3000/api/v1/agent-identities/$RESEARCHER_ID/escrow/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "5000000"
  }' | jq .

# Response should include:
# "balance": "5000000"
# "remainingSubmissions": 10
```

**Verification**:
```bash
curl -s http://localhost:3000/api/v1/agent-identities/$RESEARCHER_ID/escrow | jq .

# Expected:
# {
#   "balance": "5000000",
#   "totalDeposited": "5000000",
#   "totalDeducted": "0",
#   "remainingSubmissions": 10,
#   "submissionFee": "500000"
# }
```

**Via Frontend**:
1. Navigate to `http://localhost:5173/agents/$RESEARCHER_ID/escrow`
2. Click "Deposit" button
3. Enter amount: 5 USDC
4. Confirm transaction
5. Verify balance shows 5 USDC and remaining submissions = 10

### Step 4: Register Protocol (Duration: 2 minutes)

The protocol registration may require x.402 payment depending on configuration:

**Demo Mode** (SKIP_X402_PAYMENT_GATE=true):
```bash
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thunder Loan Protocol",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "branch": "main",
    "contractPath": "src/protocol/ThunderLoan.sol"
  }' | jq .

# Expected: HTTP 201 Created
# Response includes: protocolId, status: "REGISTERED", scanTriggeredAt
PROTOCOL_ID="protocol-xxx"
```

**Full Mode with x.402 Payment** (SKIP_X402_PAYMENT_GATE=false):
```bash
# Initial request returns 402
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thunder Loan Protocol",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "branch": "main",
    "contractPath": "src/protocol/ThunderLoan.sol"
  }' | jq .

# Response: HTTP 402 with payment terms
# Payment Amount: 1 USDC (1000000 in 6-decimal)
# Recipient: platform wallet address

# Pay 1 USDC on-chain via USDC transfer
# Get transaction hash: 0xPAYMENT_TX_HASH

# Retry with payment receipt
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Content-Type: application/json" \
  -H "X-Payment-Receipt: 0xPAYMENT_TX_HASH" \
  -d '{...}' | jq .

# Expected: HTTP 201 Created
```

**Verification**:
```bash
# Check protocol is registered
curl -s http://localhost:3000/api/v1/protocols | jq '.[] | {name, status}'

# Expected: status = "REGISTERED"
```

**Via Frontend**:
1. Navigate to `http://localhost:5173/protocols/register`
2. Fill in form:
   - Name: Thunder Loan Protocol
   - GitHub URL: https://github.com/Cyfrin/2023-11-Thunder-Loan
   - Branch: main
   - Contract Path: src/protocol/ThunderLoan.sol
3. Click "Register Protocol"
4. (If x.402 enabled) Complete payment flow
5. Verify protocol appears in `/protocols` with status "REGISTERED" or "IN_PROGRESS" if scan started

### Step 5: Monitor Scan Progress (Duration: 5-10 minutes)

The scan automatically triggers after protocol registration. Monitor its progress:

```bash
# Poll scan status periodically
curl -s http://localhost:3000/api/v1/scans?protocolId=$PROTOCOL_ID | jq '.[] | {status, currentStage, progress}'

# Watch stage transitions:
# CLONING_REPO → DEPLOYING → ANALYZING → VALIDATING → COMPLETED
```

**Scan Stages**:
1. **CLONING_REPO** (1-2 min): Clone Thunder Loan GitHub repository
2. **DEPLOYING** (1 min): Deploy contracts to local Anvil fork
3. **ANALYZING** (2-3 min): Run Slither static analysis + AI deep analysis
4. **VALIDATING** (1 min): Generate findings with PoC exploits
5. **COMPLETED**: All findings submitted

**Via Frontend**:
1. Navigate to `http://localhost:5173/scans`
2. Click on Thunder Loan protocol scan
3. Watch real-time terminal output showing scan progress
4. See progress bar advance through stages
5. After completion, findings list appears

**Save Scan ID for Later**:
```bash
# Extract scan ID from response
SCAN_ID="scan-xxx"
```

### Step 6: Verify Findings Created (Duration: 1 minute)

After scan completes, findings are created with PENDING_VALIDATION status:

```bash
# List findings for the protocol
curl -s http://localhost:3000/api/v1/findings?protocolId=$PROTOCOL_ID | jq '.[] | {title, severity, status, researcherId}'

# Expected:
# - >=1 finding with status: "PENDING_VALIDATION"
# - Severity: "HIGH", "MEDIUM", or "LOW"
# - researcherId matches our researcher agent
```

**Verify Escrow Fee Deduction**:
```bash
# Check researcher escrow after findings submitted
curl -s http://localhost:3000/api/v1/agent-identities/$RESEARCHER_ID/escrow | jq .

# Expected:
# - balance: reduced by 0.5 USDC per finding
# - Example if 3 findings: 5 - (3 * 0.5) = 3.5 USDC
# - remainingSubmissions: 10 - 3 = 7
# - totalDeducted: 1500000 (3 * 500000)
```

**Via Frontend**:
1. On `/scans` page, click Thunder Loan scan
2. Scroll down to "Findings" section
3. See findings list with:
   - Title, severity badge
   - Status: "PENDING_VALIDATION" (yellow badge)
   - Researcher address
4. Click finding row to see full details (proof, code snippet)

### Step 7: Watch Validation (Duration: 2-3 minutes)

Validator agent automatically validates findings:

```bash
# Monitor validation progress
curl -s http://localhost:3000/api/v1/findings?protocolId=$PROTOCOL_ID | jq '.[] | {title, status, validationScore}'

# Watch status change from:
# "PENDING_VALIDATION" → "VALIDATED" or "REJECTED"
```

**What's Happening**:
1. Validator agent fetches pending findings
2. Decrypts proof (if x.402 enabled)
3. Uses Kimi 2.5 LLM to assess vulnerability
4. Calculates confidence score (0-100%)
5. Updates finding status
6. Records reputation feedback

**Check Validator Reputation Updated**:
```bash
# Get validator agent reputation
curl -s http://localhost:3000/api/v1/agents/$VALIDATOR_ID/reputation | jq .

# Expected: reputation score > 0
```

**Via Frontend**:
1. Refresh `/scans/:scanId` page
2. Watch findings status badges change to "VALIDATED" (green) or "REJECTED" (red)
3. Each finding now shows validator address and confidence score
4. Navigate to `/agents/$VALIDATOR_ID/reputation` to see validation score updated

### Step 8: Verify Payment & Reputation (Duration: 2 minutes)

Payment worker processes bounty payment and updates reputation:

```bash
# Check if payment was created
curl -s http://localhost:3000/api/v1/payments?protocolId=$PROTOCOL_ID | jq '.[] | {amount, status, transactionHash}'

# Expected: payment with status "COMPLETED" and valid txHash
```

**Verify On-Chain Payment**:
```bash
# Check researcher USDC balance increased
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0xRESEARCHER_WALLET \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Should show balance increased by payment amount

# Verify BountyPool balance decreased
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Should show balance decreased by payment amount
```

**Check Reputation Updated**:
```bash
# Get researcher reputation after payment
curl -s http://localhost:3000/api/v1/agents/$RESEARCHER_ID/reputation | jq .

# Expected:
# - reputationScore > 0
# - totalEarnings > 0
# - validationsCount >= 1
```

**Via Frontend**:
1. Navigate to `/payments`
   - See completed payment with amount, recipient, txHash
   - Click txHash to verify on Basescan
2. Navigate to `/agents/$RESEARCHER_ID/reputation`
   - See reputation score (circular progress indicator)
   - See total earnings (USDC amount)
   - See finding history with payment amounts
3. Navigate to `/agents` to see leaderboard
   - Both agents ranked by reputation score
   - Researcher now appears in top positions

---

## Frontend UI Verification Checklist

Verify all pages load and display data correctly:

| Page | URL | Verification |
|------|-----|--------------|
| Dashboard | `/` | Shows total protocols, vulnerabilities, payments, online agents |
| Agent Registry | `/agents` | Shows 2 agents (researcher + validator) with NFT IDs, types, reputation scores |
| Escrow Dashboard | `/agents/:id/escrow` | Shows balance (5 → 4.5 USDC after fees), remaining submissions, transaction history |
| Reputation Tracker | `/agents/:id/reputation` | Shows reputation score, earnings, validation count, feedback history |
| x.402 Payments | `/x402-payments` | Shows all x.402 transactions (protocol registration fee, submission fees, bounty) |
| Protocol Detail | `/protocols/:id` | Shows protocol status, scan progress, findings count, scan logs |
| Scans | `/scans` | Shows Thunder Loan scan with COMPLETED status, findings list, real-time terminal output |
| Scan Detail | `/scans/:id` | Shows detailed findings with severity, status, validator info, confidence scores |
| Payments | `/payments` | Shows completed bounty payment with amount, recipient, Basescan link |

**Success Criteria**:
- All pages load without errors
- Data matches API responses
- Links work correctly (Basescan, other pages)
- Real-time updates visible during scan and validation
- Status badges show correct colors (green for active/completed, yellow for pending, red for failed)

---

## Success Criteria

The manual E2E test is successful when ALL of these are true:

### Infrastructure ✅
- PostgreSQL connects successfully
- Redis authenticates and responds to PING
- All 4 database migrations applied
- Environment variables all configured
- BountyPool funded with >= 50 USDC

### Services ✅
- Backend API starts without errors, responds to health check
- Frontend loads on port 5173
- Researcher agent worker running and ready
- Validator agent worker running and ready
- Payment worker running and ready
- No errors in startup logs

### Agents ✅
- Researcher agent registered with agentId and nftId=1
- Validator agent registered with agentId and nftId=2
- Both visible in `/agents` page with correct types
- Status shows ACTIVE

### Escrow ✅
- Researcher deposits 5 USDC successfully
- Escrow balance shows 5 USDC
- Remaining submissions shows 10
- Escrow dashboard displays correctly

### Protocol ✅
- Thunder Loan protocol registers successfully
- Protocol status shows "REGISTERED"
- Scan auto-triggers with status "PENDING" or "IN_PROGRESS"
- Protocol appears in `/protocols` page

### Scan ✅
- Scan completes all stages: CLONING → DEPLOYING → ANALYZING → VALIDATING
- Scan finds >= 1 vulnerability
- Scan status changes to "COMPLETED"
- Findings created with status "PENDING_VALIDATION"
- Escrow deducted by 0.5 USDC per finding
- Remaining submissions correctly calculated

### Validation ✅
- Validator agent validates all findings
- Finding status changes to "VALIDATED" or "REJECTED"
- Validator reputation score increases
- All findings reach terminal status

### Payment ✅
- Payment worker creates payment record
- Payment status shows "COMPLETED"
- Transaction hash present and valid
- On-chain USDC transfer confirmed via cast call
- Researcher wallet balance increased
- BountyPool balance decreased

### Reputation ✅
- Researcher reputation score > 0
- Validator reputation score > 0
- Total earnings calculated correctly (payment amount)
- Both agents visible in leaderboard at `/agents`
- Reputation updates reflect validation outcomes

### Frontend ✅
- All 8 pages load without errors
- `/agents` shows registry table with both agents
- `/agents/:id/escrow` shows balance and transaction history
- `/agents/:id/reputation` shows reputation card and earnings
- `/protocols` shows Thunder Loan with correct status
- `/scans` shows scan with progress and findings
- `/payments` shows completed payment with Basescan link
- `/x402-payments` shows payment timeline
- Real-time updates work during scan and validation

### Overall
- Complete workflow executes end-to-end with no errors
- All data visible in both API and frontend
- On-chain state matches database
- System is ready for demonstration
- Test completed in 60-90 minutes

---

## Troubleshooting Guide

### Issue: Redis Connection Error (NOAUTH Authentication required)

**Error Message**:
```
Error: NOAUTH Authentication required
```

**Solution**:
1. Verify Redis is running: `redis-cli ping`
2. Check Redis auth credentials in `.env`:
   ```
   REDIS_URL=redis://:<your-redis-password>@localhost:6379
   ```
3. Verify auth string is correct: `redis-cli -a <your-redis-password> ping` (should return PONG)
4. Restart Redis: `redis-cli SHUTDOWN`, then restart Redis server
5. Clear Redis and restart: `redis-cli FLUSHALL`, then restart services

### Issue: Agent Worker Fails to Start

**Error Message**:
```
Error: Cannot connect to database / Redis connection failed
```

**Solution**:
1. Verify PostgreSQL and Redis are running (see Prerequisites)
2. Verify DATABASE_URL in `.env` is correct
3. Verify all migrations applied: `npx prisma migrate status`
4. Check for port conflicts: `lsof -i :3000` or `lsof -i :6379`
5. Restart backend service first, then restart agent workers
6. Check agent logs for specific error messages

### Issue: Scan Doesn't Start After Protocol Registration

**Error Message**:
```
Scan status shows PENDING but never progresses
```

**Solution**:
1. Verify researcher agent worker is running (Terminal 3)
2. Check researcher agent logs for errors
3. Verify GitHub URL and contract path are valid and accessible
4. Check if Slither is installed: `slither --version`
5. Verify `/tmp` directory has space (Anvil fork needs storage)
6. Manually trigger scan:
   ```bash
   curl -X POST http://localhost:3000/api/v1/scans/$SCAN_ID/trigger
   ```

### Issue: Findings Not Created (Scan Completes but No Findings)

**Error Message**:
```
Scan status: COMPLETED, but findingsCount: 0
```

**Solution**:
1. Check Kimi API key in `.env`: `MOONSHOT_API_KEY=...`
2. Verify Kimi API is responding:
   ```bash
   curl -X POST https://api.moonshot.cn/v1/chat/completions \
     -H "Authorization: Bearer $MOONSHOT_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"moonshot-v1-32k","messages":[{"role":"user","content":"test"}]}'
   ```
3. Check researcher agent logs for LLM errors
4. Verify `KIMI_MODEL=moonshot-v1-32k` in `.env`
5. Check contract path is correct and Slither found vulnerabilities:
   - Run Slither manually: `cd /tmp && slither src/protocol/ThunderLoan.sol`

### Issue: Payment Contract Revert

**Error Message**:
```
Transaction reverted: insufficient balance / AccessControl revert
```

**Solution**:
1. Verify BountyPool funded: `npx tsx backend/scripts/check-pool-balance.ts`
2. If balance = 0, run: `npx tsx backend/scripts/fund-bounty-pool.ts`
3. Check payer wallet has ETH for gas (>= 0.01 ETH)
4. Verify BountyPool contract address is correct
5. Check if contract is actually deployed on Base Sepolia:
   ```bash
   cast code 0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0 --rpc-url $BASE_SEPOLIA_RPC_URL
   ```

### Issue: Insufficient Pool Balance

**Error Message**:
```
Payment amount exceeds available pool balance
```

**Solution**:
1. Calculate required funding:
   - Number of findings × bounty per severity
   - Example: 3 findings (1 HIGH = 5 USDC, 2 MEDIUM = 3 USDC each) = 11 USDC needed
2. Current pool balance: `npx tsx backend/scripts/check-pool-balance.ts`
3. Fund additional USDC: `npx tsx backend/scripts/fund-bounty-pool.ts`
4. Retry payment

### Issue: Frontend Shows "API Connection Error"

**Error Message**:
```
Failed to fetch from http://localhost:3000/api/v1/...
```

**Solution**:
1. Verify backend is running: `curl -s http://localhost:3000/api/v1/health`
2. Check VITE_API_URL in frontend `.env`: should be `http://localhost:3000/api/v1`
3. Verify backend CORS is configured for frontend:
   ```bash
   curl -I -X OPTIONS http://localhost:3000/api/v1/health
   ```
4. Check browser console for CORS errors
5. Restart frontend: `npm run dev` in frontend directory

### Issue: Agent Registration Fails (Non-Existent Agent Contract)

**Error Message**:
```
Contract not found at address / Call reverted
```

**Solution**:
1. Verify `AGENT_IDENTITY_REGISTRY_ADDRESS` in `.env` is correct
2. Verify contract is deployed on Base Sepolia:
   ```bash
   cast code 0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b --rpc-url $BASE_SEPOLIA_RPC_URL
   ```
3. If contract not deployed, redeploy:
   ```bash
   cd backend/contracts && npx hardhat run scripts/deploy.js --network baseSepolia
   ```
4. Update contract address in `.env`

### Issue: x.402 Payment Verification Fails

**Error Message**:
```
Payment receipt verification failed / Invalid transaction hash
```

**Solution**:
1. Verify transaction hash is correct and transaction succeeded:
   ```bash
   cast tx 0xTX_HASH --rpc-url $BASE_SEPOLIA_RPC_URL
   ```
2. Verify USDC Transfer event was emitted:
   ```bash
   cast receipt 0xTX_HASH --rpc-url $BASE_SEPOLIA_RPC_URL | grep -i transfer
   ```
3. Check if SKIP_X402_PAYMENT_GATE is accidentally set to true
4. If verification middleware is failing, try with `SKIP_X402_PAYMENT_GATE=true` (demo mode)

---

## Integration with Automated Testing

This manual E2E testing workflow will eventually be automated through:

### Automated E2E Testing (Future Work)
- Docker Compose orchestration of all services
- Playwright browser automation for frontend testing
- CI/CD pipeline integration for pre-deployment validation
- Scheduled testing on staging environment

### Reference
See [Testing Specification](./testing.md) for:
- Unit testing approach (Vitest)
- Integration testing (Supertest)
- Smart contract testing (Foundry)
- Automated E2E testing (Playwright, Synpress)

### Blueprint for Automation
This specification serves as the blueprint for creating automated E2E tests:
1. Each step maps to a test scenario
2. GIVEN-WHEN-THEN format maps to Playwright test structure
3. Success criteria become test assertions
4. Frontend verification becomes page object model interactions

---

## Related Specifications

- [Testing Specification](./testing.md) - Complete testing framework and automated approaches
- [Workflows Specification](./workflows.md) - Detailed system workflow diagrams and descriptions
- [Agents Specification](./agents.md) - Agent types, registration, and behavior
- [API Specification](./api.md) - All API endpoints with request/response formats
- [Smart Contracts Specification](./smart-contracts.md) - Contract specifications and deployments
- [Security Specification](./security.md) - Security requirements and threat models

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-07 | 1.0 | Initial specification based on Phase 4 validation workflow |

---

## Support

For issues or questions about this specification:
1. Check the [Troubleshooting Guide](#troubleshooting-guide) above
2. Review [docs/DEMONSTRATION.md](../../docs/DEMONSTRATION.md) for detailed API reference
3. Check backend logs in Terminal 1
4. Check agent worker logs in Terminals 3-5
5. Check browser console (F12) for frontend errors
