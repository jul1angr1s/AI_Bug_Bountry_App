# Tasks: UI Dashboard Implementation

## Phase 1: Layout & Navigation

### Task 1.1: Create Base Layout Structure
**Target Layer**: Frontend
**Files**:
- `src/layouts/DashboardLayout.tsx`
- `src/layouts/DashboardLayout.module.css`

**Requirements**:
- Fixed sidebar (200px width) with dark navy background
- Fluid content area with responsive padding
- Header with theme toggle and user profile
- Use CSS Grid for layout structure

**Acceptance**:
- Layout renders with correct sidebar/content split
- Sidebar remains fixed on scroll
- Responsive breakpoints work on tablet/mobile

---

### Task 1.2: Implement Sidebar Navigation
**Target Layer**: Frontend
**Files**:
- `src/components/Sidebar/Sidebar.tsx`
- `src/components/Sidebar/NavLink.tsx`
- `src/components/Sidebar/UserProfile.tsx`

**Requirements**:
- Thunder Security branding with version badge
- Navigation items: Dashboard, Protocols, Scans, Validations, Payments
- Active state highlighting with blue accent
- User profile at bottom with wallet address (truncated)
- Icons from lucide-react

**Acceptance**:
- Navigation highlights active route
- Hover states work on all links
- User profile displays connected wallet

---

### Task 1.3: Set up React Router Structure
**Target Layer**: Frontend
**Files**:
- `src/App.tsx`
- `src/routes/index.tsx`

**Requirements**:
- Define routes for: /, /protocols, /scans, /validations, /payments
- Protected routes requiring Supabase auth
- Redirect to /login if unauthenticated

**Acceptance**:
- All routes load correct components
- Protected routes redirect to login
- Browser back/forward work correctly

---

### Task 1.4: Integrate Supabase Auth
**Target Layer**: Frontend
**Files**:
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/components/Login/WalletConnect.tsx`

**Requirements**:
- SIWE (Sign-In with Ethereum) flow
- Supabase session management
- Display user wallet in sidebar

**Acceptance**:
- Users can connect with MetaMask/WalletConnect
- Session persists on refresh
- Logout clears session

---

## Phase 2: Dashboard Components

### Task 2.1: Build StatCard Component
**Target Layer**: Frontend
**Files**:
- `src/components/shared/StatCard.tsx`
- `src/components/shared/StatCard.stories.tsx`

**Requirements**:
- Display title, value, subtitle (optional)
- Support icon (top-right corner)
- Progress bar variant for bounty pool
- Loading skeleton state
- Props: `title`, `value`, `subtitle`, `icon`, `variant`

**Acceptance**:
- Renders with all prop combinations
- Progress bar animates smoothly
- Loading state displays skeleton

---

### Task 2.2: Implement ProtocolOverview Card
**Target Layer**: Frontend
**Files**:
- `src/components/Dashboard/ProtocolOverview.tsx`

**Requirements**:
- Display protocol name + contract address (truncated)
- Monitoring status badge ("MONITORING ACTIVE" in green)
- Fetches data from `GET /api/v1/protocols/:id`
- Uses TanStack Query for data fetching

**Acceptance**:
- Displays protocol details correctly
- Handles loading and error states
- Updates when protocol changes

---

### Task 2.3: Build StatisticsPanel
**Target Layer**: Frontend
**Files**:
- `src/components/Dashboard/StatisticsPanel.tsx`

**Requirements**:
- Three StatCards: Bounty Pool, Vulns Found, Total Paid
- Bounty Pool shows progress bar (used/total)
- Vulns Found shows count + pending critical badge
- Total Paid shows last payment timestamp
- Fetches from `GET /api/v1/stats`

**Acceptance**:
- All three cards display correct data
- Progress bar reflects actual pool usage
- Updates in real-time via WebSocket

---

### Task 2.4: Create AgentStatusGrid
**Target Layer**: Frontend
**Files**:
- `src/components/Dashboard/AgentStatusGrid.tsx`
- `src/components/Dashboard/AgentStatusCard.tsx`

**Requirements**:
- Three agent cards: Protocol, Researcher, Validator
- Each shows: icon, name, current task, status (ONLINE/BUSY/OFFLINE)
- Status indicator with pulsing animation for BUSY
- Fetches from `GET /api/v1/agents`
- Real-time updates via `agent:status` WebSocket event

**Acceptance**:
- All agents display with correct status
- Status updates in real-time
- Hover shows tooltip with last heartbeat

---

### Task 2.5: Build VulnerabilitiesTable
**Target Layer**: Frontend
**Files**:
- `src/components/Dashboard/VulnerabilitiesTable.tsx`
- `src/components/shared/SeverityBadge.tsx`
- `src/components/shared/StatusBadge.tsx`

**Requirements**:
- Columns: Vulnerability (title + description), Severity, Researcher (wallet), Status, Action
- Sortable by severity and date
- Severity badge with color coding (CRITICAL=red, HIGH=orange, etc.)
- "View Tx" action button opens Basescan
- "Details" action opens vulnerability detail modal
- Fetches from `GET /api/v1/protocols/:id/vulnerabilities`

**Acceptance**:
- Table displays all vulnerabilities
- Sorting works for severity and date
- Action buttons navigate correctly

---

### Task 2.6: Implement CriticalAlertBanner
**Target Layer**: Frontend
**Files**:
- `src/components/Dashboard/CriticalAlertBanner.tsx`

**Requirements**:
- Red background with alert icon
- Display critical vulnerability message
- "View Report" button (navigation to vulnerability detail)
- Dismissable with X button (persists to localStorage)
- Only shows for CRITICAL severity findings

**Acceptance**:
- Banner displays for critical vulns
- Dismiss button hides banner
- Dismiss state persists on refresh

---

## Phase 3: Real-time Integration

### Task 3.1: Set up WebSocket Connection Manager
**Target Layer**: Frontend
**Files**:
- `src/lib/websocket.ts`
- `src/hooks/useWebSocket.ts`

**Requirements**:
- Connect to `wss://api.example.com`
- Auto-reconnect with exponential backoff
- Subscribe to rooms: protocols, vulnerabilities, agents
- Emit connection status to Zustand store

**Acceptance**:
- Connection establishes on mount
- Reconnects on disconnect
- Connection status visible in UI

---

### Task 3.2: Implement WebSocket Event Handlers
**Target Layer**: Frontend
**Files**:
- `src/hooks/useDashboardEvents.ts`

**Requirements**:
- Handle `protocol:updated` - refresh protocol card
- Handle `vuln:discovered` - add to table + show toast
- Handle `vuln:confirmed` - update status in table
- Handle `agent:status` - update agent cards
- Handle `payment:released` - show toast + update stats

**Acceptance**:
- All events trigger correct UI updates
- No duplicate event handling
- Events update Zustand store

---

### Task 3.3: Add Optimistic UI Updates
**Target Layer**: Frontend
**Files**:
- `src/hooks/useOptimisticUpdate.ts`

**Requirements**:
- Optimistically update UI before API confirmation
- Rollback on API failure
- Show inline error messages

**Acceptance**:
- UI updates immediately on action
- Rollback works on failure
- Error messages are clear

---

### Task 3.4: Build Toast Notification System
**Target Layer**: Frontend
**Files**:
- `src/components/shared/Toast.tsx`
- Use `sonner` library

**Requirements**:
- Success toast for payments released
- Warning toast for new vulnerabilities
- Error toast for agent failures
- Dismissable with X or auto-dismiss after 5s

**Acceptance**:
- Toasts appear in top-right corner
- Multiple toasts stack correctly
- Auto-dismiss works

---

## Phase 4: Data Fetching & State

### Task 4.1: Implement TanStack Query Hooks
**Target Layer**: Frontend
**Files**:
- `src/hooks/useProtocol.ts`
- `src/hooks/useVulnerabilities.ts`
- `src/hooks/useAgents.ts`
- `src/hooks/useStats.ts`

**Requirements**:
- Define query keys and fetch functions
- Enable refetch on window focus
- Cache responses with 5-minute stale time
- Include error and loading states

**Acceptance**:
- All hooks return correct data types
- Loading states work
- Errors handled gracefully

---

### Task 4.2: Set up Zustand Dashboard Store
**Target Layer**: Frontend
**Files**:
- `src/store/dashboardStore.ts`

**Requirements**:
```typescript
interface DashboardStore {
  selectedProtocolId: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastEventId: string;

  setSelectedProtocol: (id: string) => void;
  setConnectionStatus: (status: string) => void;
  handleWSEvent: (event: WSEvent) => void;
}
```

**Acceptance**:
- Store persists selected protocol
- Connection status updates correctly
- WebSocket events update store

---

### Task 4.3: Add Loading Skeletons
**Target Layer**: Frontend
**Files**:
- `src/components/shared/SkeletonCard.tsx`
- `src/components/shared/SkeletonTable.tsx`

**Requirements**:
- Animated shimmer effect
- Match exact dimensions of loaded content
- Show during initial load and refetch

**Acceptance**:
- Skeletons match component dimensions
- Animation is smooth
- Skeletons replace correctly

---

### Task 4.4: Implement Error Boundaries
**Target Layer**: Frontend
**Files**:
- `src/components/shared/ErrorBoundary.tsx`
- `src/components/shared/ErrorFallback.tsx`

**Requirements**:
- Catch React errors
- Display user-friendly error message
- "Retry" button to reset state
- Log errors to Sentry (if configured)

**Acceptance**:
- Errors don't crash entire app
- Fallback UI is helpful
- Retry button works

---

## Phase 5: Polish & Accessibility

### Task 5.1: Apply Design System Styling
**Target Layer**: Frontend
**Files**:
- `tailwind.config.js` (update)
- All component files

**Requirements**:
- Define color palette in Tailwind config
- Apply consistent spacing (8px grid)
- Use design tokens for colors
- Match UI mockup exactly

**Acceptance**:
- Colors match mockup
- Spacing is consistent
- Typography sizes correct

---

### Task 5.2: Add Keyboard Navigation
**Target Layer**: Frontend
**Files**:
- All interactive components

**Requirements**:
- Tab order follows visual hierarchy
- Focus indicators visible (blue ring)
- Enter/Space activate buttons
- Escape dismisses modals/alerts

**Acceptance**:
- All interactive elements keyboard accessible
- Focus indicators always visible
- Tab order is logical

---

### Task 5.3: Implement ARIA Labels
**Target Layer**: Frontend
**Files**:
- All components

**Requirements**:
- Add `aria-label` to icon buttons
- Add `role` attributes where needed
- Add `aria-live` to real-time updates
- Add `aria-describedby` for error messages

**Acceptance**:
- Screen reader announces all content
- ARIA roles are correct
- Live regions work

---

### Task 5.4: Add Responsive Breakpoints
**Target Layer**: Frontend
**Files**:
- All layout components

**Requirements**:
- Mobile (< 768px): Stack cards vertically, hide sidebar
- Tablet (768px - 1024px): 2-column grid
- Desktop (> 1024px): Full layout as designed

**Acceptance**:
- Layout works on all screen sizes
- No horizontal scroll on mobile
- Touch targets are 44x44px minimum

---

## Testing Tasks

### Task T.1: Unit Tests for Components
**Files**:
- `src/components/**/*.test.tsx`

**Requirements**:
- Test all component render states
- Test user interactions (click, hover)
- Test prop variations
- Use React Testing Library

---

### Task T.2: Integration Tests for Dashboard
**Files**:
- `src/pages/Dashboard.test.tsx`

**Requirements**:
- Test full dashboard load
- Test WebSocket event handling
- Test API error scenarios
- Mock Supabase auth

---

### Task T.3: E2E Tests with Playwright
**Files**:
- `e2e/dashboard.spec.ts`

**Requirements**:
- Test login flow
- Test vulnerability table interaction
- Test real-time updates
- Test navigation

---

## Dependencies Installation

```bash
npm install @tanstack/react-query zustand sonner lucide-react recharts
npm install -D @testing-library/react @testing-library/user-event vitest
```
