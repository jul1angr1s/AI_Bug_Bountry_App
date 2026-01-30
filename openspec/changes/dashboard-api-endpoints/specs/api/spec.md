# Delta Spec: API (Dashboard Extensions)

## ADDED Requirements

### Requirement: Dashboard statistics endpoint with protocol filtering
The system SHALL provide GET endpoint at `/api/v1/stats` with optional protocolId query parameter for filtered statistics.

#### Scenario: Global stats retrieval
- **WHEN** user requests /api/v1/stats without protocolId parameter
- **THEN** system returns aggregated statistics across all protocols owned by user

#### Scenario: Protocol-specific stats retrieval
- **WHEN** user requests /api/v1/stats with protocolId query parameter
- **THEN** system returns statistics filtered to specified protocol only

#### Scenario: Stats response structure
- **WHEN** stats endpoint returns successfully
- **THEN** system includes bountyPool object with total/available/paid/currency fields, vulnerabilities object with counts by severity and status, payments object with total/count/lastPayment, and scans object with total/lastScan/avgDuration

### Requirement: Agent status endpoint with admin restriction
The system SHALL provide GET endpoint at `/api/v1/agents` restricted to admin users only.

#### Scenario: Admin retrieves all agent status
- **WHEN** admin user requests /api/v1/agents
- **THEN** system returns array of all agents with id, name, type, status, currentTask, taskProgress, lastHeartbeat, uptime, and scansCompleted fields

#### Scenario: Agent status with filtering
- **WHEN** user provides type query parameter (PROTOCOL, RESEARCHER, or VALIDATOR)
- **THEN** system returns only agents matching specified type

#### Scenario: Agent heartbeat freshness
- **WHEN** agent lastHeartbeat timestamp is older than 120 seconds
- **THEN** system automatically marks agent status as OFFLINE

### Requirement: Vulnerability list endpoint with pagination and sorting
The system SHALL enhance GET endpoint at `/api/v1/protocols/:id/vulnerabilities` with pagination, sorting, and filtering.

#### Scenario: Vulnerabilities with pagination
- **WHEN** user provides page and limit query parameters
- **THEN** system returns specified page with metadata including total count, current page, total pages, and hasNext/hasPrev flags

#### Scenario: Vulnerabilities sorted by severity
- **WHEN** user provides sort=severity query parameter
- **THEN** system returns vulnerabilities ordered by CRITICAL, HIGH, MEDIUM, LOW, INFO

#### Scenario: Vulnerabilities sorted by date
- **WHEN** user provides sort=date query parameter
- **THEN** system returns vulnerabilities ordered by discoveredAt timestamp descending

#### Scenario: Vulnerabilities filtered by severity
- **WHEN** user provides severity query parameter
- **THEN** system returns only vulnerabilities matching specified severity level

#### Scenario: Vulnerabilities filtered by status
- **WHEN** user provides status query parameter (CONFIRMED, PENDING, or RESOLVED)
- **THEN** system returns only vulnerabilities matching specified status

## MODIFIED Requirements

### Requirement: Rate limits for dashboard endpoints
The system SHALL apply specific rate limits for dashboard endpoints to accommodate auto-refresh behavior.

**Original:** Authenticated GET requests limited to 300 per minute across all endpoints.

**Modified:**
- Authenticated GET requests remain at 300 per minute for most endpoints
- `/api/v1/stats` endpoint: 60 requests per minute per user
- `/api/v1/agents` endpoint: 120 requests per minute (admin only, higher for real-time monitoring)
- `/api/v1/protocols/:id` endpoint: 60 requests per minute per user
- `/api/v1/protocols/:id/vulnerabilities` endpoint: 60 requests per minute per user

#### Scenario: Stats endpoint rate limit exceeded
- **WHEN** user exceeds 60 requests per minute to /api/v1/stats
- **THEN** system returns 429 Too Many Requests with Retry-After header

#### Scenario: Agent status rate limit for admins
- **WHEN** admin exceeds 120 requests per minute to /api/v1/agents
- **THEN** system returns 429 Too Many Requests with Retry-After header

#### Scenario: Rate limit headers included
- **WHEN** any dashboard endpoint responds
- **THEN** system includes X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers

### Requirement: WebSocket event types extended for dashboard
The system SHALL add new WebSocket event types for dashboard real-time updates.

**Original:** Event types include protocol, scan, vuln, payment, and agent events.

**Modified:** All original event types remain, plus new types:
- `agent:task_update` - Agent task progress changes
- `bounty_pool:updated` - Bounty pool balance changes
- `vuln:status_changed` - Vulnerability status transitions

#### Scenario: Agent task update event emission
- **WHEN** agent task progress changes
- **THEN** system emits agent:task_update event to agents room with agentId, task, progress, and estimatedCompletion

#### Scenario: Bounty pool update event emission
- **WHEN** bounty pool balance changes
- **THEN** system emits bounty_pool:updated event to protocol:{id} room with pool totals and change details

#### Scenario: Vulnerability status change event emission
- **WHEN** vulnerability status transitions
- **THEN** system emits vuln:status_changed event to protocol:{id} room with vulnerabilityId, old/new status, and timestamp

## ADDED Requirements (Continued)

### Requirement: Error codes for dashboard failures
The system SHALL define specific error codes for dashboard-related failures.

#### Scenario: Protocol not monitored error
- **WHEN** dashboard requests data for protocol with monitoring disabled
- **THEN** system returns 400 with error code PROTOCOL_NOT_MONITORED

#### Scenario: Agent unreachable error
- **WHEN** agent status check times out after 5 seconds
- **THEN** system returns 503 with error code AGENT_UNREACHABLE

#### Scenario: Stats unavailable error
- **WHEN** statistics calculation fails due to database error
- **THEN** system returns 503 with error code STATS_UNAVAILABLE

### Requirement: Cache control headers
The system SHALL include appropriate cache control headers for dashboard endpoints.

#### Scenario: Stats endpoint cache headers
- **WHEN** /api/v1/stats endpoint responds
- **THEN** system includes Cache-Control: private, max-age=30 header

#### Scenario: Agent status cache headers
- **WHEN** /api/v1/agents endpoint responds
- **THEN** system includes Cache-Control: private, max-age=10 header

#### Scenario: Vulnerabilities cache headers
- **WHEN** /api/v1/protocols/:id/vulnerabilities endpoint responds
- **THEN** system includes Cache-Control: private, max-age=60 header
