# Agents Specification

## Overview

MCP-powered AI agents using Kimi k.25 for inference. Five agent types (4 production + 1 dev tooling) coordinate via Redis PubSub.

## Source Documentation
- **Primary**: [docs/SUBAGENTS.md](../../docs/SUBAGENTS.md)
- **Supporting**: [docs/SKILLS.md](../../docs/SKILLS.md)

## AI Stack
- **Provider**: Kimi AI (Moonshot)
- **Model**: Kimi k.25
- **SDK**: @modelcontextprotocol/sdk

## Agent Types

### 1. Protocol Agent
**Purpose**: Represents protocols seeking security audits

**MCP Tools**:
- `register_protocol` - Register GitHub repo + terms
- `set_bounty_terms` - Configure bounty multipliers
- `fund_pool` - Deposit USDC to bounty pool
- `get_status` - Query protocol status

**Responsibilities**:
- Register GitHub repository URL in the Bazaar
- Define bounty pricing per severity
- Fund the bounty pool with USDC
- Receive vulnerability notifications

### 2. Researcher Agent
**Purpose**: Autonomous vulnerability scanner

**MCP Tools**:
- `clone_repo` - Clone GitHub repository
- `compile_contracts` - Run Foundry build
- `deploy_fresh` - Deploy to local Anvil
- `scan_contract` - Run static analysis (Slither, Quimera)
- `generate_proof` - Create encrypted exploit proof
- `submit_finding` - Send to Validator Agent

**Responsibilities**:
- Query available protocols from Bazaar
- Clone and compile contracts from GitHub
- Deploy fresh instance per scan (state isolation)
- Perform static analysis and pattern detection
- Generate encrypted exploit proofs

### 3. Validator Agent
**Purpose**: Independent exploit verification

**MCP Tools**:
- `clone_repo` - Clone same commit as Researcher
- `spawn_sandbox` - Create isolated Anvil instance
- `deploy_isolated` - Deploy to sandbox
- `execute_exploit` - Run exploit code
- `update_registry` - Record TRUE/FALSE on Base Sepolia

**Responsibilities**:
- Decrypt and parse exploit proofs
- Deploy fresh contract to isolated sandbox
- Execute exploit against clean instance
- Capture and verify state changes
- Update ERC-8004 registry (triggers payment)
- Update scan status in real-time

### 4. Payment Agent
**Purpose**: Processes USDC bounty payments and escrow operations

**Capabilities**:
- `USDC transfers` - Execute on-chain USDC payments via BountyPool contract
- `Bounty calculation` - Calculate payouts by severity (Critical/High/Medium/Low)
- `On-chain settlement` - Submit and verify Base Sepolia transactions
- `Payment tracking` - Record payment status and transaction hashes

**Responsibilities**:
- Process bounty payouts from BountyPool contract
- Calculate severity-based payment amounts
- Execute USDC transfers to researcher wallets
- Track payment state (PENDING → PROCESSING → COMPLETED/FAILED)
- Support demo mode fallback when pool is unfunded

### 5. Frontend QA Agent
**Purpose**: Automated frontend debugging and UI verification

**MCP Tools**:
- `chrome_devtools` - Inspect and control Chrome instance
- `console_logs` - Read browser console logs
- `network_monitor` - Analyze network requests
- `dom_inspector` - Query/manipulate DOM elements
- `screenshot` - Capture UI state

**Responsibilities**:
- Monitor browser console for errors
- Inspect DOM structure for layout issues
- Verify network request payloads/responses
- Debug real-time WebSocket updates
- Execute UI tests in headless Chrome

## Agent-to-Agent Communication

**Message Bus**: BullMQ (Redis-backed job queues)

**Message Types**:
- `SCAN_REQUEST` - PA/Scheduler → RA
- `PROOF_SUBMISSION` - RA → VA
- `VALIDATION_RESULT` - VA → RA/PA

**Message Structure**:
```typescript
{
  type: MessageType,
  from: AgentId,
  to: AgentId,
  payload: encrypted,
  signature: ed25519,
  timestamp: unix
}
```

## Swarm Orchestrator
- Task delegation and decomposition
- Resource management (spawn replicas under load)
- Consensus synthesis (deduplication logic)
- Self-healing (detect stuck/hallucinating agents)

## Required Skills
- `mcp-builder` - MCP server implementation
- `kimi-integration` - Kimi AI API integration
- `typescript-expert` - Type-safe agent code

## Requirements

### Requirement: Researcher agent lifecycle and job loop
The Researcher Agent SHALL run as a long-lived worker that pulls scan jobs from the queue, updates job state, and records execution metadata.

#### Scenario: Worker starts and claims a job
- **WHEN** the Researcher Agent process starts
- **THEN** it registers as online and claims the next queued scan job

### Requirement: Deterministic scan pipeline execution
The Researcher Agent SHALL execute the scan pipeline in the following order: clone repo, compile contracts, deploy fresh instance to local Anvil, run static analysis, generate encrypted proof, submit finding to Validator Agent.

#### Scenario: Successful scan pipeline
- **WHEN** a scan job is executed end-to-end without errors
- **THEN** the agent records each step completion and produces a proof submission

### Requirement: Proof submission contract
The Researcher Agent MUST submit findings to the Validator Agent via the Redis PubSub bus using the PROOF_SUBMISSION message type with a signed, encrypted payload and scan metadata.

#### Scenario: Proof submitted to validator
- **WHEN** a proof is generated
- **THEN** a PROOF_SUBMISSION message is published containing proof reference, scan id, protocol id, commit hash, and researcher identity

### Requirement: Error handling and retries
The Researcher Agent SHALL mark scan jobs as failed with a structured error code and MAY retry according to configured limits.

#### Scenario: Scan step fails
- **WHEN** a scan step fails (clone, compile, deploy, scan, proof)
- **THEN** the job state is set to failed with an error code and retry count is updated
