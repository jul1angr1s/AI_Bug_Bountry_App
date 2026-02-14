# Capability: validator-event-streaming

## Purpose

Real-time event streaming for the validator agent, providing step-by-step visibility into the validation process via Redis Pub/Sub, SSE endpoints, and frontend progress/terminal components. Mirrors the existing researcher agent scan progress architecture.

## Requirements

### Requirement: Backend emits validation progress events
The system SHALL emit `validation:progress` events to Redis Pub/Sub channel `validation:{proofId}:progress` at each validation stage, including `currentStep`, `state`, `progress` percentage, `message`, and `workerType` fields.

#### Scenario: LLM worker emits progress through 7 stages
- **WHEN** the LLM validator worker processes a proof submission
- **THEN** it SHALL emit progress events for stages DECRYPT_PROOF (0-10%), FETCH_DETAILS (10-20%), READ_CONTRACT (20-30%), LLM_ANALYSIS (30-60%), UPDATE_RESULT (60-80%), RECORD_ONCHAIN (80-95%), COMPLETE (95-100%) with `workerType: 'LLM'`

#### Scenario: Execution worker emits progress through 10 stages
- **WHEN** the execution validator worker processes a proof submission
- **THEN** it SHALL emit progress events for stages DECRYPT_PROOF (0-5%), FETCH_DETAILS (5-10%), CLONE_REPO (10-20%), COMPILE (20-30%), SPAWN_SANDBOX (30-40%), DEPLOY (40-55%), EXECUTE_EXPLOIT (55-75%), UPDATE_RESULT (75-85%), RECORD_ONCHAIN (85-95%), COMPLETE (95-100%) with `workerType: 'EXECUTION'`

#### Scenario: Final progress event on completion
- **WHEN** validation completes successfully
- **THEN** the system SHALL emit a progress event with `state: 'COMPLETED'` and `progress: 100`

#### Scenario: Error progress event on failure
- **WHEN** validation fails with an error
- **THEN** the system SHALL emit a progress event with `state: 'FAILED'` and include the error message

### Requirement: Backend emits validation log events
The system SHALL emit `validation:log` events to Redis Pub/Sub channel `validation:{proofId}:logs` with color-coded log levels (INFO, ANALYSIS, ALERT, WARN, DEFAULT) at each validation step.

#### Scenario: Log events include appropriate levels
- **WHEN** the validator processes each step
- **THEN** it SHALL emit DEFAULT-level logs for step initiation, INFO-level logs for step completion, ANALYSIS-level logs for LLM/exploit analysis, ALERT-level logs for confirmed vulnerabilities, and WARN-level logs for rejected vulnerabilities

#### Scenario: Detailed log messages provide context
- **WHEN** the LLM analysis step completes
- **THEN** the log SHALL include the verdict (VALID/INVALID), confidence percentage, and severity level

### Requirement: SSE endpoint streams validation progress
The system SHALL provide `GET /api/v1/validations/:id/progress` as a Server-Sent Events endpoint that streams real-time validation progress events, where `:id` is the proofId.

#### Scenario: Client connects to progress stream
- **WHEN** a client opens an SSE connection to `/api/v1/validations/{proofId}/progress`
- **THEN** the server SHALL send an initial state event and stream all subsequent progress events from the Redis channel

#### Scenario: Stream closes on terminal state
- **WHEN** a progress event with state COMPLETED or FAILED is received
- **THEN** the SSE stream SHALL close automatically

#### Scenario: Non-existent validation returns 404
- **WHEN** a client connects with an invalid proofId
- **THEN** the server SHALL respond with HTTP 404

#### Scenario: Authentication required
- **WHEN** an unauthenticated client connects
- **THEN** the server SHALL reject the connection using `sseAuthenticate` middleware

### Requirement: SSE endpoint streams validation logs
The system SHALL provide `GET /api/v1/validations/:id/logs` as a Server-Sent Events endpoint that streams real-time validation log events.

#### Scenario: Client connects to log stream
- **WHEN** a client opens an SSE connection to `/api/v1/validations/{proofId}/logs`
- **THEN** the server SHALL stream log events from the Redis `validation:{proofId}:logs` channel

#### Scenario: Log stream closes on validation completion
- **WHEN** validation reaches a terminal state
- **THEN** the log SSE stream SHALL close by also subscribing to the progress channel for completion detection

### Requirement: Frontend displays real-time validation progress timeline
The frontend SHALL render a `ValidationProgressTimeline` component showing the current stage with visual indicators: completed (green checkmark), active (spinning icon), failed (red X), pending (gray circle).

#### Scenario: LLM worker timeline shows 7 stages
- **WHEN** `workerType` is `'LLM'`
- **THEN** the timeline SHALL display: Decrypt Proof, Fetch Details, Read Contract, Kimi 2.5 Analysis, Update Result, Record On-Chain, Complete

#### Scenario: Execution worker timeline shows 10 stages
- **WHEN** `workerType` is `'EXECUTION'`
- **THEN** the timeline SHALL display: Decrypt Proof, Fetch Details, Clone Repository, Compile Contracts, Spawn Sandbox, Deploy Contract, Execute Exploit, Update Result, Record On-Chain, Complete

### Requirement: Frontend displays real-time terminal log output
The frontend SHALL reuse the existing `LiveTerminalOutput` component to display color-coded validation log messages in a terminal-style interface.

#### Scenario: Validation logs render with correct colors
- **WHEN** validation log events are received via SSE
- **THEN** the terminal SHALL render INFO in blue, ANALYSIS in green, ALERT in red, WARN in yellow, and DEFAULT in gray

### Requirement: Active validation panel embedded in Validations page
The existing `/validations` page SHALL display an `ActiveValidationPanel` at the top when a validation is actively running, showing the progress timeline and terminal output inline.

#### Scenario: Panel appears for active validation
- **WHEN** the validations list contains an entry with status PENDING or VALIDATING
- **THEN** an `ActiveValidationPanel` SHALL render above the validations list with real-time progress and logs

#### Scenario: Panel disappears when validation completes
- **WHEN** the active validation reaches state COMPLETED or FAILED
- **THEN** the `ActiveValidationPanel` SHALL reflect the terminal state and the validations list SHALL refresh

### Requirement: No generic emitAgentTaskUpdate in validator workers
Both validator workers SHALL use `emitValidationProgress` and `emitValidationLog` instead of the generic `emitAgentTaskUpdate` function.

#### Scenario: LLM worker uses validation-specific emitters
- **WHEN** the LLM worker processes a validation
- **THEN** it SHALL NOT call `emitAgentTaskUpdate` and SHALL only use `emitValidationProgress` and `emitValidationLog`

#### Scenario: Execution worker uses validation-specific emitters
- **WHEN** the execution worker processes a validation
- **THEN** it SHALL NOT call `emitAgentTaskUpdate` and SHALL only use `emitValidationProgress` and `emitValidationLog`

### Requirement: Validation detail modal shows finding details
The frontend SHALL display a `ValidationDetailModal` when clicking a validation card, showing full vulnerability description, file location, proof status, on-chain record, and remediation suggestions.

#### Scenario: Modal opens on card click
- **WHEN** a user clicks on a validation card in the validations list
- **THEN** a modal SHALL appear with detailed information fetched from `GET /api/v1/validations/:id/detail`

#### Scenario: Modal displays proof and on-chain info
- **WHEN** the validation detail modal is open
- **THEN** it SHALL display proof status, submission timestamp, validation timestamp, and on-chain transaction hash (with Basescan link) when available
