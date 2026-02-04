## ADDED Requirements (Payment workflow demo – 2026-02-04)

### Requirement: Finding-to-Vulnerability-to-Payment mapping
The system SHALL create a Vulnerability record from a validated Finding before creating a Payment, and SHALL associate the Payment with the Vulnerability (not the Finding).

#### Scenario: Validation triggers payment
- **WHEN** ValidationService marks a finding as VALIDATED and triggers payment
- **THEN** the system SHALL ensure a Vulnerability record exists for that finding (create with protocolId, vulnerabilityHash = keccak256(scanId:findingId), severity, bounty)
- **THEN** the system SHALL create a Payment record with vulnerabilityId set to that Vulnerability.id

### Requirement: On-chain protocol ID for BountyPool
The payment worker SHALL call BountyPool.releaseBounty() with the protocol’s on-chain bytes32 identifier, not the database UUID.

#### Scenario: Payment worker releases bounty
- **WHEN** the payment worker executes releaseBounty
- **THEN** it SHALL resolve the protocol’s onChainProtocolId from the Protocol record (or derive bytes32 from protocolId if not set)
- **THEN** it SHALL pass this on-chain protocol ID to BountyPool.releaseBounty()

### Requirement: Demo modes for payment
The system SHALL support demo configuration via environment variables without changing production contract behavior.

#### Scenario: Off-chain validation demo
- **WHEN** PAYMENT_OFFCHAIN_VALIDATION is true
- **THEN** the payment worker SHALL skip the on-chain ValidationRegistry check and proceed to release bounty (or skip on-chain payment if SKIP_ONCHAIN_PAYMENT is true)

#### Scenario: Skip on-chain payment demo
- **WHEN** SKIP_ONCHAIN_PAYMENT is true
- **THEN** the payment worker SHALL not call BountyPool.releaseBounty()
- **THEN** it SHALL mark the Payment as COMPLETED with a mock tx hash and emit WebSocket payment-released as in production

### Requirement: No debug instrumentation in production paths
Payment, validation, and agent code SHALL NOT send debug data to external ingest endpoints or log internal record payloads (e.g. payment IDs, validation IDs, protocol IDs) to debug-only sinks.
