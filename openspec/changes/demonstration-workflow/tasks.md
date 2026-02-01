# Demonstration Workflow Implementation Tasks

**Status**: In Progress
**Created**: 2026-02-01
**Total Tasks**: 95
**Completed**: 0/95 (0%)

## Overview

This task list orchestrates the complete implementation of the demonstration workflow. Tasks are organized by phase and component, following the implementation plan.

## Phase 0: OpenSpec Cleanup & Alignment (CURRENT)

### 0.1 Audit Current OpenSpec Changes
- [x] 0.1.1 List all active changes in `/openspec/changes/`
- [x] 0.1.2 Review alignment with demonstration workflow
- [x] 0.1.3 Identify stale/misaligned specs
- [x] 0.1.4 Document findings

### 0.2 Archive Misaligned Specs
- [ ] 0.2.1 Move `phase-4-payment-automation` to archive (needs major revision for proof-based validation)
- [ ] 0.2.2 Create archive README with archival reason and timestamp
- [ ] 0.2.3 Update archive index

### 0.3 Create Aligned Specs
- [x] 0.3.1 Create `demonstration-workflow` spec and README
- [ ] 0.3.2 Create `frontend-demonstration-pages` spec
- [ ] 0.3.3 Create `researcher-agent-completion` spec
- [ ] 0.3.4 Create `validator-proof-based` spec
- [ ] 0.3.5 Create `payment-worker-completion` spec

## Phase 1: Core Demonstration UI (Week 1)

### 1.1 Protocol Registration Form
- [x] 1.1.1 CREATE `frontend/src/pages/ProtocolRegistration.tsx` - Main page component
- [x] 1.1.2 CREATE `frontend/src/components/protocols/ProtocolForm.tsx` - Form component
- [x] 1.1.3 Add form fields: Protocol Name, GitHub URL, Contract Path, Contract Name, Bounty Pool Address, Network
- [x] 1.1.4 Implement validation: URL format (GitHub), Ethereum address format (bounty pool)
- [x] 1.1.5 Add API integration: POST `/api/v1/protocols` - Added createProtocol function to lib/api.ts
- [x] 1.1.6 Implement success feedback: Navigate to `/protocols` with toast notification
- [x] 1.1.7 Implement error handling: Display validation errors, network errors
- [x] 1.1.8 MODIFY `frontend/src/App.tsx` - Add `/protocols/register` route
- [x] 1.1.9 Add loading state during form submission
- [x] 1.1.10 Add TailwindCSS styling with purple/pink gradient theme

### 1.2 Protocols List Page
- [x] 1.2.1 CREATE `frontend/src/pages/Protocols.tsx` - Main page component (~240 lines)
- [x] 1.2.2 CREATE `frontend/src/hooks/useProtocols.ts` - Data fetching hook with TanStack Query
- [x] 1.2.3 CREATE `frontend/src/components/protocols/ProtocolCard.tsx` - Card component (~140 lines)
- [x] 1.2.4 Implement grid/list view toggle - Grid3x3 and List icons with state management
- [x] 1.2.5 Display protocol data: Name, Status, Created Date, Active Scans, Vulnerabilities Found, Risk Score
- [x] 1.2.6 Add click handler: Navigate to `/protocols/:id` on card click
- [x] 1.2.7 Implement WebSocket subscription for real-time status updates - useProtocolsRealtime hook (placeholder for WebSocket, polling active)
- [x] 1.2.8 Add empty state: "No protocols registered" with CTA button
- [x] 1.2.9 Add loading skeleton while fetching data - Uses LoadingSkeleton component
- [x] 1.2.10 Add error state handling - Error boundary with retry button
- [x] 1.2.11 MODIFY `backend/src/routes/protocol.routes.ts` - Add GET `/api/v1/protocols` endpoint
- [x] 1.2.12 Implement pagination support (page, limit query params) - Added listProtocols service function
- [x] 1.2.13 Add status filter dropdown - All Status, Pending, Active, Paused, Deprecated
- [x] 1.2.14 Add responsive design (mobile + desktop layouts) - Responsive grid and flexbox layouts

### 1.3 Scans Page
- [ ] 1.3.1 CREATE `frontend/src/pages/Scans.tsx` - Main page component
- [ ] 1.3.2 CREATE `frontend/src/hooks/useScans.ts` - Data fetching hook
- [ ] 1.3.3 CREATE `frontend/src/components/scans/ScanCard.tsx` - Card component
- [ ] 1.3.4 Implement scan list with data: Protocol Name, Status, Progress %, Current Step, Findings Count, Started At
- [ ] 1.3.5 Add filter controls: Protocol dropdown, Status dropdown, Date range picker
- [ ] 1.3.6 Add click handler: Navigate to `/scans/:id` for scan detail
- [ ] 1.3.7 ENHANCE `frontend/src/components/ScanProgress.tsx` - Remove mock data, connect to real API
- [ ] 1.3.8 Implement WebSocket subscription for real-time scan progress updates
- [ ] 1.3.9 Add loading and error states
- [ ] 1.3.10 CREATE `backend/src/routes/scan.routes.ts` - Add GET `/api/v1/scans` endpoint
- [ ] 1.3.11 Implement scan detail endpoint GET `/api/v1/scans/:id`
- [ ] 1.3.12 Add pagination support

### 1.4 Protocol Detail Page
- [ ] 1.4.1 CREATE `frontend/src/pages/ProtocolDetail.tsx` - Main page component
- [ ] 1.4.2 CREATE `frontend/src/hooks/useProtocol.ts` - Data fetching hook
- [ ] 1.4.3 CREATE `frontend/src/components/protocols/ProtocolStats.tsx` - Stats cards component
- [ ] 1.4.4 Implement protocol header: Name, Status badge, GitHub link, Contract address
- [ ] 1.4.5 Implement stats cards: Total Scans, Vulnerabilities Found, Total Paid, Active Researchers
- [ ] 1.4.6 Add tabs: Overview, Scans, Findings, Payments
- [ ] 1.4.7 Implement Overview tab: Recent activity timeline
- [ ] 1.4.8 Implement Scans tab: List of scans for this protocol
- [ ] 1.4.9 Implement Findings tab: List of vulnerabilities
- [ ] 1.4.10 Implement Payments tab: Payment history
- [ ] 1.4.11 Add action buttons: "Trigger Rescan", "View Report"
- [ ] 1.4.12 Implement WebSocket subscription for protocol updates
- [ ] 1.4.13 MODIFY `backend/src/routes/protocol.routes.ts` - Enhance GET `/api/v1/protocols/:id` with full details

### 1.5 Dashboard Enhancement
- [ ] 1.5.1 MODIFY `frontend/src/pages/Dashboard.tsx` - Remove all mock data fallbacks
- [ ] 1.5.2 MODIFY `frontend/src/hooks/useDashboardData.ts` - Connect to real API GET `/api/v1/stats`
- [ ] 1.5.3 Implement bounty pool balance fetching from smart contract
- [ ] 1.5.4 Display actual vulnerability counts from database
- [ ] 1.5.5 Display actual payment totals from database
- [ ] 1.5.6 Display live agent status from backend health checks
- [ ] 1.5.7 Add graceful error handling if backend unavailable
- [ ] 1.5.8 Add loading states for all data fetches
- [ ] 1.5.9 Verify NO mock data used anywhere
- [ ] 1.5.10 Test all dashboard stats reflect actual database state

## Phase 2: Validation & Payment Integration (Week 2)

### 2.1 Validator Agent Integration
- [ ] 2.1.1 MODIFY `backend/src/agents/validator/worker.ts` - Complete implementation
- [ ] 2.1.2 Implement proof fetching from Finding record
- [ ] 2.1.3 Integrate Kimi 2.5 LLM for proof analysis
- [ ] 2.1.4 Implement proof validation prompt engineering
- [ ] 2.1.5 Parse LLM response for confidence score
- [ ] 2.1.6 Update Finding record (VALIDATED/INVALID, confidence, validatedAt)
- [ ] 2.1.7 Trigger payment queue if VALIDATED
- [ ] 2.1.8 Implement error handling and retry logic
- [ ] 2.1.9 MODIFY `backend/src/server.ts` - Start validator worker on boot
- [ ] 2.1.10 CREATE `backend/src/services/validation.service.ts` - Business logic

### 2.2 Payment Automation Worker
- [ ] 2.2.1 CREATE `backend/src/agents/payment/worker.ts` - Payment worker implementation
- [ ] 2.2.2 Implement payment eligibility validation
- [ ] 2.2.3 Implement bounty pool balance check
- [ ] 2.2.4 Integrate BountyPoolClient for on-chain transactions
- [ ] 2.2.5 Implement transaction submission to BountyPool contract
- [ ] 2.2.6 Monitor transaction confirmation
- [ ] 2.2.7 Update Payment record (txHash, status=COMPLETED, paidAt)
- [ ] 2.2.8 MODIFY `backend/src/services/event-listener.service.ts` - Add BountyReleased handler
- [ ] 2.2.9 Implement event listener for BountyReleased events
- [ ] 2.2.10 Implement payment reconciliation logic
- [ ] 2.2.11 MODIFY `backend/src/queues/payment.queue.ts` - Complete queue configuration
- [ ] 2.2.12 Add retry logic for failed transactions
- [ ] 2.2.13 Add gas price optimization

### 2.3 Payment API Endpoints
- [ ] 2.3.1 CREATE `backend/src/routes/payment.routes.ts` - Payment router
- [ ] 2.3.2 CREATE `backend/src/controllers/payment.controller.ts` - Payment controller
- [ ] 2.3.3 Implement GET `/api/v1/payments` - List all payments (with filters)
- [ ] 2.3.4 Implement GET `/api/v1/payments/:id` - Payment details
- [ ] 2.3.5 Implement GET `/api/v1/payments/researcher/:address` - Payments by researcher
- [ ] 2.3.6 Implement POST `/api/v1/payments/:id/retry` - Manual retry failed payment
- [ ] 2.3.7 Implement GET `/api/v1/payments/stats` - Payment statistics
- [ ] 2.3.8 Add pagination support to list endpoints
- [ ] 2.3.9 Add authorization checks (admin only for retry)
- [ ] 2.3.10 Add error handling for invalid payment IDs

### 2.4 Validations Page
- [ ] 2.4.1 CREATE `frontend/src/pages/Validations.tsx` - Main page component
- [ ] 2.4.2 CREATE `frontend/src/hooks/useValidations.ts` - Data fetching hook
- [ ] 2.4.3 CREATE `frontend/src/components/validations/ValidationCard.tsx` - Card component
- [ ] 2.4.4 Implement validation list with data: Finding Title, Protocol, Status, Confidence Score, Validated At
- [ ] 2.4.5 Add filter controls: Protocol dropdown, Status dropdown, Date range
- [ ] 2.4.6 Add click handler: Navigate to validation detail view
- [ ] 2.4.7 Implement validation detail view: Proof, Logs, Verdict
- [ ] 2.4.8 Add status badges: PENDING, IN_PROGRESS, VALIDATED, INVALID, FAILED
- [ ] 2.4.9 Implement WebSocket subscription for real-time validation updates
- [ ] 2.4.10 Add loading and error states
- [ ] 2.4.11 CREATE `backend/src/routes/validation.routes.ts` - Add GET `/api/v1/validations` endpoint

### 2.5 Payments Page
- [ ] 2.5.1 CREATE `frontend/src/pages/Payments.tsx` - Main page component
- [ ] 2.5.2 CREATE `frontend/src/hooks/usePayments.ts` - Data fetching hook
- [ ] 2.5.3 CREATE `frontend/src/components/payments/PaymentCard.tsx` - Card component
- [ ] 2.5.4 Implement payment list with data: Finding, Researcher Address, Amount, Status, Transaction Hash, Paid At
- [ ] 2.5.5 Add filter controls: Protocol dropdown, Status dropdown, Date range
- [ ] 2.5.6 Add transaction hash links to Basescan block explorer
- [ ] 2.5.7 Add status badges: PENDING, QUEUED, PROCESSING, COMPLETED, FAILED
- [ ] 2.5.8 Implement retry button for failed payments (admin only)
- [ ] 2.5.9 Implement WebSocket subscription for real-time payment updates
- [ ] 2.5.10 Add loading and error states

## Phase 3: Testing & Polish (Week 3)

### 3.1 End-to-End Testing
- [ ] 3.1.1 CREATE `frontend/cypress/e2e/demonstration-flow.cy.ts` - E2E test
- [ ] 3.1.2 Implement test: Register Thunder Loan protocol
- [ ] 3.1.3 Implement test: Wait for Protocol Agent completion
- [ ] 3.1.4 Implement test: Wait for Researcher Agent scanning
- [ ] 3.1.5 Implement test: Verify findings created
- [ ] 3.1.6 Implement test: Wait for Validator Agent
- [ ] 3.1.7 Implement test: Wait for Payment processing
- [ ] 3.1.8 Implement test: Verify payment completed
- [ ] 3.1.9 CREATE `backend/tests/e2e/demonstration-workflow.test.ts` - Backend E2E test
- [ ] 3.1.10 Implement API tests for all endpoints
- [ ] 3.1.11 Implement WebSocket tests for real-time updates
- [ ] 3.1.12 Verify E2E test passes consistently

### 3.2 Error Handling & Resilience
- [ ] 3.2.1 MODIFY all agent workers - Add comprehensive error handling
- [ ] 3.2.2 MODIFY all API routes - Standardize error responses
- [ ] 3.2.3 CREATE `backend/src/middleware/error-handler.ts` - Centralized error handler
- [ ] 3.2.4 Implement graceful degradation: Frontend shows cached data if backend unavailable
- [ ] 3.2.5 Implement retry logic: Failed jobs retry with exponential backoff
- [ ] 3.2.6 Implement dead letter queues for failed jobs
- [ ] 3.2.7 Add user-friendly error messages
- [ ] 3.2.8 Integrate Sentry for error tracking
- [ ] 3.2.9 Verify no unhandled promise rejections
- [ ] 3.2.10 Verify system recovers from transient failures

### 3.3 Monitoring & Observability
- [ ] 3.3.1 CREATE `backend/src/monitoring/metrics.ts` - Metrics collection
- [ ] 3.3.2 Add metrics: Queue depths, processing times, success rates
- [ ] 3.3.3 MODIFY `backend/src/server.ts` - Add health check endpoint
- [ ] 3.3.4 Implement health checks: Database, Redis, Queue workers
- [ ] 3.3.5 CREATE `frontend/src/components/admin/SystemHealth.tsx` - Admin dashboard
- [ ] 3.3.6 Implement system health visualization
- [ ] 3.3.7 Add alerts: Slack/email notifications for critical failures
- [ ] 3.3.8 Verify health check endpoint returns system status
- [ ] 3.3.9 Verify metrics exported to monitoring system
- [ ] 3.3.10 Verify alerts trigger on failures

### 3.4 Documentation & OpenSpec
- [ ] 3.4.1 UPDATE `/README.md` - Add demonstration section
- [ ] 3.4.2 CREATE `/docs/DEMONSTRATION.md` - User guide for demonstration
- [ ] 3.4.3 Update API documentation with new endpoints
- [ ] 3.4.4 Document cache key patterns and TTL values
- [ ] 3.4.5 Document WebSocket event payloads and room structure
- [ ] 3.4.6 Create architecture diagrams for demonstration workflow
- [ ] 3.4.7 Create deployment guide
- [ ] 3.4.8 Archive completed OpenSpec changes
- [ ] 3.4.9 Update OpenSpec main specs with demonstration workflow
- [ ] 3.4.10 Verify all new features documented

## PR Strategy (GitOps)

Each component maps to 1-3 focused PRs (<1,500 lines each):

### Phase 0 PRs
- [ ] PR 0.1: OpenSpec cleanup and aligned specs creation

### Phase 1 PRs (5-7 PRs)
- [ ] PR 1.1: Protocol Registration Form (~400 lines)
- [ ] PR 1.2: Backend GET /protocols endpoint (~200 lines)
- [ ] PR 1.3: Protocols List Page (~450 lines)
- [ ] PR 1.4: Scans List Page (~500 lines)
- [ ] PR 1.5: Protocol Detail Page (~600 lines)
- [ ] PR 1.6: Dashboard Real Data Integration (~350 lines)

### Phase 2 PRs (5 PRs)
- [ ] PR 2.1: Validator Agent Completion (~800 lines)
- [ ] PR 2.2: Payment Worker Implementation (~900 lines)
- [ ] PR 2.3: Payment API Endpoints (~400 lines)
- [ ] PR 2.4: Validations Page (~450 lines)
- [ ] PR 2.5: Payments Page (~450 lines)

### Phase 3 PRs (4 PRs)
- [ ] PR 3.1: E2E Tests (~600 lines)
- [ ] PR 3.2: Error Handling & Resilience (~500 lines)
- [ ] PR 3.3: Monitoring & Observability (~400 lines)
- [ ] PR 3.4: Documentation (~300 lines)

**Total PRs**: 15-17 focused PRs
**All PRs < 1,500 line limit**: ✅

## Dependencies

**Completed Changes**:
- ✅ `backend-api-foundation` - Foundation infrastructure
- ✅ `dashboard-api-endpoints` - Stats endpoints (43/162 tasks)
- ✅ `protocol-agent` - Protocol registration (10/18 tasks)
- ✅ `integrate-frontend-backend` - Integration complete

**In Progress**:
- 🚧 `demonstration-workflow` - This change

## Success Metrics

- [ ] User can register Thunder Loan protocol in <30 seconds
- [ ] Protocol Agent completes analysis in <60 seconds
- [ ] Researcher Agent finds oracle manipulation vulnerability
- [ ] Validator Agent successfully validates exploit proof
- [ ] Payment processes and completes on-chain
- [ ] Dashboard updates in real-time throughout workflow
- [ ] Zero mock data in production build
- [ ] E2E test passes consistently
