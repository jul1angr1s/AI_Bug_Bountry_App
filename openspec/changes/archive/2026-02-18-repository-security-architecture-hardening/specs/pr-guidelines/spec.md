## ADDED Requirements

### Requirement: High-risk changes MUST be implemented in isolated git worktrees
Security, architecture, and infrastructure-affecting changes MUST be developed in isolated git worktrees with explicit scope ownership.

#### Scenario: Multi-stream hardening effort begins
- **WHEN** implementation planning starts for a cross-cutting hardening change
- **THEN** separate worktrees are created for each stream and linked in the task plan

### Requirement: Parallel background execution MUST use explicit ownership boundaries
Parallel background agents or contributors MUST operate on scoped file sets with a designated integration owner.

#### Scenario: Parallel stream execution
- **WHEN** two or more streams run concurrently
- **THEN** each stream has an owner, bounded file scope, and integration handoff protocol

### Requirement: Merge sequencing MUST include integration and validation gates
Stream branches MUST merge through an integration branch/worktree with required test and deployment validation evidence.

#### Scenario: Stream branch is ready to merge
- **WHEN** stream-local tasks are complete
- **THEN** integration tests and required Railway validation gates pass before merge to main
