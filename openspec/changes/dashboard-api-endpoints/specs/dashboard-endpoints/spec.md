# Spec: Dashboard Endpoints

## ADDED Requirements

### Requirement: Protocol Overview Endpoint
The system SHALL provide a GET endpoint at `/api/v1/protocols/:id` that returns comprehensive protocol information for dashboard display.

#### Scenario: Successful protocol overview retrieval
- **WHEN** authenticated user requests protocol overview for a protocol they own
- **THEN** system returns protocol details including name, contract address, status, monitoring status, last scan timestamp, next scheduled scan, and owner information

#### Scenario: Protocol not found
- **WHEN** user requests protocol overview for non-existent protocol ID
- **THEN** system returns 404 error with message "Protocol not found"

#### Scenario: Unauthorized access
- **WHEN** user requests protocol overview for protocol they do not own
- **THEN** system returns 403 error with message "Access denied"

### Requirement: Dashboard Statistics Endpoint
The system SHALL provide a GET endpoint at `/api/v1/stats` that returns aggregated dashboard statistics.

#### Scenario: Successful stats retrieval
- **WHEN** authenticated user requests dashboard statistics
- **THEN** system returns bounty pool totals, vulnerability counts by severity, payment history, and scan metrics

#### Scenario: Stats calculation with no data
- **WHEN** user has no protocols or activity
- **THEN** system returns zero values for all statistics without error

#### Scenario: Stats filtering by protocol
- **WHEN** user provides optional protocolId query parameter
- **THEN** system returns statistics filtered to that specific protocol only

### Requirement: Agent Status Endpoint
The system SHALL provide a GET endpoint at `/api/v1/agents` that returns real-time status of all active agents.

#### Scenario: Successful agent status retrieval
- **WHEN** admin user requests agent status
- **THEN** system returns array of agents with ID, type, status, current task, task progress, last heartbeat, uptime, and scan counts

#### Scenario: Non-admin access denied
- **WHEN** non-admin user requests agent status
- **THEN** system returns 403 error with message "Admin access required"

#### Scenario: Agent heartbeat timeout
- **WHEN** agent has not sent heartbeat in >2 minutes
- **THEN** system marks agent status as OFFLINE in response

### Requirement: Protocol Vulnerabilities Endpoint
The system SHALL provide a GET endpoint at `/api/v1/protocols/:id/vulnerabilities` that returns vulnerability list for a protocol.

#### Scenario: Successful vulnerabilities retrieval
- **WHEN** authenticated user requests vulnerabilities for their protocol
- **THEN** system returns paginated list of vulnerabilities with ID, title, severity, status, discovered timestamp, and bounty amount

#### Scenario: Vulnerabilities sorting
- **WHEN** user provides sort query parameter (severity, date, or status)
- **THEN** system returns vulnerabilities sorted by specified field in descending order

#### Scenario: Vulnerabilities filtering by severity
- **WHEN** user provides severity query parameter
- **THEN** system returns only vulnerabilities matching that severity level

#### Scenario: Vulnerabilities pagination
- **WHEN** user provides page and limit query parameters
- **THEN** system returns specified page of results with total count metadata

### Requirement: Input Validation
The system SHALL validate all query parameters and path parameters using Zod schemas.

#### Scenario: Invalid protocol ID format
- **WHEN** user provides malformed protocol ID
- **THEN** system returns 400 error with validation details

#### Scenario: Invalid pagination parameters
- **WHEN** user provides negative page or limit values
- **THEN** system returns 400 error with message "Invalid pagination parameters"

#### Scenario: Invalid sort field
- **WHEN** user provides unsupported sort field
- **THEN** system returns 400 error listing valid sort options

### Requirement: Response Format
The system SHALL return all responses in JSON format with consistent error structure.

#### Scenario: Successful response format
- **WHEN** any endpoint succeeds
- **THEN** system returns 200 status with data object containing requested information

#### Scenario: Error response format
- **WHEN** any endpoint fails
- **THEN** system returns appropriate HTTP status with error object containing code, message, and optional details fields

### Requirement: Authentication
The system SHALL require valid Supabase JWT token for all dashboard endpoints.

#### Scenario: Missing authentication token
- **WHEN** request lacks Authorization header
- **THEN** system returns 401 error with message "Authentication required"

#### Scenario: Invalid or expired token
- **WHEN** request includes invalid or expired JWT
- **THEN** system returns 401 error with message "Invalid or expired token"

#### Scenario: Valid token with user context
- **WHEN** request includes valid JWT
- **THEN** system extracts user ID from token and applies to RLS policies
