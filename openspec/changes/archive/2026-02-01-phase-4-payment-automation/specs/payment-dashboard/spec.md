# Payment Dashboard Specification

## ADDED Requirements

### Requirement: System SHALL provide paginated payment history API
The system SHALL expose API endpoint to retrieve payment records with filtering, sorting, and pagination.

#### Scenario: Fetch payment list with pagination
- **WHEN** client requests GET /api/v1/payments?page=1&limit=20
- **THEN** system SHALL return first 20 payment records ordered by createdAt DESC
- **THEN** response SHALL include pagination metadata (totalCount, totalPages, currentPage, hasNext, hasPrevious)

#### Scenario: Filter payments by protocol
- **WHEN** client requests GET /api/v1/payments?protocolId={id}
- **THEN** system SHALL return only payments associated with the specified protocol

#### Scenario: Filter payments by status
- **WHEN** client requests GET /api/v1/payments?status=COMPLETED
- **THEN** system SHALL return only payments with status matching the query parameter

#### Scenario: Filter payments by date range
- **WHEN** client requests GET /api/v1/payments?startDate={iso}&endDate={iso}
- **THEN** system SHALL return only payments with createdAt within the specified date range

#### Scenario: Combine multiple filters
- **WHEN** client requests GET /api/v1/payments?protocolId={id}&status=COMPLETED&startDate={iso}
- **THEN** system SHALL apply all filters using AND logic

### Requirement: System SHALL provide payment details API
The system SHALL expose API endpoint to retrieve full details of a specific payment.

#### Scenario: Fetch payment by ID
- **WHEN** client requests GET /api/v1/payments/{paymentId}
- **THEN** system SHALL return payment record with vulnerabilityId, amount, currency, status, txHash, researcherAddress, paidAt, reconciled, failureReason, retryCount

#### Scenario: Include related validation data
- **WHEN** client requests payment details
- **THEN** response SHALL include nested validation data (validationId, outcome, timestamp)
- **THEN** response SHALL include nested vulnerability data (title, severity, description)

#### Scenario: Payment not found returns 404
- **WHEN** client requests payment with non-existent ID
- **THEN** system SHALL return 404 Not Found with error message "Payment not found"

### Requirement: System SHALL provide researcher earnings API
The system SHALL expose API endpoint to retrieve total earnings and payment history for a specific researcher address.

#### Scenario: Fetch earnings by researcher address
- **WHEN** client requests GET /api/v1/payments/researcher/{address}
- **THEN** system SHALL return array of payments with researcherAddress matching the specified address
- **THEN** response SHALL include totalEarnings (sum of all COMPLETED payment amounts)

#### Scenario: Include payment count by severity
- **WHEN** client requests researcher earnings
- **THEN** response SHALL include breakdown of payment counts by severity (CRITICAL, HIGH, MEDIUM, LOW)

#### Scenario: Filter researcher payments by date range
- **WHEN** client requests GET /api/v1/payments/researcher/{address}?startDate={iso}&endDate={iso}
- **THEN** system SHALL return earnings and payments only within the specified date range

### Requirement: System SHALL provide payment statistics API
The system SHALL expose API endpoint to retrieve aggregated payment metrics.

#### Scenario: Fetch overall payment statistics
- **WHEN** client requests GET /api/v1/payments/stats
- **THEN** system SHALL return JSON with totalPayments, totalAmountPaid, averagePaymentAmount, paymentsByStatus (PENDING, COMPLETED, FAILED counts)

#### Scenario: Filter statistics by protocol
- **WHEN** client requests GET /api/v1/payments/stats?protocolId={id}
- **THEN** system SHALL return statistics scoped to the specified protocol only

#### Scenario: Statistics include time series data
- **WHEN** client requests GET /api/v1/payments/stats?groupBy=day&days=30
- **THEN** system SHALL return daily payment counts and totals for the last 30 days

### Requirement: System SHALL provide earnings leaderboard API
The system SHALL expose API endpoint to retrieve top-earning researchers ranked by total USDC received.

#### Scenario: Fetch top 10 researchers
- **WHEN** client requests GET /api/v1/payments/leaderboard?limit=10
- **THEN** system SHALL return array of 10 researchers ranked by total earnings DESC
- **THEN** each entry SHALL include researcherAddress, totalEarnings, paymentCount, averagePaymentAmount

#### Scenario: Leaderboard includes only COMPLETED payments
- **WHEN** leaderboard is calculated
- **THEN** system SHALL sum only payments with status=COMPLETED
- **THEN** PENDING and FAILED payments SHALL be excluded from earnings calculation

#### Scenario: Leaderboard filterable by time range
- **WHEN** client requests GET /api/v1/payments/leaderboard?limit=10&startDate={iso}
- **THEN** system SHALL rank researchers based on earnings since the specified date

### Requirement: System SHALL provide bounty pool status API
The system SHALL expose API endpoint to retrieve current balance and transaction history for a protocol's bounty pool.

#### Scenario: Fetch pool status by protocol
- **WHEN** client requests GET /api/v1/payments/pool/{protocolId}
- **THEN** system SHALL query BountyPool contract for current USDC balance
- **THEN** response SHALL include availableBalance, totalDeposited, totalPaid, remainingBalance (availableBalance - pending payments)

#### Scenario: Include recent pool transactions
- **WHEN** client requests pool status
- **THEN** response SHALL include last 10 transactions (deposits and payments) with timestamp, type, amount, txHash

#### Scenario: Pool status includes pending payments
- **WHEN** client requests pool status
- **THEN** response SHALL sum all PENDING payments for the protocol
- **THEN** response SHALL include pendingPaymentsCount and pendingPaymentsTotal

### Requirement: Frontend SHALL display payment history table
The frontend payment history component SHALL render paginated table of payments with filters and real-time updates.

#### Scenario: Display payment table columns
- **WHEN** user views payment history page
- **THEN** table SHALL display columns: Date, Protocol, Researcher Address, Severity, Amount (USDC), Status, Transaction Link

#### Scenario: Payment status indicators
- **WHEN** payment has status=COMPLETED
- **THEN** table SHALL display green checkmark icon with "Paid" label
- **WHEN** payment has status=PENDING
- **THEN** table SHALL display yellow clock icon with "Processing" label
- **WHEN** payment has status=FAILED
- **THEN** table SHALL display red X icon with "Failed" label

#### Scenario: Transaction link to Basescan
- **WHEN** payment has txHash
- **THEN** table SHALL display link to https://sepolia.basescan.org/tx/{txHash} opening in new tab

#### Scenario: Filter controls above table
- **WHEN** user views payment history
- **THEN** UI SHALL display filter dropdowns for Status (All, Completed, Pending, Failed) and Severity (All, Critical, High, Medium, Low)
- **THEN** UI SHALL display date range picker for filtering by payment date

### Requirement: Frontend SHALL display earnings leaderboard
The frontend earnings leaderboard component SHALL render top researchers ranked by total earnings.

#### Scenario: Display top 10 researchers
- **WHEN** user views leaderboard
- **THEN** component SHALL fetch and display top 10 researchers from /api/v1/payments/leaderboard
- **THEN** each row SHALL display rank number, researcher address (truncated), total earnings, payment count

#### Scenario: Leaderboard includes refresh button
- **WHEN** user views leaderboard
- **THEN** UI SHALL display "Refresh" button to manually fetch latest data

#### Scenario: Highlight current user in leaderboard
- **WHEN** connected wallet address appears in leaderboard
- **THEN** row SHALL be highlighted with distinct background color

### Requirement: Frontend SHALL display bounty pool status
The frontend bounty pool status component SHALL visualize pool balance and recent transactions.

#### Scenario: Display pool balance as progress bar
- **WHEN** user views pool status for protocol
- **THEN** component SHALL display horizontal progress bar showing (totalPaid / totalDeposited * 100)%
- **THEN** progress bar SHALL have label "Pool Balance: {availableBalance} USDC / {totalDeposited} USDC"

#### Scenario: Display recent transactions list
- **WHEN** user views pool status
- **THEN** component SHALL display last 10 transactions with Type (Deposit/Payment), Amount, Date, Transaction Link

#### Scenario: Pool status includes deposit button
- **WHEN** protocol owner views their protocol's pool status
- **THEN** UI SHALL display "Deposit USDC" button
- **THEN** clicking button SHALL open USDC approval flow component

### Requirement: Frontend SHALL receive real-time WebSocket updates
The frontend SHALL subscribe to WebSocket events for real-time payment updates.

#### Scenario: Subscribe to protocol payment events
- **WHEN** user views payment dashboard for specific protocol
- **THEN** frontend SHALL join Socket.io room protocol:{protocolId}
- **THEN** frontend SHALL listen for payment:released and payment:failed events

#### Scenario: Update payment table on payment:released event
- **WHEN** payment:released event is received
- **THEN** frontend SHALL add new payment to top of payment history table
- **THEN** frontend SHALL update pool status balance (decrease by payment amount)

#### Scenario: Show notification on payment event
- **WHEN** payment:released event is received
- **THEN** frontend SHALL display toast notification "Payment of {amount} USDC sent to {researcher}"

#### Scenario: Update status indicator on payment:failed event
- **WHEN** payment:failed event is received
- **THEN** frontend SHALL update corresponding payment row status to "Failed" with red indicator

### Requirement: Payment APIs SHALL implement caching
The system SHALL cache frequently accessed payment data with Redis to reduce database load.

#### Scenario: Cache payment statistics for 60 seconds
- **WHEN** client requests GET /api/v1/payments/stats
- **THEN** system SHALL check Redis cache for key payment:stats:{protocolId}
- **THEN** IF cache hit, return cached data
- **THEN** IF cache miss, query database, store result in Redis with 60 second TTL, return data

#### Scenario: Cache leaderboard for 60 seconds
- **WHEN** client requests GET /api/v1/payments/leaderboard
- **THEN** system SHALL cache results in Redis with key payment:leaderboard:{limit}:{startDate} for 60 seconds

#### Scenario: Invalidate cache on payment completion
- **WHEN** payment worker updates Payment to status=COMPLETED
- **THEN** system SHALL delete Redis keys matching payment:stats:* and payment:leaderboard:*

### Requirement: Payment APIs SHALL implement rate limiting
The system SHALL rate limit payment API endpoints to prevent abuse.

#### Scenario: Rate limit payment list endpoint
- **WHEN** client makes more than 100 requests to /api/v1/payments within 1 minute from same IP
- **THEN** system SHALL return 429 Too Many Requests with Retry-After header

#### Scenario: Rate limit leaderboard endpoint
- **WHEN** client makes more than 20 requests to /api/v1/payments/leaderboard within 1 minute
- **THEN** system SHALL return 429 Too Many Requests

#### Scenario: Authenticated users have higher limits
- **WHEN** authenticated user makes requests to payment APIs
- **THEN** rate limit SHALL be 500 requests per minute (5x higher than unauthenticated)
