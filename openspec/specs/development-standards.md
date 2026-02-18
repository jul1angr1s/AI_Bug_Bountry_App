# Development Standards & Quality Assurance

## Overview

High-quality code is enforced through automated checks at various stages of the development lifecycle, preventing bad code from entering the codebase.

## Git Hooks (Husky)

We use **Husky** to manage Git hooks, ensuring that all code meets quality standards before it is committed or pushed.

### Implemented Hooks

| Hook | Stage | Action | Commands |
| :--- | :--- | :--- | :--- |
| **pre-commit** | Before Commit | **Linting & Formatting** | `npm run lint`, `npm run format:check` |
| **commit-msg** | Commit Message | **Convention Check** | `npx --no -- commitlint --edit ${1}` |
| **pre-push** | Before Push | **Testing** | `npm run test:unit`, `forge test` |

> **Note**: Bypassing hooks (e.g., `git commit --no-verify`) is strictly prohibited for main branches.

## Code Quality Standards

### Linting & Formatting
- **JavaScript/TypeScript**:
    - **Lint**: ESLint with strict config (AirBnB or similar).
    - **Format**: Prettier.
- **Solidity**:
    - **Lint**: Solhint.
    - **Format**: Forge fmt / Prettier Plugin Solidity.

### Commit Messages
- Must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
- Format: `<type>[optional scope]: <description>`
- Examples:
    - `feat(protocol): add reentrancy check`
    - `fix(dashboard): resolve websocket reconnection issue`
    - `chore: update dependencies`

## Testing Requirements (Pre-Push)

Before pushing code to the remote repository, the following tests MUST pass locally:

1.  **Unit Tests**: All frontend and backend unit tests.
2.  **Smart Contract Tests**: All Foundry tests (`forge test`).
3.  **Build Check**: The application must build successfully (`npm run build`).

## CI/CD Parity

Local hooks are designed to mirror the CI pipeline. If a check fails locally via Husky, it WILL fail in CI. Fix issues locally to save time and CI resources.

## Change Specifications

- [Code Quality Improvement](../changes/archive/2026-02-06-code-quality-improvement/) - Eliminated 131 `any` types, centralized error hierarchy, migrated TODOs to Issues, ESLint enforcement

## Requirements

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
