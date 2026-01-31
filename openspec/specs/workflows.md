# Workflows Specification

## Overview

End-to-end workflows from protocol registration through bounty payment.

## Source Documentation
- **Primary**: [project/Workflows.md](../../project/Workflows.md)
- **Demonstration**: [project/FirstFlightDemonstration.md](../../project/FirstFlightDemonstration.md)

## Core Workflows

### 1. System Initialization
```
Load Environment → Init PostgreSQL → Connect Redis
→ Start API/WebSocket/Queue Workers
→ Spawn MCP Agents (Protocol, Researcher, Validator)
→ Connect to Anvil (31337) + Base Sepolia (84532)
→ System Ready
```

### 2. Protocol Registration Flow
**Actor**: Protocol Agent
**Chains**: Base Sepolia (registration) + Local Anvil (target deployment)

1. Protocol owner submits GitHub URL + bounty terms
2. Protocol Agent clones repo, validates contract path
3. Compiles with Foundry, calculates risk score
4. Registers on-chain (ProtocolRegistry on Sepolia)
5. Stores in PostgreSQL, caches compiled artifacts
6. Prompts owner to fund bounty pool

### 3. Vulnerability Scanning Flow
**Actor**: Researcher Agent
**Chain**: Local Anvil (31337)

1. Scheduler queues scan request
2. Researcher Agent clones GitHub repo (specific commit)
3. Compiles contracts with Foundry
4. Deploys **fresh instance** to local Anvil
5. Runs static analysis (Slither, Quimera, Mythril)
6. Detects vulnerability patterns
7. Generates encrypted exploit proof
8. Submits to Validator Agent via A2A bus

### 4. Exploit Validation Flow
**Actor**: Validator Agent
**Chain**: Local Anvil Sandbox (31338)

1. Receives encrypted proof from Researcher
2. Decrypts and parses exploit instructions
3. Spawns isolated sandbox (fork from main Anvil)
4. Clones **same commit** as Researcher used
5. Deploys **fresh instance** to sandbox
6. Executes exploit, captures state changes
7. Records TRUE/FALSE on ERC-8004 (Base Sepolia)

### 5. Bounty Payment Flow
**Chain**: Base Sepolia (84532)

1. ValidationRegistry emits `ValidationTrue` event
2. BountyPool calculates payout (base × severity multiplier)
3. Checks available balance
4. Transfers USDC to researcher wallet
5. Emits `BountyReleased` event
6. Dashboard updates via WebSocket

## State Isolation Guarantee

**Problem**: If Agent A exploits a deployed contract, Agent B sees corrupted state.

**Solution**: Deploy fresh from source each time:
- Agent A deploys Vault@0x111 → exploits it
- Agent B deploys Vault@0x222 → scans clean state
- Same source code → same behavior → reproducible results

## Deduplication & Fairness

**First-to-Commit Principle**: On-chain `submittedAt` timestamp determines priority.

**Canonical Fingerprint**:
```solidity
vulnerabilityHash = keccak256(abi.encodePacked(
    chainId,
    targetContractAddress,
    vulnerabilityType,  // "REENTRANCY_ETH"
    functionSelector    // "0x3ccfd60b"
));
```

If two researchers find same `vulnerabilityHash`, earlier `submittedAt` wins.

## Requirements

### Requirement: Scan scheduling and distribution
The system SHALL schedule vulnerability scans for active protocols and enqueue scan jobs for Researcher Agents based on priority and last scan time.

#### Scenario: Scheduler enqueues scans
- **WHEN** the scheduler runs on its interval
- **THEN** it enqueues scan jobs for all eligible protocols with priority values

### Requirement: Scan lifecycle states
Scan jobs MUST transition through explicit states: queued, running, succeeded, failed, canceled.

#### Scenario: Scan completes successfully
- **WHEN** a Researcher Agent finishes all scan steps
- **THEN** the job state transitions from running to succeeded

### Requirement: Proof submission handoff
The workflow SHALL require that a succeeded scan produces a proof submission to the Validator Agent and records the handoff status.

#### Scenario: Proof handoff recorded
- **WHEN** a proof is submitted to the Validator Agent
- **THEN** the scan record stores the proof reference and handoff timestamp

### Requirement: Scan cancellation
The system MUST allow cancellation of queued or running scans and SHALL notify the Researcher Agent to stop processing.

#### Scenario: User cancels a scan
- **WHEN** a cancellation request is accepted
- **THEN** the scan state becomes canceled and the agent stops processing the job
