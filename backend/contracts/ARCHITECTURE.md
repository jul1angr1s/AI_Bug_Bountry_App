# Smart Contract Architecture

## Project Structure

```
AI Bug Bounty Platform - Smart Contracts
│
├── Phase 1 (CURRENT): Vulnerable Test Contracts
│   ├── VulnerableVault.sol      [Reentrancy vulnerability]
│   └── MockDeFi.sol              [Overflow vulnerability]
│
├── Phase 2: Local Testing & Integration
│   ├── DeployLocal.s.sol         [Anvil deployment]
│   └── VulnerableVault.t.sol     [Attack demonstrations]
│
└── Phase 3 (PLANNED): Production Contracts
    ├── ProtocolRegistry.sol      [Protocol registration]
    ├── ValidationRegistry.sol    [ERC-8004 attestations]
    └── BountyPool.sol            [Payment management]
```

## Contract Relationships

### Current Phase (Testing)

```
┌─────────────────────────────────────────────────────┐
│                   Anvil (Local Node)                 │
│                  http://localhost:8545               │
└─────────────────────────────────────────────────────┘
                          │
                          │ forge script
                          ▼
┌─────────────────────────────────────────────────────┐
│              DeployLocal.s.sol                       │
│            (Deployment Script)                       │
└─────────────────────────────────────────────────────┘
                          │
                          │ deploys
                          ▼
        ┌─────────────────────────────────┐
        │     VulnerableVault.sol         │
        │                                  │
        │  • deposit()                     │
        │  • withdraw() [VULNERABLE]       │
        │  • getBalance()                  │
        └─────────────────────────────────┘
                          │
                          │ tested by
                          ▼
        ┌─────────────────────────────────┐
        │   VulnerableVault.t.sol         │
        │                                  │
        │  • Basic functionality tests    │
        │  • Attacker contract            │
        │  • Reentrancy attack demo       │
        └─────────────────────────────────┘
```

### Researcher Agent Integration Flow

```
┌─────────────────────────────────────────────────────┐
│              User/Protocol Owner                     │
│         (Submits contract for scanning)              │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Backend API                             │
│         POST /api/protocols/register                 │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│           Researcher Agent                           │
│       (agents/researcher/index.ts)                   │
│                                                       │
│  1. Receive contract source                          │
│  2. Write to temp file                               │
│  3. Run Slither analysis                             │
│  4. Parse vulnerabilities                            │
│  5. Generate report                                  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                Slither Analysis                      │
│              (Static Analysis)                       │
│                                                       │
│  Detects:                                            │
│  • Reentrancy (VulnerableVault)                     │
│  • Overflow (MockDeFi)                               │
│  • CEI violations                                    │
│  • Deprecated Solidity versions                      │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│          Vulnerability Report                        │
│                                                       │
│  • Severity: Critical/High/Medium/Low                │
│  • Type: Reentrancy, Overflow, etc.                 │
│  • Location: File + line numbers                     │
│  • Description: Detailed explanation                 │
│  • Recommendation: Fix suggestions                   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│             Database Storage                         │
│        (Protocol + Vulnerability records)            │
└─────────────────────────────────────────────────────┘
```

## Future Phase 3 Architecture

```
┌─────────────────────────────────────────────────────┐
│              Base Sepolia Testnet                    │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │      ProtocolRegistry.sol                     │  │
│  │                                                │  │
│  │  • registerProtocol()                         │  │
│  │  • getProtocol()                              │  │
│  │  • updateProtocol()                           │  │
│  └───────────────────────────────────────────────┘  │
│                      │                                │
│                      │ emits event                    │
│                      ▼                                │
│  ┌───────────────────────────────────────────────┐  │
│  │    ValidationRegistry.sol (ERC-8004)         │  │
│  │                                                │  │
│  │  • createAttestation()                        │  │
│  │  • verifyAttestation()                        │  │
│  │  • revokeAttestation()                        │  │
│  └───────────────────────────────────────────────┘  │
│                      │                                │
│                      │ references                     │
│                      ▼                                │
│  ┌───────────────────────────────────────────────┐  │
│  │         BountyPool.sol                        │  │
│  │                                                │  │
│  │  • depositBounty()                            │  │
│  │  • payBounty()                                │  │
│  │  • withdrawBalance()                          │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Vulnerability Detection Flow

### VulnerableVault.sol - Reentrancy

```
┌──────────────────────────────────────────────────────┐
│  User calls withdraw(1 ether)                        │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Check: balances[user] >= 1 ether ✓                 │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  VULNERABLE: External call                           │
│  user.call{value: 1 ether}("")                       │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Attacker's receive() function triggered             │
│  → Calls withdraw(1 ether) AGAIN                     │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Check: balances[user] >= 1 ether ✓                 │
│  (Still passes! Balance not updated yet)             │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Another 1 ether sent to attacker                    │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Eventually: balances[user] -= 1 ether               │
│  But attacker already extracted 2+ ether             │
└──────────────────────────────────────────────────────┘
```

### MockDeFi.sol - Integer Overflow

```
┌──────────────────────────────────────────────────────┐
│  User calls mint(type(uint256).max)                  │
│  balances[user] = 0 + type(uint256).max               │
│  balances[user] = 115792089237316195423570985008...   │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  User calls mint(1)                                   │
│  balances[user] = max + 1                            │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  VULNERABLE: Overflow wraps around                    │
│  balances[user] = 0 (instead of reverting)           │
│  totalSupply also wraps to 0                         │
└──────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│  Attacker manipulated balance from max to 0          │
│  Can now mint again and exploit further              │
└──────────────────────────────────────────────────────┘
```

## Testing Architecture

```
┌─────────────────────────────────────────────────────┐
│               Foundry Test Suite                     │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  VulnerableVaultTest                       │     │
│  │  • testDeposit()                           │     │
│  │  • testWithdraw()                          │     │
│  │  • testGetBalance()                        │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  Attacker Contract                         │     │
│  │  • attack() - initiates attack             │     │
│  │  • receive() - reentrancy callback         │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  ┌────────────────────────────────────────────┐     │
│  │  ReentrancyAttackTest                      │     │
│  │  • setUp() - fund victim & attacker        │     │
│  │  • testReentrancyAttack() - prove exploit  │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│             Test Results                             │
│                                                       │
│  ✓ Basic functions work correctly                   │
│  ✓ Reentrancy attack successfully exploits vault    │
│  ✓ Attacker extracts more funds than deposited      │
└─────────────────────────────────────────────────────┘
```

## Development Workflow

```
┌─────────────────────────────────────────────────────┐
│  1. Developer writes/modifies contract               │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  2. forge build                                      │
│     Compiles contracts                               │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  3. forge test                                       │
│     Runs test suite                                  │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  4. slither src/Contract.sol                         │
│     Static analysis for vulnerabilities              │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  5. anvil (start local node)                         │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  6. forge script script/DeployLocal.s.sol            │
│     Deploy to local Anvil                            │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  7. Manual testing with cast                         │
│     Interact with deployed contracts                 │
└─────────────────────────────────────────────────────┘
```

## File Dependencies

```
foundry.toml
    │
    ├── Defines: Solidity version, directories
    └── Used by: forge build, forge test, forge script

remappings.txt
    │
    ├── Maps: forge-std/ → lib/forge-std/src/
    └── Used by: All .sol files with imports

src/VulnerableVault.sol
    │
    ├── Imported by: script/DeployLocal.s.sol
    └── Tested by: test/VulnerableVault.t.sol

src/MockDeFi.sol
    │
    └── Standalone (not yet deployed/tested)

script/DeployLocal.s.sol
    │
    ├── Imports: forge-std/Script.sol, VulnerableVault.sol
    └── Executed by: forge script

test/VulnerableVault.t.sol
    │
    ├── Imports: forge-std/Test.sol, VulnerableVault.sol
    └── Executed by: forge test

setup.sh
    │
    ├── Runs: forge install, forge build
    └── Purpose: One-command setup
```

## Security Analysis Tools Integration

```
┌─────────────────────────────────────────────────────┐
│              Smart Contract Source                   │
│           (VulnerableVault.sol, etc.)                │
└─────────────────────────────────────────────────────┘
                    │
                    ├──────────┬──────────┬────────────
                    ▼          ▼          ▼
            ┌──────────┐ ┌──────────┐ ┌──────────┐
            │ Slither  │ │ Mythril  │ │  Manual  │
            │          │ │          │ │  Review  │
            └──────────┘ └──────────┘ └──────────┘
                    │          │          │
                    └──────────┴──────────┘
                              ▼
            ┌─────────────────────────────────┐
            │   Aggregated Findings           │
            │                                  │
            │  • Reentrancy: Critical          │
            │  • Overflow: High                │
            │  • CEI Violation: High           │
            │  • Deprecated Version: Info      │
            └─────────────────────────────────┘
                              ▼
            ┌─────────────────────────────────┐
            │     Researcher Agent             │
            │   (Formats & stores report)      │
            └─────────────────────────────────┘
```

## Deployment Stages

### Stage 1: Local Development (CURRENT)
- Environment: Anvil (localhost:8545)
- Purpose: Testing, vulnerability verification
- Contracts: VulnerableVault, MockDeFi
- Users: Developers only

### Stage 2: Integration Testing (NEXT)
- Environment: Anvil + Backend API
- Purpose: Agent integration testing
- Contracts: Same as Stage 1
- Users: Developers + Researcher Agent

### Stage 3: Testnet Deployment (FUTURE)
- Environment: Base Sepolia
- Purpose: Public testing
- Contracts: ProtocolRegistry, ValidationRegistry, BountyPool
- Users: Public testers

### Stage 4: Mainnet (EVENTUAL)
- Environment: Base Mainnet
- Purpose: Production
- Contracts: Production-ready versions
- Users: Real protocols and bug hunters

## Summary

This architecture provides:

1. Clear separation between test contracts (vulnerable) and production contracts (stubs)
2. Well-defined integration points with Researcher Agent
3. Comprehensive testing strategy with attack demonstrations
4. Scalable structure for Phase 3 expansion
5. Multiple security analysis layers

The current implementation (Phase 1) establishes the foundation for vulnerability detection testing, while the stub contracts (Phase 3) outline the future production system architecture.
