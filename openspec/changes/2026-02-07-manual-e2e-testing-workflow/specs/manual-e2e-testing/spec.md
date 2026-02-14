# Manual E2E Testing Workflow - Specification

## Overview

Formal GIVEN-WHEN-THEN scenarios for the Manual End-to-End Testing Workflow. These scenarios describe the complete system behavior from prerequisites validation through payment execution and reputation updates.

## Requirement: Prerequisites Validation SHALL Complete Successfully

### Scenario 1.1: Database and Redis Prerequisites Pass
- **GIVEN** PostgreSQL is running on localhost:5432
- **GIVEN** Redis is running with authentication (`redis-cli -a <your-redis-password> ping`)
- **GIVEN** All 4 database migrations applied (init_schema, add_agent_reputation, add_x402_payment_gate, add_payment_idempotency)
- **GIVEN** Database schema includes AgentIdentity, AgentReputation, Protocol, Scan, Finding, Payment tables
- **WHEN** Tester runs `psql -U user -d bugbounty -c "SELECT version();"`
- **WHEN** Tester runs `redis-cli -a <your-redis-password> ping`
- **WHEN** Tester runs `npx prisma migrate status` in backend directory
- **THEN** PostgreSQL responds with version information
- **THEN** Redis responds with "PONG"
- **THEN** All 4 migrations show as "Applied"
- **THEN** No migration errors in output

### Scenario 1.2: Environment Configuration Is Complete
- **GIVEN** `.env` file exists in backend directory
- **GIVEN** Frontend `.env` file exists with VITE_API_URL configured
- **WHEN** Tester verifies `DATABASE_URL` is set and formatted correctly
- **WHEN** Tester verifies `BOUNTY_POOL_ADDRESS` is configured (0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0)
- **WHEN** Tester verifies `USDC_ADDRESS` is configured (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- **WHEN** Tester verifies `AGENT_IDENTITY_REGISTRY_ADDRESS` is set (0x772ADB0bC03B1b465942091a35D8F6fCC6F84f8b)
- **WHEN** Tester verifies `MOONSHOT_API_KEY` is set
- **WHEN** Tester verifies `REDIS_URL` points to running Redis with authentication
- **THEN** All required environment variables are configured
- **THEN** No environment variable errors during backend startup

### Scenario 1.3: Contract Balances Are Adequate
- **GIVEN** BountyPool contract deployed at configured address
- **GIVEN** Payer wallet is funded with ETH (>= 0.01 ETH for gas)
- **WHEN** Tester runs `cast call $BOUNTY_POOL_ADDRESS "balances(bytes32)(uint256)" $PROTOCOL_HASH --rpc-url $BASE_SEPOLIA_RPC_URL` (returns 0 initially)
- **WHEN** Tester runs `npx tsx backend/scripts/fund-bounty-pool.ts` to fund with 50 USDC
- **WHEN** Tester verifies pool now has >= 50 USDC balance
- **THEN** BountyPool can process payment bounties
- **THEN** Gas is available for on-chain transactions

---

## Requirement: All Services SHALL Start Successfully

### Scenario 2.1: Backend API Starts and Is Ready
- **GIVEN** Prerequisites validated (Scenario 1.1-1.3)
- **GIVEN** Node.js >= 20 installed
- **GIVEN** npm dependencies installed (`npm install` in backend)
- **WHEN** Tester runs `npm run dev` in backend directory
- **WHEN** Tester waits for startup sequence
- **THEN** Terminal shows "listening on port 3000"
- **THEN** Terminal shows "Connected to database: bugbounty"
- **THEN** Terminal shows "Redis connected"
- **THEN** No error messages in startup logs
- **THEN** GET http://localhost:3000/api/v1/health returns HTTP 200 with `{"status":"ok"}`

### Scenario 2.2: Frontend Application Starts
- **GIVEN** Backend API running
- **GIVEN** npm dependencies installed (`npm install` in frontend)
- **WHEN** Tester runs `npm run dev` in frontend directory
- **WHEN** Tester waits for build completion
- **THEN** Terminal shows "Local: http://localhost:5173"
- **THEN** Terminal shows "ready in X ms"
- **THEN** No build errors in output
- **THEN** GET http://localhost:5173 returns HTML page with React app
- **THEN** Browser shows login page with "Connect Wallet" button

### Scenario 2.3: Agent Workers Start and Are Ready
- **GIVEN** Backend API running
- **GIVEN** Redis connected
- **WHEN** Tester runs researcher agent worker (`npm run agent:researcher` or equivalent)
- **WHEN** Tester runs validator agent worker (`npm run agent:validator` or equivalent)
- **WHEN** Tester runs payment worker (`npm run worker:payment` or equivalent)
- **THEN** Researcher agent logs show "Agent started, waiting for tasks"
- **THEN** Validator agent logs show "Agent started, waiting for tasks"
- **THEN** Payment worker logs show "Worker ready, monitoring queue"
- **THEN** No authentication errors in logs
- **THEN** All workers are polling task queues

---

## Requirement: Agents SHALL Register Successfully

### Scenario 3.1: Researcher Agent Registers via API
- **GIVEN** All services running (Scenario 2.1-2.3)
- **GIVEN** Researcher wallet has ETH for gas
- **GIVEN** AgentIdentityRegistry contract is deployed
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/agent-identities/register`
  ```json
  {
    "walletAddress": "0xRESEARCHER_WALLET",
    "agentType": "RESEARCHER",
    "registerOnChain": true
  }
  ```
- **THEN** Response HTTP 201 Created
- **THEN** Response body includes:
  ```json
  {
    "agentId": "agent-xxx",
    "walletAddress": "0xRESEARCHER_WALLET",
    "agentType": "RESEARCHER",
    "nftId": 1,
    "status": "ACTIVE",
    "registeredAt": "2026-02-07T..."
  }
  ```
- **THEN** Agent appears in AgentIdentity database table
- **THEN** Agent record shows status = "ACTIVE"

### Scenario 3.2: Validator Agent Registers via API
- **GIVEN** Researcher agent registered (Scenario 3.1)
- **GIVEN** Validator wallet has ETH for gas
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/agent-identities/register`
  ```json
  {
    "walletAddress": "0xVALIDATOR_WALLET",
    "agentType": "VALIDATOR",
    "registerOnChain": true
  }
  ```
- **THEN** Response HTTP 201 Created with validator nftId = 2
- **THEN** Response body shows agentType = "VALIDATOR"
- **THEN** Validator appears in database

### Scenario 3.3: Registered Agents Appear in Frontend
- **GIVEN** Both agents registered (Scenario 3.1-3.2)
- **WHEN** Tester navigates to http://localhost:5173/agents
- **WHEN** Tester waits for page to load
- **THEN** Page shows "Agent Registry" title
- **THEN** Table displays 2 rows (researcher + validator)
- **THEN** First row shows:
  - Wallet address truncated (0xRESEARCHER...WALLET)
  - Agent type badge "RESEARCHER"
  - NFT ID "1"
  - Status "ACTIVE" with green indicator
- **THEN** Second row shows validator with type badge "VALIDATOR"
- **THEN** Both rows show registration timestamps

---

## Requirement: Researcher Escrow Shall Be Funded

### Scenario 4.1: Researcher Deposits USDC to Escrow via API
- **GIVEN** Researcher agent registered (Scenario 3.1)
- **GIVEN** Researcher has 5+ USDC balance
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/agent-identities/{researcherId}/escrow/deposit`
  ```json
  {
    "amount": "5000000",
    "txHash": "0x..."
  }
  ```
  (Note: 5000000 = 5 USDC in 6-decimal format)
- **THEN** Response HTTP 200 OK
- **THEN** Response body includes:
  ```json
  {
    "agentId": "agent-xxx",
    "balance": "5000000",
    "totalDeposited": "5000000",
    "totalDeducted": "0",
    "remainingSubmissions": 10,
    "submissionFee": "500000"
  }
  ```
- **THEN** Deposit recorded in database with DEPOSIT transaction type
- **THEN** Calculation: 5 USDC / 0.5 USDC per submission = 10 remaining submissions

### Scenario 4.2: Escrow Balance Displays in Frontend
- **GIVEN** Researcher funded escrow (Scenario 4.1)
- **WHEN** Tester navigates to http://localhost:5173/agents/{researcherId}/escrow
- **THEN** Page shows "Escrow Dashboard" title
- **THEN** Card displays:
  - Current Balance: 5 USDC
  - Remaining Submissions: 10
  - Submission Fee: 0.5 USDC
  - Total Deposited: 5 USDC
  - Total Deducted: 0 USDC
- **THEN** Deposit history table shows 1 transaction (DEPOSIT, 5 USDC, timestamp)
- **THEN** "Deposit" button available for additional funding

---

## Requirement: Protocol Registration SHALL Complete

### Scenario 5.1: Protocol Registers Without x.402 Gate (Demo Mode)
- **GIVEN** Escrow funded (Scenario 4.1)
- **GIVEN** `SKIP_X402_PAYMENT_GATE=true` in .env
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/protocols`
  ```json
  {
    "name": "Thunder Loan Protocol",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "branch": "main",
    "contractPath": "src/protocol/ThunderLoan.sol"
  }
  ```
- **THEN** Response HTTP 201 Created (no 402 required)
- **THEN** Response body includes:
  ```json
  {
    "protocolId": "protocol-xxx",
    "name": "Thunder Loan Protocol",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "status": "REGISTERED",
    "registeredAt": "2026-02-07T...",
    "scanTriggeredAt": "2026-02-07T..."
  }
  ```
- **THEN** Protocol appears in database with status = "REGISTERED"
- **THEN** Scan is created automatically with status = "PENDING"

### Scenario 5.2: Protocol Registration With x.402 Payment Gate
- **GIVEN** `SKIP_X402_PAYMENT_GATE=false` in .env
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/protocols` (same as 5.1)
- **THEN** Response HTTP 402 Payment Required
- **THEN** Response body includes x.402 payment terms:
  ```json
  {
    "error": "Payment Required",
    "x402": {
      "version": "1.0",
      "amount": "1000000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "chain": "base-sepolia",
      "recipient": "0xPLATFORM_WALLET",
      "memo": "Protocol registration fee",
      "expiresAt": "2026-02-07T..."
    }
  }
  ```
- **WHEN** Tester pays 1 USDC via on-chain transfer to platform wallet
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/protocols` with header:
  ```
  X-Payment-Receipt: 0xTX_HASH
  ```
- **THEN** Response HTTP 201 Created
- **THEN** Protocol registered successfully

### Scenario 5.3: Protocol Appears in Frontend
- **GIVEN** Protocol registered (Scenario 5.1 or 5.2)
- **WHEN** Tester navigates to http://localhost:5173/protocols
- **THEN** Page shows "Protocols" title
- **THEN** Protocol table displays 1 row:
  - Protocol name: "Thunder Loan Protocol"
  - Status: "REGISTERED" with green indicator
  - GitHub URL: link to repository
  - Registered date: timestamp
  - Scan status: "IN_PROGRESS" (because scan auto-triggered)
- **THEN** Click protocol name to view details page

---

## Requirement: Scan SHALL Execute and Find Vulnerabilities

### Scenario 6.1: Scan Executes Through All Stages
- **GIVEN** Protocol registered (Scenario 5.1 or 5.2)
- **GIVEN** Researcher agent running (Scenario 2.3)
- **WHEN** Tester monitors `/api/v1/scans?protocolId=protocol-xxx` endpoint
- **THEN** Initial response shows scan with status = "IN_PROGRESS"
- **THEN** Scan shows currentStage = "CLONING_REPO"
- **WHEN** Tester waits 1-2 minutes (repository cloning)
- **THEN** Scan stage updates to "DEPLOYING"
- **WHEN** Tester waits 1 minute (deployment)
- **THEN** Scan stage updates to "ANALYZING"
- **WHEN** Tester waits 2-3 minutes (Slither + AI analysis)
- **THEN** Scan stage updates to "VALIDATING"
- **WHEN** Tester waits 1 minute (findings generation)
- **THEN** Scan status changes to "COMPLETED"
- **THEN** Final response shows completedAt timestamp
- **THEN** Scan shows findingsCount >= 1

### Scenario 6.2: Findings Created with Correct Status
- **GIVEN** Scan completed (Scenario 6.1)
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/findings?protocolId=protocol-xxx`
- **THEN** Response includes findings array with >= 1 finding
- **THEN** Each finding includes:
  ```json
  {
    "findingId": "finding-xxx",
    "protocolId": "protocol-xxx",
    "title": "Vulnerability title",
    "description": "Description of vulnerability",
    "severity": "HIGH|MEDIUM|LOW",
    "status": "PENDING_VALIDATION",
    "researcherId": "researcher-agent-id",
    "submittedAt": "2026-02-07T...",
    "proof": "encrypted_proof_data"
  }
  ```
- **THEN** All findings have status = "PENDING_VALIDATION"
- **THEN** All findings reference the researcher agent

### Scenario 6.3: Researcher Escrow Reduced by Submission Fees
- **GIVEN** Findings created (Scenario 6.2)
- **GIVEN** N findings submitted where N = findings count
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/agent-identities/{researcherId}/escrow`
- **THEN** Response shows:
  - balance = 5000000 - (N * 500000) = (5 - 0.5*N) USDC
  - totalDeducted = N * 500000
  - remainingSubmissions = 10 - N
- **THEN** Example: If 3 findings submitted:
  - balance = 2500000 (2.5 USDC)
  - remainingSubmissions = 7
- **THEN** Escrow transaction log shows SUBMISSION_FEE deductions

### Scenario 6.4: Scan Progress Displays in Frontend
- **GIVEN** Scan running (Scenario 6.1)
- **WHEN** Tester navigates to http://localhost:5173/scans
- **THEN** Page shows "Scans" title
- **THEN** Scan table displays Thunder Loan protocol
- **THEN** Progress bar shows current completion percentage
- **THEN** Current stage label shows (e.g., "Analyzing...")
- **WHEN** Tester clicks on scan row
- **THEN** Scan detail page opens
- **THEN** Terminal output section shows real-time logs
- **THEN** After scan completes:
  - Status badge changes to "COMPLETED" (green)
  - Findings count displays (e.g., "3 Vulnerabilities Found")
  - Findings list appears below terminal output

---

## Requirement: Validator Agent SHALL Validate Findings

### Scenario 7.1: Validator Agent Validates All Findings
- **GIVEN** Findings created with status = "PENDING_VALIDATION" (Scenario 6.2)
- **GIVEN** Validator agent running (Scenario 2.3)
- **WHEN** Validator agent checks for pending findings
- **WHEN** Validator decrypts proof for each finding (if x.402 enabled)
- **WHEN** Validator uses Kimi LLM to assess vulnerability validity
- **WHEN** Validator submits validation with:
  ```json
  {
    "findingId": "finding-xxx",
    "isValid": true,
    "confidence": 0.95,
    "validationNotes": "Vulnerability confirmed via LLM analysis"
  }
  ```
- **THEN** Response HTTP 200 OK
- **THEN** Finding status updates to "VALIDATED" (for valid findings)
- **THEN** Finding status updates to "REJECTED" (for invalid findings)
- **THEN** Validator agent reputation increases by confidence score
- **THEN** All findings reach terminal status (VALIDATED or REJECTED)

### Scenario 7.2: Reputation Updates After Validation
- **GIVEN** Findings validated (Scenario 7.1)
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/agents/{validatorId}/reputation`
- **THEN** Response includes:
  ```json
  {
    "agentId": "validator-id",
    "reputationScore": > 0,
    "validationsCount": >= 1,
    "accuracyRate": confidence_average,
    "totalEarnings": "calculated_reward"
  }
  ```
- **THEN** reputationScore reflects successful validations
- **THEN** validationsCount shows number of validated findings
- **THEN** Researcher agent reputation also updated (for submitted findings)

### Scenario 7.3: Validation Results Display in Frontend
- **GIVEN** Findings validated (Scenario 7.1)
- **WHEN** Tester refreshes http://localhost:5173/scans/:scanId
- **THEN** Findings list now shows validation status for each finding:
  - Finding title
  - Severity badge (HIGH/MEDIUM/LOW)
  - Validation status badge (VALIDATED/REJECTED with color)
  - Validator address (truncated)
  - Confidence score (e.g., "95% confident")
- **WHEN** Tester clicks on finding row
- **THEN** Finding detail modal opens showing:
  - Full description
  - Proof (decrypted if applicable)
  - Validation notes
  - Validator information

---

## Requirement: Payment SHALL Execute On-Chain

### Scenario 8.1: Payment Worker Processes Bounty Payment
- **GIVEN** Findings validated (Scenario 7.1)
- **GIVEN** BountyPool has >= 50 USDC balance
- **GIVEN** Payment worker running (Scenario 2.3)
- **WHEN** Payment worker detects completed findings
- **WHEN** Payment worker calculates bounty amount based on severity:
  - HIGH: 25 USDC
  - MEDIUM: 15 USDC
  - LOW: 5 USDC
- **WHEN** Payment worker calls BountyPool.releaseBounty() on-chain
- **WHEN** On-chain transaction:
  - Transfers USDC from BountyPool to researcher wallet
  - Emits BountyPaid event with amount and txHash
  - Updates on-chain payment record
- **THEN** Transaction confirms with receipt
- **THEN** Payment record created in database with:
  ```json
  {
    "paymentId": "payment-xxx",
    "findingId": "finding-xxx",
    "recipientId": "researcher-id",
    "amount": "25000000",
    "status": "COMPLETED",
    "transactionHash": "0xTX_HASH",
    "completedAt": "2026-02-07T..."
  }
  ```
- **THEN** Payment status = "COMPLETED"

### Scenario 8.2: On-Chain Payment Verified
- **GIVEN** Payment executed (Scenario 8.1)
- **WHEN** Tester verifies on-chain using cast:
  ```bash
  cast call $BOUNTY_POOL_ADDRESS \
    "getPaymentStatus(string)(uint8)" "payment-xxx" \
    --rpc-url $BASE_SEPOLIA_RPC_URL
  ```
- **THEN** cast call returns payment status value
- **WHEN** Tester checks researcher wallet balance:
  ```bash
  cast call $USDC_ADDRESS \
    "balanceOf(address)(uint256)" 0xRESEARCHER_WALLET \
    --rpc-url $BASE_SEPOLIA_RPC_URL
  ```
- **THEN** Balance increased by payment amount
- **THEN** BountyPool balance decreased by payment amount

### Scenario 8.3: Payment History Displays in Frontend
- **GIVEN** Payment executed (Scenario 8.1)
- **WHEN** Tester navigates to http://localhost:5173/payments
- **THEN** Page shows "Payments" title
- **THEN** Payment table displays completed payment:
  - Protocol: Thunder Loan Protocol
  - Finding: vulnerability title
  - Recipient: researcher wallet (truncated)
  - Amount: 25 USDC
  - Status: "COMPLETED" (green badge)
  - Transaction: link to block explorer with txHash
- **WHEN** Tester clicks payment row
- **THEN** Payment detail page shows:
  - Full transaction details
  - On-chain confirmation status
  - Links to all related findings
  - Researcher reputation impact

### Scenario 8.4: Payment Timeline Displays in x.402 View
- **GIVEN** Payment executed (Scenario 8.1)
- **GIVEN** Protocol registration fee was paid (if x.402 enabled)
- **WHEN** Tester navigates to http://localhost:5173/x402-payments
- **THEN** Page shows "x.402 Payment Timeline"
- **THEN** Timeline shows all x.402-related payments:
  - Protocol registration fee (1 USDC) - initial payment
  - Finding submission fees (0.5 USDC each) - from escrow
  - Bounty payment (25 USDC) - final payment to researcher
- **THEN** Each payment shows:
  - Type (Registration Fee, Submission Fee, Bounty Payment)
  - Amount in USDC
  - Status (PENDING, COMPLETED)
  - Transaction hash if completed
  - Timestamp

---

## Requirement: Agent Reputation Shall Update Correctly

### Scenario 9.1: Researcher Reputation Increases After Payment
- **GIVEN** Payment completed (Scenario 8.1)
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/agents/{researcherId}/reputation`
- **THEN** Response includes:
  ```json
  {
    "agentId": "researcher-id",
    "reputationScore": >= 50,
    "findingsSubmitted": >= 1,
    "findingsValidated": >= 1,
    "totalEarnings": "25000000",
    "averageSeverity": "HIGH|MEDIUM|LOW",
    "lastActivityAt": "2026-02-07T..."
  }
  ```
- **THEN** reputationScore reflects finding submission + validation + payment
- **THEN** totalEarnings shows accumulated USDC from bounties
- **THEN** findingsValidated increases

### Scenario 9.2: Validator Reputation Increases After Validation
- **GIVEN** Payment completed (Scenario 8.1)
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/agents/{validatorId}/reputation`
- **THEN** Response shows:
  - validationsCount >= 1
  - reputationScore reflecting successful validations
  - accuracyRate >= 0.9 (90%+ for correct validations)
  - totalEarnings reflecting validator reward

### Scenario 9.3: Agent Leaderboard Updates in Frontend
- **GIVEN** Reputation updated (Scenario 9.1-9.2)
- **WHEN** Tester navigates to http://localhost:5173/agents/:researcherId/reputation
- **THEN** Page shows "Agent Reputation" title
- **THEN** Dashboard displays:
  - Reputation score card (large number)
  - Earnings card (total USDC earned)
  - Findings submitted / validated counters
  - Activity timeline
- **WHEN** Tester navigates to http://localhost:5173/leaderboard (if exists)
- **THEN** Leaderboard shows agents ranked by reputation score
- **THEN** Researcher appears in leaderboard with:
  - Rank position
  - Agent address
  - Reputation score
  - Total earnings
  - Recent activity indicators

---

## Requirement: End-to-End Workflow Shall Complete Successfully

### Scenario 10: Full Manual E2E Test Success
- **GIVEN** All services started (Scenario 2.1-2.3)
- **GIVEN** Agents registered (Scenario 3.1-3.2)
- **GIVEN** Escrow funded (Scenario 4.1)
- **GIVEN** Protocol registered (Scenario 5.1)
- **GIVEN** Scan completed (Scenario 6.1-6.2)
- **GIVEN** Findings validated (Scenario 7.1)
- **GIVEN** Payment executed (Scenario 8.1)
- **GIVEN** Reputation updated (Scenario 9.1)
- **WHEN** Tester reviews entire workflow end-to-end
- **THEN** No errors occurred at any step
- **THEN** All data visible in frontend
- **THEN** All on-chain transactions confirmed
- **THEN** Reputation scores correctly calculated
- **THEN** System is ready for demonstration
- **THEN** Test completed in 60-90 minutes
- **THEN** All success criteria from Requirement Summary met

---

## Success Criteria Summary

The manual E2E test is successful when:

✅ **Infrastructure**
- PostgreSQL connected and migrated
- Redis authenticated
- All environment variables set
- Contract balances adequate

✅ **Services**
- Backend API listening on port 3000
- Frontend serving on port 5173
- All agent workers running
- No startup errors

✅ **Registration**
- Researcher agent registered with NFT ID
- Validator agent registered with NFT ID
- Both agents visible in frontend

✅ **Escrow**
- Researcher funded with 5 USDC
- 10 submissions available
- Balance visible in dashboard

✅ **Protocol**
- Thunder Loan registered
- Scan auto-triggered
- Status visible in frontend

✅ **Scan**
- Completes through all stages
- Finds >= 1 vulnerability
- Submission fees deducted
- Progress visible in real-time

✅ **Validation**
- Validator validates findings
- Findings marked VALIDATED/REJECTED
- Reputation increased

✅ **Payment**
- BountyPool payment executed
- USDC transferred on-chain
- Payment visible in frontend
- Block explorer confirms transaction

✅ **Reputation**
- Researcher score updated
- Validator score updated
- Leaderboard reflects changes
- Total earnings calculated

✅ **Frontend**
- All pages load without errors
- Real-time updates work
- Links function correctly
- Data displays accurately

---

## Related Specifications

- [Testing Specification](../testing.md) - Automated testing framework
- [Workflows Specification](../workflows.md) - System workflow details
- [Agents Specification](../agents.md) - Agent types and behavior
- [API Specification](../api.md) - API endpoints reference
