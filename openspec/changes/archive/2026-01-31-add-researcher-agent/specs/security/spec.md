## ADDED Requirements

### Requirement: Proof encryption and signing
All researcher proofs MUST be encrypted for the Validator Agent and MUST include a researcher signature over the plaintext payload.

#### Scenario: Proof is generated
- **WHEN** a researcher produces a proof
- **THEN** the proof is encrypted for the validator and includes a researcher signature

### Requirement: Access controls for scan data
The system SHALL restrict write access to scans, findings, and proofs to service-role credentials and SHALL allow protocol owners to read their protocol scan results.

#### Scenario: Unauthorized write attempt
- **WHEN** a non-service client attempts to write scan data
- **THEN** the request is denied

### Requirement: Audit logging for agent actions
The system MUST log agent actions for scan creation, step transitions, proof submissions, and cancellations.

#### Scenario: Proof submission logged
- **WHEN** a proof is submitted
- **THEN** an audit log entry is recorded with agent id, scan id, and timestamp

### Requirement: Safe handling of repository inputs
The Researcher Agent MUST sanitize repository inputs and constrain execution to prevent code execution outside the sandbox.

#### Scenario: Repository includes unsafe path
- **WHEN** a repository includes a path traversal or unsafe script
- **THEN** the agent rejects the input and records a security error
