# Payment Reconciliation Specification

## ADDED Requirements

### Requirement: System SHALL listen for BountyReleased events
The system SHALL maintain a persistent event listener connected to the BountyPool contract on Base Sepolia that processes BountyReleased events in real-time.

#### Scenario: Event listener starts on server boot
- **WHEN** backend server starts
- **THEN** BountyReleased event listener SHALL connect to BountyPool contract via WebSocket provider and begin listening from the last processed block

#### Scenario: Event listener recovers from downtime
- **WHEN** event listener restarts after downtime
- **THEN** system SHALL query EventListenerState for last processed block and replay all BountyReleased events since that block

#### Scenario: Event listener tracks processed blocks
- **WHEN** BountyReleased event is processed successfully
- **THEN** system SHALL update EventListenerState with the event's block number

### Requirement: System SHALL match BountyReleased events to Payment records
The system SHALL correlate on-chain BountyReleased events with database Payment records using validationId as the matching key.

#### Scenario: Matching Payment found and updated
- **WHEN** BountyReleased event is emitted with validationId that matches existing Payment record
- **THEN** system SHALL update Payment with status=COMPLETED, paidAt=event.timestamp, reconciled=true, reconciledAt=current timestamp

#### Scenario: Payment txHash verified
- **WHEN** matching Payment is found
- **THEN** system SHALL verify Payment.txHash matches BountyReleased event transaction hash
- **THEN** IF txHash matches, mark Payment as reconciled
- **THEN** IF txHash differs, create PaymentReconciliation record with status=DISCREPANCY

#### Scenario: Orphaned on-chain payment detected
- **WHEN** BountyReleased event is emitted with validationId that has NO matching Payment record in database
- **THEN** system SHALL create PaymentReconciliation record with status=ORPHANED, onChainBountyId=validationId, txHash, amount, discoveredAt=current timestamp

### Requirement: System SHALL run periodic reconciliation job
The system SHALL execute a periodic reconciliation process every 10 minutes to detect missed events and discrepancies.

#### Scenario: Reconciliation job scheduled
- **WHEN** backend server starts
- **THEN** system SHALL schedule BullMQ repeatable job for reconciliation with cron expression "*/10 * * * *" (every 10 minutes)

#### Scenario: Reconciliation queries recent events
- **WHEN** reconciliation job executes
- **THEN** system SHALL query BountyPool for BountyReleased events from the last 24 hours
- **THEN** system SHALL compare events against Payment records in database

#### Scenario: Reconciliation detects missing Payment
- **WHEN** reconciliation job finds BountyReleased event without corresponding Payment record
- **THEN** system SHALL create PaymentReconciliation record with status=MISSING_PAYMENT

#### Scenario: Reconciliation detects unconfirmed Payment
- **WHEN** reconciliation job finds Payment record with status=COMPLETED but no matching BountyReleased event
- **THEN** system SHALL create PaymentReconciliation record with status=UNCONFIRMED_PAYMENT

### Requirement: System SHALL detect amount mismatches
The system SHALL compare payment amounts from BountyReleased events against expected amounts calculated from severity tiers.

#### Scenario: Amount matches expected value
- **WHEN** BountyReleased event amount equals Payment.amount in database
- **THEN** system SHALL mark reconciliation as successful without creating discrepancy record

#### Scenario: Amount mismatch detected
- **WHEN** BountyReleased event amount differs from Payment.amount
- **THEN** system SHALL create PaymentReconciliation record with status=AMOUNT_MISMATCH
- **THEN** PaymentReconciliation SHALL include both onChainAmount and databaseAmount for comparison

### Requirement: System SHALL provide reconciliation report API
The system SHALL expose API endpoint to retrieve the latest reconciliation status and metrics.

#### Scenario: Fetch reconciliation summary
- **WHEN** admin requests GET /api/v1/reconciliation/report
- **THEN** system SHALL return JSON with total payments, reconciled count, pending count, discrepancy count, last reconciliation timestamp

#### Scenario: Reconciliation metrics include success rate
- **WHEN** admin requests reconciliation report
- **THEN** response SHALL include reconciliation success rate calculated as (reconciled / total * 100)

#### Scenario: Report includes time-based filtering
- **WHEN** admin requests GET /api/v1/reconciliation/report?since={timestamp}
- **THEN** system SHALL return metrics only for payments created after the specified timestamp

### Requirement: System SHALL provide discrepancy listing API
The system SHALL expose API endpoint to retrieve all unresolved payment discrepancies.

#### Scenario: Fetch all discrepancies
- **WHEN** admin requests GET /api/v1/reconciliation/discrepancies
- **THEN** system SHALL return array of PaymentReconciliation records with status != RESOLVED
- **THEN** each record SHALL include paymentId, onChainBountyId, txHash, amount, status, discoveredAt, notes

#### Scenario: Filter discrepancies by status
- **WHEN** admin requests GET /api/v1/reconciliation/discrepancies?status=ORPHANED
- **THEN** system SHALL return only discrepancies matching the specified status

#### Scenario: Discrepancies sorted by discovery time
- **WHEN** admin requests discrepancy list
- **THEN** results SHALL be sorted by discoveredAt DESC (newest first)

### Requirement: System SHALL support manual discrepancy resolution
The system SHALL provide API endpoint for administrators to manually resolve payment discrepancies.

#### Scenario: Resolve discrepancy with notes
- **WHEN** admin requests POST /api/v1/reconciliation/resolve/{discrepancyId} with body {notes: "Manual verification completed"}
- **THEN** system SHALL update PaymentReconciliation record with status=RESOLVED, resolvedAt=current timestamp, notes from request

#### Scenario: Unresolved discrepancy cannot be resolved again
- **WHEN** admin requests resolve for already resolved discrepancy
- **THEN** system SHALL return 409 Conflict with error "Discrepancy already resolved"

#### Scenario: Resolve requires authentication
- **WHEN** unauthenticated user requests discrepancy resolution
- **THEN** system SHALL return 401 Unauthorized

### Requirement: System SHALL auto-resolve simple discrepancies
The reconciliation service SHALL automatically resolve certain categories of discrepancies without manual intervention.

#### Scenario: Auto-resolve missing txHash
- **WHEN** Payment exists with status=COMPLETED but missing txHash
- **THEN** AND matching BountyReleased event found with validationId
- **THEN** system SHALL update Payment.txHash with value from event, mark reconciled=true, and NOT create PaymentReconciliation record

#### Scenario: Auto-resolve requires exact match
- **WHEN** attempting auto-resolution
- **THEN** system SHALL verify validationId, researcherAddress, and amount ALL match between database and event
- **THEN** IF any field differs, create PaymentReconciliation record instead of auto-resolving

### Requirement: System SHALL alert on critical discrepancies
The reconciliation service SHALL trigger alerts when discrepancies exceed defined thresholds.

#### Scenario: Alert on high discrepancy count
- **WHEN** reconciliation job completes
- **THEN** AND unresolved discrepancy count > 10
- **THEN** system SHALL log error-level alert "High payment discrepancy count: {count}"

#### Scenario: Alert on orphaned payments
- **WHEN** reconciliation detects orphaned on-chain payment
- **THEN** system SHALL log warning-level alert "Orphaned payment detected: validationId={id}, amount={amount}, txHash={hash}"

#### Scenario: Alert on amount mismatch
- **WHEN** amount mismatch detected
- **THEN** system SHALL log error-level alert "Payment amount mismatch: validationId={id}, expected={expected}, actual={actual}"

### Requirement: PaymentReconciliation records SHALL provide audit trail
The PaymentReconciliation model SHALL store complete history of all detected discrepancies for compliance and debugging.

#### Scenario: Reconciliation record includes all key data
- **WHEN** PaymentReconciliation record is created
- **THEN** record SHALL include paymentId (if matched), onChainBountyId, txHash, amount, status, discoveredAt, resolvedAt (nullable), notes (nullable)

#### Scenario: Reconciliation records never deleted
- **WHEN** discrepancy is resolved
- **THEN** PaymentReconciliation record SHALL remain in database with status=RESOLVED
- **THEN** system SHALL NOT delete resolved reconciliation records

#### Scenario: Reconciliation queryable by time range
- **WHEN** admin queries reconciliation records
- **THEN** system SHALL support filtering by discoveredAt and resolvedAt date ranges
