# Scans Dashboard UI Specification

## MODIFIED Requirements

### Requirement: Display scan detail page with modern layout

The system SHALL display a modern dashboard layout for active scans with live progress tracking, terminal output, vulnerability charts, and real-time findings.

#### Scenario: Modern dashboard displays for running scans
- **WHEN** a user navigates to `/scans/:id` AND the scan state is "RUNNING"
- **THEN** the system displays the modern dashboard layout with left sidebar (progress timeline) and right content area (terminal, chart, findings)

#### Scenario: Classic detail view displays for completed scans
- **WHEN** a user navigates to `/scans/:id` AND the scan state is "COMPLETED", "FAILED", or "CANCELED"
- **THEN** the system displays the classic detail view with tabs (Overview, Findings)

#### Scenario: Dashboard uses 12-column grid layout
- **WHEN** the modern dashboard is rendered on desktop (>= 1024px)
- **THEN** the system uses a 12-column grid with left sidebar (4 columns) and right content (8 columns)

#### Scenario: Dashboard stacks vertically on mobile
- **WHEN** the modern dashboard is rendered on mobile (< 1024px)
- **THEN** the system stacks the progress timeline and content area vertically

---

### Requirement: Display scan metadata header

The system SHALL display a page header with scan metadata, status badge, and action buttons.

#### Scenario: Header displays scan status badge
- **WHEN** the scan metadata header is rendered
- **THEN** the system displays a status badge ("Active Scan", "Queued", "Completed", "Failed") with appropriate color coding (green=active, yellow=queued, gray=completed, red=failed)

#### Scenario: Header displays scan ID
- **WHEN** the header is rendered
- **THEN** the system displays the scan ID in monospace font with format "ID: #SCAN-{id}"

#### Scenario: Header displays protocol name
- **WHEN** the header is rendered AND scan has associated protocol
- **THEN** the system displays the protocol name as the main heading (e.g., "Protocol Scan: Uniswap V3 Fork")

#### Scenario: Header displays contract address
- **WHEN** the header is rendered AND scan has target contract address
- **THEN** the system displays the contract address in monospace font with truncation (0x1f98...c991)

#### Scenario: Header displays scan start time
- **WHEN** the header is rendered
- **THEN** the system displays the relative start time (e.g., "Started 14 mins ago")

#### Scenario: Header displays action buttons
- **WHEN** the header is rendered for a running scan
- **THEN** the system displays "Pause" and "Abort Scan" buttons aligned to the right

#### Scenario: Abort button shows confirmation
- **WHEN** the user clicks "Abort Scan" button
- **THEN** the system displays a confirmation dialog before executing the abort action

---

### Requirement: Apply consistent design system

The system SHALL use a consistent color palette, typography, and spacing system across all dashboard components.

#### Scenario: Dashboard uses custom color palette
- **WHEN** any dashboard component is rendered
- **THEN** the system uses the extended Tailwind config colors: primary (#0663f9), background-dark (#0f1723), surface-dark (#1a2432), surface-border (#21314a)

#### Scenario: Dashboard uses custom typography
- **WHEN** any text element is rendered
- **THEN** the system uses Space Grotesk font for headings and Noto Sans for body text

#### Scenario: Dashboard uses consistent border radius
- **WHEN** any card or container is rendered
- **THEN** the system uses Tailwind border radius utilities: rounded (0.5rem), rounded-lg (1rem), rounded-xl (1.5rem)

#### Scenario: Dashboard uses consistent spacing
- **WHEN** layout elements are positioned
- **THEN** the system uses Tailwind spacing scale (4px base unit) with gap-4, gap-6, gap-8 for component spacing

---

### Requirement: Support dark mode theme

The system SHALL display the dashboard in dark mode with high contrast and reduced eye strain.

#### Scenario: Dashboard uses dark background
- **WHEN** the dashboard is rendered
- **THEN** the system uses background-dark (#0f1723) for the page background

#### Scenario: Dashboard uses dark surface colors
- **WHEN** cards and panels are rendered
- **THEN** the system uses surface-dark (#1a2432) for card backgrounds

#### Scenario: Dashboard uses light text on dark background
- **WHEN** text is rendered
- **THEN** the system uses white (#ffffff) for primary text and slate-300/slate-400 for secondary text

#### Scenario: Dashboard uses subtle borders
- **WHEN** borders are rendered
- **THEN** the system uses surface-border (#21314a) for card borders and dividers

---

### Requirement: Maintain existing routing structure

The system SHALL preserve the existing routing structure for scan list and detail pages.

#### Scenario: Scan list page route unchanged
- **WHEN** a user navigates to `/scans`
- **THEN** the system displays the scan list page (existing Scans.tsx component)

#### Scenario: Scan detail page route unchanged
- **WHEN** a user navigates to `/scans/:id`
- **THEN** the system displays the appropriate detail view (modern or classic based on scan state)

#### Scenario: Protocol filter query param supported
- **WHEN** a user navigates to `/scans?protocolId={id}`
- **THEN** the system filters the scan list to show only scans for the specified protocol

---

### Requirement: Reuse existing data fetching patterns

The system SHALL leverage existing React Query hooks and API endpoints for data fetching.

#### Scenario: Dashboard uses useScan hook for metadata
- **WHEN** the modern dashboard is rendered
- **THEN** the system calls `useScan(scanId)` to fetch scan metadata (protocol name, status, timestamps)

#### Scenario: Dashboard uses useScanFindings for findings list
- **WHEN** the findings section is rendered
- **THEN** the system calls `useScanFindings(scanId)` to fetch the findings array

#### Scenario: Dashboard uses useScanProgressLive for real-time updates
- **WHEN** the progress timeline is rendered for a running scan
- **THEN** the system calls `useScanProgressLive(scanId)` to subscribe to WebSocket progress events

#### Scenario: Dashboard handles loading states
- **WHEN** data is being fetched
- **THEN** the system displays skeleton loaders or loading spinners for pending data sections

#### Scenario: Dashboard handles error states
- **WHEN** a data fetch fails
- **THEN** the system displays an error message with retry button

---

### Requirement: Provide responsive navigation

The system SHALL support navigation between scan list and detail pages with browser history integration.

#### Scenario: Back button returns to scan list
- **WHEN** a user clicks the back button or browser back
- **THEN** the system navigates to the scan list page with previous filters preserved

#### Scenario: Breadcrumb navigation available
- **WHEN** the scan detail page is rendered
- **THEN** the system displays breadcrumbs: "Scans / {Protocol Name} / {Scan ID}"

---

### Requirement: Support real-time synchronization

The system SHALL keep the dashboard synchronized with backend state changes via WebSocket events.

#### Scenario: Dashboard updates on scan state change
- **WHEN** a `scan:progress` event is received with state change (e.g., RUNNING → COMPLETED)
- **THEN** the system updates the UI to reflect the new state (switch from modern dashboard to classic detail view)

#### Scenario: Dashboard updates on new finding detection
- **WHEN** a new finding is created AND the dashboard is viewing that scan
- **THEN** the system adds the finding to the findings list and updates the chart

#### Scenario: Dashboard shows connection status
- **WHEN** the WebSocket connection status changes
- **THEN** the system displays a connection indicator (green dot=connected, red dot=disconnected, yellow=reconnecting)

---

### Requirement: Maintain accessibility standards

The system SHALL ensure the dashboard meets WCAG 2.1 AA accessibility standards.

#### Scenario: Dashboard has semantic HTML structure
- **WHEN** the dashboard is rendered
- **THEN** the system uses semantic HTML5 elements (header, main, section, article)

#### Scenario: Dashboard has skip navigation link
- **WHEN** the dashboard page loads
- **THEN** the system displays a skip link to main content for keyboard users

#### Scenario: Dashboard has sufficient color contrast
- **WHEN** text is rendered on dark backgrounds
- **THEN** the system ensures a minimum 4.5:1 contrast ratio for normal text and 3:1 for large text

#### Scenario: Dashboard supports keyboard navigation
- **WHEN** a user navigates with keyboard only
- **THEN** the system allows Tab navigation through all interactive elements with visible focus indicators

#### Scenario: Dashboard announces dynamic updates
- **WHEN** scan progress or findings update
- **THEN** the system uses ARIA live regions to announce changes to screen reader users
