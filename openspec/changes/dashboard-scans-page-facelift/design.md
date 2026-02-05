## Context

The current `/scans` page exists at `frontend/src/pages/Scans.tsx` with a functional but basic UI using `ScanCard` components in a grid layout. The page successfully implements filtering by protocol and status, real-time updates via WebSocket, and navigation to detailed scan views at `/scans/:id` via `ScanDetail.tsx`.

However, the visual design lacks the modern, polished aesthetic shown in the reference design. The current implementation uses:
- Simple card-based grid layout with minimal visual hierarchy
- Basic progress indicators without detailed step-by-step visualization
- No live terminal output display
- No vulnerability detection charts
- Limited real-time visual feedback

The reference design showcases a sophisticated dashboard with:
- Left sidebar: Vertical timeline showing 7 scan stages with completion states
- Center/right area: Live terminal output, vulnerability detection chart, real-time findings cards
- Modern dark theme with custom color palette and typography
- Rich visual feedback with progress percentages, time estimates, and status badges

**Technical Constraints:**
- Must reuse existing backend endpoints (`/api/v1/scans/*`)
- Must maintain existing WebSocket/SSE real-time update patterns
- Must preserve routing structure (`/scans` and `/scans/:id`)
- Must work with existing data structures (`Scan`, `Finding`, `ScanProgressEvent`)
- Must follow TailwindCSS + Shadcn UI component patterns
- Must maintain TypeScript strict mode compliance

**Stakeholders:**
- Frontend developers maintaining the scan visualization
- Users monitoring active scans and reviewing findings
- Contributors evaluating the platform's capabilities

## Goals / Non-Goals

### Goals

1. **Modernize the `/scans` page visual design** to match the reference aesthetic while maintaining all existing functionality
2. **Create a dedicated live scan view** at `/scans/:id` that replaces the current detail page with the modern dashboard layout
3. **Implement reusable UI components** for scan progress timeline, live terminal output, vulnerability charts, and findings display
4. **Preserve existing data flow** by reusing `useScanProgressLive`, `useScans`, and WebSocket connections
5. **Maintain responsive design** for mobile, tablet, and desktop breakpoints
6. **Ensure comprehensive testing** with unit tests, integration tests, and visual regression tests
7. **Follow GitOps best practices** with feature branch, PR review, and clean commit history

### Non-Goals

1. **No new backend endpoints** - we will work with existing API structure
2. **No changes to WebSocket event format** - use existing `scan:progress` events
3. **No modifications to database schema** - use existing `Scan` and `Finding` models
4. **No changes to authentication/authorization** - maintain existing `ProtectedRoute` wrapper
5. **Not redesigning the list view** (`/scans`) in this phase - focus is on the live detail view
6. **Not implementing real-time log streaming from backend** - we'll use mock/sample log data for terminal display until backend supports it

## Decisions

### Decision 1: Page Structure - Replace ScanDetail with ModernScanDashboard

**Choice:** Create a new page component `ScanDashboardModern.tsx` that replaces the current tabbed `ScanDetail.tsx` for live scans (state=RUNNING), while keeping `ScanDetail.tsx` for completed/failed scans.

**Rationale:**
- The reference design is optimized for **active, running scans** with live progress tracking
- Completed scans need different UI (findings review, summary stats) vs. live monitoring
- Conditional rendering based on scan state allows best-of-both-worlds UX
- Avoids breaking existing functionality for historical scan review

**Alternatives Considered:**
- **Alternative A:** Replace `ScanDetail.tsx` entirely → Rejected: Would lose purpose-built UI for completed scan analysis
- **Alternative B:** Add tabs to `ScanDetail.tsx` (Overview/Live/Findings) → Rejected: Adds unnecessary navigation complexity for running scans

**Implementation:**
```typescript
// In App.tsx routing
<Route path="/scans/:id" element={
  <ProtectedRoute>
    <DashboardLayout>
      <ScanDetailRouter /> {/* New router component */}
    </DashboardLayout>
  </ProtectedRoute>
} />

// ScanDetailRouter.tsx
const ScanDetailRouter = () => {
  const { id } = useParams();
  const { data: scan } = useScan(id);

  if (scan?.state === 'RUNNING') {
    return <ScanDashboardModern scanId={id} />;
  }
  return <ScanDetail scanId={id} />;
};
```

---

### Decision 2: Component Architecture - Composition over Monolith

**Choice:** Build the modern dashboard using composable, single-responsibility components:
- `ScanProgressTimeline` - 7-step vertical timeline
- `LiveTerminalOutput` - Terminal-style log display
- `VulnerabilityChart` - SVG line chart for detection rate
- `FindingsList` - Real-time findings cards
- `ScanDashboardHeader` - Page heading with scan metadata and controls

**Rationale:**
- Aligns with existing component patterns (`ScanCard`, `ScanProgress`, `FindingsList`)
- Enables independent testing and reusability
- Follows React composition best practices
- Simplifies maintenance and future modifications

**Alternatives Considered:**
- **Alternative A:** Single monolithic `ScanDashboardModern` component → Rejected: 500+ lines, hard to test, violates SRP
- **Alternative B:** Use Shadcn UI Card component for everything → Rejected: Reference design has custom layouts that don't fit generic card pattern

---

### Decision 3: Real-time Data Flow - Leverage Existing Hooks

**Choice:** Reuse `useScanProgressLive` for progress updates, `useScan` for metadata, and `useScanFindings` for findings list. No new WebSocket subscriptions.

**Rationale:**
- `useScanProgressLive` already provides WebSocket connection with `scan:progress` events
- Existing hooks have error handling, reconnection logic, and cleanup
- Avoids duplicate WebSocket connections (performance, resource usage)
- Maintains consistency with existing real-time patterns

**Data Flow:**
```
WebSocket (scan:progress) → useScanProgressLive → ScanProgressTimeline
                                                 ↓
                                      LiveTerminalOutput (if message includes logs)

REST API → useScan → ScanDashboardHeader (metadata, controls)
REST API → useScanFindings → FindingsList (real-time findings)
```

**Alternatives Considered:**
- **Alternative A:** Create new `useScanLiveDashboard` hook → Rejected: Duplicates existing logic unnecessarily
- **Alternative B:** Use Supabase Realtime → Rejected: Backend uses WebSocket/SSE, not Supabase Realtime subscriptions

---

### Decision 4: Terminal Output Data Source - Mock Until Backend Ready

**Choice:** Implement `LiveTerminalOutput` component with:
1. Mock log data (hardcoded sample logs matching reference design)
2. Prop interface accepting `logs: Array<{ level, message, timestamp }>`
3. Comment indicating future integration with backend log streaming

**Rationale:**
- Backend doesn't currently expose real-time log streaming endpoint
- UI component can be built, tested, and demoed independently
- Future integration requires only updating data source, not component logic
- Unblocks frontend development

**Future Integration Path:**
```typescript
// Current (Phase 1)
<LiveTerminalOutput logs={MOCK_LOGS} />

// Future (Phase 2 - when backend adds /scans/:id/logs SSE endpoint)
const { logs } = useScanLogs(scanId); // New hook
<LiveTerminalOutput logs={logs} />
```

**Alternatives Considered:**
- **Alternative A:** Wait for backend log streaming → Rejected: Blocks frontend progress unnecessarily
- **Alternative B:** Parse `message` field from `ScanProgressEvent` → Rejected: Single message per step is insufficient for terminal output UI

---

### Decision 5: Vulnerability Chart Data - Derive from Findings API

**Choice:** Build time-series data for vulnerability chart by:
1. Fetching findings via `useScanFindings`
2. Grouping findings by `createdAt` timestamp (bucket into 5-minute intervals)
3. Calculate cumulative count over time
4. Render as SVG path using D3-like approach or hand-coded SVG

**Rationale:**
- Backend already provides `findings` array with `createdAt` timestamps
- Client-side aggregation avoids new backend endpoint
- Cumulative count over time gives "detection rate" visualization
- SVG approach matches reference design and avoids heavy charting library

**Data Transformation:**
```typescript
const buildChartData = (findings: Finding[]) => {
  // Sort by createdAt
  const sorted = findings.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Bucket into 5-min intervals
  const buckets = groupByInterval(sorted, 5 * 60 * 1000);

  // Calculate cumulative counts
  let cumulative = 0;
  return buckets.map(bucket => {
    cumulative += bucket.count;
    return { timestamp: bucket.timestamp, count: cumulative };
  });
};
```

**Alternatives Considered:**
- **Alternative A:** Add `/scans/:id/metrics` endpoint → Rejected: Violates "no new backend" constraint
- **Alternative B:** Use Recharts library → Rejected: Adds 100KB+ dependency for single chart; reference design uses simple SVG

---

### Decision 6: Styling Approach - Extend Tailwind Config

**Choice:** Extend `tailwind.config.js` with custom colors and fonts matching reference design:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0663f9',
        'background-dark': '#0f1723',
        'surface-dark': '#1a2432',
        'surface-border': '#21314a',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Noto Sans', 'sans-serif'],
      },
    },
  },
};
```

**Rationale:**
- Maintains consistency with existing Tailwind-based styling
- Semantic color names improve maintainability
- Custom fonts via Google Fonts (or npm packages for production)
- No CSS-in-JS or styled-components needed

**Alternatives Considered:**
- **Alternative A:** Inline Tailwind classes only → Rejected: Repeated color codes (#0663f9) hurt maintainability
- **Alternative B:** CSS modules → Rejected: Breaks pattern established in existing components

---

### Decision 7: Icon System - Material Symbols Outlined

**Choice:** Use Material Symbols Outlined icon font (matching reference design) via:
1. Google Fonts CDN for development: `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined..." />`
2. Render via `<span className="material-symbols-outlined">icon_name</span>`

**Rationale:**
- Reference design explicitly uses Material Symbols Outlined
- Zero bundle size impact (CDN-hosted)
- Simple integration (no React wrapper component needed)
- Consistent with reference design aesthetic

**Production Consideration:**
```typescript
// Future optimization: Install @mui/material-icons or similar npm package
// to avoid CDN dependency and improve offline support
```

**Alternatives Considered:**
- **Alternative A:** Lucide React (existing project icon library) → Rejected: Visual mismatch with reference design
- **Alternative B:** React Icons → Rejected: Adds bundle size, requires component mapping

---

### Decision 8: Testing Strategy - Comprehensive Multi-Layer Approach

**Choice:** Implement testing at four levels:
1. **Unit Tests** (Vitest + React Testing Library): Each component in isolation with mocked data
2. **Integration Tests**: `ScanDashboardModern` with real hooks and MSW-mocked APIs
3. **Visual Regression Tests** (Storybook + Chromatic): Capture screenshots at mobile/tablet/desktop breakpoints
4. **E2E Tests** (Playwright): Full scan lifecycle from list → detail → progress → completion

**Rationale:**
- Multi-layer testing catches different bug types
- Unit tests enable fast TDD workflow
- Integration tests verify data flow and hook interactions
- Visual regression prevents unintended UI changes
- E2E tests validate real user workflows

**Test Coverage Targets:**
- Components: 80%+ statement coverage
- Hooks: 90%+ coverage (critical for real-time logic)
- E2E: Happy path + error scenarios

**Alternatives Considered:**
- **Alternative A:** Unit tests only → Rejected: Misses integration issues (WebSocket event handling)
- **Alternative B:** E2E tests only → Rejected: Slow feedback loop, doesn't catch component-level bugs

---

### Decision 9: Git Workflow - Feature Branch with PR Review

**Choice:** Follow GitOps best practices:
1. Create feature branch: `feature/scans-dashboard-facelift`
2. Implement in atomic commits (one logical change per commit)
3. Open PR to `main` with:
   - Screenshots/GIF of new UI
   - Test coverage report
   - Migration notes (if any)
4. Require review from 1+ frontend maintainer
5. Merge via squash commit (clean history)

**Rationale:**
- Follows project's established PR guidelines (see `openspec/specs/pr-guidelines.md`)
- Atomic commits enable easy revert if needed
- PR review ensures code quality and knowledge sharing
- Squash merge keeps main branch history clean

**Commit Structure Example:**
```
feat(scans): add ScanProgressTimeline component
feat(scans): add LiveTerminalOutput component
feat(scans): add VulnerabilityChart component
feat(scans): add FindingsList modern variant
feat(scans): create ScanDashboardModern page
feat(scans): add routing logic for modern dashboard
test(scans): add unit tests for new components
test(scans): add E2E tests for live scan workflow
docs(scans): update frontend README with new components
```

**Alternatives Considered:**
- **Alternative A:** Direct commits to main → Rejected: No review, risky for large UI change
- **Alternative B:** Long-lived feature branch with weekly syncs → Rejected: Merge conflicts, delays feedback

## Risks / Trade-offs

### Risk 1: Terminal Output Data Unavailability
**Risk:** Backend doesn't provide real-time log streaming, so `LiveTerminalOutput` uses mock data.

**Mitigation:**
- Component interface designed for easy integration (accepts `logs` prop)
- Mock data matches expected backend format
- Comment in code indicates future enhancement
- Component fully functional and testable with mock data

**Trade-off:** Users see simulated terminal output until backend implements log streaming. This is acceptable for Phase 1 as it demonstrates the UI pattern without blocking frontend development.

---

### Risk 2: Performance with Large Findings Lists
**Risk:** Scans with 100+ findings could cause performance issues in `FindingsList` re-renders.

**Mitigation:**
- Implement virtualization using `react-window` or `@tanstack/react-virtual` if findings exceed 50 items
- Paginate findings API response (backend already supports this)
- Use `React.memo` on `FindingCard` to prevent unnecessary re-renders
- Throttle WebSocket updates to max 1 update per second

**Trade-off:** Initial implementation without virtualization is simpler and sufficient for typical scans (<50 findings). Add virtualization in Phase 2 if performance issues emerge.

---

### Risk 3: WebSocket Connection Stability
**Risk:** WebSocket disconnections could cause missed progress updates or stale UI state.

**Mitigation:**
- `useScanProgressLive` already implements auto-reconnect with exponential backoff
- SSE fallback available via `useSSE` flag
- Display connection status indicator in UI (green dot = connected, red = disconnected)
- On reconnection, fetch latest scan state via REST API to sync

**Trade-off:** Brief UI staleness during reconnection window (3-15 seconds). Acceptable for non-critical monitoring dashboard.

---

### Risk 4: Chart Data Accuracy with Client-Side Aggregation
**Risk:** Deriving chart data from findings timestamps may not reflect true "detection rate" if findings are batch-created.

**Mitigation:**
- Document assumptions in code comments
- Consider adding `detectedAt` timestamp field to `Finding` schema in Phase 2
- Validate chart accuracy during testing with real scan data
- Fallback: Display findings count trend instead of rate if timestamps unreliable

**Trade-off:** Chart may show step function (batch jumps) instead of smooth curve. Acceptable for initial implementation as it still conveys trend.

---

### Risk 5: Responsive Design Complexity
**Risk:** Reference design is optimized for desktop; mobile/tablet layouts may require significant rework.

**Mitigation:**
- Mobile-first CSS approach with Tailwind responsive utilities (`md:`, `lg:`)
- Collapse timeline to horizontal stepper on mobile
- Stack terminal and chart vertically on small screens
- Test on real devices, not just browser DevTools
- Use Storybook to validate all breakpoints

**Trade-off:** Mobile experience may be less rich than desktop (smaller charts, abbreviated terminal output). Acceptable as primary use case is desktop monitoring.

---

### Risk 6: Icon Font Loading Failure (CDN)
**Risk:** Google Fonts CDN outage or network issues could break icon display.

**Mitigation:**
- Add fallback text in `<span className="material-symbols-outlined" title="icon_name">icon_name</span>`
- Consider self-hosting fonts in Phase 2
- Use `font-display: swap` to prevent layout shift
- Add error boundary to gracefully handle font loading errors

**Trade-off:** Temporary icon display issues during CDN outages. Acceptable for development; address in production hardening.

---

### Risk 7: Test Maintenance Burden
**Risk:** Comprehensive testing (unit + integration + visual + E2E) requires significant maintenance as UI evolves.

**Mitigation:**
- Focus integration tests on critical flows (not every edge case)
- Use visual regression baseline updates judiciously
- Keep unit tests isolated (mock all hooks/APIs)
- Document test rationale in comments
- Review test failures promptly to avoid "broken window" effect

**Trade-off:** Higher initial testing effort (~40% of development time). Justified by increased confidence and reduced regression risk.

## Migration Plan

### Phase 1: Component Development (Estimated: 3-4 days)

**Day 1:**
1. Create feature branch: `feature/scans-dashboard-facelift`
2. Extend Tailwind config with custom colors and fonts
3. Add Material Symbols Outlined font to `index.html`
4. Create component directory: `frontend/src/components/scans/modern/`
5. Implement `ScanProgressTimeline.tsx` with unit tests
6. Implement `LiveTerminalOutput.tsx` with mock data and unit tests

**Day 2:**
1. Implement `VulnerabilityChart.tsx` with SVG rendering and unit tests
2. Implement `FindingCard.tsx` modern variant with unit tests
3. Implement `FindingsList.tsx` modern variant (reuse if possible)
4. Implement `ScanDashboardHeader.tsx` with controls and unit tests

**Day 3:**
1. Create `ScanDashboardModern.tsx` page composing all components
2. Create `ScanDetailRouter.tsx` for conditional routing
3. Update `App.tsx` routing to use `ScanDetailRouter`
4. Integration tests for `ScanDashboardModern` with MSW-mocked APIs

**Day 4:**
1. Add Storybook stories for all new components
2. Capture visual regression baselines (mobile, tablet, desktop)
3. Implement E2E tests for live scan workflow
4. Code review and refinement

---

### Phase 2: Testing & Refinement (Estimated: 1-2 days)

**Day 5:**
1. Manual QA testing on real devices
2. Performance testing with large findings datasets
3. Accessibility audit (keyboard navigation, screen reader)
4. Bug fixes and polish

**Day 6 (Optional):**
1. Address PR review feedback
2. Update documentation (`frontend/README.md`)
3. Add migration notes for other developers

---

### Phase 3: Deployment (Estimated: 1 day)

**Deployment Steps:**
1. Merge feature branch to `main` via squash commit
2. Verify CI/CD pipeline passes (linting, type-checking, tests)
3. Deploy to staging environment
4. Smoke test on staging (verify `/scans/:id` for running scan)
5. Deploy to production
6. Monitor error tracking (Sentry) for 24 hours post-deploy

**Rollback Strategy:**
If critical bugs detected post-deployment:
1. Revert merge commit on `main`
2. Redeploy previous version
3. Create hotfix branch from reverted commit
4. Fix issue and re-deploy via expedited PR

---

### Phase 4: Future Enhancements (Post-MVP)

**Backend Integration:**
- Add `/scans/:id/logs` SSE endpoint for real-time log streaming
- Replace mock logs in `LiveTerminalOutput` with real backend data

**Performance Optimization:**
- Add findings virtualization if datasets exceed 50 items
- Implement chart data caching to reduce re-renders

**Feature Additions:**
- Export findings as PDF report
- Filter findings by severity in UI
- Bookmark/favorite scans
- Scan comparison view (diff two scans side-by-side)

## Open Questions

1. **Q:** Should we add a "pause scan" button in addition to "abort"?
   **A:** TBD - Check with backend team if scan pause/resume is supported. If yes, add button; if no, document as future enhancement.

2. **Q:** What's the expected maximum findings count per scan?
   **A:** TBD - Need to validate with historical scan data. This determines if virtualization is needed in Phase 1 or Phase 2.

3. **Q:** Should mobile users see the full dashboard or a simplified mobile-optimized view?
   **A:** TBD - User research needed. Proposal: Start with responsive adaptation of desktop UI, add mobile-specific view if user feedback indicates complexity.

4. **Q:** Do we need to support real-time collaborative viewing (multiple users watching same scan)?
   **A:** TBD - Likely not in Phase 1. WebSocket connection is per-client, so multiple users can watch independently. True collaboration (shared cursors, comments) is out of scope.

5. **Q:** Should the vulnerability chart show all-time data or just current scan session?
   **A:** **Decision:** Current scan session only (findings from this `scanId`). All-time trends require historical analytics endpoint (future enhancement).

6. **Q:** How should we handle scans that fail at early stages (e.g., CLONE step fails)?
   **A:** **Decision:** Show timeline with failed step highlighted, display error message in terminal output area, hide findings/chart sections (no data to show).
