# Phase 4: Payment Automation Design

## Context

The platform currently has complete payment infrastructure deployed:
- BountyPool.sol contract on Base Sepolia (0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0) with `releaseBounty()` function
- ValidationRegistry emitting ValidationRecorded events for CONFIRMED validations
- Database models (Payment, FundingEvent) for tracking payment state
- BountyPoolClient wrapper for contract interactions
- WebSocket infrastructure for real-time updates

**Gap**: No automation exists to connect validation confirmation → payment execution. This requires manual intervention, creating delays and reducing trustworthiness of the "instant payment" value proposition.

**Current State Analysis**:
- Phase 3 completed: Validator agents can confirm exploits and emit ValidationRecorded events
- Payment database tables exist but are never populated automatically
- BountyPoolClient.releaseBounty() exists but is only callable manually
- No reconciliation mechanism to detect payment failures or discrepancies
- No visibility layer for payments (no dashboard)

**Stakeholders**:
- Protocol owners: Need to approve USDC spending and monitor pool balances
- Researchers: Expect instant payment on validation confirmation
- Validator agents: Trigger ValidationRecorded events but don't handle payments
- System administrators: Need reconciliation reports and payment analytics

## Goals / Non-Goals

**Goals:**
1. **Fully Automated Payment Flow**: ValidationRecorded event → Payment database record → BullMQ job → BountyPool.releaseBounty() → USDC transfer (no manual steps)
2. **Payment Reconciliation**: Periodic sync between on-chain BountyReleased events and database Payment records with discrepancy detection
3. **USDC Approval UX**: Simple frontend flow for protocol owners to approve USDC spending before depositing to pools
4. **Payment Visibility**: Real-time dashboard showing payment history, researcher earnings, and pool balances
5. **Robust Error Handling**: Retry logic for transient failures, clear error states for permanent failures, audit trail for all payment attempts
6. **Two-Wallet Testing**: Support PRIVATE_KEY2 researcher wallet for end-to-end testing of payment flow

**Non-Goals:**
1. **Multiple Payment Currencies**: USDC only (no ETH, no other stablecoins)
2. **Payment Batching**: Each validation triggers individual payment (no batch processing for cost optimization)
3. **Off-Chain Payments**: Only on-chain USDC via BountyPool.sol (no PayPal, bank transfers, etc.)
4. **Automatic Pool Refilling**: Protocol owners manually deposit USDC (no automatic top-up)
5. **Payment Escrow Holds**: Payments execute immediately on validation (no dispute period)
6. **Multi-Chain Payments**: Base Sepolia only (no cross-chain payment routing)

## Decisions

### Decision 1: Event-Driven Architecture with BullMQ

**Choice**: Use ethers.js event listeners + BullMQ queue for payment processing

**Alternatives Considered**:
- **Polling ValidationRegistry**: Query new validations every N seconds
  - ❌ Higher RPC usage, delayed payment trigger (up to N seconds), more complex state tracking
- **Direct synchronous payment**: Call releaseBounty() immediately in validation API endpoint
  - ❌ No retry mechanism, blocks API response, hard to monitor payment state
- **Webhook-based**: Expose webhook for external service to trigger payments
  - ❌ Adds external dependency, less control over reliability, security risk

**Rationale**: Event listeners provide instant notification when ValidationRecorded emits. BullMQ adds retry logic, error handling, job persistence, and monitoring. This separates payment execution from validation logic, allowing independent scaling and failure isolation.

### Decision 2: Two Separate Event Listeners (ValidationRecorded + BountyReleased)

**Choice**: Create two independent event listeners:
- `validation-listener.ts`: ValidationRecorded → Create Payment record → Queue job
- `bounty-listener.ts`: BountyReleased → Update Payment record → Mark reconciled

**Alternatives Considered**:
- **Single listener for both events**: One service handling multiple event types
  - ❌ Tight coupling, harder to test, single point of failure
- **No reconciliation listener**: Only listen to ValidationRecorded
  - ❌ Can't detect payment failures, no discrepancy detection, incomplete audit trail

**Rationale**: Separation of concerns - validation listener handles payment initiation, bounty listener handles confirmation. Each can fail independently without affecting the other. Enables reconciliation to run even if validation listener is down.

### Decision 3: Periodic Reconciliation (10 min intervals) vs Real-Time Only

**Choice**: Hybrid approach - real-time BountyReleased listener + periodic reconciliation job every 10 minutes

**Alternatives Considered**:
- **Real-time only**: Trust BountyReleased listener catches everything
  - ❌ Miss events if listener is down, no recovery for missed blocks
- **Periodic only**: Run reconciliation every 10 minutes, no real-time listener
  - ❌ Slower payment confirmation in UI, delayed payment status updates

**Rationale**: Real-time listener provides fast feedback for 99% of cases. Periodic reconciliation acts as safety net for missed events, network issues, or listener downtime. 10 minute interval balances detection speed vs RPC cost.

### Decision 4: Payment Worker Idempotency via Database Check

**Choice**: Before calling releaseBounty(), check if Payment record status is already COMPLETED

**Alternatives Considered**:
- **Smart contract check**: Query BountyPool to see if payment already executed
  - ❌ Extra RPC call, slower, still need database update
- **Job deduplication only**: Rely on BullMQ job ID uniqueness
  - ❌ Doesn't prevent re-processing if job is manually retried

**Rationale**: Database is source of truth for payment intent. Contract state reflects actual execution. Checking both prevents duplicate payments even if jobs are retried or events are replayed.

### Decision 5: USDC Approval Flow (Frontend Signing) vs Backend Proxy

**Choice**: Frontend generates approval transaction, user signs with wallet (wagmi), backend never handles private keys

**Alternatives Considered**:
- **Backend meta-transactions**: User approves backend to execute approval on their behalf
  - ❌ Adds complexity, requires separate authorization system, less trustless
- **Unlimited approval**: Request max uint256 allowance upfront
  - ❌ Security risk, users don't trust unlimited approvals, bad UX

**Rationale**: Frontend signing is standard Web3 UX. Users maintain full control. Backend provides read-only helpers (getAllowance, getBalance) but never touches user funds. Follows principle of least privilege.

### Decision 6: WebSocket Events for Real-Time Dashboard Updates

**Choice**: Emit `payment:released` and `payment:failed` events via Socket.io when payment worker completes

**Alternatives Considered**:
- **Polling API**: Frontend polls /api/v1/payments every N seconds
  - ❌ Delayed updates, higher server load, poor UX
- **Server-Sent Events (SSE)**: HTTP-based event stream
  - ❌ Unidirectional only, no room-based targeting, less flexible than WebSocket

**Rationale**: WebSocket already used for protocol/validation updates. Room-based targeting (`protocol:{id}`) enables efficient updates. Real-time feedback improves UX for payment confirmation.

### Decision 7: Two-Wallet Configuration for Testing

**Choice**: Add PRIVATE_KEY2 environment variable for researcher wallet, use in payment worker

**Alternatives Considered**:
- **Single wallet**: Use PRIVATE_KEY for both payer and researcher
  - ❌ Can't test actual USDC transfer (would just move funds to same wallet)
- **Hardcoded researcher addresses in test files**: Store addresses in test constants
  - ❌ Harder to verify actual payments, requires manual balance checks

**Rationale**: PRIVATE_KEY has PAYER_ROLE, PRIVATE_KEY2 is researcher receiving payment. Enables end-to-end testing where USDC actually transfers between wallets. Production replaces PRIVATE_KEY2 with researcher address from database.

### Decision 8: Exponential Backoff for Payment Retries

**Choice**: BullMQ retry configuration: 3 attempts, exponential backoff (1s, 5s, 25s)

**Alternatives Considered**:
- **Fixed delay**: Retry every 30 seconds
  - ❌ Wastes retry attempts on persistent failures, slower recovery on transient issues
- **Immediate retry**: Retry without delay
  - ❌ Hammers RPC on transient network issues, poor rate limiting behavior

**Rationale**: Exponential backoff gives transient failures time to resolve (network blips, RPC rate limits) while quickly failing permanent errors (insufficient funds, invalid validation ID). 3 attempts balances reliability vs alert noise.

## Risks / Trade-offs

### Risk 1: Event Listener Downtime → Missed Payments
**Mitigation**:
- EventListenerState tracks last processed block
- On restart, replay events from last checkpoint
- Periodic reconciliation detects missed payments and alerts

### Risk 2: RPC Rate Limiting → Event Listener Failures
**Mitigation**:
- Use WebSocket provider (wss://) for event listeners instead of polling
- Implement exponential backoff on RPC errors
- Monitor RPC usage and alert on approaching limits

### Risk 3: Database/Queue Out of Sync with Blockchain
**Mitigation**:
- PaymentReconciliation model audits all discrepancies
- Periodic reconciliation job (every 10 min) compares on-chain vs database
- Manual resolution endpoint for critical mismatches

### Risk 4: Payment Queue Backup → Delayed Payments
**Mitigation**:
- Monitor queue length and processing rate
- Alert if queue depth > 50 jobs
- Horizontal scaling: Add more payment workers if needed
- Each job has timeout (2 min) to prevent stuck jobs

### Risk 5: USDC Approval Phishing → User Fund Loss
**Mitigation**:
- Display clear approval amount (never unlimited)
- Show BountyPool contract address prominently
- Verify transaction data before signing
- User education: Only approve official BountyPool address

### Risk 6: Smart Contract Upgrade → Event Signature Changes
**Mitigation**:
- Event listeners use ABI from `backend/contracts/out/` (auto-generated by Foundry)
- If contract upgrades, update ABI and restart listeners
- Version event listener configuration in environment

### Risk 7: Researcher Address Mismatch → Wrong Payment Recipient
**Mitigation**:
- Payment service validates researcher address from Finding → Proof → Validation chain
- Database foreign key constraints ensure data integrity
- Reconciliation detects if on-chain recipient differs from database

## Migration Plan

### Pre-Deployment Checklist
1. ✅ Add PRIVATE_KEY2 to backend/.env (researcher wallet for testing)
2. ✅ Ensure Redis running (required for BullMQ)
3. ✅ Run Prisma migration: `npx prisma migrate dev`
4. ✅ Verify BountyPool has USDC balance for test payments
5. ✅ Verify PRIVATE_KEY wallet has PAYER_ROLE on BountyPool
6. ✅ Verify PRIVATE_KEY wallet has ETH for gas

### Deployment Steps
1. **Deploy Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```
   - Adds Payment fields: researcherAddress, reconciled, etc.
   - Creates PaymentReconciliation table
   - Creates EventListenerState table

2. **Deploy Backend Code**:
   - Deploy new services, workers, listeners, routes
   - server.ts starts event listeners on boot

3. **Verify Event Listeners Started**:
   - Check logs for "ValidationRecorded listener started"
   - Check logs for "BountyReleased listener started"
   - Verify EventListenerState records created

4. **Deploy Frontend Code**:
   - Build and deploy payment dashboard components
   - Update API client with payment endpoints

5. **Smoke Test**:
   - Trigger test ValidationRecorded event (use Validator Agent)
   - Verify Payment record created
   - Verify payment job queued in BullMQ
   - Verify BountyPool.releaseBounty() executed
   - Verify USDC transferred to researcher (PRIVATE_KEY2)
   - Verify payment appears in dashboard

### Rollback Strategy

**If Critical Bug Detected**:
1. **Stop Event Listeners**: Set environment variable `DISABLE_EVENT_LISTENERS=true` and restart backend
2. **Pause Payment Queue**: Call `POST /api/v1/admin/payments/pause` to stop processing
3. **Rollback Code**: Deploy previous version of backend/frontend
4. **Database**: Migration is additive (no data deletion), safe to keep new tables

**Partial Rollback (Payment Queue Only)**:
- Keep event listeners running (ValidationRecorded still creates Payment records)
- Pause payment queue to stop execution
- Manually release payments via admin endpoint

## Open Questions

### Q1: Should reconciliation auto-resolve discrepancies or require manual approval?
**Proposal**: Auto-resolve simple cases (on-chain payment found, database missing txHash). Require manual approval for:
- Orphaned on-chain payments (no matching database record)
- Amount mismatches
- Duplicate payments

**Decision needed before**: Phase 3 (Reconciliation Service) implementation

### Q2: What is acceptable payment delay SLA?
**Proposal**: 95% of payments complete within 60 seconds of ValidationRecorded event. Use this for alerting threshold.

**Decision needed before**: Monitoring setup

### Q3: Should payment dashboard be public or authenticated?
**Proposal**:
- Public: Payment history, leaderboard (read-only)
- Authenticated: Pool status, deposit button, reconciliation reports

**Decision needed before**: Phase 4 (Payment Dashboard) implementation

### Q4: How to handle BountyPool insufficient funds?
**Current Plan**: Mark payment FAILED, emit WebSocket event, log error. Protocol owner manually deposits more USDC.

**Alternative**: Auto-alert protocol owner via email/webhook when pool balance < 10% of maximum bounty.

**Decision needed before**: Phase 2A (Payment Worker) implementation
