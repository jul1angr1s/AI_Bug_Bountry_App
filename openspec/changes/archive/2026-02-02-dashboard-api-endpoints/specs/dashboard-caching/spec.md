# Spec: Dashboard Caching

## ADDED Requirements

### Requirement: Redis Cache Layer
The system SHALL implement Redis caching for dashboard endpoints to reduce database load.

#### Scenario: Cache hit on protocol stats
- **WHEN** stats endpoint is called and valid cache exists
- **THEN** system returns cached data without database query and includes X-Cache: HIT header

#### Scenario: Cache miss on protocol stats
- **WHEN** stats endpoint is called and no cache exists
- **THEN** system queries database, caches result, and returns data with X-Cache: MISS header

#### Scenario: Cache expiration
- **WHEN** cached data exceeds TTL (time-to-live)
- **THEN** system treats as cache miss and refreshes from database

### Requirement: Cache Key Strategy
The system SHALL use consistent cache key patterns for dashboard data.

#### Scenario: Protocol stats cache key
- **WHEN** caching protocol statistics
- **THEN** system uses key pattern `dashboard:stats:{protocolId}`

#### Scenario: Agent status cache key
- **WHEN** caching agent status data
- **THEN** system uses key pattern `agent:status`

#### Scenario: Vulnerabilities cache key
- **WHEN** caching vulnerability list
- **THEN** system uses key pattern `protocol:vulnerabilities:{protocolId}:{page}:{limit}:{sort}`

### Requirement: Cache TTL Configuration
The system SHALL set appropriate TTL values based on data volatility.

#### Scenario: Stats data TTL
- **WHEN** caching dashboard statistics
- **THEN** system sets TTL to 30 seconds

#### Scenario: Agent status TTL
- **WHEN** caching agent status
- **THEN** system sets TTL to 10 seconds

#### Scenario: Vulnerabilities list TTL
- **WHEN** caching vulnerabilities
- **THEN** system sets TTL to 60 seconds

### Requirement: Cache Invalidation on WebSocket Events
The system SHALL invalidate relevant cache entries when WebSocket events are emitted.

#### Scenario: Invalidate on vulnerability discovered
- **WHEN** vuln:discovered WebSocket event is emitted
- **THEN** system purges dashboard:stats:{protocolId} and protocol:vulnerabilities:{protocolId}:* cache keys

#### Scenario: Invalidate on agent status change
- **WHEN** agent:status WebSocket event is emitted
- **THEN** system purges agent:status cache key

#### Scenario: Invalidate on bounty pool update
- **WHEN** bounty_pool:updated WebSocket event is emitted
- **THEN** system purges dashboard:stats:{protocolId} cache key

### Requirement: Cache Error Handling
The system SHALL gracefully handle Redis connection failures without blocking requests.

#### Scenario: Redis unavailable on read
- **WHEN** cache read fails due to Redis connection error
- **THEN** system logs error, treats as cache miss, and proceeds with database query

#### Scenario: Redis unavailable on write
- **WHEN** cache write fails due to Redis connection error
- **THEN** system logs error and returns data without caching

#### Scenario: Redis timeout
- **WHEN** Redis operation exceeds 100ms timeout
- **THEN** system aborts cache operation and falls back to database

### Requirement: Cache Monitoring
The system SHALL track cache performance metrics for monitoring.

#### Scenario: Cache hit rate tracking
- **WHEN** any cached endpoint is called
- **THEN** system increments cache hit or miss counter in metrics

#### Scenario: Cache size monitoring
- **WHEN** cache operations occur
- **THEN** system tracks total cached keys and memory usage

#### Scenario: Cache performance alerting
- **WHEN** cache hit rate drops below 50%
- **THEN** system logs warning for investigation
