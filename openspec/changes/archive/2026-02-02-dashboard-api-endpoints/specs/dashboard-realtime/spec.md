# Spec: Dashboard Realtime

## ADDED Requirements

### Requirement: Agent Task Update Events
The system SHALL emit WebSocket events when agent task progress changes.

#### Scenario: Agent task progress update
- **WHEN** agent reports task progress change
- **THEN** system emits agent:task_update event with agentId, task name, progress percentage, and estimated completion time

#### Scenario: Agent task completion
- **WHEN** agent completes current task
- **THEN** system emits agent:task_update event with progress 100 and transitions to next task

#### Scenario: Agent task failure
- **WHEN** agent task fails
- **THEN** system emits agent:task_update event with error details and resets progress to 0

### Requirement: Bounty Pool Update Events
The system SHALL emit WebSocket events when bounty pool balance changes.

#### Scenario: Bounty pool deposit
- **WHEN** protocol owner deposits funds to bounty pool
- **THEN** system emits bounty_pool:updated event with protocolId, updated totals, and change type DEPOSIT

#### Scenario: Bounty pool payment release
- **WHEN** bounty payment is released to researcher
- **THEN** system emits bounty_pool:updated event with protocolId, updated totals, payment amount, and change type PAYMENT_RELEASED

#### Scenario: Bounty pool reservation
- **WHEN** funds are reserved for pending validation
- **THEN** system emits bounty_pool:updated event with protocolId, updated totals, reserved amount, and change type RESERVATION

### Requirement: Vulnerability Status Change Events
The system SHALL emit WebSocket events when vulnerability status transitions.

#### Scenario: Vulnerability confirmed
- **WHEN** validator confirms vulnerability
- **THEN** system emits vuln:status_changed event with vulnerabilityId, protocolId, old status PENDING, new status CONFIRMED, severity, and timestamp

#### Scenario: Vulnerability paid
- **WHEN** payment is released for confirmed vulnerability
- **THEN** system emits vuln:status_changed event with vulnerabilityId, protocolId, old status CONFIRMED, new status PAID, payment amount, and timestamp

#### Scenario: Vulnerability rejected
- **WHEN** validator rejects vulnerability
- **THEN** system emits vuln:status_changed event with vulnerabilityId, protocolId, old status PENDING, new status REJECTED, rejection reason, and timestamp

### Requirement: WebSocket Room Management
The system SHALL organize WebSocket connections by protocol ID for targeted event delivery.

#### Scenario: User joins protocol room
- **WHEN** user connects to WebSocket with valid protocol ID
- **THEN** system adds connection to room `protocol:{protocolId}`

#### Scenario: Event broadcast to protocol room
- **WHEN** protocol-specific event occurs
- **THEN** system broadcasts event only to connections in that protocol's room

#### Scenario: User leaves protocol room
- **WHEN** user disconnects or switches protocols
- **THEN** system removes connection from previous room

### Requirement: Event Payload Format
The system SHALL use consistent JSON structure for all WebSocket events.

#### Scenario: Event with standard fields
- **WHEN** any WebSocket event is emitted
- **THEN** system includes eventType, timestamp, and data fields in payload

#### Scenario: Event with protocol context
- **WHEN** protocol-specific event is emitted
- **THEN** system includes protocolId field in payload

#### Scenario: Event serialization
- **WHEN** emitting WebSocket event
- **THEN** system serializes all dates to ISO 8601 format and numbers to strings for precision

### Requirement: Event Delivery Guarantees
The system SHALL handle WebSocket connection issues gracefully.

#### Scenario: Client disconnected during event
- **WHEN** event is emitted but client is disconnected
- **THEN** system logs event but does not retry delivery

#### Scenario: Client reconnects after missing events
- **WHEN** client reconnects after disconnection
- **THEN** system allows client to request latest state via REST API (no event replay)

#### Scenario: Event emission failure
- **WHEN** WebSocket server fails to emit event
- **THEN** system logs error with event details for debugging

### Requirement: Event Rate Limiting
The system SHALL prevent event flooding to clients.

#### Scenario: High-frequency task updates
- **WHEN** agent sends task updates more than once per second
- **THEN** system batches updates and emits at most one event per second

#### Scenario: Burst of vulnerability updates
- **WHEN** multiple vulnerabilities change status simultaneously
- **THEN** system emits individual events but throttles to max 10 events per second per room

#### Scenario: Event buffer overflow
- **WHEN** event emission queue exceeds 100 pending events
- **THEN** system drops oldest events and logs warning
