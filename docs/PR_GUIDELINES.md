# PR Guidelines

## Scope

Use this checklist for security, architecture, and infra-affecting changes.

## 1. Worktree Isolation (Required)

- Use a dedicated branch and git worktree per stream.
- Keep stream ownership bounded by file scope.
- Do not mix unrelated stream edits in one worktree.

Example:

```bash
git worktree add ../stream-a feature/stream-a
git worktree add ../stream-b feature/stream-b
git worktree add ../stream-c feature/stream-c
```

## 2. Evidence Bundle (Required)

Attach evidence in the PR description:

1. Test/build output for changed areas.
2. `openspec` task updates with completed checkboxes.
3. Railway validation evidence for runtime-affecting changes:
   - `railway status`
   - relevant `railway logs`
   - endpoint smoke checks
4. Security checks confirming no debug instrumentation/secrets in commits.

## 3. Required Checks

For PRs to `main`, ensure these pass:

1. `Docs - Command Parity`
2. `Backend - Lint, Type-check, Test`
3. `Frontend - Lint, Type-check, Build`
4. `PR Size Check`

## 4. OpenSpec Traceability

For OpenSpec-driven work, every merged stream must keep spec/tasks synchronized with implementation.

Reference hardening change: `repository-security-architecture-hardening`.
