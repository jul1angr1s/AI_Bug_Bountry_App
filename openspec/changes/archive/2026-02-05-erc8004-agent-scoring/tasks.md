# Tasks: ERC-8004 Agent Identity & Reputation Scoring

## Phase 1: Smart Contracts

### Task 1.1: Deploy AgentIdentityRegistry
- [x] Create `AgentIdentityRegistry.sol`
- [ ] Write unit tests `AgentIdentityRegistry.t.sol`
- [x] Deploy to Base Sepolia (address: `0x59932bDf3056D88DC07cb320263419B8ec1e942d`)
- [ ] Verify on Basescan
- [x] Update `.env` with contract address

**Files:**
- `backend/contracts/src/AgentIdentityRegistry.sol`
- `backend/contracts/test/AgentIdentityRegistry.t.sol`
- `backend/contracts/script/DeployAgentContracts.s.sol`

### Task 1.2: Deploy AgentReputationRegistry
- [x] Create `AgentReputationRegistry.sol`
- [ ] Write unit tests `AgentReputationRegistry.t.sol`
- [x] Deploy to Base Sepolia (address: `0x8160aB516366FfaAb6C239524D35963058Feb850`)
- [ ] Verify on Basescan
- [x] Grant SCORER_ROLE to AgentIdentityRegistry

**Files:**
- `backend/contracts/src/AgentReputationRegistry.sol`
- `backend/contracts/test/AgentReputationRegistry.t.sol`

## Phase 2: Backend Services

### Task 2.1: AgentIdentityService
- [x] Create `agent-identity.service.ts`
- [x] Implement `registerAgent()`
- [x] Implement `registerAgentOnChain()`
- [x] Implement `getAgentByWallet()`
- [x] Implement `getLeaderboard()`

**Files:**
- `backend/src/services/agent-identity.service.ts`

### Task 2.2: ReputationService
- [x] Create `reputation.service.ts`
- [x] Implement `recordFeedback()`
- [x] Implement `recordFeedbackOnChain()`
- [x] Implement `calculateScore()`
- [x] Implement `getReputation()`

**Files:**
- `backend/src/services/reputation.service.ts`

### Task 2.3: Database Schema
- [x] Add `AgentIdentity` model
- [x] Add `AgentReputation` model
- [x] Add `AgentFeedback` model
- [x] Run Prisma migration (tables verified in DB)

**Files:**
- `backend/prisma/schema.prisma`

## Phase 3: API Routes

### Task 3.1: Agent Identity Routes
- [x] `POST /api/v1/agent-identities/register`
- [x] `GET /api/v1/agent-identities/:id`
- [x] `GET /api/v1/agent-identities/wallet/:walletAddress`
- [x] `GET /api/v1/agent-identities/type/:agentType`
- [x] `GET /api/v1/agent-identities/leaderboard`
- [x] `GET /api/v1/agent-identities` (list all agents)
- [x] Fixed route ordering (static routes before /:id param)

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

### Task 3.2: Reputation Routes
- [x] `GET /api/v1/agent-identities/:id/reputation`
- [x] `GET /api/v1/agent-identities/:id/feedback`
- [x] Integrate with Validator Agent for auto-reputation updates

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

## Phase 4: Integration

### Task 4.1: Validator Agent Integration
- [x] Update Validator Agent worker to call `reputationService.recordFeedback()` after validation
- [x] Map validation outcome to FeedbackType (with severity mapping including INFO→INFORMATIONAL)
- [x] Dynamic researcher/validator identity resolution from AgentIdentity table
- [x] Fallback to env vars when agent identities not found

**Files:**
- `backend/src/agents/validator/worker.ts`

### Task 4.2: WebSocket Events
- [ ] Emit `REPUTATION_UPDATED` event
- [ ] Emit `AGENT_REGISTERED` event

**Files:**
- `backend/src/websocket/events.ts`

## Phase 5: Frontend

### Task 5.1: Agent Registry Page (`/agents`)
- [x] `AgentRegistryTable` component - table with wallet, type badge, NFT ID, score, status, basescan links
- [x] `RegisterAgentModal` component - registration form with wallet + type
- [x] `AgentRegistry` page - combines table + leaderboard + modal
- [x] Route: `/agents`

**Files:**
- `frontend/src/pages/AgentRegistry.tsx`
- `frontend/src/components/agents/AgentRegistryTable.tsx`
- `frontend/src/components/agents/RegisterAgentModal.tsx`

### Task 5.2: Reputation Tracker Page (`/agents/:id/reputation`)
- [x] `ReputationScoreCard` component - score display with circular progress
- [x] `FeedbackHistoryList` component - feedback events table with severity badges
- [x] `ReputationLeaderboard` component - ranked list with avatars
- [x] `ReputationTracker` page
- [x] Route: `/agents/:id/reputation`

**Files:**
- `frontend/src/pages/ReputationTracker.tsx`
- `frontend/src/components/agents/ReputationScoreCard.tsx`
- `frontend/src/components/agents/FeedbackHistoryList.tsx`
- `frontend/src/components/agents/ReputationLeaderboard.tsx`

### Task 5.3: Types, API, and Hooks
- [x] `AgentIdentity`, `AgentReputation`, `AgentFeedback` types in `dashboard.ts`
- [x] API functions: `fetchAgentIdentities`, `registerAgent`, `fetchAgentReputation`, `fetchAgentFeedback`, `fetchAgentLeaderboard`
- [x] Hooks: `useAgentIdentities`, `useAgentIdentity`, `useAgentReputation`, `useAgentFeedback`, `useAgentLeaderboard`

**Files:**
- `frontend/src/types/dashboard.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/hooks/useAgentIdentities.ts`
- `frontend/src/hooks/useReputation.ts`

### Task 5.4: Navigation
- [x] Add "Agents" nav item to Sidebar
- [x] Add routes to App.tsx

## Completion Checklist

- [x] Smart contracts created
- [ ] Smart contracts tested (Forge tests pending)
- [x] Smart contracts deployed (Base Sepolia)
- [x] Backend services implemented
- [x] API routes created
- [x] Prisma migration run (tables verified)
- [x] Integration with validator worker
- [x] Frontend pages and components
- [x] Frontend tests
- [ ] End-to-end testing
