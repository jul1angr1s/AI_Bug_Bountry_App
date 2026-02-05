# Design: Protocols Page Facelift

## Context

The Protocols page serves as the central hub for viewing all registered smart contract protocols, their security status, and scan progress. The current implementation (256 lines in Protocols.tsx) provides basic grid/list functionality but lacks the visual sophistication of the newly redesigned dashboard.

This transformation will bring the Protocols page to the same quality standard as the dashboard while maintaining all existing functionality and adding new overview statistics.

## Goals

**Primary Goals:**
1. Match visual quality and design language of the dashboard facelift
2. Add statistics overview section for platform-wide protocol metrics
3. Enhance search and filtering with modern UI patterns
4. Redesign protocol cards with better information hierarchy
5. Maintain all existing functionality (pagination, real-time updates, etc.)
6. Zero backend changes (use existing API endpoints)

**Non-Goals:**
1. Add new backend endpoints or modify API contracts
2. Change protocol registration flow or forms
3. Add protocol detail page redesign (separate change)
4. Implement bulk actions or protocol management features
5. Add new filtering criteria beyond existing status filter

## Decisions

### Decision 1: Reuse Dashboard Design System Components

**Chosen Approach:** Import and reuse all shared components from dashboard facelift (MaterialIcon, GlowCard, GradientButton, PulseIndicator).

**Rationale:**
- Ensures perfect consistency with dashboard aesthetic
- Zero development time for component creation
- Smaller bundle size (no duplicate components)
- Proven components with existing testing and refinement
- Accelerates development timeline significantly

**Alternatives Considered:**
- Create separate protocol-specific components: Rejected due to code duplication and maintenance overhead
- Mix old and new components: Rejected due to visual inconsistency

**Implementation:**
```typescript
import { MaterialIcon } from '../components/shared/MaterialIcon';
import { GlowCard } from '../components/shared/GlowCard';
import { GradientButton } from '../components/shared/GradientButton';
import { PulseIndicator } from '../components/shared/PulseIndicator';
```

### Decision 2: Add Stats Section Without Backend Changes

**Chosen Approach:** Calculate statistics client-side from existing protocols data returned by `/api/v1/protocols` endpoint.

**Rationale:**
- No backend development required (faster delivery)
- Avoids API versioning complexity
- Statistics update automatically with real-time protocol updates
- Simple aggregation logic suitable for client-side computation
- Current protocol list already fetched for display

**Alternatives Considered:**
- Add `/api/v1/protocols/statistics` endpoint: Rejected to minimize scope and avoid backend changes
- Fetch separate endpoint for each stat: Rejected due to multiple round trips
- Skip stats section entirely: Rejected as it provides valuable overview

**Implementation:**
```typescript
const stats = useMemo(() => {
  if (!data?.protocols) return null;
  return {
    totalValueSecured: data.protocols.reduce((sum, p) => sum + (p.tvl || 0), 0),
    activeBounties: data.protocols.filter(p => p.status === 'ACTIVE').length,
    bountiesPaid: data.protocols.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    findingsFixed: data.protocols.reduce((sum, p) => sum + (p.vulnerabilitiesFixed || 0), 0),
  };
}, [data?.protocols]);
```

### Decision 3: Replace Dropdown Filter with Status Chips

**Chosen Approach:** Transform status dropdown into horizontal chip buttons with Material Symbols icons.

**Rationale:**
- Better visual hierarchy and discoverability
- Matches modern web app patterns (Gmail, Notion, Linear)
- Faster interaction (single click vs. click → select)
- Shows all options simultaneously without opening dropdown
- Gradient styling provides better visual feedback
- More mobile-friendly (larger touch targets)

**Alternatives Considered:**
- Keep dropdown: Rejected as it doesn't match modern dashboard aesthetic
- Use radio buttons: Rejected due to less modern appearance
- Multi-select checkboxes: Rejected as single status filter is sufficient

**Implementation:**
```typescript
<div className="flex items-center gap-2 flex-wrap">
  {['Active', 'Scanning', 'Paused'].map(status => (
    <button
      key={status}
      onClick={() => setStatusFilter(status === statusFilter ? '' : status)}
      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
        statusFilter === status
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glow-purple'
          : 'bg-navy-800 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
      }`}
    >
      <MaterialIcon name={getStatusIcon(status)} className="text-lg" />
      <span>{status}</span>
    </button>
  ))}
</div>
```

### Decision 4: Add Search with Debounced Input

**Chosen Approach:** Add search input with 300ms debounce, filtering by protocol name and contract address.

**Rationale:**
- Essential feature for users managing many protocols
- Debouncing prevents excessive re-renders during typing
- Client-side filtering is fast for typical protocol counts (<100)
- Material Symbols search icon maintains design consistency
- Clear button provides good UX when search is active

**Alternatives Considered:**
- Server-side search: Rejected as it requires backend changes
- No debounce: Rejected due to performance concerns with rapid typing
- Search-as-you-type without clear: Rejected due to poor UX

**Implementation:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

const filteredProtocols = useMemo(() => {
  if (!debouncedSearch) return data?.protocols || [];
  return data?.protocols.filter(p =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.contractAddress.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];
}, [data?.protocols, debouncedSearch]);
```

### Decision 5: Redesign Protocol Cards with GlowCard

**Chosen Approach:** Replace basic card styling with GlowCard wrapper and modern layout matching dashboard agent cards.

**Rationale:**
- Visual consistency with dashboard creates cohesive platform experience
- Hover glow effects provide interactive feedback
- Background icons add visual interest without clutter
- Gradient progress bars are more visually appealing than basic bars
- PulseIndicator on status badges adds motion and attention
- Better information hierarchy with clear sections

**Card Structure:**
```
┌─────────────────────────────────────┐
│ [BG Icon]        [Status Badge]     │ ← Background shield icon + pulse status
│                                     │
│ [Protocol Logo/Avatar]              │ ← Logo or gradient fallback
│ Protocol Name                       │ ← Space Grotesk heading
│ 0x1234...5678                       │ ← Truncated address
│                                     │
│ ┌───────────┬───────────┬─────────┐│
│ │ $2.5M TVL │ 5 Bounties│ 12 Scans││ ← Key metrics row
│ └───────────┴───────────┴─────────┘│
│                                     │
│ Risk Score: [====    ] 65%          │ ← Gradient progress bar
│ Last scan: 2 hours ago              │ ← Relative time
│                                     │
└─────────────────────────────────────┘
```

**Alternatives Considered:**
- Keep current card design: Rejected due to visual inconsistency with dashboard
- Table view for desktop: Rejected as cards provide better visual hierarchy
- Minimal card design: Rejected as it doesn't showcase platform sophistication

### Decision 6: Maintain Existing Pagination and Backend Integration

**Chosen Approach:** Keep current pagination logic and useProtocols hook unchanged.

**Rationale:**
- Pagination already works well with backend API
- Real-time updates via useProtocolsRealtime are valuable
- No need to change what's working
- Focus design efforts on visual transformation
- Reduces testing surface area

**No Changes To:**
- `useProtocols({ status, page, limit })` hook
- `useProtocolsRealtime()` subscription
- Pagination buttons and logic
- API request/response format
- Error handling and loading states

## Layout Structure

### Desktop (lg+):
```
┌─────────────────────────────────────────────────────────────┐
│ Protocols                                [Refresh] [Register]│ ← Header
├─────────────────────────────────────────────────────────────┤
│ [Total Value] [Active Bounties] [Paid] [Fixed]             │ ← Stats (4-col)
├─────────────────────────────────────────────────────────────┤
│ [Search........................] [Active] [Scanning] [Paused]│ ← Search + Filters
├─────────────────────────────────────────────────────────────┤
│ [Card 1]      [Card 2]      [Card 3]                        │
│ [Card 4]      [Card 5]      [Card 6]                        │ ← Protocol Grid (3-col)
│ [Card 7]      [Card 8]      [Card 9]                        │
├─────────────────────────────────────────────────────────────┤
│              [Previous] 1 2 3 [Next]                        │ ← Pagination
└─────────────────────────────────────────────────────────────┘
```

### Tablet (md):
```
┌───────────────────────────────────┐
│ Protocols            [Btn] [Btn]  │
├───────────────────────────────────┤
│ [Stat 1]           [Stat 2]       │ ← Stats (2-col)
│ [Stat 3]           [Stat 4]       │
├───────────────────────────────────┤
│ [Search....................]      │ ← Search full width
│ [Active] [Scanning] [Paused]      │ ← Filters wrapped
├───────────────────────────────────┤
│ [Card 1]           [Card 2]       │ ← Protocol Grid (2-col)
│ [Card 3]           [Card 4]       │
└───────────────────────────────────┘
```

### Mobile (sm):
```
┌─────────────────────┐
│ Protocols           │
│ [Btn]               │
│ [Btn]               │
├─────────────────────┤
│ [Stat 1]            │ ← Stats (1-col)
│ [Stat 2]            │
│ [Stat 3]            │
│ [Stat 4]            │
├─────────────────────┤
│ [Search........]    │
│ [Active]            │ ← Filters stacked
│ [Scanning]          │
│ [Paused]            │
├─────────────────────┤
│ [Card 1]            │ ← Protocol Grid (1-col)
│ [Card 2]            │
│ [Card 3]            │
└─────────────────────┘
```

## Component Breakdown

### New Components:

1. **ProtocolStatsCard** (`/frontend/src/components/protocols/ProtocolStatsCard.tsx`)
   - Props: `icon: string`, `label: string`, `value: string | number`, `color: string`
   - Reuses MaterialIcon and navy-800 background
   - Glow effect on hover matching color prop

2. **ProtocolSearchBar** (`/frontend/src/components/protocols/ProtocolSearchBar.tsx`)
   - Props: `value: string`, `onChange: (value: string) => void`
   - Material Symbols search icon
   - Clear button (X icon) when value is not empty
   - Debounce handled in parent component

3. **StatusFilterChips** (`/frontend/src/components/protocols/StatusFilterChips.tsx`)
   - Props: `selected: string`, `onChange: (status: string) => void`
   - Status options: Active, Scanning, Paused
   - Material Symbols icons mapped to each status
   - Gradient background when selected

4. **ModernProtocolCard** (`/frontend/src/components/protocols/ModernProtocolCard.tsx`)
   - Replaces current ProtocolCard with modern design
   - Uses GlowCard wrapper
   - Background shield icon with opacity
   - Protocol logo/avatar with fallback gradients
   - Status badge with PulseIndicator
   - Metrics row (TVL, Bounties, Scans)
   - Gradient progress bar for risk score
   - Relative timestamp with date-fns
   - Click handler navigates to protocol detail

### Modified Components:

1. **Protocols.tsx** (`/frontend/src/pages/Protocols.tsx`)
   - Add stats section at top
   - Replace dropdown with StatusFilterChips
   - Add ProtocolSearchBar
   - Replace ProtocolCard with ModernProtocolCard
   - Update grid classes for responsive layout
   - Add stats calculation logic
   - Add search state and debouncing

## Risks & Trade-offs

### Risk 1: Client-Side Stats Calculation Performance

**Risk:** Aggregating stats from all protocols may be slow with large datasets (500+ protocols).

**Mitigation:**
- Use React useMemo to cache calculations
- Only recalculate when protocols data changes
- Typical platform has <100 protocols (acceptable for client-side)
- Show loading state for stats section separately

**Trade-off Accepted:** Client-side calculation avoids backend work; acceptable for typical use case.

### Risk 2: Search Performance with Many Protocols

**Risk:** Client-side search filtering may be slow with 500+ protocols.

**Mitigation:**
- 300ms debounce prevents excessive filtering during typing
- Simple string includes is fast (O(n) where n = protocol count)
- Use useMemo to cache filtered results
- Pagination limits rendered cards regardless of search results

**Trade-off Accepted:** Server-side search would require API changes; client-side sufficient for v1.

### Risk 3: Visual Consistency as Design Evolves

**Risk:** Dashboard design system may evolve, causing protocol cards to look outdated.

**Mitigation:**
- Document dependency on dashboard shared components
- Versioning in OpenSpec tracks design system changes
- Future dashboard updates should consider protocol page impact
- Automated visual regression testing (future enhancement)

**Trade-off Accepted:** Living design systems require ongoing maintenance; benefit outweighs cost.

## Migration Plan

### Phase 1: Create New Components
1. Create ProtocolStatsCard component
2. Create ProtocolSearchBar component
3. Create StatusFilterChips component
4. Create ModernProtocolCard component
5. Add TypeScript types for all props

### Phase 2: Update Protocols.tsx
1. Import new components and dashboard shared components
2. Add search state and debouncing logic
3. Add stats calculation useMemo hook
4. Add stats section rendering
5. Replace filter dropdown with StatusFilterChips
6. Add ProtocolSearchBar above filters
7. Update filtered protocols logic to include search
8. Replace ProtocolCard with ModernProtocolCard
9. Update responsive grid classes

### Phase 3: Testing
1. Test on desktop (1920x1080) - verify 3-column grid and 4-column stats
2. Test on tablet (768x1024) - verify 2-column grid and 2-column stats
3. Test on mobile (375x667) - verify single column layout
4. Test search functionality with various queries
5. Test status filter chips (single selection)
6. Test stats calculation with empty, few, and many protocols
7. Test pagination with search and filters applied
8. Test real-time updates with useProtocolsRealtime

### Phase 4: Documentation & PR
1. Update frontend README with new components
2. Add screenshots to OpenSpec change
3. Create PR following GitOps workflow
4. Request design review
5. Merge and archive OpenSpec change

## Open Questions

**Q1: Should stats include all protocols or respect current filters?**
- **Decision:** Show all protocols in stats (global overview). Filters only apply to card list below.

**Q2: Should search be persistent across page navigation (URL query param)?**
- **Decision:** No. Keep search as ephemeral component state for v1. Add URL persistence in future iteration if users request it.

**Q3: Should we add view mode toggle (grid/list) with new design?**
- **Decision:** Keep view mode toggle but style list view to match new aesthetic. Both views should use ModernProtocolCard with different layouts.

**Q4: Should empty state match new design system?**
- **Decision:** Yes. Update empty state illustration and button styling to use GradientButton and modern spacing.

**Q5: Should we show protocol logos or use gradient avatars?**
- **Decision:** Use protocol logos if available from API, fallback to gradient avatars with protocol initials (similar to dashboard agent cards).
