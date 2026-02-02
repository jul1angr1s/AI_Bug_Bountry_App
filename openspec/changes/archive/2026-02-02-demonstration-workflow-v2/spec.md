# Demonstration Workflow Specification

## Overview

This specification defines the complete end-to-end demonstration workflow for the AI Bug Bounty Platform using the Thunder Loan protocol as the reference implementation.

## User Journey

### 1. Protocol Owner Registration

**Actor**: Protocol Owner (Thunder Loan team)
**Entry Point**: Landing page → "Register Protocol" CTA
**Duration**: <30 seconds

**Steps**:
1. User navigates to `/protocols/register`
2. Fills out form:
   - Protocol Name: "Thunder Loan Protocol"
   - GitHub URL: "https://github.com/Cyfrin/2023-11-Thunder-Loan"
   - Branch: "main"
   - Contract Path: "src/protocol/ThunderLoan.sol"
   - Contract Name: "ThunderLoan"
   - Bounty Pool Address: (existing deployed BountyPool address)
   - Network: "Base Sepolia"
3. Submits form → POST `/api/v1/protocols`
4. Backend creates Protocol record (status=PENDING)
5. Backend queues Protocol Agent job
6. User redirected to `/protocols` with success toast
7. WebSocket broadcasts `protocol:registered` event

**UI Requirements**:
- Form validation (GitHub URL format, Ethereum address format)
- Loading state during submission
- Error handling for duplicate URLs, invalid addresses
- Success feedback with link to protocol detail page

### 2. Protocol Analysis (Automated)

**Actor**: Protocol Agent
**Duration**: <60 seconds
**Visibility**: Real-time progress updates on Dashboard

**Steps**:
1. Protocol Agent picks up job from queue
2. Clones repository: `git clone https://github.com/Cyfrin/2023-11-Thunder-Loan`
3. Verifies contract path exists: `src/protocol/ThunderLoan.sol`
4. Compiles contracts: `forge build`
5. Calculates risk score based on complexity
6. Updates Protocol (status=ACTIVE)
7. Triggers Researcher Agent queue
8. Broadcasts `protocol:active` event

**UI Updates**:
- Dashboard shows "Protocol Analysis In Progress" badge
- Progress indicator: Clone → Verify → Compile → Calculate Risk
- On completion, badge changes to "Active"
- Protocol appears in active protocols list

### 3. Vulnerability Scanning (Automated)

**Actor**: Researcher Agent
**Duration**: <60 seconds
**Visibility**: Scans page shows real-time progress

**Steps**:
1. Researcher Agent picks up scan job
2. Deploys fresh ThunderLoan to local Anvil fork
3. Analyzes contract with Kimi 2.5 LLM:
   - Prompt: "Analyze this Solidity contract for vulnerabilities. Focus on: access control, reentrancy, oracle manipulation, flash loan attacks, storage collisions."
   - LLM identifies oracle manipulation in `getCalculatedFee()`
4. Generates exploit proof-of-concept code
5. Creates Finding record (severity=CRITICAL, status=PENDING_VALIDATION)
6. Stores proof in database (encrypted)
7. Triggers Validator Agent queue
8. Broadcasts `finding:discovered` event

**UI Updates**:
- Scans page shows scan progress:
  - Deploy → Analyze → Generate Proof → Submit
- Dashboard vulnerability count increments
- Finding appears in "Pending Validation" section
- Real-time progress bar on scan detail page

### 4. Proof Validation (Automated)

**Actor**: Validator Agent
**Duration**: <60 seconds
**Visibility**: Validations page shows validation in progress

**Steps**:
1. Validator Agent picks up validation job
2. Fetches proof from Finding record
3. Analyzes proof logic with Kimi 2.5 LLM:
   - Prompt: "Validate this exploit proof for a Solidity vulnerability. Proof: {proof}. Contract: {contract_code}. Does the proof demonstrate a valid exploit? What is the confidence level?"
   - LLM validates the oracle manipulation attack vector
   - LLM calculates confidence score (e.g., 95%)
4. Updates Finding (status=VALIDATED, validatedAt=now, confidence=95)
5. Triggers Payment queue
6. Broadcasts `validation:complete` event

**Alternative Flow - Proof Invalid**:
- LLM identifies flaws in proof logic
- Updates Finding (status=INVALID, confidence=0)
- NO payment triggered
- Broadcasts `validation:invalid` event

**UI Updates**:
- Validations page shows validation progress
- On completion, Finding moves to "Validated" section
- Dashboard shows validation badge with confidence score
- Green checkmark appears next to finding

### 5. Payment Processing (Automated)

**Actor**: Payment Worker
**Duration**: <30 seconds (blockchain confirmation time)
**Visibility**: Payments page shows payment processing

**Steps**:
1. Payment Worker picks up payment job
2. Validates eligibility:
   - Finding is VALIDATED
   - Not already paid
   - Bounty pool has sufficient balance
3. Calculates payment amount:
   - Base reward: $500
   - Severity multiplier: 10x (CRITICAL)
   - Total: $5,000 USDC
4. Submits transaction to BountyPool contract:
   ```solidity
   bountyPool.releaseBounty(
     protocolId,
     researcherAddress,
     amount
   )
   ```
5. Monitors transaction confirmation
6. Updates Payment record (txHash, status=COMPLETED, paidAt=now)
7. Listens for `BountyReleased` event from contract
8. Reconciles payment (reconciled=true)
9. Broadcasts `payment:released` event

**UI Updates**:
- Payments page shows "Processing Payment" status
- On tx submission: Shows "Confirming..." with tx link
- On confirmation: Shows "Paid ✅" with amount
- Dashboard total paid amount updates
- Transaction hash links to Basescan

### 6. Dashboard Real-time Updates

**Throughout entire workflow, dashboard shows**:

**Stats Cards**:
- Active Protocols: 1
- Vulnerabilities Found: 1
- Total Paid: $5,000
- Active Researchers: 1

**Recent Activity Timeline**:
1. T+0s: "Thunder Loan protocol registered"
2. T+30s: "Protocol analysis complete - ACTIVE"
3. T+60s: "Critical vulnerability discovered"
4. T+120s: "Vulnerability validated (95% confidence)"
5. T+150s: "Payment released: $5,000 USDC"

**Agent Status**:
- Protocol Agent: ✅ Idle (last active: 2m ago)
- Researcher Agent: 🔍 Scanning (Thunder Loan)
- Validator Agent: ⏳ Validating proof

**Real-time Updates via WebSocket**:
- All stats update live without page refresh
- Activity timeline prepends new items
- Agent status updates every 5s
- Payment processing shows live progress

## Data Flow

```
┌──────────────┐
│ User submits │
│   protocol   │
└──────┬───────┘
       │
       ▼
┌──────────────────┐     ┌─────────────────┐
│ Protocol created │────▶│ Protocol Agent  │
│  (status=PENDING)│     │  queued (BullMQ)│
└──────────────────┘     └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ Clone + Compile │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐     ┌─────────────────┐
                         │ Protocol ACTIVE │────▶│Researcher Agent │
                         └─────────────────┘     │ queued (BullMQ) │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Analyze + Find  │
                                                  │  vulnerability  │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐     ┌─────────────────┐
                                                  │ Finding created │────▶│ Validator Agent │
                                                  │ (PENDING_VALID) │     │ queued (BullMQ) │
                                                  └─────────────────┘     └────────┬────────┘
                                                                                   │
                                                                                   ▼
                                                                          ┌─────────────────┐
                                                                          │ Validate proof  │
                                                                          │  with LLM       │
                                                                          └────────┬────────┘
                                                                                   │
                                                                                   ▼
                                                                          ┌─────────────────┐     ┌─────────────────┐
                                                                          │Finding VALIDATED│────▶│  Payment Worker │
                                                                          └─────────────────┘     │ queued (BullMQ) │
                                                                                                  └────────┬────────┘
                                                                                                           │
                                                                                                           ▼
                                                                                                  ┌─────────────────┐
                                                                                                  │ Release bounty  │
                                                                                                  │   on-chain      │
                                                                                                  └────────┬────────┘
                                                                                                           │
                                                                                                           ▼
                                                                                                  ┌─────────────────┐
                                                                                                  │Payment COMPLETED│
                                                                                                  │  (reconciled)   │
                                                                                                  └─────────────────┘
```

## WebSocket Event Schema

### `protocol:registered`
```typescript
{
  event: "protocol:registered",
  data: {
    protocolId: string,
    name: string,
    githubUrl: string,
    status: "PENDING",
    timestamp: number
  }
}
```

### `protocol:active`
```typescript
{
  event: "protocol:active",
  data: {
    protocolId: string,
    name: string,
    riskScore: number,
    timestamp: number
  }
}
```

### `scan:progress`
```typescript
{
  event: "scan:progress",
  data: {
    scanId: string,
    protocolId: string,
    step: "deploying" | "analyzing" | "generating_proof" | "submitting",
    progress: number, // 0-100
    timestamp: number
  }
}
```

### `finding:discovered`
```typescript
{
  event: "finding:discovered",
  data: {
    findingId: string,
    protocolId: string,
    protocolName: string,
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    title: string,
    status: "PENDING_VALIDATION",
    timestamp: number
  }
}
```

### `validation:complete`
```typescript
{
  event: "validation:complete",
  data: {
    findingId: string,
    protocolId: string,
    result: "VALIDATED" | "INVALID",
    confidence: number, // 0-100
    timestamp: number
  }
}
```

### `payment:released`
```typescript
{
  event: "payment:released",
  data: {
    paymentId: string,
    findingId: string,
    protocolId: string,
    amount: string, // e.g., "5000.00"
    token: "USDC",
    researcherAddress: string,
    txHash: string,
    timestamp: number
  }
}
```

## Database Schema Changes

### Protocol Table
```prisma
model Protocol {
  id              String          @id @default(uuid())
  name            String
  githubUrl       String          @unique
  branch          String          @default("main")
  contractPath    String
  contractName    String
  bountyPoolAddress String?       // Existing deployed pool
  network         String          @default("base-sepolia")
  status          ProtocolStatus  @default(PENDING)
  riskScore       Int?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  scans           Scan[]
  findings        Finding[]
}

enum ProtocolStatus {
  PENDING
  ACTIVE
  PAUSED
  DEPRECATED
}
```

### Finding Table
```prisma
model Finding {
  id              String          @id @default(uuid())
  protocolId      String
  protocol        Protocol        @relation(fields: [protocolId], references: [id], onDelete: Cascade)
  scanId          String?
  scan            Scan?           @relation(fields: [scanId], references: [id])

  title           String
  description     String
  severity        Severity
  status          FindingStatus   @default(PENDING_VALIDATION)

  proof           Json            // Encrypted exploit proof
  proofHash       String?         @unique

  submittedBy     String?         // Researcher address
  discoveredAt    DateTime        @default(now())
  validatedAt     DateTime?
  confidence      Int?            // 0-100

  payment         Payment?

  @@index([protocolId, status])
  @@index([status, severity])
}

enum FindingStatus {
  PENDING_VALIDATION
  VALIDATED
  INVALID
  PAID
}
```

### Payment Table
```prisma
model Payment {
  id                String        @id @default(uuid())
  findingId         String        @unique
  finding           Finding       @relation(fields: [findingId], references: [id])

  researcherAddress String
  amount            Decimal       @db.Decimal(18, 6)
  token             String        @default("USDC")

  status            PaymentStatus @default(PENDING)
  txHash            String?
  queuedAt          DateTime      @default(now())
  paidAt            DateTime?

  reconciled        Boolean       @default(false)
  reconciledAt      DateTime?

  failureReason     String?
  retryCount        Int           @default(0)

  @@index([researcherAddress])
  @@index([status])
}

enum PaymentStatus {
  PENDING
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

## API Endpoints

### POST /api/v1/protocols
Register new protocol

**Request**:
```typescript
{
  name: string,
  githubUrl: string,
  branch?: string,
  contractPath: string,
  contractName: string,
  bountyPoolAddress: string,
  network?: string
}
```

**Response**:
```typescript
{
  id: string,
  name: string,
  status: "PENDING",
  message: "Protocol registered. Analysis in progress..."
}
```

### GET /api/v1/protocols
List all protocols

**Query Params**:
- `status?: PENDING | ACTIVE | PAUSED | DEPRECATED`
- `page?: number`
- `limit?: number`

**Response**:
```typescript
{
  protocols: Array<{
    id: string,
    name: string,
    githubUrl: string,
    status: ProtocolStatus,
    riskScore?: number,
    scansCount: number,
    vulnerabilitiesCount: number,
    createdAt: string
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### GET /api/v1/scans
List all scans

**Query Params**:
- `protocolId?: string`
- `status?: string`
- `page?: number`
- `limit?: number`

**Response**:
```typescript
{
  scans: Array<{
    id: string,
    protocolId: string,
    protocolName: string,
    status: string,
    progress: number,
    currentStep: string,
    findingsCount: number,
    startedAt: string,
    completedAt?: string
  }>,
  pagination: {...}
}
```

### GET /api/v1/validations
List all validations

**Query Params**:
- `protocolId?: string`
- `status?: string`
- `page?: number`
- `limit?: number`

**Response**:
```typescript
{
  validations: Array<{
    id: string,
    findingId: string,
    findingTitle: string,
    protocolName: string,
    severity: Severity,
    status: FindingStatus,
    confidence?: number,
    validatedAt?: string
  }>,
  pagination: {...}
}
```

### GET /api/v1/payments
List all payments

**Query Params**:
- `protocolId?: string`
- `researcherAddress?: string`
- `status?: string`
- `page?: number`
- `limit?: number`

**Response**:
```typescript
{
  payments: Array<{
    id: string,
    findingId: string,
    findingTitle: string,
    protocolName: string,
    researcherAddress: string,
    amount: string,
    token: string,
    status: PaymentStatus,
    txHash?: string,
    paidAt?: string
  }>,
  pagination: {...}
}
```

## Testing Requirements

### Unit Tests
- Protocol registration validation
- Agent queue job processing
- LLM proof analysis logic
- Payment calculation
- WebSocket event emission

### Integration Tests
- Complete workflow: Registration → Analysis → Scan → Validate → Pay
- WebSocket event broadcasting
- Database state transitions
- Queue retry logic

### E2E Test
- Thunder Loan full demonstration
- User journey from registration to payment view
- Real-time UI updates

## Success Criteria

- ✅ Protocol registration completes in <30s
- ✅ Protocol analysis completes in <60s
- ✅ Vulnerability scan completes in <60s
- ✅ Proof validation completes in <60s
- ✅ Payment processes in <30s
- ✅ All WebSocket events broadcast correctly
- ✅ Dashboard shows real-time updates
- ✅ Zero mock data in production
- ✅ End-to-end test passes consistently
