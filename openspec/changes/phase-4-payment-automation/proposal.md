# Phase 4: Payment Automation Proposal

## Why

Currently, bounty payments require manual intervention after validation confirmation. This creates delays, increases operational overhead, and reduces the platform's value proposition of "instant USDC bounty payments." The system has all infrastructure in place (BountyPool.sol deployed on Base Sepolia with `releaseBounty()`, Payment/FundingEvent database models, and BountyPoolClient) but lacks the automated trigger mechanism, payment reconciliation, and visibility layer needed for a production-ready payment system.

## What Changes

- **Automatic Payment Trigger**: ValidationRecorded events (CONFIRMED status) automatically queue and process USDC payments via BountyPool.releaseBounty()
- **Payment Reconciliation**: BountyReleased event listener synchronizes on-chain payment state with database, detects discrepancies, and maintains audit trail
- **USDC Approval Flow**: Frontend component for protocol owners to approve USDC spending before depositing to bounty pools
- **Payment Dashboard**: Real-time payment visualization with history, earnings leaderboard, and pool status
- **Two-Wallet Testing**: Support for PRIVATE_KEY2 researcher wallet to enable end-to-end payment flow testing
- **Event Listener Infrastructure**: Foundational service for tracking ValidationRecorded and BountyReleased events with block state management

## Capabilities

### New Capabilities

- `automatic-payment-trigger`: Event-driven payment processing that listens for ValidationRecorded events, creates Payment records, queues payment jobs via BullMQ, and executes BountyPoolClient.releaseBounty() with retry logic and error handling
- `usdc-approval-flow`: USDC ERC-20 approval mechanism for protocol owners to authorize BountyPool contract spending before deposits, including allowance checking, approval transaction generation, and blockchain confirmation polling
- `payment-reconciliation`: Periodic reconciliation between on-chain BountyReleased events and database Payment records, detecting orphaned payments, amount mismatches, and maintaining PaymentReconciliation audit trail
- `payment-dashboard`: Real-time payment visualization with paginated payment history, researcher earnings leaderboard, bounty pool balance status, transaction links to Basescan, and WebSocket-driven updates

### Modified Capabilities

<!-- No existing capabilities being modified - this is all new functionality -->

## Impact

### Affected Components

**Backend (13 new files, 4 modifications)**:
- New Services: `payment.service.ts`, `reconciliation.service.ts`, `event-listener.service.ts`
- New Workers: `payment.worker.ts`
- New Queues: `payment.queue.ts`
- New Event Listeners: `validation-listener.ts`, `bounty-listener.ts`
- New Blockchain Clients: `USDCClient.ts`
- New API Routes: `payment.routes.ts`, `reconciliation.routes.ts`
- Modified: `server.ts` (start event listeners), `blockchain/config.ts` (two-wallet support), `websocket/events.ts` (payment events)

**Frontend (7 new files, 1 modification)**:
- New Components: `PaymentHistory.tsx`, `USDCApprovalFlow.tsx`, `EarningsLeaderboard.tsx`, `BountyPoolStatus.tsx`, `PaymentDetailsModal.tsx`
- New Pages: `PaymentDashboard.tsx`
- Modified: `lib/api.ts` (payment API functions)

**Database**:
- Extended Payment model: `researcherAddress`, `reconciled`, `reconciledAt`, `failureReason`, `retryCount`, `queuedAt`
- New PaymentReconciliation model: Audit trail for on-chain/database discrepancies
- New EventListenerState model: Block tracking for event listeners
- New indexes for payment queries

**Smart Contracts**:
- Uses existing deployed contracts (no modifications):
  - BountyPool.sol (0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0)
  - ValidationRegistry.sol (0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d)
  - Base Sepolia USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)

### Chain Interactions

**Base Sepolia Only**:
- Listen for ValidationRecorded events from ValidationRegistry
- Listen for BountyReleased events from BountyPool
- Execute BountyPool.releaseBounty() transactions
- Query USDC allowance and balance
- Generate USDC approval transactions for frontend signing

### Dependencies

**Existing Features**:
- Phase 3: Validation workflow (ValidationRecorded events must exist)
- BountyPool contract with PAYER_ROLE wallet configured
- Database models: Payment, FundingEvent, Proof, Finding
- BountyPoolClient with releaseBounty() method
- WebSocket server for real-time updates

**New External Dependencies**:
- ethers.js v6 (event listening)
- BullMQ (payment job queue)
- Redis (queue backend)

### Security Considerations

**Payment Authorization**:
- Only ValidationRecorded events with CONFIRMED status trigger payments
- Payment records prevent duplicate processing (check before executing)
- Verify researcher address matches validation data

**Private Key Management**:
- PRIVATE_KEY (wallet with PAYER_ROLE) for releasing payments
- PRIVATE_KEY2 (researcher wallet) for testing payment reception
- Both stored in secure environment variables, never exposed to frontend

**USDC Approval Security**:
- User-controlled approval amounts (never request unlimited allowance)
- Frontend-only wallet signing (backend never handles user private keys)
- Approval transaction verification before allowing deposits

**Reconciliation Integrity**:
- Periodic reconciliation detects payment failures and orphaned transactions
- PaymentReconciliation audit trail for all discrepancies
- Alert mechanism for manual intervention on critical mismatches

**Rate Limiting**:
- Payment API endpoints rate-limited
- Queue-based processing prevents payment spam
- Maximum retry attempts (3) for failed payments

**Error Handling**:
- Insufficient funds → mark FAILED, alert protocol owner
- Transaction revert → retry with exponential backoff
- Network errors → requeue job
- Critical errors logged for audit trail
