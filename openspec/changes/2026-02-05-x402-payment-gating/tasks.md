# Tasks: x.402 Payment Gating for Platform Sustainability

## Phase 1: Smart Contract

### Task 1.1: Deploy PlatformEscrow
- [x] Create `PlatformEscrow.sol`
- [ ] Write unit tests `PlatformEscrow.t.sol`
- [x] Deploy to Base Sepolia (address: `0x33e5eE00985F96b482370c948d1c63c0AA4bD1ab`)
- [ ] Verify on Basescan
- [x] Update `.env` with contract address

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
- [x] Implement on-chain receipt verification (`verifyX402Receipt`)
- [x] Implement replay prevention via X402PaymentRequest table
- [x] Implement X402PaymentRequest tracking (PENDING on 402, COMPLETED on verified receipt)

**Files:**
- `backend/src/middleware/x402-payment-gate.middleware.ts`

### Task 2.3: Database Schema
- [x] Add `AgentEscrow` model
- [x] Add `EscrowTransaction` model
- [x] Add `X402PaymentRequest` model
- [x] Run Prisma migration (tables verified in DB)

**Files:**
- `backend/prisma/schema.prisma`

## Phase 3: API Routes

### Task 3.1: Escrow Routes
- [x] `GET /api/v1/agent-identities/:id/escrow`
- [x] `POST /api/v1/agent-identities/:id/escrow/deposit`
- [x] `GET /api/v1/agent-identities/:id/escrow/transactions`

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

### Task 3.2: Apply Middleware
- [x] Apply `x402ProtocolRegistrationGate` to protocol registration route (`POST /protocols`)
- [x] Apply `x402FindingSubmissionGate` to scan creation route (`POST /scans`)

**Files:**
- `backend/src/routes/protocol.routes.ts`
- `backend/src/routes/scans.ts`

### Task 3.3: x.402 Payment History Routes
- [x] `GET /api/v1/agent-identities/x402-payments` (all payments)
- [x] `GET /api/v1/agent-identities/:id/x402-payments` (per agent)

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

## Phase 4: Integration

### Task 4.1: Protocol Registration Integration
- [x] Protocol registration checks payment via x402ProtocolRegistrationGate
- [x] Payment receipt stored in X402PaymentRequest table

**Files:**
- `backend/src/routes/protocol.routes.ts`
- `backend/src/middleware/x402-payment-gate.middleware.ts`

### Task 4.2: Finding Submission Integration
- [x] Scan creation checks escrow balance via x402FindingSubmissionGate
- [x] Fee deducted after scan creation via `escrowService.deductSubmissionFee()`
- [x] Non-refundable per design

**Files:**
- `backend/src/routes/scans.ts`

### Task 4.3: WebSocket Events
- [ ] Emit `ESCROW_DEPOSITED` event
- [ ] Emit `SUBMISSION_FEE_DEDUCTED` event
- [ ] Emit `PROTOCOL_FEE_COLLECTED` event

**Files:**
- `backend/src/websocket/events.ts`

## Phase 5: Frontend

### Task 5.1: Escrow Dashboard (`/agents/:id/escrow`)
- [x] `EscrowBalanceCard` component - balance, remaining submissions, deposit button
- [x] `EscrowTransactionList` component - transaction history with type icons, basescan links
- [x] `EscrowDepositFlow` component - deposit form
- [x] `EscrowDashboard` page
- [x] Route: `/agents/:id/escrow`

**Files:**
- `frontend/src/pages/EscrowDashboard.tsx`
- `frontend/src/components/agents/EscrowBalanceCard.tsx`
- `frontend/src/components/agents/EscrowTransactionList.tsx`
- `frontend/src/components/agents/EscrowDepositFlow.tsx`

### Task 5.2: x.402 Payment Timeline (`/x402-payments`)
- [x] `X402PaymentTimeline` component - table with type, requester, amount, status badges
- [x] `X402PaymentCard` component - individual payment event card
- [x] `X402Payments` page
- [x] Route: `/x402-payments`

**Files:**
- `frontend/src/pages/X402Payments.tsx`
- `frontend/src/components/agents/X402PaymentTimeline.tsx`
- `frontend/src/components/agents/X402PaymentCard.tsx`

### Task 5.3: 402 Response Handler
- [x] `PaymentRequiredModal` component - intercepts 402, shows terms, payment flow
- [x] Route: N/A (utility modal)

**Files:**
- `frontend/src/components/agents/PaymentRequiredModal.tsx`

### Task 5.4: Types, API, and Hooks
- [x] `EscrowBalance`, `EscrowTransaction`, `X402PaymentEvent` types
- [x] API functions: `fetchEscrowBalance`, `depositEscrow`, `fetchEscrowTransactions`, `fetchX402Payments`
- [x] Hooks: `useEscrowBalance`, `useEscrowTransactions`, `useX402Payments`

**Files:**
- `frontend/src/types/dashboard.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/hooks/useEscrow.ts`
- `frontend/src/hooks/useX402Payments.ts`

### Task 5.5: Navigation
- [x] Add "x402 Payments" nav item to Sidebar
- [x] Add routes to App.tsx

## Phase 6: Testing

### Task 6.1: Backend Tests
- [x] `x402-receipt-verification.test.ts` - receipt verification unit tests
- [x] `escrow-fee-deduction.test.ts` - fee deduction unit tests
- [x] `x402-payment-gate.test.ts` - integration tests for middleware

### Task 6.2: Frontend Tests
- [x] Agent component test files (11 test files)

## Completion Checklist

- [x] Smart contract created
- [ ] Smart contract tested (Forge tests pending)
- [x] Smart contract deployed (Base Sepolia)
- [x] Backend services implemented
- [x] Middleware implemented with on-chain verification
- [x] API routes created
- [x] Prisma migration run (tables verified)
- [x] Middleware applied to routes (protocol registration + scan creation)
- [x] Fee deduction integrated
- [x] Frontend pages and components
- [x] Backend tests
- [x] Frontend tests
- [ ] End-to-end testing
