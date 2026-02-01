# Automatic Payment Trigger Specification

## ADDED Requirements

### Requirement: System SHALL listen for ValidationRecorded events
The system SHALL maintain a persistent event listener connected to the ValidationRegistry contract on Base Sepolia that processes ValidationRecorded events in real-time.

#### Scenario: Event listener starts on server boot
- **WHEN** backend server starts
- **THEN** ValidationRecorded event listener SHALL connect to ValidationRegistry contract via WebSocket provider and begin listening from the last processed block

#### Scenario: Event listener recovers from downtime
- **WHEN** event listener restarts after downtime
- **THEN** system SHALL query EventListenerState for last processed block and replay all ValidationRecorded events since that block

#### Scenario: Event listener tracks processed blocks
- **WHEN** ValidationRecorded event is processed successfully
- **THEN** system SHALL update EventListenerState with the event's block number

### Requirement: System SHALL create Payment records for CONFIRMED validations only
The system SHALL filter ValidationRecorded events by outcome status and create Payment database records only for validations with CONFIRMED status.

#### Scenario: CONFIRMED validation triggers payment creation
- **WHEN** ValidationRecorded event is emitted with outcome=CONFIRMED
- **THEN** system SHALL create Payment record with status=PENDING, researcherAddress from Finding, amount from severity tier, and queuedAt timestamp

#### Scenario: REJECTED validation does not trigger payment
- **WHEN** ValidationRecorded event is emitted with outcome=REJECTED
- **THEN** system SHALL NOT create Payment record and SHALL NOT queue payment job

#### Scenario: DISPUTED validation does not trigger payment
- **WHEN** ValidationRecorded event is emitted with outcome=DISPUTED
- **THEN** system SHALL NOT create Payment record and SHALL NOT queue payment job

### Requirement: System SHALL queue payment jobs via BullMQ
The system SHALL add payment processing jobs to the BullMQ payment-processing queue for each newly created Payment record.

#### Scenario: Payment record created triggers job queue
- **WHEN** Payment record is created with status=PENDING
- **THEN** system SHALL add job to payment-processing queue with paymentId, validationId, and protocolId as job data

#### Scenario: Job includes retry configuration
- **WHEN** payment job is added to queue
- **THEN** job SHALL have 3 retry attempts with exponential backoff (1s, 5s, 25s delays)

#### Scenario: Duplicate payment prevented by database check
- **WHEN** ValidationRecorded event is processed for validation that already has Payment record
- **THEN** system SHALL NOT create duplicate Payment record and SHALL log warning

### Requirement: Payment worker SHALL execute BountyPool.releaseBounty()
The payment worker SHALL process queued payment jobs by calling BountyPoolClient.releaseBounty() with validation details.

#### Scenario: Worker processes payment job successfully
- **WHEN** payment worker dequeues job with valid paymentId
- **THEN** worker SHALL fetch validation details, verify status=CONFIRMED, call BountyPool.releaseBounty() with protocolId, validationId, researcherAddress, and severity
- **THEN** worker SHALL update Payment record with status=COMPLETED, txHash, and paidAt timestamp

#### Scenario: Worker handles insufficient pool funds
- **WHEN** BountyPool.releaseBounty() reverts with "Insufficient pool balance" error
- **THEN** worker SHALL update Payment record with status=FAILED and failureReason="Insufficient pool balance"
- **THEN** worker SHALL emit WebSocket event payment:failed with error details
- **THEN** worker SHALL NOT retry the job

#### Scenario: Worker retries on network errors
- **WHEN** BountyPool.releaseBounty() fails with network error (timeout, connection refused)
- **THEN** worker SHALL increment Payment.retryCount
- **THEN** worker SHALL throw error to trigger BullMQ retry with exponential backoff

#### Scenario: Worker prevents duplicate payments
- **WHEN** payment worker dequeues job for Payment with status=COMPLETED
- **THEN** worker SHALL skip execution and mark job as completed without calling releaseBounty()

### Requirement: System SHALL emit WebSocket events for payment state changes
The system SHALL broadcast payment state changes to connected clients via Socket.io for real-time dashboard updates.

#### Scenario: Successful payment emits payment:released event
- **WHEN** payment worker successfully executes releaseBounty() and updates Payment to status=COMPLETED
- **THEN** system SHALL emit payment:released event to room protocol:{protocolId} with payment details (id, amount, txHash, researcherAddress, paidAt)

#### Scenario: Failed payment emits payment:failed event
- **WHEN** payment worker marks Payment as status=FAILED
- **THEN** system SHALL emit payment:failed event to room protocol:{protocolId} with error details (paymentId, failureReason, retryCount)

### Requirement: Payment worker SHALL validate researcher address
The payment worker SHALL verify the researcher address from the validation chain (Finding → Proof → Validation) before executing payment.

#### Scenario: Worker validates researcher address from Finding
- **WHEN** payment worker processes job
- **THEN** worker SHALL query Validation → Proof → Finding to extract submittedBy address
- **THEN** worker SHALL use submittedBy address as researcherAddress parameter for releaseBounty()

#### Scenario: Worker handles missing researcher address
- **WHEN** validation chain query fails to retrieve submittedBy address
- **THEN** worker SHALL mark Payment as FAILED with failureReason="Missing researcher address"
- **THEN** worker SHALL NOT retry the job

### Requirement: System SHALL log all payment attempts for audit trail
The system SHALL log payment processing events including job start, blockchain transaction submission, success, and failures.

#### Scenario: Payment job start logged
- **WHEN** payment worker dequeues job
- **THEN** system SHALL log payment attempt with paymentId, validationId, researcherAddress, and amount

#### Scenario: Transaction submission logged
- **WHEN** worker calls releaseBounty() and receives transaction hash
- **THEN** system SHALL log transaction submission with txHash, block number, and gas used

#### Scenario: Payment failure logged
- **WHEN** payment job fails (any retry attempt)
- **THEN** system SHALL log failure with paymentId, error message, retry count, and timestamp
