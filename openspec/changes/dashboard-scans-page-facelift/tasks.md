# Implementation Tasks: Dashboard Scans Page Facelift

## 1. Environment Setup

- [x] 1.1 Create feature branch `feature/scans-dashboard-facelift` from main
- [x] 1.2 Extend `frontend/tailwind.config.js` with custom colors (primary, background-dark, surface-dark, surface-border)
- [x] 1.3 Extend `frontend/tailwind.config.js` with custom fonts (Space Grotesk, Noto Sans)
- [x] 1.4 Add Material Symbols Outlined font link to `frontend/index.html` head
- [x] 1.5 Create component directory structure: `frontend/src/components/scans/modern/`
- [x] 1.6 Verify existing hooks (`useScan`, `useScanFindings`, `useScanProgressLive`) are working correctly

## 2. ScanProgressTimeline Component

- [x] 2.1 Create `frontend/src/components/scans/modern/ScanProgressTimeline.tsx` with TypeScript interface `ScanProgressTimelineProps`
- [x] 2.2 Implement vertical timeline layout with 7 stages (Clone Repository, Compile Contracts, Deploy Testnet, Static Analysis, AI Deep Analysis, Proof of Concept, Submit Report)
- [x] 2.3 Implement stage icon rendering (checkmark for completed, sync for active, circle for pending, X for failed)
- [x] 2.4 Implement vertical connecting line (2px width, surface-border color)
- [x] 2.5 Implement stage metadata display (duration, custom messages, block number, findings count)
- [x] 2.6 Implement responsive layout (vertical on all breakpoints, compact on mobile)
- [x] 2.7 Add ARIA labels and semantic HTML (ordered list with list items)
- [x] 2.8 Add ARIA live region for real-time stage updates
- [x] 2.9 Create unit tests for ScanProgressTimeline component (all scenarios from spec)
- [ ] 2.10 Create Storybook story for ScanProgressTimeline with all stage states

## 3. LiveTerminalOutput Component

- [x] 3.1 Create `frontend/src/components/scans/modern/LiveTerminalOutput.tsx` with TypeScript interface `LogMessage` and `LiveTerminalOutputProps`
- [x] 3.2 Implement terminal container with title bar (scan_agent_01 — zsh, macOS window dots)
- [x] 3.3 Implement terminal content area with black background (#0c0c0c), monospace font, 320px height, scrollable
- [x] 3.4 Implement color-coded log message rendering (INFO=blue, ANALYSIS=green with glow, ALERT=red, WARN=yellow, DEFAULT=gray)
- [x] 3.5 Implement log message formatting (preserve prefixes, tree structures, indentation)
- [x] 3.6 Implement auto-scroll logic (scroll to bottom on new message if user is at bottom)
- [x] 3.7 Implement blinking cursor animation for active terminal (scan state=RUNNING)
- [x] 3.8 Create mock log data constant matching reference design samples
- [x] 3.9 Implement performance optimizations (limit to 500 messages, batch updates every 100ms)
- [x] 3.10 Create unit tests for LiveTerminalOutput component (all scenarios from spec)
- [ ] 3.11 Create Storybook story for LiveTerminalOutput with mock data

## 4. VulnerabilityChart Component

- [x] 4.1 Create `frontend/src/components/scans/modern/VulnerabilityChart.tsx` with TypeScript interface `VulnerabilityChartProps` and `ChartDataPoint`
- [x] 4.2 Implement SVG chart container with 478px × 120px dimensions (responsive scaling)
- [x] 4.3 Implement data transformation function `buildChartData(findings)` to group by 5-minute intervals and calculate cumulative counts
- [x] 4.4 Implement SVG path rendering for line chart with smooth curves
- [x] 4.5 Implement linear gradient fill (primary blue 30% opacity → transparent)
- [x] 4.6 Implement endpoint circle indicator (4px white fill, 2px primary blue border)
- [x] 4.7 Implement total count display (3xl font, top-right corner)
- [x] 4.8 Implement "+{count} new" trend indicator badge (green with trending-up icon)
- [x] 4.9 Implement chart metadata (time window label, axis markers)
- [x] 4.10 Implement empty state handling (flat line at zero, "No vulnerabilities detected yet")
- [x] 4.11 Add ARIA label with descriptive chart summary
- [x] 4.12 Create unit tests for VulnerabilityChart component (all scenarios from spec)
- [ ] 4.13 Create Storybook story for VulnerabilityChart with sample findings data

## 5. FindingCard Component

- [x] 5.1 Create `frontend/src/components/scans/modern/FindingCard.tsx` with TypeScript interface `FindingCardProps`
- [x] 5.2 Implement card container with dark surface background, border, rounded corners, hover state
- [x] 5.3 Implement severity badge rendering (Critical=red, High=orange, Medium=yellow, Low=blue, Info=gray with 10% opacity backgrounds and ring borders)
- [x] 5.4 Implement CWE code display in monospace font
- [x] 5.5 Implement finding title display (white bold text, truncated if too long)
- [x] 5.6 Implement finding description display (gray text, 1-2 lines with ellipsis)
- [x] 5.7 Implement AI confidence meter with percentage and progress bar (green gradient for high confidence)
- [x] 5.8 Implement responsive layout (horizontal on desktop, stacked on mobile)
- [x] 5.9 Implement chevron-right expand button (future enhancement placeholder)
- [x] 5.10 Add ARIA label with severity and title
- [x] 5.11 Create unit tests for FindingCard component (all severity variations)
- [ ] 5.12 Create Storybook story for FindingCard with all severity examples

## 6. FindingsList Component

- [x] 6.1 Create `frontend/src/components/scans/modern/FindingsList.tsx` with TypeScript interface `FindingsListProps`
- [x] 6.2 Implement section header with "Real-time Findings" title, warning icon, and "Export Report" button
- [x] 6.3 Implement findings list container with vertical layout and 12px gap
- [x] 6.4 Implement findings sorting (by severity then timestamp)
- [x] 6.5 Implement empty state placeholder ("No vulnerabilities detected yet")
- [x] 6.6 Implement findings rendering using FindingCard component
- [x] 6.7 Add semantic HTML structure (list element with role)
- [x] 6.8 Create unit tests for FindingsList component (sorting, empty state)
- [ ] 6.9 Create Storybook story for FindingsList with various data states

## 7. ScanDashboardHeader Component

- [x] 7.1 Create `frontend/src/components/scans/modern/ScanDashboardHeader.tsx` with TypeScript interface `ScanDashboardHeaderProps`
- [x] 7.2 Implement status badge with animated pulse for "Active Scan" state
- [x] 7.3 Implement scan ID display with monospace font (format: #SCAN-{id})
- [x] 7.4 Implement protocol name heading (3xl font, bold)
- [x] 7.5 Implement contract address display with truncation (0x1f98...c991 format)
- [x] 7.6 Implement relative start time display ("Started 14 mins ago")
- [x] 7.7 Implement action buttons (Pause, Abort Scan) aligned right
- [x] 7.8 Implement abort confirmation dialog (using existing dialog component or create simple modal)
- [x] 7.9 Wire up Pause and Abort actions to backend API calls
- [x] 7.10 Create unit tests for ScanDashboardHeader component
- [ ] 7.11 Create Storybook story for ScanDashboardHeader

## 8. ScanDashboardModern Page

- [ ] 8.1 Create `frontend/src/pages/ScanDashboardModern.tsx` with TypeScript interface `ScanDashboardModernProps`
- [ ] 8.2 Implement page layout with 12-column grid (lg: 4 cols left sidebar, 8 cols right content)
- [ ] 8.3 Implement responsive layout (stack vertically on mobile < lg breakpoint)
- [ ] 8.4 Integrate ScanDashboardHeader component with scan metadata
- [ ] 8.5 Integrate ScanProgressTimeline component in left sidebar with useScanProgressLive hook
- [ ] 8.6 Integrate LiveTerminalOutput component in right content area (use mock data initially)
- [ ] 8.7 Integrate VulnerabilityChart component in right content area with useScanFindings data
- [ ] 8.8 Integrate FindingsList component in right content area with useScanFindings data
- [ ] 8.9 Implement loading states for all data sections (skeleton loaders)
- [ ] 8.10 Implement error states with retry buttons
- [ ] 8.11 Implement WebSocket connection status indicator (green/yellow/red dot)
- [ ] 8.12 Add dark background styling (background-dark color)
- [ ] 8.13 Create integration tests for ScanDashboardModern page with MSW-mocked APIs

## 9. ScanDetailRouter Component

- [ ] 9.1 Create `frontend/src/components/scans/ScanDetailRouter.tsx` with conditional routing logic
- [ ] 9.2 Implement scan state check (if state=RUNNING, render ScanDashboardModern; else render ScanDetail)
- [ ] 9.3 Handle loading state while scan metadata is being fetched
- [ ] 9.4 Handle error state if scan ID is invalid or fetch fails
- [ ] 9.5 Create unit tests for ScanDetailRouter component with different scan states

## 10. Routing Integration

- [ ] 10.1 Update `frontend/src/App.tsx` to use ScanDetailRouter for `/scans/:id` route
- [ ] 10.2 Verify existing `/scans` list route still works correctly
- [ ] 10.3 Verify protocolId query param filtering still works on list page
- [ ] 10.4 Test browser back button navigation from detail to list page
- [ ] 10.5 Add breadcrumb navigation component (optional enhancement)

## 11. Testing - Unit Tests

- [ ] 11.1 Run all unit tests and ensure 80%+ statement coverage for new components
- [ ] 11.2 Verify ScanProgressTimeline tests cover all stage states (pending, active, completed, failed)
- [ ] 11.3 Verify LiveTerminalOutput tests cover color coding, auto-scroll, and performance limits
- [ ] 11.4 Verify VulnerabilityChart tests cover data transformation and edge cases (empty, single point)
- [ ] 11.5 Verify FindingCard tests cover all severity badges and confidence variations
- [ ] 11.6 Verify FindingsList tests cover sorting and empty states
- [ ] 11.7 Verify ScanDashboardHeader tests cover action button interactions
- [ ] 11.8 Verify ScanDetailRouter tests cover conditional rendering logic

## 12. Testing - Integration Tests

- [ ] 12.1 Create integration test for ScanDashboardModern with MSW-mocked `/api/v1/scans/:id` endpoint
- [ ] 12.2 Create integration test for ScanDashboardModern with MSW-mocked `/api/v1/scans/:id/findings` endpoint
- [ ] 12.3 Create integration test for real-time WebSocket updates (mock WebSocket connection)
- [ ] 12.4 Test scan state transitions (RUNNING → COMPLETED → switches to classic view)
- [ ] 12.5 Test error handling and retry logic
- [ ] 12.6 Test loading states and skeleton loaders

## 13. Testing - Visual Regression

- [ ] 13.1 Capture Storybook screenshots for all components at mobile breakpoint (375px)
- [ ] 13.2 Capture Storybook screenshots for all components at tablet breakpoint (768px)
- [ ] 13.3 Capture Storybook screenshots for all components at desktop breakpoint (1440px)
- [ ] 13.4 Set up Chromatic integration for automated visual regression (optional if not already configured)
- [ ] 13.5 Review baseline screenshots and approve initial visual state

## 14. Testing - End-to-End

- [ ] 14.1 Create E2E test: Navigate from scan list to running scan detail page
- [ ] 14.2 Create E2E test: Verify modern dashboard displays for running scan
- [ ] 14.3 Create E2E test: Verify classic detail view displays for completed scan
- [ ] 14.4 Create E2E test: Verify progress timeline updates in real-time (simulate WebSocket events)
- [ ] 14.5 Create E2E test: Verify findings list updates when new finding is detected
- [ ] 14.6 Create E2E test: Abort scan and verify state change
- [ ] 14.7 Create E2E test: Test mobile responsive layout behavior

## 15. Manual QA & Accessibility

- [ ] 15.1 Manual test on real iPhone (Safari) - verify touch interactions and responsive layout
- [ ] 15.2 Manual test on real Android device (Chrome) - verify responsive layout
- [ ] 15.3 Manual test on desktop browsers (Chrome, Firefox, Safari) - verify all features work
- [ ] 15.4 Keyboard navigation audit - verify all interactive elements are reachable via Tab
- [ ] 15.5 Screen reader testing with VoiceOver (macOS) - verify ARIA labels announce correctly
- [ ] 15.6 Screen reader testing with NVDA (Windows) - verify accessibility (optional)
- [ ] 15.7 Color contrast audit - verify all text meets WCAG 2.1 AA standards (4.5:1 ratio)
- [ ] 15.8 Test WebSocket disconnection and reconnection behavior
- [ ] 15.9 Test with large datasets (100+ findings) - verify performance is acceptable
- [ ] 15.10 Test with very long scan (30+ minutes) - verify chart and timeline scale correctly

## 16. Documentation

- [ ] 16.1 Update `frontend/README.md` with new component architecture section
- [ ] 16.2 Document ScanProgressTimeline component props and usage in README or inline JSDoc
- [ ] 16.3 Document LiveTerminalOutput component props and mock data usage
- [ ] 16.4 Document VulnerabilityChart component data transformation logic
- [ ] 16.5 Document FindingCard and FindingsList component usage
- [ ] 16.6 Document ScanDashboardModern page structure and data flow
- [ ] 16.7 Add migration notes for other developers (conditional routing based on scan state)
- [ ] 16.8 Document Material Symbols Outlined font integration and fallback strategy

## 17. Code Review & Refinement

- [ ] 17.1 Run TypeScript type checking (`npm run type-check`) and fix all errors
- [ ] 17.2 Run ESLint (`npm run lint`) and fix all warnings
- [ ] 17.3 Run Prettier (`npm run format`) to ensure consistent code formatting
- [ ] 17.4 Review all components for consistency with existing code patterns
- [ ] 17.5 Review all components for potential performance optimizations (memoization, lazy loading)
- [ ] 17.6 Self-review code for security issues (XSS in log messages, injection vulnerabilities)
- [ ] 17.7 Create atomic commits with clear commit messages (feat(scans): add ScanProgressTimeline component)
- [ ] 17.8 Push feature branch to remote and create draft PR

## 18. Pull Request & Deployment

- [ ] 18.1 Update PR description with screenshots of new UI (desktop, tablet, mobile)
- [ ] 18.2 Add GIF or video demonstrating real-time progress updates
- [ ] 18.3 Include test coverage report in PR description
- [ ] 18.4 Link PR to related issues or OpenSpec change document
- [ ] 18.5 Mark PR as ready for review and request review from frontend maintainer
- [ ] 18.6 Address PR review feedback and make requested changes
- [ ] 18.7 Ensure CI/CD pipeline passes (linting, type-checking, tests)
- [ ] 18.8 Squash commits and merge PR to main branch
- [ ] 18.9 Verify deployment to staging environment succeeds
- [ ] 18.10 Manual smoke test on staging (verify `/scans/:id` for running scan works correctly)
- [ ] 18.11 Monitor error tracking (Sentry) for 24 hours post-deploy
- [ ] 18.12 Deploy to production if staging validation passes

## 19. Post-Deployment Validation

- [ ] 19.1 Verify modern dashboard displays correctly in production
- [ ] 19.2 Verify classic detail view still works for completed scans
- [ ] 19.3 Verify WebSocket real-time updates work in production environment
- [ ] 19.4 Monitor application performance metrics (page load time, bundle size)
- [ ] 19.5 Monitor error rates and investigate any new errors
- [ ] 19.6 Collect user feedback on new UI design (optional)

## 20. Archive & Cleanup

- [ ] 20.1 Mark this OpenSpec change as completed in `.openspec.yaml`
- [ ] 20.2 Move change directory to `openspec/changes/archive/2026-02-05-scans-dashboard-facelift/`
- [ ] 20.3 Add `ARCHIVE_REASON.md` explaining completion and noting reusable patterns
- [ ] 20.4 Update project task board or issue tracker to close related tasks
- [ ] 20.5 Delete feature branch after successful merge and deployment
