## Why

Payments are not visible during the demo because the off-chain validation flow and the `/payments` UI are misaligned with the backend response shape and the protocol-scoped requirement. Fixing this now unblocks end-to-end demonstrations and confirms USDC transfer between the payer and researcher wallets.

## What Changes

- Route `/payments` to the richer payment dashboard UI and scope it to a specific protocol.
- Require `protocolId` for the payments list API and return protocol-scoped results only.
- Align the off-chain ValidationService payment trigger with the payment worker expectations used in the demo flow.
- Ensure payment data includes the fields needed by the payment dashboard (protocol name, status, timestamps).

## Capabilities

### New Capabilities
- _None_

### Modified Capabilities
- `workflows`: update the off-chain validation → payment trigger flow to match the demo path and protocol-scoped payment visibility.

## Impact

- **Frontend**: `frontend/src/pages/Payments.tsx`, `frontend/src/pages/PaymentDashboard.tsx`, payment components and routing.
- **Backend**: payment list API contract and validation service integration with payment worker.
- **APIs**: `GET /api/v1/payments` requires `protocolId`, response shape used by dashboard.
- **Agents**: off-chain ValidationService payment trigger alignment (no on-chain listener dependency for demo).
- **Chains**: Base Sepolia payment execution remains unchanged.
