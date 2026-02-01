# Pull Request

## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

## PR Size Check

- [ ] This PR is under 1,500 lines (excluding tests)
- [ ] OR: This PR is part of a documented split strategy (see below)
- [ ] OR: This PR has been approved for size exception by: [@maintainer]

**PR Size**: Automatically labeled by GitHub Action

### Split Strategy (if applicable)

<!-- If this PR is part of a larger feature split, document it here -->

**Part X of Y PRs**:
- Link to related PRs: #XX, #XX
- Dependencies: This PR depends on: #XX (must merge first)
- Merge order: X

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing locally

### Test Coverage

<!-- Describe what you tested and how -->

## Database Changes

- [ ] No database changes
- [ ] Database migration included
- [ ] Migration is backward compatible (all new fields nullable)
- [ ] Migration is split by feature domain (not combined with unrelated changes)
- [ ] Migration rollback tested

## Breaking Changes

- [ ] No breaking changes
- [ ] Breaking changes documented below

<!-- If breaking changes, describe them and provide migration path -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No new warnings or errors
- [ ] Dependent changes merged and published

## Dependencies

- [ ] This PR depends on: (list PRs that must merge first)
- [ ] This PR conflicts with: (list PRs that should not merge simultaneously)
- [ ] This PR blocks: (list PRs waiting on this)

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional information reviewers should know -->

---

**Related**:
- Issue: #XXX
- OpenSpec Change: `openspec/changes/[change-name]`
- Documentation: [Link to relevant docs]
