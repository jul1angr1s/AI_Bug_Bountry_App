## ADDED Requirements

### Requirement: Protocol Agent status visibility
The system MUST expose Protocol Agent status and current task details to the dashboard via REST and WebSocket events.

#### Scenario: Agent status retrieval
- **WHEN** an authenticated admin requests `/api/v1/agents`
- **THEN** the response includes Protocol Agent status, last heartbeat, and current task metadata

#### Scenario: Agent status broadcast
- **WHEN** the Protocol Agent transitions between states (IDLE, BUSY, ERROR)
- **THEN** the system emits a WebSocket event to the `agents` room with the updated status

### Requirement: Protocol Agent command handling
The system MUST allow authorized admins to issue control commands to the Protocol Agent via `/api/v1/agents/:id/command`.

#### Scenario: Pause command
- **WHEN** an admin submits a PAUSE command
- **THEN** the Protocol Agent acknowledges and stops accepting new registration jobs until resumed

#### Scenario: Resume command
- **WHEN** an admin submits a RESUME command
- **THEN** the Protocol Agent resumes processing queued registration jobs

### Requirement: Audit logging for protocol-agent actions
The system MUST record audit entries for protocol registration attempts, on-chain submissions, and funding events.

#### Scenario: Registration audit entry
- **WHEN** the Protocol Agent attempts on-chain registration
- **THEN** the system writes an audit log entry containing protocol ID, action type, and transaction hash

#### Scenario: Funding audit entry
- **WHEN** a funding transaction is submitted for a protocol
- **THEN** the system writes an audit log entry containing protocol ID, amount, and transaction hash
