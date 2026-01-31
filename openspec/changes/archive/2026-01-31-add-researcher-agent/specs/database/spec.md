## ADDED Requirements

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
