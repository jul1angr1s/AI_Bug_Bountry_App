# OpenSpec Tabs to Dashboard UI Mapping

This document maps the logical components defined in the OpenSpec Frontend Specification to the actual implemented routes and sidebar navigation in the Dashboard UI.

## Navigation Structure

| Sidebar Label | Route | OpenSpec Component / Features | Status |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `/` | **Dashboard Layout**<br>- Protocol table (Overview)<br>- Scan progress (Stats)<br>- Agent status<br>- Vulnerability alerts<br>- Payment history (Stats) | ✅ Implemented |
| **Protocols** | `/protocols` | **Protocol Management**<br>- Registration form<br>- Funding interface<br>- Protocol detail view | 🚧 Placeholder |
| **Scans** | `/scans` | **Scan Progress**<br>- Detailed scan logs<br>- Real-time progress indicators | 🚧 Placeholder |
| **Validations** | `/validations` | **Vulnerability Display**<br>- Severity badges<br>- Validation status tracking | 🚧 Placeholder |
| **Payments** | `/payments` | **Payment History**<br>- Payment confirmation<br>- Transaction logs | 🚧 Placeholder |

## Component Mapping

| OpenSpec Key Component | Implemented Component | Location |
| :--- | :--- | :--- |
| Protocol table | `ProtocolOverview` | `src/components/Dashboard/ProtocolOverview.tsx` |
| Scan progress | `StatisticsPanel` / `StatCard` | `src/components/Dashboard/StatisticsPanel.tsx` |
| Agent status | `AgentStatusGrid` | `src/components/Dashboard/AgentStatusGrid.tsx` |
| Vulnerability alerts | `CriticalAlertBanner` | `src/components/Dashboard/CriticalAlertBanner.tsx` |
| Vulnerability table | `VulnerabilitiesTable` | `src/components/Dashboard/VulnerabilitiesTable.tsx` |
| Severity badges | `SeverityBadge` | `src/components/shared/SeverityBadge.tsx` |
