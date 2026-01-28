# Agents Specification

## Overview

MCP-powered AI agents using Ollama for local inference. Three specialized agent types coordinate via Redis PubSub.

## Source Documentation
- **Primary**: [project/Subagents.md](../../project/Subagents.md)
- **Supporting**: [project/Skills.md](../../project/Skills.md)

## AI Stack
- **Engine**: Ollama (local)
- **Primary Model**: DeepSeek Coder V2 (code analysis)
- **Secondary Model**: Llama 3.1 (general reasoning)
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

## Agent-to-Agent Communication

**Message Bus**: Redis PubSub

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
- `ollama` - Local LLM integration
- `typescript-expert` - Type-safe agent code
