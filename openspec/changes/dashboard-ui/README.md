# Dashboard UI Change

## Overview

This OpenSpec change implements the primary dashboard interface for the Autonomous Bug Bounty Orchestrator.

## Change Contents

| File | Purpose |
|------|---------|
| `proposal.md` | High-level overview, problem statement, solution design |
| `tasks.md` | Detailed implementation tasks (21 tasks across 5 phases) |
| `delta-spec-api.md` | API extensions required for dashboard functionality |

## Quick Links

- **Design Reference**: [project/UI/Dashboard.png](../../../project/UI/Dashboard.png)
- **Related Specs**:
  - [openspec/specs/frontend.md](../../specs/frontend.md)
  - [openspec/specs/api.md](../../specs/api.md)
  - [openspec/specs/architecture.md](../../specs/architecture.md)

## Key Features

1. **Protocol Overview**: Real-time monitoring status and details
2. **Statistics Panel**: Bounty pool, vulnerabilities count, total paid
3. **Agent Status Grid**: Live status of Protocol/Researcher/Validator agents
4. **Vulnerabilities Table**: Sortable list of confirmed findings
5. **Critical Alerts**: Prominent notification banner for urgent issues

## Implementation Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| 1. Layout & Navigation | 2-3 days | Sidebar, routing, auth |
| 2. Dashboard Components | 3-4 days | Cards, tables, alerts |
| 3. Real-time Integration | 2-3 days | WebSocket, live updates |
| 4. Data & State | 2 days | TanStack Query, Zustand |
| 5. Polish & A11y | 1-2 days | Styling, keyboard nav, ARIA |

**Total Estimated Effort**: 10-14 days

## Dependencies

### NPM Packages
```bash
npm install @tanstack/react-query zustand sonner lucide-react recharts
```

### API Changes Required
- 4 new GET endpoints (see `delta-spec-api.md`)
- 3 new WebSocket events
- Rate limit adjustments

### Skills Applied
- `react-best-practices` (Vercel)
- `web-design-guidelines` (Vercel)
- `composition-patterns` (Vercel)
- `supabase-postgres-best-practices`

## Getting Started

### For Implementation
1. Read `proposal.md` for context and design decisions
2. Review `tasks.md` and start with Phase 1
3. Check `delta-spec-api.md` for backend requirements
4. Reference [project/UI/Dashboard.png](../../../project/UI/Dashboard.png) for visual accuracy

### For Code Review
1. Verify all tasks in `tasks.md` have corresponding PRs
2. Check acceptance criteria in `proposal.md`
3. Ensure API endpoints match `delta-spec-api.md`
4. Run accessibility audit (Lighthouse)

## Acceptance Criteria

- [ ] Dashboard loads protocol data within 2 seconds
- [ ] WebSocket auto-reconnects on disconnect
- [ ] Agent status updates within 1 second
- [ ] Table sorting works for severity and date
- [ ] Critical alerts are dismissable
- [ ] All components keyboard accessible (WCAG AA)
- [ ] Responsive on tablet and mobile (min-width: 768px)
- [ ] 90%+ Lighthouse accessibility score

## Security Considerations

1. **Authentication**: All views require Supabase auth
2. **RLS**: Protocol data filtered by owner wallet
3. **XSS**: Vulnerability descriptions sanitized
4. **Rate Limiting**: Dashboard respects API limits

## Testing Requirements

- Unit tests for all components (React Testing Library)
- Integration tests for dashboard page
- E2E tests with Playwright (login → view → interact)
- Visual regression tests (Chromatic/Percy)

## Related Changes

- (Future) Analytics Dashboard
- (Future) Admin Panel
- (Future) Multi-Protocol Comparison

## Questions or Issues?

- Open an issue with `[dashboard-ui]` prefix
- Reference this change in PR descriptions
- Tag @frontend-subagent for component questions

---

**Created**: 2026-01-28
**Status**: Proposal
**Owner**: Frontend Team
