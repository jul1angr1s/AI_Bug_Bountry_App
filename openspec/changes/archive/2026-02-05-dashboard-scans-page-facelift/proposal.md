## Why

The current /scans dashboard page at `http://localhost:5173/scans` needs a modern UI/UX overhaul to match the compelling visual standards established in the reference design. The existing interface lacks the polished, professional appearance that attracts contributors and provides an intuitive real-time scanning experience. This facelift will transform the dashboard into a visually stunning, data-rich interface that showcases the platform's AI-powered capabilities with live scan progress tracking, terminal output visualization, vulnerability detection charts, and real-time findings display.

## What Changes

- **Modernize the Scans Dashboard Page** (`/scans` or `/protocols/:id/scans`) with contemporary dark theme UI
- **Implement vertical timeline component** showing scan progress stages (Clone Repository → Compile Contracts → Deploy Testnet → Static Analysis → AI Deep Analysis → Proof of Concept → Submit Report)
- **Add live terminal output component** displaying real-time agent logs with syntax highlighting
- **Create vulnerability detection rate chart** with SVG-based trend visualization
- **Build real-time findings list** with severity badges (Critical/High/Medium), CWE codes, AI confidence meters, and expandable details
- **Reuse existing backend endpoints** for scan data, SSE connections, and real-time updates
- **Maintain responsive design** for mobile, tablet, and desktop breakpoints
- **Apply consistent design system** using Space Grotesk (headings), Noto Sans (body), custom color palette (primary: #0663f9, background-dark: #0f1723, surface-dark: #1a2432)
- **Preserve existing functionality** including scan control (pause/abort), data fetching via TanStack Query, and real-time sync via SSE/WebSocket

## Capabilities

### New Capabilities
- `scan-progress-timeline`: Vertical timeline UI component displaying 7-stage scan progress with completion states, timestamps, and active stage highlighting
- `live-terminal-output`: Terminal-style component rendering real-time agent logs with color-coded severity levels and auto-scroll behavior
- `vulnerability-chart`: SVG-based line chart showing vulnerability detection rate over time with gradient fills and interactive tooltip
- `findings-display`: Card-based list of real-time vulnerability findings with severity classification, confidence meters, and detail expansion

### Modified Capabilities
- `scans-dashboard-ui`: Updated visual design, layout structure, and component composition while maintaining existing data flow and backend integration patterns

## Impact

### Frontend Components Affected
- `frontend/src/pages/Dashboard.tsx` or create new `frontend/src/pages/Scans.tsx` (if route doesn't exist)
- New components in `frontend/src/components/scans/`:
  - `ScanProgressTimeline.tsx`
  - `LiveTerminalOutput.tsx`
  - `VulnerabilityChart.tsx`
  - `FindingsList.tsx`
  - `FindingCard.tsx`

### Routing
- Verify/update route configuration in `frontend/src/App.tsx` for `/scans` or `/protocols/:id/scans`

### Styling
- TailwindCSS custom configuration extending color palette and font families
- Possible new utility classes for terminal text shadow effects

### State Management
- Leverage existing TanStack Query hooks for scan data fetching
- Utilize existing Zustand store for real-time scan status updates
- Maintain existing SSE connection patterns from `useProtocolRegistrationProgress` or similar hooks

### Backend Dependencies
- **No new backend endpoints required** - reuse existing scan APIs
- Assumes existing endpoints provide:
  - Scan metadata (protocol name, contract address, scan ID, status)
  - Progress stage information with timestamps
  - Live log streaming (SSE or WebSocket)
  - Vulnerability findings array with severity, CWE codes, descriptions, confidence scores

### Testing Requirements
- Component unit tests for all new UI components
- Integration tests for real-time data flow
- Visual regression tests for responsive breakpoints
- End-to-end tests for scan lifecycle (start → progress → findings → completion)

### Documentation
- Update `frontend/README.md` with new component architecture
- Document design system tokens and component usage patterns

### Dependencies
- No new npm packages anticipated (uses existing TailwindCSS, React, TypeScript stack)
- Google Fonts CDN for Space Grotesk and Noto Sans (or install via npm for production)
- Material Symbols Outlined icon font (or migrate to React icon library if preferred)
