## ADDED Requirements

### Requirement: Single-command local dev startup
The system SHALL provide a single command to start the full local stack for development.

#### Scenario: Run full stack in development
- **WHEN** a developer runs the documented command from the repository root
- **THEN** the frontend, backend, database, Redis, and any required agent processes start for local development

### Requirement: Service readiness visibility
The startup command SHALL expose basic readiness feedback for core services.

#### Scenario: Display readiness output
- **WHEN** the stack starts
- **THEN** the developer can see when the backend and database are ready (via logs or health checks)

### Requirement: Idempotent startup
The startup command SHALL be safe to run multiple times without requiring manual cleanup.

#### Scenario: Re-run startup
- **WHEN** the developer reruns the startup command
- **THEN** existing containers/processes are reused or restarted without manual teardown

