# OpenSpec: Real-Time Protocol Scanning Progress Monitoring

## Spec Version: 1.0.0
## Status: Completed
## Created: 2026-02-02
## Completed: 2026-02-02

---

## Problem Statement

When a protocol is registered with status "PENDING", the frontend has no visibility into what's happening behind the scenes. Users cannot see:
- If the protocol agent is cloning the repository
- If contracts are being compiled
- If the researcher agent has started scanning
- If the scan is in progress, aborted, or failed
- Which step of the 7-step scan pipeline is currently executing

The backend already emits comprehensive WebSocket events and has SSE endpoints, but the frontend doesn't consume them to show real-time progress.

## Solution Design

### Architecture Approach
Use a **dual-channel real-time update system**:
1. **WebSocket** for broadcast events (protocol status changes, scan lifecycle)
2. **SSE** for detailed step-by-step progress tracking (individual scan monitoring)
3. **React Query** cache invalidation triggered by WebSocket events

### UI/UX Design
When a protocol has status "PENDING":
1. **Protocol Card** shows animated progress indicator
2. **Click protocol** → Opens expandable detail panel
3. **Detail Panel** shows:
   - Current phase (Protocol Registration vs Scanning)
   - Step-by-step progress with checkmarks
   - Real-time status messages
   - Progress percentage
   - Elapsed time
   - Error messages if failed

## Implementation Components

### Backend
- Protocol registration progress events (7 steps)
- SSE endpoint for registration progress streaming
- WebSocket broadcasting with Redis pub/sub
- Event types: `protocol:registration_progress`

### Frontend Hooks
- `useProtocolRegistrationProgress` - SSE streaming
- `useScanProgressLive` - WebSocket-based
- `useLatestScan` - Helper hook
- Enhanced `useProtocol` and `useProtocols` with event subscriptions

### UI Components
- `ProtocolProgressIndicator` - Compact card indicator
- `ProtocolProgressModal` - Full tabbed modal
- `RegistrationProgress` - 7-step registration visualization
- `ScanProgressLive` - 7-step scan pipeline visualization

### Integration Points
- ProtocolCard component
- ProtocolDetail page overview tab

## Success Criteria

- [x] Protocol card shows animated progress when PENDING
- [x] Progress modal displays detailed step-by-step updates
- [x] Real-time messages appear as each step executes
- [x] Registration phase shows all 7 steps with checkmarks
- [x] Scanning phase shows all 7 steps with progress
- [x] Error states display clear messages
- [x] Toast notifications appear on completion/failure
- [x] WebSocket reconnects automatically if disconnected
- [x] SSE streams close properly on unmount
- [x] Accessibility standards met (ARIA, keyboard nav)

## Technical Details

### 7 Registration Steps
1. CLONE - Clone repository from GitHub
2. VERIFY - Verify contract path exists
3. COMPILE - Compile contracts with Foundry
4. RISK_SCORE - Calculate protocol risk score
5. ON_CHAIN_REGISTRATION - Register on Base Sepolia
6. STATUS_UPDATE - Update protocol status to ACTIVE
7. TRIGGER_SCAN - Start vulnerability scan

### 7 Scan Steps
1. CLONE - Clone target repository
2. COMPILE - Compile with Foundry
3. DEPLOY - Deploy to local Anvil (optional)
4. ANALYZE - Run static analysis
5. AI_DEEP_ANALYSIS - Deep AI-powered analysis (optional)
6. PROOF_GENERATION - Create vulnerability proofs
7. SUBMIT - Submit findings to database

## Files Changed

### Backend (4 modified)
- `backend/src/websocket/events.ts`
- `backend/src/agents/protocol/worker.ts`
- `backend/src/routes/protocol.routes.ts`
- `backend/src/agents/protocol/steps/compile.ts`

### Frontend (4 modified, 7 created)
**Modified:**
- `frontend/src/hooks/useProtocol.ts`
- `frontend/src/hooks/useProtocols.ts`
- `frontend/src/components/protocols/ProtocolCard.tsx`
- `frontend/src/pages/ProtocolDetail.tsx`

**Created:**
- `frontend/src/hooks/useProtocolRegistrationProgress.ts`
- `frontend/src/hooks/useScanProgressLive.ts`
- `frontend/src/hooks/useLatestScan.ts`
- `frontend/src/components/protocols/ProtocolProgressIndicator.tsx`
- `frontend/src/components/protocols/ProtocolProgressModal.tsx`
- `frontend/src/components/protocols/RegistrationProgress.tsx`
- `frontend/src/components/protocols/ScanProgressLive.tsx`

### CI/CD (3 created)
- `.github/workflows/pr-validation.yml`
- `.github/workflows/pr-labeler.yml`
- `.github/pr-labeler.yml`

## Deployment

- **Commit:** bcd0d1b
- **Branch:** main
- **Status:** Merged and pushed to remote
- **Files changed:** 21 (1,756 additions, 5 deletions)
