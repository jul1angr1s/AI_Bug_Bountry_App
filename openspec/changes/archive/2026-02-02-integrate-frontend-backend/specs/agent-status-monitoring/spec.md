## ADDED Requirements

### Requirement: Authenticated agent status access
The frontend SHALL fetch agent status from the backend using authenticated requests.

#### Scenario: Fetch protocol agent status
- **WHEN** a signed-in user opens the agent status view
- **THEN** the client calls `GET /api/v1/agents/protocol-agent/status` with `Authorization: Bearer <jwt>`

### Requirement: Researcher agent status visibility
The frontend SHALL display the Researcher agent’s current status using backend-provided data.

#### Scenario: Researcher agent status rendered
- **WHEN** the backend returns the Researcher agent status (via a list endpoint or dedicated status endpoint)
- **THEN** the UI shows the agent state (e.g., ONLINE, SCANNING, ERROR) and any available task metadata

### Requirement: Optional realtime status updates
The frontend SHALL support realtime agent status updates when a WebSocket channel is available.

#### Scenario: Realtime status update received
- **WHEN** a WebSocket agent status event is received
- **THEN** the UI updates the agent status display without a full page refresh

