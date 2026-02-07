# Design: ERC-8004 Agent Identity & Reputation Scoring

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Agent       │  │ Reputation  │  │ Leaderboard             │  │
│  │ Registration│  │ Profile     │  │ (Top Researchers)       │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ POST /api/v1/agents/register                               │ │
│  │ GET  /api/v1/agents/:id                                    │ │
│  │ GET  /api/v1/agents/:id/reputation                         │ │
│  │ GET  /api/v1/agents/:id/feedback                           │ │
│  │ GET  /api/v1/agents/leaderboard                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────────────────────┐   │
│  │ AgentIdentity     │  │ ReputationService                 │   │
│  │ Service           │  │ - recordFeedback()                │   │
│  │ - registerAgent() │  │ - calculateScore()                │   │
│  │ - getAgent()      │  │ - getReputation()                 │   │
│  └─────────┬─────────┘  └─────────────┬─────────────────────┘   │
└────────────┼──────────────────────────┼─────────────────────────┘
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Base Sepolia                                  │
│  ┌───────────────────┐  ┌───────────────────────────────────┐   │
│  │ AgentIdentity     │  │ AgentReputationRegistry           │   │
│  │ Registry          │  │ (Reads from ValidationRegistry)   │   │
│  │ (ERC-721 NFTs)    │  │                                   │   │
│  └───────────────────┘  └───────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ValidationRegistry (EXISTING - 0x8fBE5E9B...)             │  │
│  │ - Validation outcomes (CONFIRMED/REJECTED)                │  │
│  │ - Validator agent tracking                                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Agent Registration Flow

```
User connects wallet
       │
       ▼
┌─────────────────┐
│ POST /agents/   │
│ register        │
│ {walletAddress, │
│  agentType}     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Create DB       │────►│ Mint NFT        │
│ AgentIdentity   │     │ (on-chain)      │
│ + Reputation    │     │ AgentIdentity   │
│ + Escrow        │     │ Registry        │
└─────────────────┘     └─────────────────┘
```

### 2. Reputation Update Flow

```
Validator validates finding
           │
           ▼
┌──────────────────────┐
│ ValidationRegistry   │
│ recordValidation()   │
│ (CONFIRMED/REJECTED) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Backend detects      │
│ validation event     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ ReputationService    │────►│ AgentReputation      │
│ recordFeedback()     │     │ Registry (on-chain)  │
└──────────┬───────────┘     └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Update DB            │
│ AgentReputation      │
│ score = confirmed/   │
│         total × 100  │
└──────────────────────┘
```

## Database Schema

```prisma
model AgentIdentity {
  id            String            @id @default(uuid())
  walletAddress String            @unique
  agentNftId    BigInt?           // On-chain NFT ID
  agentType     AgentIdentityType // RESEARCHER | VALIDATOR
  isActive      Boolean           @default(true)
  registeredAt  DateTime          @default(now())
  
  reputation    AgentReputation?
  escrowBalance AgentEscrow?
  feedbacksGiven    AgentFeedback[] @relation("ValidatorFeedbacks")
  feedbacksReceived AgentFeedback[] @relation("ResearcherFeedbacks")
}

model AgentReputation {
  id               String   @id
  agentIdentityId  String   @unique
  confirmedCount   Int      @default(0)
  rejectedCount    Int      @default(0)
  totalSubmissions Int      @default(0)
  reputationScore  Int      @default(0)  // 0-100
  lastUpdated      DateTime
}

model AgentFeedback {
  id                String       @id
  researcherAgentId String
  validatorAgentId  String
  validationId      String?
  feedbackType      FeedbackType
  onChainFeedbackId String?
  createdAt         DateTime
}
```

## Smart Contract Interfaces

### AgentIdentityRegistry.sol

```solidity
interface IAgentIdentityRegistry {
    enum AgentType { RESEARCHER, VALIDATOR }
    
    struct Agent {
        uint256 agentId;
        address wallet;
        AgentType agentType;
        uint256 registeredAt;
        bool active;
    }
    
    function selfRegister(AgentType agentType) external returns (uint256 agentId);
    function registerAgent(address wallet, AgentType agentType) external returns (uint256);
    function getAgent(uint256 agentId) external view returns (Agent memory);
    function getAgentByWallet(address wallet) external view returns (Agent memory);
    function isRegistered(address wallet) external view returns (bool);
    function isActive(uint256 agentId) external view returns (bool);
}
```

### AgentReputationRegistry.sol

```solidity
interface IAgentReputationRegistry {
    enum FeedbackType {
        CONFIRMED_CRITICAL,
        CONFIRMED_HIGH,
        CONFIRMED_MEDIUM,
        CONFIRMED_LOW,
        CONFIRMED_INFORMATIONAL,
        REJECTED
    }
    
    struct ReputationRecord {
        uint256 agentId;
        address wallet;
        uint256 confirmedCount;
        uint256 rejectedCount;
        uint256 totalSubmissions;
        uint256 reputationScore;
        uint256 lastUpdated;
    }
    
    function recordFeedback(
        uint256 researcherAgentId,
        uint256 validatorAgentId,
        bytes32 validationId,
        FeedbackType feedbackType
    ) external returns (bytes32 feedbackId);
    
    function getReputation(uint256 agentId) external view returns (ReputationRecord memory);
    function getScore(uint256 agentId) external view returns (uint256);
    function meetsMinimumScore(uint256 agentId, uint256 minScore) external view returns (bool);
}
```

## Scoring Algorithm

```
Score = (confirmedCount × 100) / totalSubmissions

Examples:
- 3 confirmed, 0 rejected → 100%
- 2 confirmed, 1 rejected → 67%
- 1 confirmed, 2 rejected → 33%
- 0 confirmed, 3 rejected → 0%
```

## Security Considerations

1. **Soulbound NFTs**: Agent identity NFTs are non-transferable to prevent identity trading
2. **Role-based Access**: Only SCORER_ROLE can update reputation scores
3. **Immutable Feedback**: Feedback records cannot be modified after creation
4. **Hybrid Storage**: Aggregate scores on-chain, detailed history off-chain
