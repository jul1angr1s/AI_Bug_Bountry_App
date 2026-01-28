# Proposal: UI Dashboard Implementation

## Overview

Implement the primary dashboard interface for the Autonomous Bug Bounty Orchestrator, providing real-time visibility into protocol security status, agent operations, and vulnerability findings.

## Problem Statement

Currently, the platform lacks a user interface for protocol owners and security researchers to:
- Monitor active protocols and their security status
- Track agent operations in real-time
- View discovered vulnerabilities and validation status
- Monitor bounty pools and payment history

## Proposed Solution

Build a React-based dashboard with the following key components:

### 1. Main Dashboard View
- **Protocol Overview Card**: Display active protocol details (name, contract address, monitoring status)
- **Statistics Panel**: Three metric cards showing:
  - Bounty Pool balance with visual progress indicator
  - Vulnerabilities Found count with severity breakdown
  - Total Paid amount with last payment timestamp
- **Critical Alert Banner**: Prominent notification system for high-severity findings
- **Agent Status Grid**: Real-time status cards for all three agent types
- **Vulnerabilities Table**: Paginated table of confirmed findings

### 2. Left Sidebar Navigation
- Thunder Security branding with version
- Navigation links: Dashboard, Protocols, Scans, Validations, Payments
- User profile section (Security Ops role + wallet address)

### 3. Real-time Features
- WebSocket integration for live agent status updates
- Auto-refreshing vulnerability list
- Real-time bounty pool balance updates
- Toast notifications for new findings

## Design System

Based on the provided UI mockup:
- **Theme**: Dark mode with navy background (#0A0E1A)
- **Primary Color**: Electric blue (#3B82F6)
- **Status Colors**:
  - CRITICAL: Red (#EF4444)
  - INFO: Blue (#3B82F6)
  - ONLINE: Green (#10B981)
- **Typography**: Sans-serif system font stack
- **Layout**: Fixed sidebar (200px), fluid content area

## Technical Specifications

### Components to Build

```
src/components/
├── Dashboard/
│   ├── DashboardLayout.tsx
│   ├── ProtocolOverview.tsx
│   ├── StatisticsPanel.tsx
│   ├── CriticalAlertBanner.tsx
│   ├── AgentStatusGrid.tsx
│   └── VulnerabilitiesTable.tsx
├── Sidebar/
│   ├── Sidebar.tsx
│   ├── NavLink.tsx
│   └── UserProfile.tsx
├── shared/
│   ├── StatCard.tsx
│   ├── StatusBadge.tsx
│   └── LoadingSpinner.tsx
```

### State Management

```typescript
interface DashboardState {
  selectedProtocol: Protocol | null;
  agents: AgentStatus[];
  vulnerabilities: Vulnerability[];
  stats: {
    bountyPool: string;
    vulnsFound: number;
    totalPaid: string;
  };
  alerts: Alert[];
}
```

### API Integration

**Required Endpoints** (see `openspec/specs/api.md`):
- `GET /api/v1/protocols/:id` - Fetch protocol details
- `GET /api/v1/protocols/:id/vulnerabilities` - List vulnerabilities
- `GET /api/v1/agents` - Agent status
- `GET /api/v1/stats` - Dashboard statistics

**WebSocket Events**:
- `protocol:updated` - Protocol status changes
- `vuln:discovered` - New vulnerability found
- `vuln:confirmed` - Validation completed
- `agent:status` - Agent state changes
- `payment:released` - Bounty paid

## Implementation Tasks

### Phase 1: Layout & Navigation (2-3 days)
1. Create base layout structure with sidebar and content area
2. Implement responsive sidebar navigation
3. Build routing structure for dashboard views
4. Integrate Supabase auth for user profile display

### Phase 2: Dashboard Components (3-4 days)
5. Build StatCard component with animation
6. Implement ProtocolOverview card
7. Create AgentStatusGrid with live status indicators
8. Build VulnerabilitiesTable with sorting/filtering
9. Implement CriticalAlertBanner with dismiss action

### Phase 3: Real-time Integration (2-3 days)
10. Set up WebSocket connection manager
11. Implement event handlers for live updates
12. Add optimistic UI updates with rollback
13. Build toast notification system

### Phase 4: Data Fetching & State (2 days)
14. Implement TanStack Query hooks for data fetching
15. Set up Zustand store for dashboard state
16. Add loading states and skeletons
17. Implement error boundaries

### Phase 5: Polish & Accessibility (1-2 days)
18. Apply Tailwind styling matching design system
19. Add keyboard navigation support
20. Implement ARIA labels and roles
21. Add responsive breakpoints for mobile

## Dependencies

### External Libraries
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `recharts` or `victory` - Chart library (for progress bars)
- `lucide-react` - Icon library
- `sonner` - Toast notifications

### Project Specs Referenced
- `openspec/specs/frontend.md` - React stack and patterns
- `openspec/specs/api.md` - API endpoints and WebSocket events
- `openspec/specs/database.md` - Data models
- `project/Architecture.md` - System components
- `project/Skills.md` - Vercel Agent Skills (react-best-practices, web-design-guidelines)

## Security Considerations

1. **Authentication**: All dashboard views require Supabase authentication
2. **RLS Policies**: Protocol data filtered by owner wallet address
3. **XSS Prevention**: Sanitize all vulnerability descriptions before rendering
4. **Rate Limiting**: Dashboard API calls respect rate limits (see api.md)
5. **Sensitive Data**: Never display full private keys or proof contents

## Acceptance Criteria

- [ ] Dashboard loads protocol data within 2 seconds
- [ ] WebSocket connection auto-reconnects on disconnect
- [ ] Agent status updates appear within 1 second of event
- [ ] Vulnerabilities table supports sorting by severity and date
- [ ] Critical alerts are dismissable and persist state
- [ ] All components are keyboard accessible (WCAG AA)
- [ ] Dashboard is responsive on tablet and mobile (min-width: 768px)
- [ ] Loading states shown for all async operations
- [ ] Error states provide actionable feedback

## Non-Goals

- Admin panel for system configuration (separate feature)
- Multi-protocol comparison view (future enhancement)
- Historical analytics charts (separate analytics feature)
- Custom dashboard layout configuration (v2 feature)

## Open Questions

1. Should we implement protocol switching in the header, or require navigation to Protocols page?
2. Do we need real-time agent logs visible in the dashboard, or just status?
3. Should the vulnerabilities table paginate server-side or client-side?

## Estimated Effort

**Total: 10-14 days** (single developer)

## Success Metrics

- Dashboard page load time < 2s
- WebSocket event latency < 500ms
- Zero XSS vulnerabilities in security audit
- 90%+ Lighthouse accessibility score
