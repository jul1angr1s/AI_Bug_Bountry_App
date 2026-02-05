# Tasks: x.402 Payment Gating for Platform Sustainability

## Phase 1: Smart Contract

### Task 1.1: Deploy PlatformEscrow
- [x] Create `PlatformEscrow.sol`
- [ ] Write unit tests `PlatformEscrow.t.sol`
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan
- [ ] Update `.env` with contract address

**Files:**
- `backend/contracts/src/PlatformEscrow.sol`
- `backend/contracts/test/PlatformEscrow.t.sol`
- `backend/contracts/script/DeployAgentContracts.s.sol`

## Phase 2: Backend Services

### Task 2.1: EscrowService
- [x] Create `escrow.service.ts`
- [x] Implement `depositEscrow()`
- [x] Implement `deductSubmissionFee()`
- [x] Implement `getEscrowBalance()`
- [x] Implement `canSubmitFinding()`

**Files:**
- `backend/src/services/escrow.service.ts`

### Task 2.2: x.402 Middleware
- [x] Create `x402-payment-gate.middleware.ts`
- [x] Implement `x402ProtocolRegistrationGate()`
- [x] Implement `x402FindingSubmissionGate()`
- [x] Implement `createX402PaymentResponse()`

**Files:**
- `backend/src/middleware/x402-payment-gate.middleware.ts`

### Task 2.3: Database Schema
- [x] Add `AgentEscrow` model
- [x] Add `EscrowTransaction` model
- [x] Add `X402PaymentRequest` model
- [ ] Run Prisma migration

**Files:**
- `backend/prisma/schema.prisma`

## Phase 3: API Routes

### Task 3.1: Escrow Routes
- [x] `GET /api/v1/agents/:id/escrow`
- [x] `POST /api/v1/agents/:id/escrow/deposit`
- [x] `GET /api/v1/agents/:id/escrow/transactions`

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

### Task 3.2: Apply Middleware
- [ ] Apply `x402ProtocolRegistrationGate` to protocol registration route
- [ ] Apply `x402FindingSubmissionGate` to finding submission route

**Files:**
- `backend/src/routes/protocol.routes.ts`
- `backend/src/routes/finding.routes.ts`

## Phase 4: Integration

### Task 4.1: Protocol Registration Integration
- [ ] Update protocol registration flow to check payment
- [ ] Store payment receipt in AuditLog
- [ ] Emit WebSocket event on payment success

**Files:**
- `backend/src/services/protocol.service.ts`

### Task 4.2: Finding Submission Integration
- [ ] Update Researcher Agent to check escrow before submission
- [ ] Deduct fee before sending to Validator
- [ ] Handle insufficient balance errors

**Files:**
- `backend/src/agents/researcher/worker.ts`

### Task 4.3: WebSocket Events
- [ ] Emit `ESCROW_DEPOSITED` event
- [ ] Emit `SUBMISSION_FEE_DEDUCTED` event
- [ ] Emit `PROTOCOL_FEE_COLLECTED` event

**Files:**
- `backend/src/websocket/events.ts`

## Phase 5: Frontend (Optional)

### Task 5.1: Escrow Management
- [ ] Create escrow deposit form
- [ ] Display balance and remaining submissions
- [ ] Show transaction history

### Task 5.2: Payment Flow UI
- [ ] Handle 402 responses in API client
- [ ] Show payment instructions
- [ ] Display payment confirmation

## Environment Configuration

### Task 6.1: Update .env.example
- [ ] Add `PLATFORM_ESCROW_ADDRESS`
- [ ] Add `PLATFORM_WALLET_ADDRESS`
- [ ] Add `SKIP_X402_PAYMENT_GATE`

**Files:**
- `backend/.env.example`

## Completion Checklist

- [x] Smart contract created
- [ ] Smart contract tested
- [ ] Smart contract deployed
- [x] Backend services implemented
- [x] Middleware implemented
- [x] API routes created
- [ ] Prisma migration run
- [ ] Middleware applied to routes
- [ ] Integration with existing flows
- [ ] End-to-end testing
