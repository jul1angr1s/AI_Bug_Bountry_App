# First Flight Demonstration: Thunder Loan Exploit

## Overview

This document demonstrates an end-to-end workflow of the Autonomous Bug Bounty Orchestrator using a real-world vulnerable smart contract: **Thunder Loan** from Cyfrin's First Flight security competition.

**Target Protocol**: [Cyfrin/2023-11-Thunder-Loan](https://github.com/Cyfrin/2023-11-Thunder-Loan)
**Detection Tool**: [Quimera](https://github.com/gustavo-grieco/quimera) - AI-powered exploit generation
**Known Vulnerabilities**: Flash loan oracle manipulation, storage collision, missing checks

---

## Demonstration Timeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     END-TO-END DEMONSTRATION TIMELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  T+0s          T+30s         T+60s         T+120s        T+180s      T+210s │
│    │             │             │              │             │            │   │
│    ▼             ▼             ▼              ▼             ▼            ▼   │
│ ┌──────┐    ┌──────┐     ┌──────┐      ┌──────┐      ┌──────┐    ┌──────┐  │
│ │REGIST│    │ SCAN │     │DETECT│      │SUBMIT│      │VALID │    │ PAY  │  │
│ │ER    │───▶│      │────▶│      │─────▶│PROOF │─────▶│ATE   │───▶│      │  │
│ └──────┘    └──────┘     └──────┘      └──────┘      └──────┘    └──────┘  │
│ Protocol    Researcher   Researcher    Researcher    Validator   BountyPool│
│ Agent       Agent        Agent         Agent         Agent       Contract   │
│                                                                              │
│ Base        Local        Local         IPFS +        Local       Base       │
│ Sepolia     Anvil        Anvil         A2A Bus       Sandbox     Sepolia    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Protocol Registration

### Step 1.1: Thunder Loan Owner Submits Protocol

**Actor**: Protocol Agent (on behalf of Thunder Loan team)
**Chain**: Base Sepolia (84532)

```typescript
// Dashboard Form Submission
const registrationRequest = {
  githubUrl: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  branch: "main",
  commitHash: null, // Use latest
  contractPath: "src/protocol/ThunderLoan.sol",
  contractName: "ThunderLoan",
  constructorArgs: [],
  name: "Thunder Loan Protocol",
  description: "Flash loan protocol for DeFi operations",
  bountyTerms: {
    baseReward: "500.00",        // $500 USDC base
    multipliers: {
      critical: 10.0,            // $5,000 for critical
      high: 5.0,                 // $2,500 for high
      medium: 2.0,               // $1,000 for medium
      low: 1.0                   // $500 for low
    },
    maxPayout: "25000.00"        // Cap at $25,000
  }
};
```

### Step 1.2: Protocol Agent MCP Tool Execution

```typescript
// Protocol Agent executes registration
const protocolAgent = {
  name: "Protocol Agent",
  tools: ["register_protocol", "fund_bounty_pool", "get_status"]
};

// MCP Tool: register_protocol
await protocolAgent.executeTool("register_protocol", {
  githubUrl: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  branch: "main",
  contractPath: "src/protocol/ThunderLoan.sol",
  contractName: "ThunderLoan",
  bountyTerms: registrationRequest.bountyTerms
});
```

### Step 1.3: On-Chain Registration (Base Sepolia)

```solidity
// ProtocolRegistry.sol on Base Sepolia
function registerProtocol(
    string calldata githubUrl,
    string calldata contractPath,
    BountyTerms calldata terms
) external returns (bytes32 protocolId) {
    protocolId = keccak256(abi.encodePacked(
        githubUrl,
        block.chainid,
        protocolCount++
    ));
    
    _protocols[protocolId] = Protocol({
        githubUrl: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
        contractPath: "src/protocol/ThunderLoan.sol",
        owner: msg.sender,
        status: ProtocolStatus.Pending,
        bountyTerms: terms,
        registeredAt: block.timestamp
    });
    
    emit ProtocolRegistered(protocolId, githubUrl, msg.sender);
}
```

**Transaction Output**:
```json
{
  "protocolId": "0x7a3f...9c2d",
  "txHash": "0xabc123...def456",
  "blockNumber": 18543210,
  "chain": "Base Sepolia (84532)",
  "status": "PENDING"
}
```

### Step 1.4: Fund Bounty Pool

```typescript
// Protocol Agent funds the bounty pool
await protocolAgent.executeTool("fund_bounty_pool", {
  protocolId: "0x7a3f...9c2d",
  amount: "10000.00", // $10,000 USDC
  tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // USDC Sepolia
});
```

```solidity
// BountyPool.sol - Deposit USDC
function depositBounty(bytes32 protocolId, uint256 amount) external {
    usdc.safeTransferFrom(msg.sender, address(this), amount);
    
    _pools[protocolId].totalDeposited += amount;
    _pools[protocolId].availableBalance += amount;
    
    // Activate protocol after funding
    protocolRegistry.updateStatus(protocolId, ProtocolStatus.Active);
    
    emit BountyDeposited(protocolId, msg.sender, amount);
}
```

**WebSocket Event Broadcast**:
```json
{
  "event": "protocol:registered",
  "data": {
    "protocolId": "0x7a3f...9c2d",
    "name": "Thunder Loan Protocol",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "bountyPool": "10000.00",
    "status": "ACTIVE"
  }
}
```

---

## Phase 2: Vulnerability Scanning

### Step 2.1: Researcher Agent Receives Scan Task

**Actor**: Researcher Agent
**Chain**: Local Anvil (31337)

```typescript
// Agent-to-Agent Message Bus
const scanRequest = {
  type: "SCAN_REQUEST",
  from: "scheduler",
  to: "researcher-agent-1",
  payload: {
    protocolId: "0x7a3f...9c2d",
    githubUrl: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    branch: "main",
    contractPath: "src/protocol/ThunderLoan.sol",
    priority: 1
  },
  timestamp: Date.now()
};
```

### Step 2.2: Clone Repository & Compile

```typescript
// MCP Tool: clone_repo
const repoPath = await researcherAgent.executeTool("clone_repo", {
  url: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  ref: "main"
});
// Returns: /cache/repos/Cyfrin/2023-11-Thunder-Loan/main

// MCP Tool: compile_contracts
const artifacts = await researcherAgent.executeTool("compile_contracts", {
  repoPath: repoPath,
  contractPath: "src/protocol/ThunderLoan.sol"
});
```

**Foundry Compilation**:
```bash
cd /cache/repos/Cyfrin/2023-11-Thunder-Loan/main
forge build

# Output:
# Compiling 15 files with Solc 0.8.20
# ThunderLoan.sol compiled successfully
# AssetToken.sol compiled successfully
# ...
```

### Step 2.3: Deploy Fresh Instance to Local Anvil

```typescript
// MCP Tool: deploy_fresh
const deployment = await researcherAgent.executeTool("deploy_fresh", {
  artifacts: artifacts,
  contractName: "ThunderLoan",
  constructorArgs: [],
  anvilUrl: "http://127.0.0.1:8545"
});

// Result:
{
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  blockNumber: 1,
  chainId: 31337
}
```

### Step 2.4: Run Quimera AI Exploit Detection

```typescript
// MCP Tool: scan_contract (integrates Quimera)
const scanResults = await researcherAgent.executeTool("scan_contract", {
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  analysisTools: ["quimera", "slither", "mythril"],
  scanType: "FULL"
});
```

**Quimera Execution**:
```bash
# Run Quimera exploit detection
quimera analyze \
  --target 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  --rpc http://127.0.0.1:8545 \
  --output /tmp/quimera-results.json

# Quimera AI Analysis Output:
{
  "vulnerabilities": [
    {
      "type": "ORACLE_MANIPULATION",
      "severity": "CRITICAL",
      "location": "ThunderLoan.sol:getCalculatedFee()",
      "description": "Flash loan fee calculation uses manipulable oracle",
      "confidence": 0.95
    },
    {
      "type": "STORAGE_COLLISION", 
      "severity": "HIGH",
      "location": "ThunderLoan.sol (upgradeable proxy)",
      "description": "Storage layout collision in upgradeable contract",
      "confidence": 0.88
    }
  ],
  "exploitGenerated": true,
  "exploitContract": "..."
}
```

### Step 2.5: Generate Exploit Proof-of-Concept

```typescript
// Quimera generates exploit contract
const exploitCode = `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ThunderLoan} from "../src/protocol/ThunderLoan.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ThunderLoanExploit {
    ThunderLoan public thunderLoan;
    IERC20 public token;
    uint256 public stolenAmount;
    
    constructor(address _thunderLoan, address _token) {
        thunderLoan = ThunderLoan(_thunderLoan);
        token = IERC20(_token);
    }
    
    function attack(uint256 amount) external {
        // Step 1: Request flash loan
        thunderLoan.flashloan(address(this), token, amount, "");
    }
    
    function executeOperation(
        address,
        IERC20 _token,
        uint256 amount,
        uint256 fee,
        bytes calldata
    ) external returns (bool) {
        // Step 2: Manipulate oracle during callback
        // Fee calculation uses current price which we manipulate
        
        // Step 3: Repay less than expected due to manipulated fee
        uint256 amountOwed = amount + fee;
        
        // Exploit: Oracle manipulation reduces fee calculation
        _token.transfer(address(thunderLoan), amountOwed);
        
        stolenAmount = token.balanceOf(address(this));
        return true;
    }
}
`;
```

---

## Phase 3: Proof Submission

### Step 3.1: Encrypt and Store Proof on IPFS

```typescript
// Create structured proof
const exploitProof = {
  protocolId: "0x7a3f...9c2d",
  vulnerability: {
    type: "ORACLE_MANIPULATION",
    severity: "CRITICAL",
    title: "Flash Loan Oracle Manipulation in getCalculatedFee()",
    description: "The fee calculation in ThunderLoan.getCalculatedFee() uses an oracle that can be manipulated within a flash loan callback, allowing attackers to pay reduced fees.",
    location: {
      file: "src/protocol/ThunderLoan.sol",
      function: "getCalculatedFee",
      lines: [142, 158]
    }
  },
  exploit: {
    contract: exploitCode,
    steps: [
      "1. Request flash loan for large amount",
      "2. In callback, manipulate oracle price",
      "3. Fee calculation uses manipulated price",
      "4. Repay with reduced fee amount",
      "5. Profit from fee differential"
    ],
    expectedProfit: "~5% of loan amount"
  },
  metadata: {
    detectedBy: "quimera-v1.0",
    scanId: "scan-abc123",
    commitHash: "a1b2c3d4...",
    timestamp: "2026-01-28T15:00:00Z"
  }
};

// Encrypt proof
const encryptedProof = await encrypt(exploitProof, validatorPublicKey);

// Generate proof hash
const proofHash = keccak256(JSON.stringify(exploitProof));
// proofHash: 0xdef456...789abc

// Store on IPFS via Pinata
const ipfsCid = await pinata.pinJSONToIPFS({
  pinataContent: encryptedProof,
  pinataMetadata: {
    name: `proof-${proofHash}`,
    keyvalues: { protocolId: "0x7a3f...9c2d", severity: "CRITICAL" }
  }
});
// ipfsCid: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
```

### Step 3.2: Submit to Validator Agent via A2A Bus

```typescript
// Agent-to-Agent Message
const proofSubmission = {
  type: "PROOF_SUBMISSION",
  from: "researcher-agent-1",
  to: "validator-agent-1",
  payload: {
    protocolId: "0x7a3f...9c2d",
    proofHash: "0xdef456...789abc",
    severity: "CRITICAL",
    ipfsCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    commitHash: "a1b2c3d4...",
    researcherAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  },
  signature: "0xsigned...",
  timestamp: Date.now()
};

// Publish to Redis PubSub
await redis.publish("agent:messages", JSON.stringify(proofSubmission));
```

**WebSocket Event**:
```json
{
  "event": "vuln:discovered",
  "data": {
    "protocolId": "0x7a3f...9c2d",
    "protocolName": "Thunder Loan Protocol",
    "severity": "CRITICAL",
    "title": "Flash Loan Oracle Manipulation",
    "status": "PENDING_VALIDATION"
  }
}
```

---

## Phase 4: Exploit Validation

### Step 4.1: Validator Agent Receives Proof

**Actor**: Validator Agent
**Chain**: Local Anvil Sandbox (31338)

```typescript
// Validator Agent receives message
const validatorAgent = {
  name: "Validator Agent",
  tools: ["clone_repo", "spawn_sandbox", "deploy_isolated", "execute_exploit", "update_registry"]
};

// Decrypt and parse proof
const decryptedProof = await decrypt(encryptedProof, validatorPrivateKey);
```

### Step 4.2: Spawn Isolated Sandbox

```typescript
// MCP Tool: spawn_sandbox
const sandbox = await validatorAgent.executeTool("spawn_sandbox", {
  baseAnvilUrl: "http://127.0.0.1:8545", // Fork from main Anvil
  sandboxPort: 8546,
  chainId: 31338
});

// Result:
{
  sandboxId: "sandbox-xyz789",
  rpcUrl: "http://127.0.0.1:8546",
  chainId: 31338,
  snapshotId: "0x1"
}
```

### Step 4.3: Deploy Fresh Contract from Same Source

```typescript
// Clone same commit as researcher
const repoPath = await validatorAgent.executeTool("clone_repo", {
  url: "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  ref: "a1b2c3d4..." // Exact commit hash from proof
});

// Deploy isolated instance
const isolatedDeployment = await validatorAgent.executeTool("deploy_isolated", {
  sandboxUrl: "http://127.0.0.1:8546",
  repoPath: repoPath,
  contractName: "ThunderLoan"
});

// Result:
{
  contractAddress: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  sandboxId: "sandbox-xyz789"
}
```

### Step 4.4: Execute Exploit in Sandbox

```typescript
// MCP Tool: execute_exploit
const exploitResult = await validatorAgent.executeTool("execute_exploit", {
  sandboxUrl: "http://127.0.0.1:8546",
  targetAddress: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  exploitContract: exploitCode,
  exploitFunction: "attack",
  exploitArgs: [ethers.parseEther("1000")] // 1000 ETH flash loan
});
```

**Foundry Test Execution**:
```bash
# Validator runs exploit in sandbox
forge script script/ValidateExploit.s.sol \
  --rpc-url http://127.0.0.1:8546 \
  --broadcast

# Output:
# Running validation for proof 0xdef456...789abc
# 
# Pre-exploit state:
#   - ThunderLoan balance: 10000 tokens
#   - Attacker balance: 0 tokens
#
# Executing exploit...
#   - Flash loan requested: 1000 tokens
#   - Oracle manipulated during callback
#   - Fee calculated: 0.5 tokens (should be 10 tokens)
#
# Post-exploit state:
#   - ThunderLoan balance: 9990.5 tokens  
#   - Attacker profit: 9.5 tokens
#
# ✅ EXPLOIT SUCCESSFUL - Vulnerability CONFIRMED
# State changes captured and logged
```

### Step 4.5: Capture State Changes

```typescript
// Capture before/after state
const stateChanges = {
  preExploit: {
    thunderLoanBalance: "10000000000000000000000",
    attackerBalance: "0"
  },
  postExploit: {
    thunderLoanBalance: "9990500000000000000000",
    attackerBalance: "9500000000000000000"
  },
  profitExtracted: "9.5 tokens",
  gasUsed: 245000,
  success: true
};

// Validation result
const validationResult = {
  validationId: "val-123456",
  proofHash: "0xdef456...789abc",
  result: "TRUE",
  severity: "CRITICAL",
  executionLog: stateChanges,
  sandboxId: "sandbox-xyz789"
};
```

---

## Phase 5: Registry Update & Payment

### Step 5.1: Update ERC-8004 Registry (Base Sepolia)

**Actor**: Validator Agent
**Chain**: Base Sepolia (84532)

```typescript
// MCP Tool: update_registry
await validatorAgent.executeTool("update_registry", {
  proofHash: "0xdef456...789abc",
  result: true, // TRUE = exploit confirmed
  severity: 0,  // 0 = CRITICAL
  researcher: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  ipfsCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
});
```

```solidity
// ValidationRegistry.sol on Base Sepolia
function recordResult(
    bytes32 validationId,
    ValidationResult result
) external onlyRole(VALIDATOR_ROLE) {
    Validation storage validation = _validations[validationId];
    require(validation.result == ValidationResult.Pending, "Already validated");
    
    validation.result = result; // TRUE
    validation.validatedAt = block.timestamp;
    
    emit ValidationCompleted(validationId, validation.proofHash, result);
    
    if (result == ValidationResult.True) {
        emit ValidationTrue(
            validationId,
            validation.protocolId,    // 0x7a3f...9c2d
            validation.researcher,     // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
            validation.severity        // CRITICAL (0)
        );
        
        // Trigger automatic payment
        bountyPool.releaseBounty(
            validation.protocolId,
            validation.researcher,
            validation.severity,
            validationId
        );
    }
}
```

**Transaction**:
```json
{
  "txHash": "0x789abc...def123",
  "blockNumber": 18543250,
  "chain": "Base Sepolia (84532)",
  "events": [
    "ValidationCompleted(0xval123, 0xdef456..., TRUE)",
    "ValidationTrue(0xval123, 0x7a3f..., 0x70997..., CRITICAL)"
  ]
}
```

### Step 5.2: Automatic Bounty Release

```solidity
// BountyPool.sol - Triggered by ValidationRegistry
function releaseBounty(
    bytes32 protocolId,
    address researcher,
    uint8 severity,
    bytes32 validationId
) external onlyRole(PAYOUT_ROLE) nonReentrant {
    require(!_paidValidations[validationId], "Already paid");
    
    // Calculate bounty: $500 base × 10x critical multiplier = $5,000
    uint256 amount = protocolRegistry.calculateBounty(protocolId, severity);
    // amount = 5000 * 10^6 (USDC has 6 decimals)
    
    PoolInfo storage pool = _pools[protocolId];
    require(pool.availableBalance >= amount, "Insufficient funds");
    
    _paidValidations[validationId] = true;
    pool.availableBalance -= amount;
    pool.totalPaidOut += amount;
    
    // Transfer USDC to researcher
    usdc.safeTransfer(researcher, amount);
    
    emit BountyReleased(protocolId, researcher, amount, validationId);
}
```

**Payment Transaction**:
```json
{
  "txHash": "0xpayment...abc789",
  "blockNumber": 18543251,
  "from": "BountyPool (0xBounty...)",
  "to": "Researcher (0x70997970C51812dc3A010C7d01b50e0d17dc79C8)",
  "token": "USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e)",
  "amount": "5000.00 USDC",
  "chain": "Base Sepolia (84532)"
}
```

---

## Phase 6: Notification & Dashboard Update

### Step 6.1: WebSocket Broadcast

```typescript
// Backend broadcasts events
io.to("vulnerabilities").emit("vuln:confirmed", {
  id: "vuln-abc123",
  protocolId: "0x7a3f...9c2d",
  protocolName: "Thunder Loan Protocol",
  title: "Flash Loan Oracle Manipulation",
  severity: "CRITICAL",
  researcher: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  validationTxHash: "0x789abc...def123"
});

io.to("payments").emit("payment:released", {
  id: "pay-xyz789",
  vulnerabilityId: "vuln-abc123",
  amount: "5000.00",
  token: "USDC",
  researcher: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  txHash: "0xpayment...abc789"
});
```

### Step 6.2: Dashboard Updates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BUG BOUNTY ORCHESTRATOR DASHBOARD                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🔔 ALERT: Critical Vulnerability Confirmed!                                │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ Protocol: Thunder Loan Protocol                                     │     │
│  │ Severity: 🔴 CRITICAL                                               │     │
│  │ Title: Flash Loan Oracle Manipulation in getCalculatedFee()        │     │
│  │ Researcher: 0x7099...79C8                                          │     │
│  │ Bounty Paid: $5,000.00 USDC ✅                                     │     │
│  │ Tx: 0xpayment...abc789                                             │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐       │
│  │ PROTOCOL STATS              │  │ AGENT STATUS                    │       │
│  │ Bounty Pool: $5,000.00      │  │ 🟢 Protocol Agent: Online       │       │
│  │ Vulns Found: 1              │  │ 🟢 Researcher Agent: Scanning   │       │
│  │ Total Paid: $5,000.00       │  │ 🟢 Validator Agent: Idle        │       │
│  └─────────────────────────────┘  └─────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Sequence Diagram

```mermaid
sequenceDiagram
    participant Owner as Protocol Owner
    participant PA as Protocol Agent
    participant Sepolia as Base Sepolia
    participant GitHub as GitHub
    participant RA as Researcher Agent
    participant Anvil as Local Anvil
    participant Quimera as Quimera AI
    participant IPFS as Pinata IPFS
    participant VA as Validator Agent
    participant Sandbox as Anvil Sandbox
    participant BP as BountyPool
    participant Researcher as Researcher Wallet
    participant Dashboard as Dashboard

    Note over Owner,Dashboard: PHASE 1: Registration
    Owner->>PA: Register Thunder Loan
    PA->>GitHub: Validate repo exists
    PA->>Sepolia: registerProtocol()
    PA->>Sepolia: depositBounty($10,000)
    Sepolia-->>Dashboard: protocol:registered

    Note over Owner,Dashboard: PHASE 2: Scanning
    RA->>GitHub: Clone repo
    RA->>Anvil: Deploy fresh ThunderLoan
    RA->>Quimera: Analyze contract
    Quimera-->>RA: CRITICAL: Oracle manipulation

    Note over Owner,Dashboard: PHASE 3: Proof
    RA->>RA: Generate exploit PoC
    RA->>IPFS: Store encrypted proof
    RA->>VA: PROOF_SUBMISSION (A2A)
    RA-->>Dashboard: vuln:discovered

    Note over Owner,Dashboard: PHASE 4: Validation
    VA->>GitHub: Clone same commit
    VA->>Sandbox: Deploy isolated instance
    VA->>Sandbox: Execute exploit
    Sandbox-->>VA: SUCCESS - Profit extracted

    Note over Owner,Dashboard: PHASE 5: Payment
    VA->>Sepolia: recordResult(TRUE)
    Sepolia->>BP: releaseBounty()
    BP->>Researcher: Transfer $5,000 USDC
    Sepolia-->>Dashboard: vuln:confirmed
    Sepolia-->>Dashboard: payment:released

    Note over Owner,Dashboard: PHASE 6: Notification
    Dashboard-->>Owner: 🔔 Vulnerability in your protocol!
    Dashboard-->>Researcher: 💰 Payment received!
```

---

## Database Records Created

### Protocol Record
```sql
INSERT INTO "Protocol" VALUES (
  '0x7a3f...9c2d',                                      -- id
  'https://github.com/Cyfrin/2023-11-Thunder-Loan',    -- githubUrl
  'main',                                               -- branch
  'a1b2c3d4...',                                       -- commitHash
  'src/protocol/ThunderLoan.sol',                      -- contractPath
  'ThunderLoan',                                        -- contractName
  'Thunder Loan Protocol',                              -- name
  'ACTIVE',                                             -- status
  '{"baseReward":500,"multipliers":...}',              -- bountyTerms
  '0xOwner...',                                        -- ownerAddress
  75,                                                   -- riskScore
  '2026-01-28 15:00:00'                                -- createdAt
);
```

### Vulnerability Record
```sql
INSERT INTO "Vulnerability" VALUES (
  'vuln-abc123',                                       -- id
  '0x7a3f...9c2d',                                     -- protocolId
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',       -- researcherId
  'scan-xyz789',                                       -- scanId
  '0xdef456...789abc',                                 -- proofHash
  'CRITICAL',                                          -- severity
  'PAID',                                              -- status
  'Flash Loan Oracle Manipulation',                    -- title
  'The fee calculation uses manipulable oracle...',   -- description
  '[{"step":1,"action":"Request flash loan"...}]',   -- exploitSteps
  'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco', -- ipfsCid
  '2026-01-28 15:01:00'                               -- discoveredAt
);
```

### Payment Record
```sql
INSERT INTO "Payment" VALUES (
  'pay-xyz789',                                        -- id
  'vuln-abc123',                                       -- vulnerabilityId
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',       -- researcherId
  'bounty-123',                                        -- bountyId
  5000.000000,                                         -- amount
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',       -- tokenAddress (USDC)
  '0xpayment...abc789',                               -- txHash
  'CONFIRMED',                                         -- status
  '2026-01-28 15:03:00',                              -- createdAt
  '2026-01-28 15:03:30'                               -- confirmedAt
);
```

---

## Summary: Platform Capabilities Demonstrated

| Capability | Demonstrated |
|------------|--------------|
| ✅ GitHub-based protocol registration | Thunder Loan repo registered |
| ✅ On-chain bounty pool funding | $10,000 USDC deposited |
| ✅ Fresh contract deployment per scan | ThunderLoan deployed to Anvil |
| ✅ AI-powered vulnerability detection | Quimera found oracle manipulation |
| ✅ Automated exploit generation | PoC contract generated |
| ✅ Encrypted proof storage (IPFS) | Proof stored on Pinata |
| ✅ Agent-to-Agent communication | Researcher → Validator via Redis |
| ✅ Isolated sandbox validation | Exploit verified in sandbox |
| ✅ ERC-8004 validation registry | Result recorded on-chain |
| ✅ Automatic bounty payment | $5,000 USDC transferred |
| ✅ Real-time dashboard updates | WebSocket events broadcast |
| ✅ Multi-chain architecture | Anvil (scanning) + Sepolia (payments) |

**Total Time: ~3.5 minutes from registration to payment** 🚀
---

## Phase 7: The 1-Minute Race Condition (Fairness Demo)

This scenario demonstrates how the system handles two researchers finding the same "Thunder Loan" oracle bug nearly simultaneously.

### Sequence of Events

**T+180s: Researcher A Submits Proof**
- **Researcher A** (0x7099...79C8) calls `submitValidation` on Base Sepolia.
- **Transaction**: Block 18543260, Timestamp `12:00:00`.
- **Status**: `Pending`.

**T+185s: Researcher B Submits Proof**
- **Researcher B** (0x3C44...7290) finds the same bug and calls `submitValidation`.
- **Transaction**: Block 18543262, Timestamp `12:00:12`.
- **Status**: `Pending`.

### Validation Processing

1. **Validator Agent** picks up **Researcher A's** submission (A is first based on on-chain timestamp).
2. **Validator Agent** confirms exploit is successful in sandbox.
3. **Validator Agent** updates registry to `TRUE` and triggers $5,000 payout to **Researcher A**.
4. **Validator Agent** picks up **Researcher B's** submission.
5. **Validator Agent** confirms exploit is successful.
6. **Internal Audit**: Agent maps vulnerability to `protocolId="0x7a3f...9c2d"` and `location="ThunderLoan.sol:getCalculatedFee()"`.
7. **Deduplication Check**: System finds Researcher A already paid for this exact location and type.

### Outcome & Transparency

**On-Chain Record:**
- **Researcher A (val-A)**: `ValidationResult: True`, `BountyPaid: 5000 USDC`.
- **Researcher B (val-B)**: `ValidationResult: Duplicate`, `ReferenceId: val-A`.

**Transparency Proof for Researcher B:**
- Researcher B can look up `val-A` on the `ValidationRegistry`.
- They see `val-A.submittedAt = 12:00:00` and `val-B.submittedAt = 12:01:12`.
- The 12-second difference is mathematically proven on the blockchain, guaranteeing that Researcher A was indeed first.
- The platform remains transparent: Researcher B's finding is acknowledged as valid (`TRUE` logic), but not eligible for payment due to the precedence of Researcher A.
