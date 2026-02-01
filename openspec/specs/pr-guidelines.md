# Pull Request Size Guidelines

## Overview

Large PRs are difficult to review, increase risk of bugs, and slow down development velocity. This document establishes PR size limits and split strategies for the project.

## Hard Limits

### Size Limits
- **Maximum PR size**: 1,500 lines of code changes
- **Maximum PR size (with tests)**: 2,000 lines total
- **Maximum files changed**: 30 files

### Exceptions
- **Documentation-only PRs**: No limit
- **Auto-generated code**: No limit (e.g., Prisma migrations, package-lock.json)
- **Emergency hotfixes**: Discuss with team lead before creating PR

## When Your PR Exceeds Limits

If your PR exceeds the size limits, you MUST use one of these strategies:

### Strategy 1: Split by Layer

Break the PR into logical layers:

1. **Database Layer** - Schema changes and migrations
2. **Service Layer** - Business logic and services
3. **API Layer** - Routes, controllers, validation schemas
4. **UI Layer** - Frontend components and pages
5. **Test Layer** - Tests and test infrastructure

**Example:**
```
Original PR: "Add payment system" (12,000 lines)

Split into:
- PR 1: Database schema for payments (~400 lines)
- PR 2: Payment services and queue (~2,000 lines)
- PR 3: Payment API routes (~1,800 lines)
- PR 4: Payment dashboard UI (~1,500 lines)
```

### Strategy 2: Split by Feature

Break the PR into sub-features:

**Example:**
```
Original PR: "Payment automation" (8,000 lines)

Split into:
- PR 1: USDC approval flow (~1,200 lines)
- PR 2: Automatic payment trigger (~1,500 lines)
- PR 3: Payment reconciliation (~1,800 lines)
- PR 4: Payment dashboard (~1,500 lines)
```

### Strategy 3: Use Feature Flags

For large features that must be merged atomically:

1. Merge code in small PRs behind a feature flag (disabled)
2. Enable feature flag in final PR
3. Monitor gradual rollout (10% → 50% → 100%)

**Example:**
```typescript
// In code
if (process.env.FEATURE_PAYMENT_AUTOMATION === 'true') {
  // New payment automation code
} else {
  // Old manual payment code
}
```

## Planning Your PR Split

Before starting development on a large feature, create a split plan in your OpenSpec change proposal.

### Template

Add this section to your `openspec/changes/{change-name}/proposal.md`:

```markdown
## PR Strategy

**Estimated Total Size**: [X,XXX] lines

**Split Plan**:
- [ ] PR 1: [Name] - ~XXX lines
  - Files: [list key files]
  - Dependencies: None
  - Merge order: 1

- [ ] PR 2: [Name] - ~XXX lines
  - Files: [list key files]
  - Dependencies: PR 1
  - Merge order: 2

- [ ] PR 3: [Name] - ~XXX lines
  - Files: [list key files]
  - Dependencies: PR 2
  - Merge order: 3

**Migration Handling**:
- [ ] Database schema changes in separate PR
- [ ] Migrations are split by feature domain
- [ ] All fields nullable for backward compatibility
```

## Database Schema Changes

Database migrations require special handling:

### Rule: One Migration Per Feature Domain

❌ **BAD:**
```
migrations/20260201_combined_changes/migration.sql
- Payment tables
- AI analysis tables
- User authentication tables
```

✅ **GOOD:**
```
migrations/20260201120000_payment_schema/migration.sql
- Payment tables only

migrations/20260201120001_ai_analysis_schema/migration.sql
- AI analysis tables only

migrations/20260201120002_auth_schema/migration.sql
- Authentication tables only
```

### Benefits
- Features can merge independently
- Easier rollback (roll back one feature without affecting others)
- Clear ownership per feature domain
- Reduces merge conflicts

## Automated PR Size Checks

The project uses GitHub Actions to automatically flag large PRs:

### Labels Applied

- `size/XS` - <100 lines
- `size/S` - 100-500 lines
- `size/M` - 500-1,000 lines
- `size/L` - 1,000-1,500 lines
- `size/XL` - 1,500-2,000 lines
- `size/XXL` - >2,000 lines (⚠️ needs split review)

### What Happens

When you create a PR >1,500 lines:

1. **Automated comment** posted with split suggestions
2. **Label added**: `size/XXL` + `needs-split-review`
3. **Review required**: Team lead must approve before merge

## PR Size Best Practices

### DO ✅
- Plan your PR split strategy BEFORE coding
- Keep related changes together (don't split mid-feature)
- Include tests in the same PR as the code they test
- Document dependencies between split PRs
- Merge PRs in logical order (foundation first)

### DON'T ❌
- Mix unrelated features in one PR
- Split a PR after it's already written (hard to review delta)
- Create artificial splits that break functionality
- Merge PRs out of dependency order
- Skip planning for large features

## Code Review Process

### For Reviewers

**Small PRs (<500 lines)**:
- Expected review time: 15-30 minutes
- Can approve with detailed review

**Medium PRs (500-1,500 lines)**:
- Expected review time: 30-60 minutes
- May request commits be reviewed separately

**Large PRs (>1,500 lines)**:
- Should not be merged without split strategy discussion
- Request split unless exceptional circumstances

### For Authors

**Before submitting PR**:
- [ ] Run: `git diff main --stat` to check size
- [ ] If >1,500 lines, document split strategy in PR description
- [ ] Add "Part of X/Y" to PR title if part of split series
- [ ] Link related PRs in description

## Examples

### Example 1: Payment Automation Split

**Original**: PR #32 - 26,972 lines ❌

**Split Strategy**:
- PR #33: Database foundation - 400 lines ✅
- PR #34: Payment infrastructure - 2,000 lines ✅
- PR #35: Payment API - 1,800 lines ✅
- PR #36: Payment dashboard - 1,500 lines ✅

**Result**: 4 reviewable PRs, merged over 2 weeks vs. 1 unreviewable PR blocked for months.

### Example 2: AI Analysis Split

**Original**: Would have been ~14,000 lines ❌

**Split Strategy**:
- PR #37: AI core infrastructure - 1,800 lines ✅
- PR #38: AI worker integration - 2,000 lines ✅

**Result**: 2 reviewable PRs, clear separation of concerns.

## FAQ

**Q: What if my feature truly cannot be split?**
A: Very few features truly cannot be split. Discuss with the team to find a split strategy using feature flags.

**Q: Do tests count toward the line limit?**
A: Yes, but the limit is higher (2,000 lines with tests vs. 1,500 without).

**Q: What about auto-generated code?**
A: Auto-generated files (Prisma client, migrations, package-lock.json) are excluded from the count.

**Q: Can I merge a large PR if it's urgent?**
A: Emergency hotfixes can exceed limits with team lead approval, but document why it couldn't be split.

**Q: How do I handle dependencies between split PRs?**
A: Merge PRs in order (foundation first) and clearly document dependencies in each PR description.

## Summary

**Remember**: The goal is not to hit arbitrary limits, but to create **reviewable, testable, deployable** PRs that reduce risk and speed up development.

**Golden Rule**: If you're about to create a PR >1,500 lines, pause and create a split strategy first.

---

**Related Documentation**:
- [OpenSpec Change Process](../README.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Database Migration Strategy](../../backend/README.md#migration-strategy)
