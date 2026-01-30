# Spec: Prisma Integration

## ADDED Requirements

### Requirement: Prisma client singleton
The system SHALL provide a single Prisma client instance for database access.

#### Scenario: Client initialization
- **WHEN** application starts
- **THEN** system creates Prisma client with connection pool configured

#### Scenario: Client reuse across modules
- **WHEN** multiple modules import Prisma client
- **THEN** system provides same client instance to prevent connection exhaustion

#### Scenario: Development hot reload
- **WHEN** running in development with hot reload
- **THEN** system prevents creating duplicate clients on module reload

### Requirement: Database schema definition
The system SHALL define Prisma schema for all application entities.

#### Scenario: Protocol model defined
- **WHEN** Prisma schema is generated
- **THEN** system includes Protocol model with id, name, contractAddress, githubUrl, status, bountyPool, ownerId, createdAt, updatedAt fields

#### Scenario: Vulnerability model defined
- **WHEN** Prisma schema is generated
- **THEN** system includes Vulnerability model with id, title, severity, status, protocolId, discoveredAt, bounty, proof fields

#### Scenario: Agent model defined
- **WHEN** Prisma schema is generated
- **THEN** system includes Agent model with id, type, status, currentTask, taskProgress, lastHeartbeat, uptime, scansCompleted fields

#### Scenario: Relations defined
- **WHEN** Prisma schema includes models
- **THEN** system defines Protocol hasMany Vulnerabilities, User hasMany Protocols, Protocol hasMany Scans relations

### Requirement: Database migrations
The system SHALL manage schema changes through Prisma migrations.

#### Scenario: Initial migration created
- **WHEN** prisma migrate dev is run for first time
- **THEN** system generates migration SQL creating all tables with indexes

#### Scenario: Migration applied to database
- **WHEN** migration is applied
- **THEN** system executes SQL and updates _prisma_migrations table

#### Scenario: Migration rolled back
- **WHEN** migration causes error
- **THEN** system rolls back transaction and database remains in previous state

### Requirement: Connection management
The system SHALL manage database connections efficiently.

#### Scenario: Connection pool sizing
- **WHEN** Prisma client connects to database
- **THEN** system uses connection pool with min 2 and max 10 connections

#### Scenario: Connection timeout
- **WHEN** database query exceeds 30 second timeout
- **THEN** system throws timeout error and releases connection

#### Scenario: Connection on disconnect
- **WHEN** application shuts down
- **THEN** system calls $disconnect() to close all connections gracefully

### Requirement: Query logging
The system SHALL log database queries in development.

#### Scenario: Query logged in development
- **WHEN** Prisma query executes in development environment
- **THEN** system logs query SQL and execution time to console

#### Scenario: Query not logged in production
- **WHEN** Prisma query executes in production environment
- **THEN** system skips query logging to reduce overhead

### Requirement: Type safety
The system SHALL provide TypeScript types for all database operations.

#### Scenario: Model types generated
- **WHEN** prisma generate is run
- **THEN** system generates TypeScript interfaces for all models

#### Scenario: Query type checking
- **WHEN** developer writes Prisma query with invalid field
- **THEN** TypeScript compiler shows error before runtime
