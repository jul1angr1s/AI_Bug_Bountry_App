# Phase 4: Payment Automation Implementation Tasks

## 1. Database Schema & Configuration (Foundation)

- [ ] 1.1 **Backend**: Update `backend/prisma/schema.prisma` - Add Payment model fields (researcherAddress, reconciled, reconciledAt, failureReason, retryCount, queuedAt)
- [ ] 1.2 **Backend**: Create PaymentReconciliation model in `backend/prisma/schema.prisma` with fields (id, paymentId, onChainBountyId, txHash, amount, status, discoveredAt, resolvedAt, notes)
- [ ] 1.3 **Backend**: Create EventListenerState model in `backend/prisma/schema.prisma` with fields (id, contractAddress, eventName, lastProcessedBlock, updatedAt)
- [ ] 1.4 **Backend**: Add indexes to Payment table (researcherAddress, reconciled), PaymentReconciliation table (status, onChainBountyId)
- [ ] 1.5 **Backend**: Generate Prisma migration with `npx prisma migrate dev --name phase_4_payment_automation`
- [ ] 1.6 **Backend**: Modify `backend/src/blockchain/config.ts` - Add PRIVATE_KEY2 environment variable support for researcher wallet
- [ ] 1.7 **Backend**: Create `researcherWallet` from PRIVATE_KEY2 in `backend/src/blockchain/config.ts`
- [ ] 1.8 **Backend**: Export RESEARCHER_ADDRESS constant from researcher wallet in `backend/src/blockchain/config.ts`
- [ ] 1.9 **Backend**: Add validation for both PRIVATE_KEY and PRIVATE_KEY2 present in environment

## 2. Payment Queue Infrastructure

- [ ] 2.1 **Backend**: Create `backend/src/queues/payment.queue.ts` - Define PaymentJobData interface (paymentId, validationId, protocolId)
- [ ] 2.2 **Backend**: Initialize BullMQ queue named "payment-processing" in `payment.queue.ts`
- [ ] 2.3 **Backend**: Configure retry logic in queue (3 attempts, exponential backoff: 1s, 5s, 25s)
- [ ] 2.4 **Backend**: Add queue control functions (addPaymentJob, pauseQueue, resumeQueue, getQueueStatus) in `payment.queue.ts`
- [ ] 2.5 **Backend**: Add queue monitoring (job counts, processing rate) following pattern from `protocol.queue.ts`

## 3. Event Listener Service Foundation

- [ ] 3.1 **Backend**: Create `backend/src/services/event-listener.service.ts` - Set up ethers.js v6 WebSocket provider for Base Sepolia
- [ ] 3.2 **Backend**: Implement EventListenerState manager (getLastBlock, updateLastBlock) in `event-listener.service.ts`
- [ ] 3.3 **Backend**: Create block tracking and replay logic for missed events during downtime
- [ ] 3.4 **Backend**: Add graceful shutdown handling (save last processed block before exit)
- [ ] 3.5 **Backend**: Implement error handling with exponential backoff for RPC failures

## 4. Automatic Payment Trigger - ValidationRecorded Listener

- [ ] 4.1 **Backend**: Create `backend/src/blockchain/listeners/validation-listener.ts` - Import ValidationRegistry ABI from `backend/contracts/out/`
- [ ] 4.2 **Backend**: Set up ethers.js event listener for ValidationRecorded events using WebSocket provider
- [ ] 4.3 **Backend**: Filter events by outcome=CONFIRMED status only
- [ ] 4.4 **Backend**: Implement event handler to create Payment record (status=PENDING, researcherAddress from Finding, amount from severity, queuedAt=now)
- [ ] 4.5 **Backend**: Add payment job to queue via `addPaymentJob(paymentId, validationId, protocolId)`
- [ ] 4.6 **Backend**: Update Proof table with onChainValidationId when ValidationRecorded event processed
- [ ] 4.7 **Backend**: Store last processed block in EventListenerState after each successful event
- [ ] 4.8 **Backend**: Prevent duplicate Payment creation by checking existing paymentId for validationId

## 5. Automatic Payment Trigger - Payment Worker

- [ ] 5.1 **Backend**: Create `backend/src/workers/payment.worker.ts` - Initialize BullMQ worker for "payment-processing" queue
- [ ] 5.2 **Backend**: Implement payment processing flow: fetch Validation → verify CONFIRMED → call BountyPoolClient.releaseBounty()
- [ ] 5.3 **Backend**: Add researcher address validation (query Validation → Proof → Finding → submittedBy)
- [ ] 5.4 **Backend**: Use RESEARCHER_ADDRESS from config for researcher parameter (testing) or Finding.submittedBy (production)
- [ ] 5.5 **Backend**: Update Payment record with txHash, status=COMPLETED, paidAt on successful releaseBounty()
- [ ] 5.6 **Backend**: Emit WebSocket event `payment:released` to room `protocol:{protocolId}` with payment details
- [ ] 5.7 **Backend**: Handle insufficient funds error - mark Payment as FAILED, set failureReason, emit `payment:failed` event, do NOT retry
- [ ] 5.8 **Backend**: Handle network errors - increment retryCount, throw error to trigger BullMQ retry
- [ ] 5.9 **Backend**: Prevent duplicate payment execution - check Payment status=COMPLETED before calling releaseBounty()
- [ ] 5.10 **Backend**: Log all payment attempts (start, transaction submission, success, failures) for audit trail

## 6. Payment Service (Business Logic)

- [ ] 6.1 **Backend**: Create `backend/src/services/payment.service.ts` - Implement `createPaymentFromValidation(validationId)` function
- [ ] 6.2 **Backend**: Implement `processPayment(paymentId)` function - execute via BountyPoolClient
- [ ] 6.3 **Backend**: Implement `getPaymentById(paymentId)` with nested validation and vulnerability data
- [ ] 6.4 **Backend**: Implement `getPaymentsByProtocol(protocolId, filters)` with status, date range, pagination support
- [ ] 6.5 **Backend**: Implement `getPaymentsByResearcher(address, filters)` with total earnings calculation
- [ ] 6.6 **Backend**: Implement `getPaymentStats(filters)` - aggregated statistics (totalPayments, totalAmountPaid, averagePayment, paymentsByStatus)
- [ ] 6.7 **Backend**: Add error handling for all service functions with typed errors

## 7. USDC Client & Approval Flow

- [ ] 7.1 **Backend**: Create `backend/src/blockchain/contracts/USDCClient.ts` - Initialize with Base Sepolia USDC address (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- [ ] 7.2 **Backend**: Implement `getAllowance(owner, spender)` - query USDC contract for current allowance
- [ ] 7.3 **Backend**: Implement `getBalance(address)` - query USDC balance for address
- [ ] 7.4 **Backend**: Implement `generateApprovalTxData(spender, amount)` - return unsigned transaction object for frontend signing
- [ ] 7.5 **Backend**: Add gas estimation for approval transactions

## 8. Payment & USDC API Endpoints

- [ ] 8.1 **Backend**: Create `backend/src/routes/payment.routes.ts` - Define Express router
- [ ] 8.2 **Backend**: Implement `GET /api/v1/payments/usdc/allowance?owner=&spender=` endpoint
- [ ] 8.3 **Backend**: Implement `GET /api/v1/payments/usdc/balance?address=` endpoint
- [ ] 8.4 **Backend**: Implement `POST /api/v1/payments/approve` endpoint - generate approval tx data
- [ ] 8.5 **Backend**: Implement `GET /api/v1/payments?protocolId=&status=&page=&limit=&startDate=&endDate=` endpoint with pagination
- [ ] 8.6 **Backend**: Implement `GET /api/v1/payments/:id` endpoint with nested data
- [ ] 8.7 **Backend**: Implement `GET /api/v1/payments/researcher/:address?startDate=&endDate=` endpoint with earnings breakdown
- [ ] 8.8 **Backend**: Implement `GET /api/v1/payments/stats?protocolId=&groupBy=&days=` endpoint with time series support
- [ ] 8.9 **Backend**: Implement `GET /api/v1/payments/leaderboard?limit=&startDate=` endpoint - top earners
- [ ] 8.10 **Backend**: Implement `GET /api/v1/payments/pool/:protocolId` endpoint - pool balance and recent transactions
- [ ] 8.11 **Backend**: Add authentication middleware to protected endpoints
- [ ] 8.12 **Backend**: Add rate limiting (100 req/min unauthenticated, 500 req/min authenticated)
- [ ] 8.13 **Backend**: Add Redis caching for stats and leaderboard endpoints (60s TTL)
- [ ] 8.14 **Backend**: Mount payment routes in `backend/src/server.ts`

## 9. Payment Reconciliation - BountyReleased Listener

- [ ] 9.1 **Backend**: Create `backend/src/blockchain/listeners/bounty-listener.ts` - Import BountyPool ABI
- [ ] 9.2 **Backend**: Set up ethers.js event listener for BountyReleased events using WebSocket provider
- [ ] 9.3 **Backend**: Implement event handler to match event validationId with Payment records
- [ ] 9.4 **Backend**: Update matched Payment with status=COMPLETED, paidAt=event.timestamp, reconciled=true, reconciledAt=now
- [ ] 9.5 **Backend**: Verify Payment.txHash matches event transaction hash - create PaymentReconciliation if mismatch
- [ ] 9.6 **Backend**: Detect orphaned on-chain payments (event with no matching Payment) - create PaymentReconciliation with status=ORPHANED
- [ ] 9.7 **Backend**: Store last processed block in EventListenerState after each successful event

## 10. Payment Reconciliation - Periodic Service

- [ ] 10.1 **Backend**: Create `backend/src/services/reconciliation.service.ts` - Define reconciliation logic
- [ ] 10.2 **Backend**: Create BullMQ repeatable job with cron "*/10 * * * *" (every 10 minutes)
- [ ] 10.3 **Backend**: Query BountyPool for BountyReleased events from last 24 hours
- [ ] 10.4 **Backend**: Compare events against Payment records to detect discrepancies
- [ ] 10.5 **Backend**: Detect missing Payments (event exists, no database record) - create PaymentReconciliation with status=MISSING_PAYMENT
- [ ] 10.6 **Backend**: Detect unconfirmed Payments (database COMPLETED, no event) - create PaymentReconciliation with status=UNCONFIRMED_PAYMENT
- [ ] 10.7 **Backend**: Detect amount mismatches - create PaymentReconciliation with status=AMOUNT_MISMATCH including both amounts
- [ ] 10.8 **Backend**: Auto-resolve simple cases (Payment missing txHash but event matches) - update Payment, skip PaymentReconciliation creation
- [ ] 10.9 **Backend**: Implement alert logic - log error if unresolved discrepancy count > 10
- [ ] 10.10 **Backend**: Implement `getReconciliationReport(since?)` function - summary metrics
- [ ] 10.11 **Backend**: Implement `getDiscrepancies(status?, sortBy?)` function - list unresolved issues

## 11. Reconciliation API Endpoints

- [ ] 11.1 **Backend**: Create `backend/src/routes/reconciliation.routes.ts` - Define Express router
- [ ] 11.2 **Backend**: Implement `GET /api/v1/reconciliation/report?since=` endpoint - latest reconciliation status
- [ ] 11.3 **Backend**: Implement `GET /api/v1/reconciliation/discrepancies?status=` endpoint - unresolved issues list
- [ ] 11.4 **Backend**: Implement `POST /api/v1/reconciliation/resolve/:id` endpoint - manual resolution with notes
- [ ] 11.5 **Backend**: Add admin authentication middleware to all reconciliation endpoints
- [ ] 11.6 **Backend**: Mount reconciliation routes in `backend/src/server.ts`

## 12. WebSocket Payment Events

- [ ] 12.1 **Backend**: Modify `backend/src/websocket/events.ts` - Add `payment:released` event type with payment details interface
- [ ] 12.2 **Backend**: Add `payment:failed` event type with error info interface
- [ ] 12.3 **Backend**: Update `bounty_pool:updated` event to include new payment data
- [ ] 12.4 **Backend**: Implement room-based targeting for protocol:{protocolId} rooms
- [ ] 12.5 **Backend**: Add Redis cache invalidation on payment completion (delete payment:stats:*, payment:leaderboard:*)

## 13. Backend Server Integration

- [ ] 13.1 **Backend**: Modify `backend/src/server.ts` - Import validation-listener and bounty-listener
- [ ] 13.2 **Backend**: Start ValidationRecorded event listener on server boot
- [ ] 13.3 **Backend**: Start BountyReleased event listener on server boot
- [ ] 13.4 **Backend**: Start reconciliation periodic job on server boot
- [ ] 13.5 **Backend**: Add graceful shutdown for event listeners (save last block before exit)
- [ ] 13.6 **Backend**: Add health check endpoint to verify event listeners running

## 14. Frontend - USDC Approval Component

- [ ] 14.1 **Frontend**: Create `frontend/src/components/Payment/USDCApprovalFlow.tsx` - TypeScript React component
- [ ] 14.2 **Frontend**: Implement allowance checking on component mount (call /api/v1/payments/usdc/allowance)
- [ ] 14.3 **Frontend**: Display approval status UI (insufficient → show "Approve USDC" button, sufficient → show "Approved" badge)
- [ ] 14.4 **Frontend**: Integrate wagmi `useWriteContract` hook for approval transaction signing
- [ ] 14.5 **Frontend**: Generate approval transaction data via POST /api/v1/payments/approve
- [ ] 14.6 **Frontend**: Implement polling for approval confirmation (every 2s, max 5 minutes, stop on 1 confirmation)
- [ ] 14.7 **Frontend**: Handle user rejection (display "Approval cancelled", keep button enabled)
- [ ] 14.8 **Frontend**: Handle transaction failure (display revert reason, allow retry)
- [ ] 14.9 **Frontend**: Update UI on approval success (show "Approved", enable deposit button)
- [ ] 14.10 **Frontend**: Add TailwindCSS + Shadcn UI styling

## 15. Frontend - Payment History Component

- [ ] 15.1 **Frontend**: Create `frontend/src/components/Payment/PaymentHistory.tsx` - TypeScript React component
- [ ] 15.2 **Frontend**: Implement payment table with columns (Date, Protocol, Researcher, Severity, Amount, Status, Transaction Link)
- [ ] 15.3 **Frontend**: Add status indicators (COMPLETED → green checkmark, PENDING → yellow clock, FAILED → red X)
- [ ] 15.4 **Frontend**: Add Basescan transaction links (https://sepolia.basescan.org/tx/{txHash}) opening in new tab
- [ ] 15.5 **Frontend**: Implement filter controls (Status dropdown, Severity dropdown, Date range picker)
- [ ] 15.6 **Frontend**: Implement pagination controls (page number, items per page, next/prev buttons)
- [ ] 15.7 **Frontend**: Fetch payment data via TanStack Query from GET /api/v1/payments endpoint
- [ ] 15.8 **Frontend**: Subscribe to WebSocket payment:released and payment:failed events for real-time updates
- [ ] 15.9 **Frontend**: Update table on WebSocket event (prepend new payment, update status)
- [ ] 15.10 **Frontend**: Add TailwindCSS + Shadcn UI styling

## 16. Frontend - Earnings Leaderboard Component

- [ ] 16.1 **Frontend**: Create `frontend/src/components/Payment/EarningsLeaderboard.tsx` - TypeScript React component
- [ ] 16.2 **Frontend**: Fetch leaderboard data via TanStack Query from GET /api/v1/payments/leaderboard?limit=10
- [ ] 16.3 **Frontend**: Display table with columns (Rank, Researcher Address, Total Earnings, Payment Count, Avg Payment)
- [ ] 16.4 **Frontend**: Truncate researcher addresses with tooltip showing full address
- [ ] 16.5 **Frontend**: Highlight current user's row if their address appears in leaderboard
- [ ] 16.6 **Frontend**: Add manual refresh button to fetch latest data
- [ ] 16.7 **Frontend**: Add TailwindCSS + Shadcn UI styling with rank badges (gold, silver, bronze for top 3)

## 17. Frontend - Bounty Pool Status Component

- [ ] 17.1 **Frontend**: Create `frontend/src/components/Payment/BountyPoolStatus.tsx` - TypeScript React component
- [ ] 17.2 **Frontend**: Fetch pool status via TanStack Query from GET /api/v1/payments/pool/:protocolId
- [ ] 17.3 **Frontend**: Display pool balance as horizontal progress bar (totalPaid / totalDeposited * 100%)
- [ ] 17.4 **Frontend**: Show labels "Available: {availableBalance} USDC" and "Total Deposited: {totalDeposited} USDC"
- [ ] 17.5 **Frontend**: Display recent transactions list (last 10) with Type, Amount, Date, Transaction Link
- [ ] 17.6 **Frontend**: Add "Deposit USDC" button that opens USDCApprovalFlow component
- [ ] 17.7 **Frontend**: Subscribe to WebSocket bounty_pool:updated event for real-time balance updates
- [ ] 17.8 **Frontend**: Update progress bar and balance on WebSocket event
- [ ] 17.9 **Frontend**: Add TailwindCSS + Shadcn UI styling with color-coded progress bar (red <20%, yellow 20-50%, green >50%)

## 18. Frontend - Payment Dashboard Page

- [ ] 18.1 **Frontend**: Create `frontend/src/pages/PaymentDashboard.tsx` - Page wrapper component
- [ ] 18.2 **Frontend**: Compose PaymentHistory, EarningsLeaderboard, BountyPoolStatus components in dashboard layout
- [ ] 18.3 **Frontend**: Add page title and breadcrumb navigation
- [ ] 18.4 **Frontend**: Add responsive grid layout (2 columns desktop, 1 column mobile)
- [ ] 18.5 **Frontend**: Add route to payment dashboard in router configuration

## 19. Frontend - API Integration

- [ ] 19.1 **Frontend**: Modify `frontend/src/lib/api.ts` - Add TypeScript interfaces for Payment, PaymentStats, Leaderboard, PoolStatus
- [ ] 19.2 **Frontend**: Add API functions: `getPayments(filters)`, `getPaymentById(id)`, `getResearcherEarnings(address)`, `getPaymentStats(protocolId)`, `getLeaderboard(limit)`, `getPoolStatus(protocolId)`
- [ ] 19.3 **Frontend**: Add API functions for USDC: `getUSDCAllowance(owner, spender)`, `getUSDCBalance(address)`, `generateApprovalTx(amount, spender)`
- [ ] 19.4 **Frontend**: Add WebSocket subscription helpers: `subscribeToPaymentEvents(protocolId, handlers)`
- [ ] 19.5 **Frontend**: Add error handling with typed errors for all API functions
- [ ] 19.6 **Frontend**: Add request/response logging for debugging

## 20. Testing - Unit Tests

- [ ] 20.1 **Backend**: Create `backend/tests/services/payment.service.test.ts` - Test createPaymentFromValidation, processPayment, getPayment queries
- [ ] 20.2 **Backend**: Create `backend/tests/services/reconciliation.service.test.ts` - Test reconciliation matching algorithm, discrepancy detection
- [ ] 20.3 **Backend**: Create `backend/tests/blockchain/USDCClient.test.ts` - Test getAllowance, getBalance, generateApprovalTxData
- [ ] 20.4 **Backend**: Create `backend/tests/workers/payment.worker.test.ts` - Test job processing, error handling, retry logic
- [ ] 20.5 **Backend**: Create `backend/tests/queues/payment.queue.test.ts` - Test queue operations, job persistence
- [ ] 20.6 **Backend**: Create `backend/tests/services/event-listener.service.test.ts` - Test EventListenerState manager, block tracking
- [ ] 20.7 **Backend**: Run all unit tests with `npm test` and verify >90% coverage

## 21. Testing - Integration Tests

- [ ] 21.1 **Backend**: Create `backend/tests/integration/payment-flow.test.ts` - Test full ValidationRecorded → Payment creation → Job queue → releaseBounty() → USDC transfer
- [ ] 21.2 **Backend**: Create `backend/tests/integration/reconciliation-flow.test.ts` - Test BountyReleased event → Payment update → reconciled flag → discrepancy detection
- [ ] 21.3 **Backend**: Create `backend/tests/integration/usdc-approval-flow.test.ts` - Test approval API endpoints → transaction generation → allowance check
- [ ] 21.4 **Backend**: Run integration tests against local Anvil fork of Base Sepolia
- [ ] 21.5 **Backend**: Verify all integration tests pass

## 22. Testing - End-to-End Test

- [ ] 22.1 **Backend**: Create `backend/tests/e2e/phase-4-payment.test.ts` - E2E test on Base Sepolia testnet
- [ ] 22.2 **Backend**: Test scenario: Validator Agent confirms validation → ValidationRecorded event → Payment created → Worker processes → releaseBounty() → USDC transferred to PRIVATE_KEY2 → BountyReleased event → Payment reconciled
- [ ] 22.3 **Backend**: Verify PRIVATE_KEY2 wallet receives USDC on Base Sepolia
- [ ] 22.4 **Backend**: Verify Payment record marked as reconciled
- [ ] 22.5 **Backend**: Verify dashboard displays payment correctly
- [ ] 22.6 **Backend**: Run E2E test and verify full flow succeeds

## 23. Documentation & Verification

- [ ] 23.1 **Documentation**: Update `README.md` - Mark Phase 4 as ✅ COMPLETE in roadmap section
- [ ] 23.2 **Documentation**: Update `project/APIRoutes.md` - Add payment and reconciliation API endpoints
- [ ] 23.3 **Documentation**: Update `project/Workflows.md` - Add payment automation workflow diagram
- [ ] 23.4 **Backend**: Add PRIVATE_KEY2 to `.env.example` with comment explaining researcher wallet usage
- [ ] 23.5 **Verification**: Verify all Phase 1-4 verification steps from plan (database migration, event listeners started, payment flow working, dashboard displaying data)
- [ ] 23.6 **Verification**: Run `npx prisma migrate status` to confirm migration applied
- [ ] 23.7 **Verification**: Check Redis for payment-processing queue exists
- [ ] 23.8 **Verification**: Check logs for event listener startup messages
- [ ] 23.9 **Verification**: Trigger test validation and verify payment completes end-to-end
- [ ] 23.10 **Verification**: Verify payment appears in dashboard with real-time updates

## 24. Pull Request & Deployment

- [ ] 24.1 **Git**: Commit all OpenSpec files with message "docs(openspec): Add Phase 4 payment automation change"
- [ ] 24.2 **Git**: Commit database migration with message "feat(db): Add Payment reconciliation and event listener state models"
- [ ] 24.3 **Git**: Commit backend implementation with message "feat(backend): Implement automatic payment trigger and reconciliation"
- [ ] 24.4 **Git**: Commit frontend implementation with message "feat(frontend): Add payment dashboard with real-time updates"
- [ ] 24.5 **Git**: Commit tests with message "test: Add unit, integration, and E2E tests for Phase 4"
- [ ] 24.6 **Git**: Push feature branch to remote: `git push -u origin feature/phase-4-payment-automation`
- [ ] 24.7 **GitHub**: Create Pull Request with title "feat(phase-4): Implement automated payment system with reconciliation and dashboard"
- [ ] 24.8 **GitHub**: Fill PR description using template from plan (What Changed, Key Features, Files Changed, Testing, Verification, Migration Required)
- [ ] 24.9 **GitHub**: Request review and await approval
- [ ] 24.10 **GitHub**: Merge PR to main after approval
