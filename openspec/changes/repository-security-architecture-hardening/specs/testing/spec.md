## ADDED Requirements

### Requirement: Security and financial changes MUST follow TDD-first workflow
For authentication, authorization, CSRF, SSE, or payment logic changes, failing tests MUST be authored before implementation changes.

#### Scenario: Security behavior change is proposed
- **WHEN** a pull request modifies security-critical logic
- **THEN** evidence shows a pre-existing failing test was introduced before the production code fix

### Requirement: Regression coverage MUST map to capability scenarios
Each added or modified capability scenario in this change MUST map to at least one automated test case.

#### Scenario: Capability scenario is introduced
- **WHEN** a new requirement scenario appears in change specs
- **THEN** the change includes corresponding automated tests with traceable naming or references

### Requirement: Railway-targeted validation MUST be executed for impacted paths
Changes that affect deployment/runtime behavior MUST include Railway CLI verification steps as part of release readiness.

#### Scenario: Runtime-impacting merge candidate
- **WHEN** a change touches API startup, worker lifecycle, auth/session, or payment processing behavior
- **THEN** Railway validation evidence is captured before final merge
