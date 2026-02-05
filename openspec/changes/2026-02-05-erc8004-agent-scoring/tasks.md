# Tasks: ERC-8004 Agent Identity & Reputation Scoring

## Phase 1: Smart Contracts

### Task 1.1: Deploy AgentIdentityRegistry
- [x] Create `AgentIdentityRegistry.sol`
- [ ] Write unit tests `AgentIdentityRegistry.t.sol`
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan
- [ ] Update `.env` with contract address

**Files:**
- `backend/contracts/src/AgentIdentityRegistry.sol`
- `backend/contracts/test/AgentIdentityRegistry.t.sol`
- `backend/contracts/script/DeployAgentContracts.s.sol`

### Task 1.2: Deploy AgentReputationRegistry
- [x] Create `AgentReputationRegistry.sol`
- [ ] Write unit tests `AgentReputationRegistry.t.sol`
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan
- [ ] Grant SCORER_ROLE to platform wallet

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
- [ ] Run Prisma migration

**Files:**
- `backend/prisma/schema.prisma`

## Phase 3: API Routes

### Task 3.1: Agent Identity Routes
- [x] `POST /api/v1/agents/register`
- [x] `GET /api/v1/agents/:id`
- [x] `GET /api/v1/agents/wallet/:walletAddress`
- [x] `GET /api/v1/agents/type/:agentType`
- [x] `GET /api/v1/agents/leaderboard`

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

### Task 3.2: Reputation Routes
- [x] `GET /api/v1/agents/:id/reputation`
- [x] `GET /api/v1/agents/:id/feedback`
- [ ] Integrate with ValidationService to auto-update reputation

**Files:**
- `backend/src/routes/agent-identity.routes.ts`

## Phase 4: Integration

### Task 4.1: Validator Agent Integration
- [ ] Update Validator Agent worker to call `reputationService.recordFeedback()` after validation
- [ ] Map validation outcome to FeedbackType

**Files:**
- `backend/src/agents/validator/worker.ts`

### Task 4.2: WebSocket Events
- [ ] Emit `REPUTATION_UPDATED` event
- [ ] Emit `AGENT_REGISTERED` event

**Files:**
- `backend/src/websocket/events.ts`

## Phase 5: Frontend (Optional)

### Task 5.1: Agent Registration Page
- [ ] Create agent registration form
- [ ] Connect wallet integration
- [ ] Display registration confirmation

### Task 5.2: Agent Profile Page
- [ ] Display reputation score
- [ ] Show feedback history
- [ ] Display NFT identity

### Task 5.3: Leaderboard
- [ ] Create leaderboard component
- [ ] Sort by reputation score
- [ ] Show top researchers

## Completion Checklist

- [x] Smart contracts created
- [ ] Smart contracts tested
- [ ] Smart contracts deployed
- [x] Backend services implemented
- [x] API routes created
- [ ] Prisma migration run
- [ ] Integration with existing flows
- [ ] End-to-end testing
