# Tasks: Protocols Page Facelift

## Phase 1: OpenSpec Documentation + Git Setup

### 1.1 Create OpenSpec Change Structure
- [x] Create directory: `openspec/changes/2026-02-05-protocols-facelift/`
- [x] Write `.openspec.yaml` with metadata
- [x] Write `proposal.md` with problem/solution/outcome
- [x] Write `design.md` with technical decisions
- [x] Write `tasks.md` with implementation breakdown

**Refs:** proposal.md, design.md

### 1.2 Git Setup
- [ ] Checkout main branch
- [ ] Pull latest changes
- [ ] Create feature branch: `feature/protocols-facelift`

**Refs:** PR Guidelines (openspec/specs/pr-guidelines.md)

### 1.3 Commit OpenSpec Documentation
- [ ] Stage all OpenSpec files
- [ ] Commit with message: "docs(openspec): create protocols facelift change documentation"

---

## Phase 2: Create New Protocol Components

### 2.1 Create ProtocolStatsCard Component
- [ ] Create file: `/frontend/src/components/protocols/ProtocolStatsCard.tsx`
- [ ] Import MaterialIcon from shared components
- [ ] Props: `icon: string`, `label: string`, `value: string | number`, `color: 'cyan' | 'purple' | 'blue' | 'green'`
- [ ] Layout: Icon left, label + value right (vertical stack)
- [ ] Background: navy-800 with rounded-lg
- [ ] Hover effect: glow shadow matching color prop
- [ ] Export with TypeScript interface

**Refs:** design.md (Decision 2)

### 2.2 Create ProtocolSearchBar Component
- [ ] Create file: `/frontend/src/components/protocols/ProtocolSearchBar.tsx`
- [ ] Import MaterialIcon from shared components
- [ ] Props: `value: string`, `onChange: (value: string) => void`, `placeholder?: string`
- [ ] Render input with search icon (left side)
- [ ] Add clear button (X icon) on right when value is not empty
- [ ] Style with navy-800 background and border-gray-800
- [ ] Focus state: ring-2 ring-primary
- [ ] Export with TypeScript interface

**Refs:** design.md (Decision 4)

### 2.3 Create StatusFilterChips Component
- [ ] Create file: `/frontend/src/components/protocols/StatusFilterChips.tsx`
- [ ] Import MaterialIcon from shared components
- [ ] Props: `selected: string`, `onChange: (status: string) => void`
- [ ] Define status options: `['Active', 'Scanning', 'Paused']`
- [ ] Map icons: Active → check_circle, Scanning → radar, Paused → pause_circle
- [ ] Render chip buttons with flex layout
- [ ] Selected state: gradient bg (purple to pink) with glow shadow
- [ ] Unselected state: navy-800 with border-gray-800
- [ ] Click toggles selection (click again to clear)
- [ ] Export with TypeScript interface

**Refs:** design.md (Decision 3)

### 2.4 Create ModernProtocolCard Component
- [ ] Create file: `/frontend/src/components/protocols/ModernProtocolCard.tsx`
- [ ] Import: GlowCard, MaterialIcon, PulseIndicator from shared
- [ ] Import StatusBadge (modify to accept PulseIndicator)
- [ ] Props: `protocol: Protocol` (use existing Protocol type)
- [ ] Wrap content in GlowCard with color based on status
- [ ] Add background shield icon with opacity-10
- [ ] Add protocol logo/avatar (fallback to gradient with initials)
- [ ] Add heading with protocol name (Space Grotesk)
- [ ] Add truncated contract address with copy button
- [ ] Add status badge with PulseIndicator in top-right corner
- [ ] Add metrics row (3 columns): TVL, Bounty Pool, Scans Completed
- [ ] Add gradient progress bar for risk score
- [ ] Add "Last scan" with relative time (format with date-fns formatDistanceToNow)
- [ ] Add onClick handler to navigate to protocol detail page
- [ ] Add hover effects: scale-105 transition and glow shadow
- [ ] Export with TypeScript interface

**Refs:** design.md (Decision 5)

### 2.5 Commit New Components
- [ ] Stage all new protocol components
- [ ] Commit with message: "feat(frontend): add modern protocol page components"

---

## Phase 3: Update Protocols.tsx Page

### 3.1 Import New Components
- [ ] Read current `/frontend/src/pages/Protocols.tsx`
- [ ] Add imports: ProtocolStatsCard, ProtocolSearchBar, StatusFilterChips, ModernProtocolCard
- [ ] Add imports from shared: MaterialIcon, GradientButton
- [ ] Import date-fns formatDistanceToNow if not already imported

**Target:** `/frontend/src/pages/Protocols.tsx`

### 3.2 Add Search State and Debouncing
- [ ] Add state: `const [searchQuery, setSearchQuery] = useState('')`
- [ ] Add state: `const [debouncedSearch, setDebouncedSearch] = useState('')`
- [ ] Add useEffect for debounce (300ms delay)
- [ ] Clean up timeout in useEffect return

**Refs:** design.md (Decision 4)

### 3.3 Add Stats Calculation Logic
- [ ] Create useMemo hook for stats calculation
- [ ] Calculate: totalValueSecured (sum of all protocol TVL)
- [ ] Calculate: activeBounties (count of protocols with status ACTIVE)
- [ ] Calculate: bountiesPaid (sum of all protocol totalPaid amounts)
- [ ] Calculate: findingsFixed (sum of all protocol vulnerabilitiesFixed)
- [ ] Return null if data.protocols is empty
- [ ] Add TypeScript interface for stats object

**Refs:** design.md (Decision 2)

### 3.4 Update Filtered Protocols Logic
- [ ] Create or modify filteredProtocols useMemo
- [ ] Filter by debouncedSearch (name or contractAddress includes query)
- [ ] Then filter by statusFilter (existing logic)
- [ ] Case-insensitive search with .toLowerCase()
- [ ] Return filtered array

**Refs:** design.md (Decision 4)

### 3.5 Add Stats Section Rendering
- [ ] After header, before filters section
- [ ] Render 4-column grid on desktop (lg:grid-cols-4)
- [ ] Render 2-column grid on tablet (md:grid-cols-2)
- [ ] Render 1-column grid on mobile (grid-cols-1)
- [ ] Render ProtocolStatsCard for each stat:
  - Total Value Secured: icon=lock, color=cyan, value formatted as currency
  - Active Bounties: icon=bug_report, color=purple, value=count
  - Bounties Paid: icon=payments, color=blue, value formatted as currency
  - Findings Fixed: icon=verified, color=green, value=count
- [ ] Show loading skeleton when isLoading
- [ ] Add margin bottom (mb-6)

**Refs:** design.md (Layout Structure)

### 3.6 Replace Filter Dropdown with StatusFilterChips
- [ ] Remove select dropdown element
- [ ] Replace with ProtocolSearchBar component
- [ ] Pass searchQuery and setSearchQuery as props
- [ ] Add StatusFilterChips below search bar
- [ ] Pass statusFilter and setStatusFilter as props
- [ ] Update flex layout for search bar and chips (responsive)
- [ ] Keep "Filter:" label or remove (StatusFilterChips are self-explanatory)

**Refs:** design.md (Decision 3)

### 3.7 Update Protocols Grid Section
- [ ] Replace ProtocolCard import with ModernProtocolCard
- [ ] Update grid classes: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (no more 3x3 grid option)
- [ ] Pass protocol data to ModernProtocolCard
- [ ] Remove viewMode toggle buttons (keep only grid view for v1)
- [ ] Update loading skeleton grid to match 3-column layout
- [ ] Keep pagination logic unchanged

**Refs:** design.md (Decision 5)

### 3.8 Update Empty State Styling
- [ ] Replace Plus icon with MaterialIcon
- [ ] Replace button with GradientButton component
- [ ] Update gradient colors to match new palette
- [ ] Keep existing empty state logic and messaging

**Refs:** design.md (Q4)

### 3.9 Update No Results State
- [ ] Replace Search icon with MaterialIcon
- [ ] Update button styling to match modern design
- [ ] Keep existing logic for clearing filter

### 3.10 Commit Protocols Page Updates
- [ ] Stage Protocols.tsx
- [ ] Commit with message: "feat(frontend): redesign protocols page with modern layout"

---

## Phase 4: Testing

### 4.1 Manual Testing - Desktop
- [ ] Test on 1920x1080 resolution
- [ ] Verify stats section shows 4 columns with correct calculations
- [ ] Verify protocol cards display in 3-column grid
- [ ] Test search functionality (type protocol name, verify filtering)
- [ ] Test status filter chips (click Active, Scanning, Paused)
- [ ] Verify hover effects on cards (glow shadow, scale transform)
- [ ] Test card click navigation to protocol detail
- [ ] Test pagination with search and filter applied
- [ ] Verify real-time updates (create new protocol, see it appear)

**Refs:** design.md (Layout Structure)

### 4.2 Manual Testing - Tablet
- [ ] Test on 768x1024 resolution
- [ ] Verify stats section shows 2 columns (2x2 layout)
- [ ] Verify protocol cards display in 2-column grid
- [ ] Test search bar (full width)
- [ ] Test status filter chips (responsive wrapping)
- [ ] Test all interactive elements (touch-friendly targets)

### 4.3 Manual Testing - Mobile
- [ ] Test on 375x667 resolution (iPhone SE)
- [ ] Verify stats section shows 1 column (stacked)
- [ ] Verify protocol cards display in 1 column
- [ ] Test search bar (full width)
- [ ] Test status filter chips (stacked or wrapped)
- [ ] Verify header buttons stack or shrink appropriately
- [ ] Test touch interactions and scrolling

### 4.4 Edge Case Testing
- [ ] Test with 0 protocols (empty state)
- [ ] Test with 1 protocol
- [ ] Test with 50+ protocols (pagination)
- [ ] Test search with no results
- [ ] Test filter with no matching protocols
- [ ] Test search + filter combination
- [ ] Test with very long protocol names (text truncation)
- [ ] Test with missing protocol data fields (TVL, bounty pool, etc.)

### 4.5 Performance Testing
- [ ] Verify stats calculation with 100+ protocols (useMemo caching)
- [ ] Verify search debounce (no lag during fast typing)
- [ ] Check console for errors or warnings
- [ ] Verify no memory leaks (open/close page multiple times)
- [ ] Test with React DevTools Profiler (identify slow renders)

### 4.6 Cross-Browser Testing
- [ ] Test in Chrome (primary browser)
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Verify Material Symbols icons load correctly

---

## Phase 5: Documentation + PR

### 5.1 Add Screenshots
- [ ] Take screenshot: Desktop view with stats and cards
- [ ] Take screenshot: Mobile view (stacked layout)
- [ ] Take screenshot: Search in action
- [ ] Take screenshot: Filter chips selected state
- [ ] Take screenshot: Card hover effect
- [ ] Save screenshots to `/project/UI/` directory

**Target:** `/project/UI/Protocols-Modern.png`

### 5.2 Update OpenSpec Change
- [ ] Update `.openspec.yaml` status to `completed`
- [ ] Add completion date
- [ ] Update artifacts completion status
- [ ] Add notes about implementation details

**Target:** `/openspec/changes/2026-02-05-protocols-facelift/.openspec.yaml`

### 5.3 Create Pull Request
- [ ] Stage all remaining changes
- [ ] Create final commit: "test(frontend): comprehensive protocols page testing"
- [ ] Push branch: `git push -u origin feature/protocols-facelift`
- [ ] Create PR with gh CLI: `gh pr create --title "..." --body "..."`
- [ ] Include screenshots in PR description
- [ ] Request review from team

**Refs:** pr-guidelines.md

### 5.4 PR Description Template
```markdown
## Summary
Modern redesign of the Protocols page to match dashboard facelift standards. Transforms basic grid view into visually stunning card-based interface with statistics overview, enhanced search, and filter chips.

## Changes
### Frontend
- ✅ Statistics section: Total Value Secured, Active Bounties, Bounties Paid, Findings Fixed
- ✅ Search bar with debounced input for protocol name/address filtering
- ✅ Status filter chips (Active, Scanning, Paused) replacing dropdown
- ✅ Modern protocol cards with GlowCard wrapper and hover effects
- ✅ Responsive layout: 3-col (desktop) → 2-col (tablet) → 1-col (mobile)
- ✅ Material Symbols icons throughout
- ✅ Space Grotesk headings and Noto Sans body text
- ✅ Client-side stats calculation (no backend changes)

### Components Created
- `ProtocolStatsCard.tsx` - Statistics display card
- `ProtocolSearchBar.tsx` - Search input with clear button
- `StatusFilterChips.tsx` - Modern filter chip buttons
- `ModernProtocolCard.tsx` - Redesigned protocol card

### Components Modified
- `Protocols.tsx` - Complete page restructure with new layout

## Testing
- ✅ Manual testing: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- ✅ Search functionality: debouncing, filtering, clear button
- ✅ Filter chips: single selection, visual feedback
- ✅ Stats calculation: edge cases (0, 1, 50+ protocols)
- ✅ Pagination: works with search and filters
- ✅ Real-time updates: useProtocolsRealtime verified
- ✅ Responsive layout: all breakpoints tested
- ✅ Cross-browser: Chrome, Firefox, Safari

## Screenshots
[Protocols Page - Desktop]
[Protocols Page - Mobile]
[Search and Filters]
[Card Hover Effect]

## Refs
openspec/changes/2026-02-05-protocols-facelift

## Design System
- Reuses dashboard facelift components (GlowCard, MaterialIcon, GradientButton)
- Maintains design consistency across platform
- Zero new dependencies
```

---

## Success Criteria

**All tasks completed when:**
- [ ] Stats section displays 4 key metrics with correct calculations
- [ ] Search bar filters protocols by name and contract address
- [ ] Status filter chips work with single selection
- [ ] Protocol cards display modern design with hover effects
- [ ] Responsive layout works perfectly on desktop/tablet/mobile
- [ ] All existing functionality maintained (pagination, real-time updates, navigation)
- [ ] Zero backend changes required
- [ ] No console errors or warnings
- [ ] PR created, reviewed, and merged
- [ ] OpenSpec change archived with status: completed
