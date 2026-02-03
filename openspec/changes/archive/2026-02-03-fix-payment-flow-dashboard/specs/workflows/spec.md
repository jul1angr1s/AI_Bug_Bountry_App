## ADDED Requirements

### Requirement: Off-chain validation triggers protocol-scoped payment processing
The system SHALL support the off-chain ValidationService flow by creating a Payment record and queuing a payment job scoped to the validated protocol, using a deterministic validation identifier suitable for on-chain payment execution.

#### Scenario: Off-chain validation queues a payment job
- **WHEN** ValidationService marks a finding as VALIDATED
- **THEN** the system SHALL create a Payment record with status PENDING and the protocolId of the validated finding
- **THEN** the system SHALL enqueue a payment job with { paymentId, protocolId, validationId } where validationId is derived deterministically from the finding ID

### Requirement: Payments dashboard is protocol-scoped
The system SHALL present payment history only in the context of a specific protocol.

#### Scenario: User views protocol payment history
- **WHEN** the user navigates to `/protocols/:id/payments`
- **THEN** the system SHALL request payments with protocolId set to the protocol ID
- **THEN** the system SHALL reject payment list requests that omit protocolId
