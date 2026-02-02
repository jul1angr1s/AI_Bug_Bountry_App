# Delta Spec: Database (Prisma Schema Implementation)

## ADDED Requirements

### Requirement: Prisma schema file structure
The system SHALL define database schema in prisma/schema.prisma file.

#### Scenario: Schema file location
- **WHEN** Prisma CLI looks for schema
- **THEN** system uses backend/prisma/schema.prisma as source

#### Scenario: Generator configuration
- **WHEN** prisma generate is run
- **THEN** system generates Prisma Client to node_modules/@prisma/client

#### Scenario: Datasource configuration
- **WHEN** Prisma connects to database
- **THEN** system uses postgresql provider with DATABASE_URL from environment

### Requirement: Protocol model implementation
The system SHALL implement Protocol model matching specification.

#### Scenario: Protocol table created
- **WHEN** migration is applied
- **THEN** system creates protocols table with id, authUserId, ownerAddress, githubUrl, branch, contractPath, contractName, bountyTerms, status, riskScore, createdAt, updatedAt

#### Scenario: Protocol unique constraints
- **WHEN** Protocol model is defined
- **THEN** system enforces unique constraint on githubUrl field

#### Scenario: Protocol enums defined
- **WHEN** Protocol model references status
- **THEN** system defines ProtocolStatus enum with PENDING, ACTIVE, PAUSED, DEPRECATED values

### Requirement: Vulnerability model implementation
The system SHALL implement Vulnerability model matching specification.

#### Scenario: Vulnerability table created
- **WHEN** migration is applied
- **THEN** system creates vulnerabilities table with id, protocolId, vulnerabilityHash, severity, status, discoveredAt, bounty, proof fields

#### Scenario: Vulnerability foreign key
- **WHEN** Vulnerability references Protocol
- **THEN** system creates foreign key constraint with onDelete Cascade

#### Scenario: Severity enum defined
- **WHEN** Vulnerability model references severity
- **THEN** system defines Severity enum with CRITICAL, HIGH, MEDIUM, LOW, INFO values

### Requirement: Agent model implementation
The system SHALL implement Agent model for agent heartbeat tracking.

#### Scenario: Agent table created
- **WHEN** migration is applied
- **THEN** system creates agents table with id, type, status, currentTask, taskProgress, lastHeartbeat, uptime, scansCompleted

#### Scenario: Agent type enum
- **WHEN** Agent model references type
- **THEN** system defines AgentType enum with PROTOCOL, RESEARCHER, VALIDATOR values

#### Scenario: Agent status enum
- **WHEN** Agent model references status
- **THEN** system defines AgentStatus enum with ONLINE, OFFLINE, SCANNING, ERROR values

### Requirement: Scan model implementation
The system SHALL implement Scan model for vulnerability scan tracking.

#### Scenario: Scan table created
- **WHEN** migration is applied
- **THEN** system creates scans table with id, protocolId, agentId, status, startedAt, completedAt, vulnerabilitiesFound

#### Scenario: Scan relations
- **WHEN** Scan model is defined
- **THEN** system creates relations to Protocol and Agent models

### Requirement: Payment model implementation
The system SHALL implement Payment model for bounty tracking.

#### Scenario: Payment table created
- **WHEN** migration is applied
- **THEN** system creates payments table with id, vulnerabilityId, amount, currency, txHash, status, paidAt

#### Scenario: Payment status tracking
- **WHEN** Payment model references status
- **THEN** system defines PaymentStatus enum with PENDING, COMPLETED, FAILED values

### Requirement: Index definitions
The system SHALL define indexes for query performance.

#### Scenario: Protocol owner index
- **WHEN** Prisma schema includes protocols
- **THEN** system creates index on ownerAddress field

#### Scenario: Vulnerability protocol index
- **WHEN** Prisma schema includes vulnerabilities
- **THEN** system creates composite index on (protocolId, createdAt) for dashboard queries

#### Scenario: Agent heartbeat index
- **WHEN** Prisma schema includes agents
- **THEN** system creates index on lastHeartbeat for timeout detection

### Requirement: Timestamp fields
The system SHALL automatically manage created and updated timestamps.

#### Scenario: CreatedAt default
- **WHEN** new record is created
- **THEN** system sets createdAt to current timestamp

#### Scenario: UpdatedAt automatic update
- **WHEN** record is updated
- **THEN** system automatically updates updatedAt field

## MODIFIED Requirements

None - This is an implementation detail that extends the existing database specification without changing its requirements.
