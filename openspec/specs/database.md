# Database Specification

## Overview

PostgreSQL database hosted on Supabase with Prisma ORM. Supports Web3 wallet authentication and real-time subscriptions.

## Source Documentation
- **Primary**: [docs/DATABASE_SCHEMA.md](../../docs/DATABASE_SCHEMA.md)

## Provider Stack
- **Database**: Supabase PostgreSQL 15.x
- **ORM**: Prisma 5.x
- **Auth**: Supabase Auth (SIWE - Sign-In with Ethereum)
- **Realtime**: Supabase Realtime (WebSocket replacement option)

## Core Entities

### Protocol
```
- id: UUID
- authUserId: UUID (optional link to auth.users)
- ownerAddress: String (wallet)
- githubUrl: String (unique)
- branch: String
- contractPath: String
- contractName: String
- bountyTerms: JSON
- status: Enum (PENDING, ACTIVE, PAUSED, DEPRECATED)
- riskScore: Int
```

### Researcher
```
- id: UUID
- authUserId: UUID (optional)
- walletAddress: String (unique)
- reputation: Int (calculated)
- confirmedCritical/High/Medium/Low: Int
- falsePositives: Int
- totalEarnings: Decimal
```

### Vulnerability
```
- id: UUID
- protocolId: FK
- vulnerabilityHash: String (unique, deterministic fingerprint)
- severity: Enum (CRITICAL, HIGH, MEDIUM, LOW)
- status: Enum (OPEN, PENDING_VALIDATION, VALIDATED, PAID, DUPLICATE)
- validations: Relation[]
```

### Validation
```
- id: UUID
- proofHash: String (unique)
- vulnerabilityHash: String
- result: Enum (PENDING, TRUE, FALSE, DUPLICATE, ERROR)
```

## Row Level Security (RLS)
- Public read access for Protocol metadata
- Owner-only write access (ownerAddress = auth.uid())
- Agent write via Service Role key

## Reputation Formula
```typescript
reputation =
  (confirmed_criticals * 100) +
  (confirmed_highs * 50) +
  (confirmed_mediums * 20) +
  (confirmed_lows * 10) -
  (false_positives * 30)
```

## Connection Configuration
- Transaction Pool (port 6543) for Prisma
- Direct URL for migrations
- Realtime restricted to Vulnerability and Scan tables

## Requirements

### Requirement: Scan job persistence
The database MUST persist scan jobs with protocol reference, target commit or branch, state, current step, timestamps, and assigned agent identity.

#### Scenario: Scan job created
- **WHEN** a scan job is created
- **THEN** a scan record is stored with queued state and required metadata

### Requirement: Findings and proof records
The database SHALL persist scan findings and encrypted proof references linked to a scan and protocol.

#### Scenario: Proof stored
- **WHEN** a Researcher Agent generates a proof
- **THEN** the proof metadata and encrypted payload reference are stored and linked to the scan

### Requirement: Agent execution metadata
The database SHALL record agent execution metadata including worker id, runtime version, and error codes for failed scans.

#### Scenario: Scan fails
- **WHEN** a scan fails
- **THEN** the scan record includes the failure code and the agent execution metadata

### Requirement: Retention and cleanup
The system MUST define retention rules for scan logs and proofs, including cleanup of expired artifacts.

#### Scenario: Retention window expires
- **WHEN** a scan proof exceeds the retention window
- **THEN** the system marks it for cleanup and records the cleanup action
