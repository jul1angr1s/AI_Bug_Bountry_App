# Funding Gate Design Document

## State Flow Diagram

```
┌──────────┐     ┌────────────┐     ┌─────────────────┐
│ PENDING  │────▶│ PROCESSING │────▶│     ACTIVE      │
└──────────┘     └────────────┘     └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │AWAITING_FUNDING │
                                    └────────┬────────┘
                                             │ depositBounty()
                                             ▼
                                    ┌─────────────────┐
                                    │     FUNDED      │
                                    └────────┬────────┘
                                             │ requestScan()
                                             ▼
                                    ┌─────────────────┐
                                    │   [Scanning]    │
                                    └─────────────────┘
```

## Database Changes

New Protocol fields:
- `bountyPoolAmount`: Float - requested bounty pool amount in USDC
- `fundingState`: String - AWAITING_FUNDING | FUNDED | UNDERFUNDED
- `fundingTxHash`: String - deposit transaction hash
- `fundingVerifiedAt`: DateTime - on-chain verification timestamp
- `minimumBountyRequired`: Float - minimum 25 USDC for prototype

## API Changes

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/protocols/:id/verify-funding` | Check on-chain balance, update fundingState |
| POST | `/api/v1/protocols/:id/request-scan` | Trigger scan (only if FUNDED) |

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| POST `/api/v1/protocols` | Accept `bountyPoolAmount` field |
| GET `/api/v1/protocols/:id` | Return funding fields + `canRequestScan` |

## Backend Changes

### 1. Remove Auto-Scan (Critical)
**File**: `backend/src/agents/protocol/worker.ts` (lines 305-354)

Remove Step 7 `TRIGGER_SCAN` - replace with setting `fundingState: 'AWAITING_FUNDING'`

### 2. New Funding Service
**File**: `backend/src/services/funding.service.ts` (new)

Functions:
- `verifyProtocolFunding(protocolId, userId)` → Check on-chain, update DB
- `requestScan(protocolId, userId, branch?)` → Gate scan behind funding check

### 3. New Funding Routes
**File**: `backend/src/routes/funding.routes.ts` (new)

## Frontend Changes

### 1. Protocol Form Update
**File**: `frontend/src/components/protocols/ProtocolForm.tsx`

Add `bountyPoolAmount` number input (min: 25 USDC, default: 100)

### 2. FundingGate Component (New)
**File**: `frontend/src/components/protocols/FundingGate.tsx`

Three-step wizard:
1. **Approve USDC** → Reuse existing `USDCApprovalFlow.tsx`
2. **Fund Protocol** → Call `depositBounty()` via wagmi
3. **Verify Funding** → Call `/verify-funding` API

### 3. ScanConfirmationModal Component (New)
**File**: `frontend/src/components/protocols/ScanConfirmationModal.tsx`

Modal shown when clicking "Request Researchers Scanning":
- Header: "Start Security Scan"
- Body: "Calling available researcher agents that want to participate in your bounty"
- Shows bounty pool amount and terms
- Buttons: "Cancel" | "Confirm & Start Scan"

### 4. Protocol Detail Integration
**File**: `frontend/src/pages/ProtocolDetail.tsx`

- Show `FundingGate` when `status=ACTIVE` && `fundingState!=FUNDED`
- Disable "Trigger Scan" button until `fundingState=FUNDED`

## Reused Components

| Component | Location | Usage |
|-----------|----------|-------|
| `BountyPool.sol` | `backend/contracts/src/BountyPool.sol` | `depositBounty(bytes32, uint256)` |
| `BountyPoolClient.ts` | `backend/src/blockchain/contracts/BountyPoolClient.ts` | `getProtocolBalance()` |
| `USDCApprovalFlow.tsx` | `frontend/src/components/Payment/USDCApprovalFlow.tsx` | USDC approval step |
| Wagmi config | `frontend/src/lib/wagmi.ts` | MetaMask integration |

## Configuration

- **Minimum funding**: 25 USDC (configurable via `minimumBountyRequired`)
- **At-least check**: On-chain balance >= requested amount (allows over-funding)
- **No new contracts**: Reuse existing BountyPool at `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`
