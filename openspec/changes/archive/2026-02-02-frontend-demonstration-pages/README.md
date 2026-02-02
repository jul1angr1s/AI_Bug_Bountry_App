# Frontend Demonstration Pages

**Status**: Not Started
**Created**: 2026-02-01
**Owner**: Frontend Team
**Parent Change**: demonstration-workflow

## Overview

Implement all frontend UI pages required for the demonstration workflow:
- Protocol Registration Form
- Protocols List Page
- Scans Page
- Protocol Detail Page
- Validations Page
- Payments Page
- Dashboard Enhancement (remove mock data)

## Goal

Create a complete, production-ready UI that demonstrates the full bug bounty workflow from protocol registration to payment completion with real-time updates.

## Components

### 1. Protocol Registration
- Form component with validation
- GitHub URL, contract details, bounty pool address inputs
- Real-time validation feedback
- Success/error handling

### 2. Protocols List
- Grid/list view of all registered protocols
- Real-time status updates via WebSocket
- Filter by status
- Pagination support
- Empty state with CTA

### 3. Scans Page
- List of all vulnerability scans
- Real-time progress updates
- Filter by protocol, status, date
- Scan detail view with progress visualization

### 4. Protocol Detail
- Protocol overview with stats
- Tabs: Overview, Scans, Findings, Payments
- Recent activity timeline
- Action buttons (Trigger Rescan, View Report)

### 5. Validations Page
- List of all validation attempts
- Status badges (PENDING, VALIDATED, INVALID)
- Confidence scores
- Validation detail view (proof, logs, verdict)

### 6. Payments Page
- Payment history table
- Transaction hash links to Basescan
- Filter by protocol, researcher, status
- Real-time payment status updates
- Retry button for failed payments (admin only)

### 7. Dashboard Enhancement
- Remove ALL mock data
- Connect to real APIs
- Real-time WebSocket updates
- Graceful error handling

## Technology Stack

- React 18 with TypeScript
- TailwindCSS + Shadcn UI
- TanStack Query for data fetching
- WebSocket for real-time updates
- React Router for navigation
- Zod for form validation

## API Integration

All pages connect to backend APIs:
- GET `/api/v1/protocols`
- GET `/api/v1/scans`
- GET `/api/v1/validations`
- GET `/api/v1/payments`
- WebSocket events for real-time updates

## Success Criteria

- ✅ Zero mock data in any component
- ✅ All pages responsive (mobile + desktop)
- ✅ Real-time updates working via WebSocket
- ✅ Loading and error states handled gracefully
- ✅ Form validation working correctly
- ✅ Navigation flow intuitive and smooth

## Files Created

See `tasks.md` for complete file list (~15-20 new components)

## Dependencies

- Backend API endpoints must be implemented first
- WebSocket server must be configured
- Database schemas must be finalized

## Timeline

- Week 1 (Days 2-6): Core pages implementation
- PR Strategy: 5-7 focused PRs (<1,500 lines each)
