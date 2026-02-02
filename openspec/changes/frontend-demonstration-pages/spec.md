# Frontend Demonstration Pages Specification

## Overview

This specification defines the frontend user interface components for the AI Bug Bounty Platform demonstration workflow, including protocol registration, protocol management, scan monitoring, validation tracking, and payment history pages.

## Technical Specification

### ADDED Requirements

### Requirement: System SHALL provide protocol registration form
The system SHALL provide a web form for protocol owners to register smart contracts for bug bounty analysis.

#### Scenario: User registers Thunder Loan protocol
- **WHEN** user navigates to `/protocols/register`
- **THEN** system SHALL display form with fields: Protocol Name, GitHub URL, Branch, Contract Path, Contract Name, Bounty Pool Address, Network
- **WHEN** user fills form with valid data and submits
- **THEN** system SHALL POST to `/api/v1/protocols` and redirect to `/protocols` on success
- **THEN** system SHALL display success toast notification

#### Scenario: Form validates GitHub URL format
- **WHEN** user enters non-GitHub URL
- **THEN** system SHALL display validation error "Must be a valid GitHub repository URL"
- **THEN** submit button SHALL be disabled

#### Scenario: Form validates Ethereum address format
- **WHEN** user enters invalid Ethereum address for Bounty Pool Address
- **THEN** system SHALL display validation error "Must be a valid Ethereum address"
- **THEN** submit button SHALL be disabled

#### Scenario: Form handles submission errors
- **WHEN** API returns error (duplicate URL, network failure)
- **THEN** system SHALL display error message from API response
- **THEN** form SHALL remain editable for retry

### Requirement: System SHALL provide protocols list page
The system SHALL display paginated list of registered protocols with status, statistics, and filtering capabilities.

#### Scenario: User views all protocols
- **WHEN** user navigates to `/protocols`
- **THEN** system SHALL fetch GET `/api/v1/protocols?page=1&limit=20`
- **THEN** system SHALL display protocols in grid or list view
- **THEN** each protocol card SHALL show: Name, Status, Created Date, Active Scans, Vulnerabilities Found, Risk Score

#### Scenario: User toggles between grid and list view
- **WHEN** user clicks grid/list toggle button
- **THEN** system SHALL switch layout between 3-column grid and vertical list
- **THEN** system SHALL persist view preference in localStorage

#### Scenario: User filters protocols by status
- **WHEN** user selects status filter (All, Pending, Active, Paused, Deprecated)
- **THEN** system SHALL filter displayed protocols matching selected status
- **THEN** URL query parameter SHALL update to ?status={selected}

#### Scenario: User clicks protocol card
- **WHEN** user clicks on a protocol card
- **THEN** system SHALL navigate to `/protocols/:id`

#### Scenario: Real-time updates via WebSocket
- **WHEN** Protocol Agent completes analysis
- **THEN** WebSocket event `protocol:active` SHALL update protocol status in real-time
- **THEN** protocol card SHALL reflect new status without page refresh

#### Scenario: Empty state with no protocols
- **WHEN** no protocols exist in database
- **THEN** system SHALL display "No protocols registered" message
- **THEN** system SHALL display "Register Protocol" CTA button

### Requirement: System SHALL provide protocol detail page
The system SHALL display comprehensive protocol information including statistics, scans, findings, and payments.

#### Scenario: User views protocol details
- **WHEN** user navigates to `/protocols/:id`
- **THEN** system SHALL fetch GET `/api/v1/protocols/:id`
- **THEN** system SHALL display protocol header: Name, Status badge, GitHub link, Risk Score, Created date
- **THEN** system SHALL display stats cards: Total Scans, Vulnerabilities Found, Total Paid, Active Researchers

#### Scenario: User navigates protocol tabs
- **WHEN** user clicks "Overview" tab
- **THEN** system SHALL display contract details grid, activity summary, recent activity timeline
- **WHEN** user clicks "Scans" tab
- **THEN** system SHALL display list of scans with status, progress, findings count
- **WHEN** user clicks "Findings" tab
- **THEN** system SHALL display list of vulnerabilities with severity, status, researcher
- **WHEN** user clicks "Payments" tab
- **THEN** system SHALL display list of payments with amount, transaction hash, date

#### Scenario: User triggers new scan
- **WHEN** user clicks "Trigger Scan" button
- **THEN** system SHALL POST to `/api/v1/scans` with protocolId
- **THEN** system SHALL navigate to scan detail page on success

### Requirement: System SHALL provide scans list page
The system SHALL display paginated list of vulnerability scans with real-time progress tracking.

#### Scenario: User views all scans
- **WHEN** user navigates to `/scans`
- **THEN** system SHALL fetch GET `/api/v1/scans?page=1&limit=20`
- **THEN** system SHALL display scan cards with: Protocol Name, Status, Progress %, Current Step, Findings Count, Started At

#### Scenario: User filters scans by status
- **WHEN** user selects status filter (All, QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELED)
- **THEN** system SHALL filter displayed scans matching selected status

#### Scenario: Real-time scan progress updates
- **WHEN** Researcher Agent updates scan progress
- **THEN** WebSocket event `scan:progress` SHALL update progress bar in real-time
- **THEN** current step indicator SHALL update (Deploy → Analyze → Generate Proof → Submit)

#### Scenario: User clicks scan card
- **WHEN** user clicks on a scan card
- **THEN** system SHALL navigate to `/scans/:id`

### Requirement: System SHALL provide validations list page
The system SHALL display paginated list of proof validations with LLM confidence scores.

#### Scenario: User views all validations
- **WHEN** user navigates to `/validations`
- **THEN** system SHALL fetch GET `/api/v1/validations?page=1&limit=20`
- **THEN** system SHALL display validation cards with: Finding Title, Protocol, Status, Confidence Score, Validated At

#### Scenario: User filters validations by protocol
- **WHEN** user selects protocol filter
- **THEN** system SHALL filter validations for selected protocol
- **THEN** URL query parameter SHALL update to ?protocolId={id}

#### Scenario: User filters validations by status
- **WHEN** user selects status filter (All, PENDING, IN_PROGRESS, VALIDATED, INVALID, FAILED)
- **THEN** system SHALL filter validations matching selected status

#### Scenario: User views validation detail
- **WHEN** user clicks validation card
- **THEN** system SHALL navigate to validation detail view
- **THEN** system SHALL display proof code, LLM analysis logs, confidence score, verdict

#### Scenario: Real-time validation updates
- **WHEN** Validator Agent completes validation
- **THEN** WebSocket event `validation:complete` SHALL update validation status
- **THEN** confidence score badge SHALL appear in real-time

### Requirement: System SHALL provide payments list page
The system SHALL display paginated list of bounty payments with blockchain transaction details.

#### Scenario: User views all payments
- **WHEN** user navigates to `/payments`
- **THEN** system SHALL fetch GET `/api/v1/payments?page=1&limit=20`
- **THEN** system SHALL display payment cards with: Finding Title, Researcher Address, Amount (USDC), Status, Transaction Hash, Paid At

#### Scenario: User filters payments by protocol
- **WHEN** user selects protocol filter
- **THEN** system SHALL filter payments for selected protocol
- **THEN** URL query parameter SHALL update to ?protocolId={id}

#### Scenario: User filters payments by status
- **WHEN** user selects status filter (All, PENDING, QUEUED, PROCESSING, COMPLETED, FAILED)
- **THEN** system SHALL filter payments matching selected status

#### Scenario: User views transaction on Basescan
- **WHEN** payment status is COMPLETED
- **THEN** transaction hash SHALL display as clickable link
- **WHEN** user clicks transaction hash
- **THEN** system SHALL open Basescan block explorer in new tab (https://sepolia.basescan.org/tx/{txHash})

#### Scenario: Admin retries failed payment
- **WHEN** admin user views failed payment
- **THEN** system SHALL display "Retry Payment" button
- **WHEN** admin clicks "Retry Payment"
- **THEN** system SHALL POST to `/api/v1/payments/:id/retry`
- **THEN** payment status SHALL update to QUEUED

#### Scenario: Real-time payment updates
- **WHEN** Payment Worker completes transaction
- **THEN** WebSocket event `payment:completed` SHALL update payment status
- **THEN** transaction hash link SHALL appear in real-time

### Requirement: System SHALL provide dashboard with live statistics
The system SHALL display real-time platform statistics with no mock data.

#### Scenario: User views dashboard
- **WHEN** user navigates to `/dashboard`
- **THEN** system SHALL fetch GET `/api/v1/stats`
- **THEN** system SHALL display: Total Bounty Pool Balance, Active Protocols, Total Vulnerabilities, Total Paid Out
- **THEN** system SHALL display agent status indicators (Protocol Agent, Researcher Agent, Validator Agent, Payment Worker)

#### Scenario: Dashboard shows bounty pool balance from blockchain
- **WHEN** dashboard loads
- **THEN** system SHALL fetch bounty pool balance via stats API (not mocked)
- **THEN** balance SHALL display in USDC with 6 decimals

#### Scenario: Dashboard reflects actual database state
- **WHEN** dashboard loads
- **THEN** vulnerability count SHALL match database records
- **THEN** payment totals SHALL match blockchain payment records
- **THEN** NO mock data SHALL be displayed

### Requirement: System SHALL use TailwindCSS gradient theme
The system SHALL apply consistent purple/pink gradient theme across all pages.

#### Scenario: Consistent color scheme
- **THEN** primary colors SHALL use purple-600 (#9333ea) and pink-600 (#db2777)
- **THEN** gradient backgrounds SHALL use `bg-gradient-to-r from-purple-600 to-pink-600`
- **THEN** status badges SHALL use semantic colors (green=success, yellow=pending, red=error, blue=processing)

#### Scenario: Responsive design
- **THEN** all pages SHALL be responsive for mobile (320px+), tablet (768px+), desktop (1024px+)
- **THEN** navigation SHALL collapse to hamburger menu on mobile
- **THEN** cards SHALL stack vertically on mobile, display in grid on desktop

### Requirement: System SHALL handle loading and error states
The system SHALL provide user feedback during data fetching and handle errors gracefully.

#### Scenario: Loading state during data fetch
- **WHEN** page fetches data from API
- **THEN** system SHALL display skeleton loader matching content layout
- **THEN** skeleton SHALL animate with pulse effect

#### Scenario: Error state with retry
- **WHEN** API request fails
- **THEN** system SHALL display error message with retry button
- **WHEN** user clicks retry
- **THEN** system SHALL re-attempt API request

#### Scenario: Network unavailable graceful degradation
- **WHEN** backend is unreachable
- **THEN** system SHALL display cached data if available
- **THEN** system SHALL show warning banner "Showing cached data - reconnecting..."

## Implementation Notes

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query) for server state
- **Styling**: TailwindCSS with custom gradient theme
- **Real-time**: WebSocket client (socket.io-client)
- **Icons**: Lucide React

### Component Structure
```
src/
├── pages/
│   ├── ProtocolRegistration.tsx
│   ├── Protocols.tsx
│   ├── ProtocolDetail.tsx
│   ├── Scans.tsx
│   ├── Validations.tsx
│   ├── Payments.tsx
│   └── Dashboard.tsx
├── components/
│   ├── protocols/
│   │   ├── ProtocolForm.tsx
│   │   ├── ProtocolCard.tsx
│   │   └── ProtocolStats.tsx
│   ├── scans/
│   │   └── ScanCard.tsx
│   ├── validations/
│   │   └── ValidationCard.tsx
│   └── payments/
│       └── PaymentCard.tsx
└── hooks/
    ├── useProtocols.ts
    ├── useProtocol.ts
    ├── useScans.ts
    ├── useValidations.ts
    ├── usePayments.ts
    └── useDashboardData.ts
```

### Real-time Updates
All list pages subscribe to WebSocket events:
- `protocol:registered`, `protocol:active` → Protocols page
- `scan:progress`, `scan:complete` → Scans page
- `finding:discovered`, `validation:complete` → Validations page
- `payment:queued`, `payment:completed` → Payments page

### Data Fetching Strategy
- Use TanStack Query for all API requests
- Cache TTL: 30 seconds for lists, 60 seconds for details
- Automatic background refetching on window focus
- Optimistic updates for mutations

## Success Criteria

- [ ] User can register Thunder Loan protocol in <30 seconds
- [ ] All pages load data from real APIs (zero mock data)
- [ ] Real-time updates work without page refresh
- [ ] Mobile responsive design functions on 320px+ screens
- [ ] Loading skeletons appear during data fetching
- [ ] Error states display with retry capability
- [ ] TailwindCSS purple/pink gradient theme applied consistently
- [ ] Navigation works seamlessly between all pages
