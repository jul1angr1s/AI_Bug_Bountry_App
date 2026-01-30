## Why

Protocol onboarding and bounty funding are central workflows but currently lack a dedicated Protocol Agent feature surface in the app, limiting operational visibility and automation. A first-class Protocol Agent feature will standardize protocol registration, funding, and status tracking across UI, API, and agent services to support scaling and reliability.

## What Changes

- Add a Protocol Agent feature across frontend, backend, and agent services for protocol registration, bounty term management, and funding workflows.
- Introduce API and WebSocket surfaces to expose Protocol Agent actions and status to the dashboard.
- Persist Protocol Agent-related metadata and workflow state in the database to enable auditability and recovery.
- Integrate Protocol Agent actions with Base Sepolia registry and bounty pool flows; local Anvil remains used for validation workflows.

## Capabilities

### New Capabilities
- `protocol-agent-registry`: Register protocols from GitHub, manage bounty terms, and fund pools through UI/API, coordinating with ProtocolRegistry and BountyPool on Base Sepolia.
- `protocol-agent-operations`: Track Protocol Agent lifecycle, commands, and status updates in the dashboard, including WebSocket events and audit logging.

### Modified Capabilities
- (none)

## Impact

- **Frontend**: New/updated dashboard views for protocol onboarding, funding status, and agent activity.
- **Backend**: New/extended REST endpoints (`/protocols`, `/protocols/:id/fund`, `/agents/:id/command`) and WebSocket events for protocol and agent status.
- **Database**: Extend protocol/agent-related tables to store registration state, funding events, and audit metadata (ref: `project/DatabaseSchema.md`).
- **Agents**: Protocol Agent workflow integration with queueing, GitHub validation, and registry interactions (ref: `project/Workflows.md`).
- **Contracts**: Uses existing ProtocolRegistry, ValidationRegistry, and BountyPool on Base Sepolia; no new contracts required (ref: `project/SmartContracts.md`).
- **Chains**: **Both** — Base Sepolia for registration/funding and Local Anvil for local validation flows (ref: `project/Architecture.md`).
- **Security Considerations**: Ensure agent authentication, input validation, and rate limiting for protocol registration; protect payment flows via access control, reentrancy guards, and audit logging (ref: `project/Security.md`).
