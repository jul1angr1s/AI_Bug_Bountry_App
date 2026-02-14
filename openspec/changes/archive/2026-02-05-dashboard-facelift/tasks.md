# Tasks: Modern Dashboard Facelift

## Phase 1: OpenSpec Documentation + Project Setup ✅

### 1.1 Create OpenSpec Change Structure
- [x] Create directory: `openspec/changes/2026-02-05-dashboard-facelift/`
- [x] Write `.openspec.yaml` with metadata
- [x] Write `proposal.md` with problem/solution/outcome
- [x] Write `design.md` with technical decisions
- [x] Write `tasks.md` with implementation breakdown

**Refs:** proposal.md, design.md

### 1.2 Git Setup
- [ ] Checkout main branch
- [ ] Pull latest changes
- [ ] Create feature branch: `feature/dashboard-facelift`

**Refs:** PR Guidelines (openspec/specs/pr-guidelines.md)

### 1.3 Install Dependencies
- [ ] Frontend: Install `recharts@^2.10.0` and `date-fns@^3.0.0`
- [ ] Backend: Install `ws@^8.16.0` and `@types/ws@^8.5.10`
- [ ] Verify installations with `npm list`

**Refs:** package.json files

### 1.4 Commit OpenSpec Documentation
- [ ] Stage all OpenSpec files
- [ ] Commit with message: "docs(openspec): create dashboard facelift change documentation"

---

## Phase 2: Foundation Setup - Tailwind + Fonts + Shared Components

### 2.1 Update Tailwind Configuration
- [ ] Extend `theme.fontFamily` with Space Grotesk and Noto Sans
- [ ] Add custom `colors` palette (navy, primary, accent)
- [ ] Add custom `boxShadow` utilities (glow effects)
- [ ] Test config by running `npm run dev`

**Target:** `/frontend/tailwind.config.js`
**Refs:** design.md (Decision 6)

### 2.2 Add Google Fonts to Index CSS
- [ ] Import Space Grotesk font (weights: 400, 500, 600, 700)
- [ ] Import Noto Sans font (weights: 400, 500, 600, 700)
- [ ] Import Material Symbols Outlined
- [ ] Add global styles for body and headings
- [ ] Add Material Symbols font-variation-settings

**Target:** `/frontend/src/index.css`
**Refs:** design.md (Decision 1)

### 2.3 Create MaterialIcon Component
- [ ] Create file: `/frontend/src/components/shared/MaterialIcon.tsx`
- [ ] Props: `name: string`, `className?: string`, `onClick?: () => void`
- [ ] Render span with `material-symbols-outlined` class
- [ ] Export component with TypeScript types

**Refs:** frontend.md (Component Patterns)

### 2.4 Create GlowCard Component
- [ ] Create file: `/frontend/src/components/shared/GlowCard.tsx`
- [ ] Props: `children`, `glowColor: 'cyan' | 'purple' | 'blue' | 'green'`, `className`
- [ ] Implement hover glow effect with Tailwind classes
- [ ] Use conditional shadow based on glowColor prop

**Refs:** design.md (Decision 6)

### 2.5 Create GradientButton Component
- [ ] Create file: `/frontend/src/components/shared/GradientButton.tsx`
- [ ] Props: `children`, `onClick`, `variant: 'primary' | 'secondary'`, `className`
- [ ] Implement gradient backgrounds with hover effects
- [ ] Add glow shadow on hover

### 2.6 Create PulseIndicator Component
- [ ] Create file: `/frontend/src/components/shared/PulseIndicator.tsx`
- [ ] Props: `status: 'active' | 'idle' | 'error'`
- [ ] Render animated dot with color based on status
- [ ] Use Tailwind `animate-pulse` for active status

### 2.7 Commit Foundation Changes
- [ ] Stage all foundation files
- [ ] Commit with message: "feat(frontend): add modern design system foundation"

---

## Phase 3: Backend API Endpoints

### 3.1 Create Dashboard Routes File
- [ ] Create file: `/backend/src/routes/dashboard.ts`
- [ ] Define routes: GET `/threat-metrics`, GET `/bounty-history`, GET `/network-stats`
- [ ] Import controller functions
- [ ] Apply authentication middleware
- [ ] Export router

**Refs:** architecture.md (Backend Structure)

### 3.2 Create Dashboard Controller
- [ ] Create file: `/backend/src/controllers/dashboardController.ts`
- [ ] Implement `getThreatMetrics(req, res)` handler
- [ ] Implement `getBountyHistory(req, res)` handler
- [ ] Implement `getNetworkStats(req, res)` handler
- [ ] Add error handling and input validation (Zod)

**Refs:** design.md (Decision 4)

### 3.3 Create Metrics Service
- [ ] Create file: `/backend/src/services/metricsService.ts`
- [ ] Implement `aggregateThreatMetrics(days: number)` function
- [ ] Implement `aggregateBountyHistory(months: number)` function
- [ ] Implement `calculateNetworkStats()` function
- [ ] Use Supabase client for database queries
- [ ] Add date aggregation logic with date-fns

**Refs:** supabase-postgres-best-practices

### 3.4 Create Activity Service
- [ ] Create file: `/backend/src/services/activityService.ts`
- [ ] Implement `generateActivityMessage(event)` function
- [ ] Define activity types: scan_complete, vulnerability_found, bounty_paid, agent_started
- [ ] Map event types to Material Symbol icons
- [ ] Return formatted activity object

### 3.5 Create Activity WebSocket Handler
- [ ] Create file: `/backend/src/websockets/activitySocket.ts`
- [ ] Initialize WebSocket server with `ws` library
- [ ] Implement connection handler
- [ ] Implement broadcast function for activity events
- [ ] Add heartbeat/ping mechanism for connection health
- [ ] Implement cleanup on client disconnect

**Refs:** design.md (Decision 3)

### 3.6 Update Server Entry Point
- [ ] Modify `/backend/src/server.ts`
- [ ] Import WebSocket handler
- [ ] Initialize WebSocket server alongside Express
- [ ] Register dashboard routes in router
- [ ] Test WebSocket connection with wscat

**Target:** `/backend/src/server.ts`, `/backend/src/routes/index.ts`

### 3.7 Test Backend Endpoints
- [ ] Test GET `/api/v1/dashboard/threat-metrics?days=30` with curl
- [ ] Test GET `/api/v1/dashboard/bounty-history?months=6` with curl
- [ ] Test GET `/api/v1/dashboard/network-stats` with curl
- [ ] Test WebSocket connection: `wscat -c ws://localhost:3000/api/activity`
- [ ] Verify response formats match design spec

### 3.8 Commit Backend Changes
- [ ] Stage all backend files
- [ ] Commit with message: "feat(backend): add dashboard API endpoints"

---

## Phase 4: Dashboard Header + Frontend Hooks

### 4.1 Create DashboardHeader Component
- [ ] Create file: `/frontend/src/components/Dashboard/DashboardHeader.tsx`
- [ ] Implement sticky positioning with `sticky top-0 z-50`
- [ ] Add backdrop blur: `backdrop-blur-md bg-navy-900/80`
- [ ] Add search input with MaterialIcon (search)
- [ ] Add Connect Wallet button (GradientButton)
- [ ] Add notification and account icons
- [ ] Make responsive: hide search input on mobile, show icon only

**Refs:** design.md (Decision 5)

### 4.2 Create useThreatMetrics Hook
- [ ] Create file: `/frontend/src/hooks/useThreatMetrics.ts`
- [ ] Use TanStack Query `useQuery`
- [ ] Fetch from `/api/v1/dashboard/threat-metrics?days=30`
- [ ] Configure: `staleTime: 5min`, `refetchInterval: 1min`
- [ ] Add TypeScript types for response

**Refs:** frontend.md (TanStack Query Patterns)

### 4.3 Create useBountyHistory Hook
- [ ] Create file: `/frontend/src/hooks/useBountyHistory.ts`
- [ ] Use TanStack Query `useQuery`
- [ ] Fetch from `/api/v1/dashboard/bounty-history?months=6`
- [ ] Configure: `staleTime: 5min`, `refetchInterval: 5min`
- [ ] Add TypeScript types for response

### 4.4 Create useNetworkStats Hook
- [ ] Create file: `/frontend/src/hooks/useNetworkStats.ts`
- [ ] Use TanStack Query `useQuery`
- [ ] Fetch from `/api/v1/dashboard/network-stats`
- [ ] Configure: `staleTime: 1min`, `refetchInterval: 30sec`
- [ ] Add TypeScript types for response

### 4.5 Create useLiveActivity Hook
- [ ] Create file: `/frontend/src/hooks/useLiveActivity.ts`
- [ ] Use `useState` for activity array
- [ ] Implement WebSocket connection on mount
- [ ] Add message handler to append activities
- [ ] Implement reconnection logic with exponential backoff
- [ ] Clean up WebSocket connection on unmount
- [ ] Add connection status indicator

**Refs:** design.md (Decision 3), frontend.md (Real-time Sync)

### 4.6 Commit Header and Hooks
- [ ] Stage DashboardHeader and hooks
- [ ] Commit with message: "feat(frontend): add dashboard header and data hooks"

---

## Phase 5: Modern Agent Cards

### 5.1 Create ModernAgentCard Component
- [ ] Create file: `/frontend/src/components/Dashboard/ModernAgentCard.tsx`
- [ ] Wrap content in GlowCard component
- [ ] Add background MaterialIcon with opacity (smart_toy, bug_report, etc.)
- [ ] Add agent type heading with PulseIndicator
- [ ] Add StatusBadge for agent status
- [ ] Implement gradient progress bar
- [ ] Add scan rate and uptime display
- [ ] Add hover scale effect: `group-hover:scale-105 transition-transform`

**Refs:** design.md (Layout Changes)

### 5.2 Update AgentStatusGrid Component
- [ ] Modify `/frontend/src/components/Dashboard/AgentStatusGrid.tsx`
- [ ] Import ModernAgentCard
- [ ] Replace old agent cards with ModernAgentCard
- [ ] Keep 3-column grid layout
- [ ] Add loading skeleton states

**Target:** `/frontend/src/components/Dashboard/AgentStatusGrid.tsx`

### 5.3 Commit Agent Cards
- [ ] Stage ModernAgentCard and AgentStatusGrid
- [ ] Commit with message: "feat(frontend): redesign agent status cards"

---

## Phase 6: Interactive Charts

### 6.1 Create ThreatDetectionChart Component
- [ ] Create file: `/frontend/src/components/Dashboard/ThreatDetectionChart.tsx`
- [ ] Import Recharts: LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
- [ ] Use `useThreatMetrics()` hook for data
- [ ] Configure gradient fill (cyan accent)
- [ ] Style CartesianGrid with navy-700 stroke
- [ ] Customize tooltip with navy-800 background
- [ ] Set font-family to Noto Sans
- [ ] Add loading skeleton and error states
- [ ] Make fully responsive with ResponsiveContainer

**Refs:** design.md (Decision 2)

### 6.2 Create BountyPaidChart Component
- [ ] Create file: `/frontend/src/components/Dashboard/BountyPaidChart.tsx`
- [ ] Import Recharts: BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
- [ ] Use `useBountyHistory()` hook for data
- [ ] Configure gradient bar fill (primary blue to cyan)
- [ ] Add rounded bar corners: `radius={[8, 8, 0, 0]}`
- [ ] Style axes and grid matching theme
- [ ] Customize tooltip styling
- [ ] Add loading skeleton and error states

### 6.3 Commit Charts
- [ ] Stage both chart components
- [ ] Commit with message: "feat(frontend): add interactive charts with Recharts"

---

## Phase 7: Global Leaderboard + Sidebar

### 7.1 Create GlobalLeaderboard Component
- [ ] Create file: `/frontend/src/components/Dashboard/GlobalLeaderboard.tsx`
- [ ] Transform VulnerabilitiesTable to leaderboard style
- [ ] Add rank column with gradient badges for top 3
- [ ] Add gradient avatars (initials or identicons)
- [ ] Truncate addresses: `0x1234...5678` with copy button
- [ ] Add bounty amount column with dollar formatting
- [ ] Implement hover row effect
- [ ] Keep sorting functionality

**Refs:** design.md (Layout Changes)

### 7.2 Create NetworkStatsCard Component
- [ ] Create file: `/frontend/src/components/Dashboard/NetworkStatsCard.tsx`
- [ ] Props: `icon: string`, `label: string`, `value: string | number`, `color: string`
- [ ] Layout: Icon left, label + value right
- [ ] Use MaterialIcon component
- [ ] Style with navy-800 background and rounded corners

### 7.3 Create LiveActivityFeed Component
- [ ] Create file: `/frontend/src/components/Dashboard/LiveActivityFeed.tsx`
- [ ] Use `useLiveActivity()` hook
- [ ] Render scrollable activity list (max-height: 500px)
- [ ] Activity item: MaterialIcon + message + relative time (formatDistanceToNow)
- [ ] Add hover effects on items
- [ ] Implement auto-scroll to new items
- [ ] Show connection status indicator
- [ ] Add empty state when no activities

**Refs:** design.md (Decision 3)

### 7.4 Create DashboardSidebar Component
- [ ] Create file: `/frontend/src/components/Dashboard/DashboardSidebar.tsx`
- [ ] Use `useNetworkStats()` hook
- [ ] Render 3 NetworkStatsCard components (protocols, agents, response time)
- [ ] Render LiveActivityFeed below stats
- [ ] Add section titles with proper spacing
- [ ] Make sticky on desktop: `lg:sticky lg:top-24`

### 7.5 Commit Leaderboard and Sidebar
- [ ] Stage all sidebar and leaderboard components
- [ ] Commit with message: "feat(frontend): add global leaderboard and sidebar"

---

## Phase 8: Dashboard Page Restructure

### 8.1 Update Dashboard.tsx Layout
- [ ] Read current `/frontend/src/pages/Dashboard.tsx`
- [ ] Remove old component imports (ProtocolOverview, StatisticsPanel, old AgentStatusGrid)
- [ ] Import all new components (DashboardHeader, ModernAgentCard, charts, sidebar, etc.)
- [ ] Restructure to 12-column grid layout
- [ ] Add DashboardHeader at top
- [ ] Main content: lg:col-span-8 (agent cards + charts + leaderboard)
- [ ] Sidebar: lg:col-span-4 (network stats + activity feed)
- [ ] Add responsive breakpoints

**Target:** `/frontend/src/pages/Dashboard.tsx`
**Refs:** design.md (Decision 5)

### 8.2 Test Dashboard Page
- [ ] Run `npm run dev` and navigate to `/`
- [ ] Verify all sections render correctly
- [ ] Test responsive layout on mobile/tablet/desktop
- [ ] Check data fetching and loading states
- [ ] Verify WebSocket activity feed updates

### 8.3 Commit Dashboard Restructure
- [ ] Stage Dashboard.tsx
- [ ] Commit with message: "feat(frontend): restructure dashboard with modern layout"

---

## Phase 9: Full Icon Migration

### 9.1 Find All lucide-react Usages
- [ ] Search codebase: `grep -r "from 'lucide-react'" frontend/src/`
- [ ] Document all files using lucide-react icons
- [ ] Create icon mapping list (lucide name → Material Symbol name)

**Refs:** design.md (Decision 1)

### 9.2 Update Sidebar Component
- [ ] Read `/frontend/src/components/Sidebar.tsx`
- [ ] Replace lucide-react imports with MaterialIcon
- [ ] Update icon names: Shield → shield, Bot → smart_toy, etc.
- [ ] Update icon sizing: `className="w-6 h-6"` → `className="text-2xl"`
- [ ] Test Sidebar rendering

**Target:** `/frontend/src/components/Sidebar.tsx`

### 9.3 Update Protocols Page
- [ ] Read `/frontend/src/pages/Protocols.tsx`
- [ ] Replace lucide-react icons with MaterialIcon
- [ ] Update icon names and sizing
- [ ] Test page rendering

**Target:** `/frontend/src/pages/Protocols.tsx`

### 9.4 Update Scans Page
- [ ] Read `/frontend/src/pages/Scans.tsx`
- [ ] Replace lucide-react icons with MaterialIcon
- [ ] Update icon names and sizing
- [ ] Test page rendering

**Target:** `/frontend/src/pages/Scans.tsx`

### 9.5 Update Validations Page
- [ ] Read `/frontend/src/pages/Validations.tsx`
- [ ] Replace lucide-react icons with MaterialIcon
- [ ] Update icon names and sizing
- [ ] Test page rendering

**Target:** `/frontend/src/pages/Validations.tsx`

### 9.6 Update Payments Page
- [ ] Read `/frontend/src/pages/Payments.tsx`
- [ ] Replace lucide-react icons with MaterialIcon
- [ ] Update icon names and sizing
- [ ] Test page rendering

**Target:** `/frontend/src/pages/Payments.tsx`

### 9.7 Update All Remaining Components
- [ ] Search for remaining lucide-react imports
- [ ] Update: StatCard, StatusBadge, SeverityBadge, AlertBanner, etc.
- [ ] Replace all icon instances with MaterialIcon
- [ ] Update sizing consistently across all components

### 9.8 Remove lucide-react Dependency
- [ ] Run `npm uninstall lucide-react` in frontend
- [ ] Verify no import errors: `npm run build`
- [ ] Test all pages one final time

### 9.9 Commit Icon Migration
- [ ] Stage all modified files
- [ ] Commit with message: "feat(frontend): migrate all icons to Material Symbols"

---

## Phase 10: Testing + Documentation + PR

### 10.1 Manual Testing - Desktop
- [ ] Test on 1920x1080 resolution
- [ ] Verify sticky header with blur backdrop
- [ ] Verify 8/4 column layout with sidebar on right
- [ ] Test all charts: hover, tooltips, data loading
- [ ] Test activity feed: WebSocket updates, scrolling
- [ ] Test agent cards: hover glow effects
- [ ] Test leaderboard: sorting, hover effects

### 10.2 Manual Testing - Tablet/Mobile
- [ ] Test on 768x1024 (tablet)
- [ ] Verify sidebar moves below main content
- [ ] Verify 2-column agent cards
- [ ] Test on 375x667 (mobile)
- [ ] Verify single-column layout
- [ ] Verify header search icon only (no input)
- [ ] Test touch interactions

### 10.3 Performance Testing
- [ ] Run Lighthouse audit in Chrome DevTools
- [ ] Verify Performance score >90
- [ ] Verify bundle size: `npm run build` and check dist/ size (<600KB gzipped)
- [ ] Use webpack-bundle-analyzer if needed: `npm run build -- --analyze`
- [ ] Check for console errors/warnings

### 10.4 WebSocket Testing
- [ ] Open dashboard in 2 browser tabs
- [ ] Trigger backend event (create vulnerability)
- [ ] Verify activity appears in both tabs
- [ ] Disconnect network and verify reconnection logic
- [ ] Verify no memory leaks: close tab and check WebSocket cleanup

### 10.5 Update Frontend README
- [ ] Read `/frontend/README.md`
- [ ] Add "Design System" section with color palette, fonts, icons
- [ ] Document shared components (GlowCard, GradientButton, MaterialIcon)
- [ ] Document dashboard architecture and data flow
- [ ] Add chart usage examples

**Target:** `/frontend/README.md`
**Refs:** frontend.md

### 10.6 Update OpenSpec Frontend Spec
- [ ] Read `/openspec/specs/frontend.md`
- [ ] Add dashboard-specific architecture notes
- [ ] Document Material Symbols usage
- [ ] Document Recharts integration patterns
- [ ] Document WebSocket usage patterns

**Target:** `/openspec/specs/frontend.md`

### 10.7 Create Pull Request
- [ ] Stage all remaining changes
- [ ] Create final commit: "test(frontend): comprehensive dashboard testing"
- [ ] Push branch: `git push -u origin feature/dashboard-facelift`
- [ ] Create PR with gh CLI: `gh pr create --title "..." --body "..."`
- [ ] Include screenshots in PR description
- [ ] Request review from team

**Refs:** pr-guidelines.md

### 10.8 PR Description Template
```markdown
## Summary
Complete design transformation of the AI Bug Bounty Platform dashboard with modern aesthetics, interactive charts, and real-time activity feed.

## Changes
### Frontend
- ✅ Complete icon migration: lucide-react → Material Symbols Outlined
- ✅ Design system: Space Grotesk + Noto Sans fonts, new color palette
- ✅ Interactive charts: Threat detection (line) + Bounty history (bar)
- ✅ Real-time activity feed via WebSocket
- ✅ Sticky header with blur backdrop
- ✅ 12-column responsive grid layout
- ✅ Modern agent cards with hover glow effects
- ✅ Enhanced global leaderboard

### Backend
- ✅ Dashboard API endpoints: threat-metrics, bounty-history, network-stats
- ✅ WebSocket server for activity broadcasting
- ✅ Metrics aggregation service
- ✅ Activity stream service

## Testing
- ✅ Manual testing: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- ✅ Lighthouse Performance: XX/100
- ✅ Bundle size: XXXKB gzipped (< 600KB)
- ✅ WebSocket: Connection, reconnection, cleanup verified
- ✅ All pages tested after icon migration

## Screenshots
[Dashboard - Desktop]
[Dashboard - Mobile]
[Charts - Interactive]
[Activity Feed - Live Updates]

## Refs
openspec/changes/2026-02-05-dashboard-facelift
```

---

## Success Criteria

**All tasks completed when:**
- [ ] Dashboard displays modern design with Space Grotesk + Material Symbols
- [ ] All pages migrated from lucide-react to Material Symbols (0 lucide imports)
- [ ] Charts render data from backend endpoints
- [ ] Activity feed updates in real-time via WebSocket
- [ ] Responsive layout works on desktop/tablet/mobile
- [ ] Lighthouse Performance score >90
- [ ] Bundle size <600KB gzipped
- [ ] PR created, reviewed, and merged
- [ ] OpenSpec change archived with status: completed
