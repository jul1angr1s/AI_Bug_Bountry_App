# Design: UI Dashboard Implementation

## Overview

This document captures the design decisions for the dashboard UI implementation. The design is based on the UI mockup at `project/UI/Dashboard.png` and follows the Thunder Security design system.

## Design System

### Color Palette
- **Background**: Navy (#0A0E1A)
- **Cards**: Gray-800/50 with backdrop blur
- **Primary**: Electric Blue (#3B82F6)
- **Critical**: Red (#EF4444)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)

### Typography
- **Font Family**: System font stack (sans-serif)
- **Headings**: Bold weight
- **Body**: Regular weight
- **Code/Addresses**: Monospace font

### Layout
- **Sidebar**: Fixed width 200px
- **Content Area**: Fluid with max-width constraints
- **Grid**: Responsive grid system (1-3 columns based on breakpoint)

## Component Architecture

### Layout Components
- **DashboardLayout**: Fixed sidebar + fluid content wrapper
- **Sidebar**: Navigation with branding and user profile
- **NavLink**: Active state highlighting and icons

### Dashboard Components
- **ProtocolOverview**: Card showing protocol details and monitoring status
- **StatisticsPanel**: Grid of three stat cards (bounty pool, vulnerabilities, total paid)
- **AgentStatusGrid**: Real-time status cards for Protocol/Researcher/Validator agents
- **VulnerabilitiesTable**: Sortable, filterable table of findings
- **CriticalAlertBanner**: Dismissible alert for high-severity issues

### Shared Components
- **StatCard**: Reusable metric card with optional progress bar
- **StatusBadge**: Color-coded status indicator
- **SeverityBadge**: Severity-level badge for vulnerabilities
- **LoadingSkeleton**: Animated loading placeholders

## State Management

### TanStack Query (Server State)
- Protocol data
- Vulnerabilities list
- Agent status
- Dashboard statistics
- Automatic refetching and caching

### Zustand (Client State)
- Selected protocol
- Alerts/notifications
- Optimistic updates
- UI state (loading, errors)

### WebSocket (Real-time)
- Protocol status updates
- New vulnerability discoveries
- Agent state changes
- Payment notifications

## Responsive Design

### Breakpoints
- **Mobile**: < 768px - Single column layout
- **Tablet**: 768px - 1024px - Two column layout
- **Desktop**: > 1024px - Three column layout

### Mobile Adaptations
- Collapsible sidebar
- Stacked stat cards
- Horizontal scroll for tables
- Touch-friendly hit targets

## Accessibility

### WCAG AA Compliance
- Keyboard navigation support
- ARIA labels and roles
- Focus indicators
- Color contrast ratios > 4.5:1
- Screen reader announcements

### Keyboard Shortcuts
- Tab navigation through interactive elements
- Enter/Space to activate buttons
- Escape to dismiss modals/alerts
- Arrow keys for table navigation

## Performance

### Optimization Strategies
- Code splitting by route
- Lazy loading for heavy components
- Memoization of expensive computations
- Virtual scrolling for long lists
- Image optimization and lazy loading

### Loading Strategy
- Show skeleton screens immediately
- Fetch critical data first (protocol, stats)
- Defer non-critical data (vulnerabilities table)
- Progressive enhancement

## Error Handling

### Error Boundaries
- App-level boundary for catastrophic errors
- Section-level boundaries for isolated failures
- Component-level fallbacks for minor issues

### Error States
- Network errors: Retry button
- Auth errors: Redirect to login
- Data errors: Fallback to empty state
- 404 errors: "Not found" message

## Design Decisions

### Why TanStack Query?
- Automatic caching and refetching
- Built-in loading and error states
- Optimistic updates support
- DevTools for debugging

### Why Zustand over Redux?
- Simpler API with less boilerplate
- Better TypeScript support
- Smaller bundle size
- Built-in DevTools

### Why Error Boundaries?
- Graceful degradation
- Prevent full app crashes
- Better user experience
- Easier debugging

### Why Loading Skeletons?
- Perceived performance improvement
- Reduce layout shift
- Better UX than spinners
- Matches final content structure

## Future Enhancements

- Dark/light mode toggle
- Customizable dashboard layout
- Exportable reports
- Advanced filtering and search
- Multi-protocol comparison view
- Historical trend charts
- Mobile app (React Native)

## References

- [UI Mockup](../../../project/UI/Dashboard.png)
- [Frontend Spec](../../specs/frontend.md)
- [API Spec](../../specs/api.md)
- [Architecture](../../../project/Architecture.md)
