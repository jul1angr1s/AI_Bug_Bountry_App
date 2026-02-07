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

- [Code Quality Improvement](../changes/code-quality-improvement/) - Eliminate 152 `any` types, centralize error hierarchy, migrate TODOs to Issues, ESLint enforcement
