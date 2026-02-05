# Proposal: Protocols Page Facelift

## Summary

Transform the Protocols page from a basic table/grid view into a modern, visually stunning interface with statistics overview, enhanced search capabilities, and card-based protocol display matching the dashboard facelift design system.

## Problem

The current Protocols page is functional but lacks visual sophistication:
- Basic grid/list toggle with minimal visual hierarchy
- No overview statistics (total value secured, active bounties, etc.)
- Simple status filter dropdown without modern design elements
- Using outdated lucide-react icons
- Missing search functionality for finding specific protocols
- Card design doesn't match the modern dashboard aesthetic
- No visual feedback for protocol health or security metrics
- Static color scheme without gradients or glow effects

This creates an inconsistent experience when navigating from the modern dashboard to the protocols page, undermining the platform's professional appearance.

## Solution

Complete visual transformation following the dashboard facelift design system:

**Stats Section (New):**
1. Four key metrics cards at the top:
   - Total Value Secured (aggregate of all protocol TVL)
   - Active Bounties (protocols with active scanning)
   - Bounties Paid (total payouts across all protocols)
   - Findings Fixed (total vulnerabilities resolved)
2. Material Symbols icons with glow effects
3. Responsive 4-column grid (2-column on tablet, single column on mobile)

**Search and Filters (Enhanced):**
1. Search bar with Material Symbols search icon
   - Real-time filtering by protocol name or contract address
   - Debounced input for performance
   - Clear button when search is active
2. Status filter chips (replacing dropdown)
   - Active, Scanning, Paused status filters
   - Multiple selection support
   - Gradient background when selected
   - Material Symbols icons for each status

**Protocol Cards (Redesigned):**
1. Modern card design matching dashboard agent cards:
   - GlowCard wrapper with hover effects
   - Background icon (shield for security status)
   - Protocol logo/avatar with fallback gradients
   - Status badge with PulseIndicator
   - Key metrics: Total Value Locked, Bounty Pool, Scans Completed
   - Risk score visualization (gradient progress bar)
   - Last scan timestamp with relative time
   - Hover effects: scale transform and glow shadow
2. Responsive grid: 3 columns (desktop) → 2 columns (tablet) → 1 column (mobile)

**Typography and Colors:**
- Space Grotesk for headings
- Noto Sans for body text
- Material Symbols Outlined icons
- Navy-900 background (#0f1723)
- Primary blue (#0663f9) with cyan/purple/green accents
- Glow shadows on hover and focus

**Existing Features (Maintained):**
- Pagination with current styling
- Register Protocol button (restyled as GradientButton)
- Empty state with call-to-action
- Error states and loading skeletons
- Real-time updates via useProtocolsRealtime hook
- Backend endpoints remain unchanged

**Dependencies:**
- No new dependencies required (leverages existing dashboard facelift components)
- Reuse: MaterialIcon, GlowCard, GradientButton, PulseIndicator
- Existing hooks: useProtocols, useProtocolsRealtime

## Outcome

**User Experience:**
- Visually stunning protocols page matching dashboard quality
- Quick overview of platform-wide protocol metrics
- Fast protocol discovery with search and filter chips
- Clear visual hierarchy emphasizing protocol health and security
- Consistent design language across the entire application
- Improved scanning of protocol cards with better information density

**Developer Experience:**
- Reusable components from dashboard facelift (no duplication)
- Clean component architecture following established patterns
- Maintainable code with TypeScript types
- Easy to extend with additional filters or metrics

**Performance:**
- No performance regression (same data fetching patterns)
- Bundle size increase negligible (reusing existing components)
- Smooth animations and transitions
- Efficient search with debounced input

**Timeline:**
- 4-6 hours focused sprint
- GitOps workflow: feature branch → PR → merge to main
- OpenSpec change documented and archived
