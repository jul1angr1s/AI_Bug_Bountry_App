## ADDED Requirements

### Requirement: Scan scheduling and distribution
The system SHALL schedule vulnerability scans for active protocols and enqueue scan jobs for Researcher Agents based on priority and last scan time.

#### Scenario: Scheduler enqueues scans
- **WHEN** the scheduler runs on its interval
- **THEN** it enqueues scan jobs for all eligible protocols with priority values

### Requirement: Scan lifecycle states
Scan jobs MUST transition through explicit states: queued, running, succeeded, failed, canceled.

#### Scenario: Scan completes successfully
- **WHEN** a Researcher Agent finishes all scan steps
- **THEN** the job state transitions from running to succeeded

### Requirement: Proof submission handoff
The workflow SHALL require that a succeeded scan produces a proof submission to the Validator Agent and records the handoff status.

#### Scenario: Proof handoff recorded
- **WHEN** a proof is submitted to the Validator Agent
- **THEN** the scan record stores the proof reference and handoff timestamp

### Requirement: Scan cancellation
The system MUST allow cancellation of queued or running scans and SHALL notify the Researcher Agent to stop processing.

#### Scenario: User cancels a scan
- **WHEN** a cancellation request is accepted
- **THEN** the scan state becomes canceled and the agent stops processing the job
