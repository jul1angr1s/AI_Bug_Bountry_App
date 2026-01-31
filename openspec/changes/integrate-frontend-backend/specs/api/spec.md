## MODIFIED Requirements

### Requirement: Agent status endpoints require auth
Agent status endpoints SHALL require a valid Supabase JWT and return 401 on missing or invalid credentials.

#### Scenario: Unauthorized agent status request
- **WHEN** a request is made to `GET /api/v1/agents/:id/status` without a valid JWT
- **THEN** the backend responds with 401 and an error payload

### Requirement: Agent status response includes state and type
Agent status responses SHALL include agent identity, type, and state for UI consumption.

#### Scenario: Authorized agent status request
- **WHEN** an authenticated request is made to `GET /api/v1/agents/:id/status`
- **THEN** the response includes `id`, `type`, `status`, and any queue/task metadata

