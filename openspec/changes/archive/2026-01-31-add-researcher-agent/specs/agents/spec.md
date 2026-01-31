## ADDED Requirements

### Requirement: Researcher agent lifecycle and job loop
The Researcher Agent SHALL run as a long-lived worker that pulls scan jobs from the queue, updates job state, and records execution metadata.

#### Scenario: Worker starts and claims a job
- **WHEN** the Researcher Agent process starts
- **THEN** it registers as online and claims the next queued scan job

### Requirement: Deterministic scan pipeline execution
The Researcher Agent SHALL execute the scan pipeline in the following order: clone repo, compile contracts, deploy fresh instance to local Anvil, run static analysis, generate encrypted proof, submit finding to Validator Agent.

#### Scenario: Successful scan pipeline
- **WHEN** a scan job is executed end-to-end without errors
- **THEN** the agent records each step completion and produces a proof submission

### Requirement: Proof submission contract
The Researcher Agent MUST submit findings to the Validator Agent via the Redis PubSub bus using the PROOF_SUBMISSION message type with a signed, encrypted payload and scan metadata.

#### Scenario: Proof submitted to validator
- **WHEN** a proof is generated
- **THEN** a PROOF_SUBMISSION message is published containing proof reference, scan id, protocol id, commit hash, and researcher identity

### Requirement: Error handling and retries
The Researcher Agent SHALL mark scan jobs as failed with a structured error code and MAY retry according to configured limits.

#### Scenario: Scan step fails
- **WHEN** a scan step fails (clone, compile, deploy, scan, proof)
- **THEN** the job state is set to failed with an error code and retry count is updated
