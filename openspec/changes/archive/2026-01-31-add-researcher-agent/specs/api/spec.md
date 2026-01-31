## ADDED Requirements

### Requirement: Create scan job endpoint
The API MUST provide a POST /scans endpoint that accepts protocolId, optional branch or commit hash, and returns a scanId with initial state.

#### Scenario: Create a scan job
- **WHEN** an authenticated client submits a valid scan request
- **THEN** the API creates a scan job in queued state and returns its scanId

### Requirement: Scan status endpoint
The API SHALL provide GET /scans/:id to return scan state, current step, timestamps, and summary counts of findings.

#### Scenario: Fetch scan status
- **WHEN** a client requests scan status by id
- **THEN** the API returns the latest state and progress metadata

### Requirement: Scan progress stream
The API MUST provide a progress stream for scans via GET /scans/:id/progress and emit step updates in real time.

#### Scenario: Progress update is delivered
- **WHEN** the Researcher Agent advances a scan step
- **THEN** the progress stream emits a step update with timestamp and status

### Requirement: Findings retrieval for a scan
The API SHALL expose scan findings through existing vulnerability endpoints or a scan-specific endpoint, returning proof references and validation state.

#### Scenario: Retrieve scan findings
- **WHEN** a client requests findings for a scan
- **THEN** the API returns the findings list with proof references and validation status

### Requirement: Scan cancelation endpoint
The API MUST support DELETE /scans/:id to cancel a queued or running scan and return the updated state.

#### Scenario: Cancel a scan
- **WHEN** a client submits a cancel request for a running scan
- **THEN** the API marks the scan as canceled and returns the canceled state
