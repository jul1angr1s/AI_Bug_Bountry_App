## ADDED Requirements

### Requirement: Documentation commands MUST match executable repository scripts
All commands documented in root README, contributing, and operations guides MUST correspond to existing scripts or executable command paths in the repository.

#### Scenario: Document references a test script
- **WHEN** documentation references a script name
- **THEN** that script exists and executes in the documented package context

### Requirement: Documentation examples MUST avoid misleading pseudo-implementation claims
Operational claims presented as implemented automation MUST be backed by executable configuration in repository tooling.

#### Scenario: Guide claims pre-push automation exists
- **WHEN** a standards or testing guide states an automated hook is in place
- **THEN** repository hook/tooling configuration exists and matches the claim

### Requirement: CI definitions MUST maintain parity with standards documentation
Quality gates described in standards docs MUST match active CI workflows and required checks.

#### Scenario: Standards document lists mandatory checks
- **WHEN** CI workflows are evaluated
- **THEN** equivalent checks exist or documentation is updated to reflect actual enforcement
