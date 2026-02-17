# Architecture Specification

## Overview

The Autonomous Bug Bounty Orchestrator uses a hybrid deployment model with MCP-powered AI agents for automated security auditing.

## Architectural Patterns

The system adheres to the following architectural principles to ensure maintainability, testability, and scalability:

- **Modular Monolith**: The application is structured as a single deployable unit but organized into distinct, loosely coupled modules based on business domains (e.g., Protocol Management, Scanning, Validation).
- **Hexagonal Architecture (Ports and Adapters)**: The core logic is isolated from external concerns. 
  - **Core**: Contains the domain entities and business rules.
  - **Ports**: Interface definitions that the core uses to interact with the outside world (Input/Driving Ports and Output/Driven Ports).
  - **Adapters**: Implementations of ports (e.g., REST controllers, Database repositories, Blockchain clients).
- **Clean Architecture**: Dependencies point inwards. The domain layer has no dependencies on frameworks, databases, or UI.

## Source Documentation
- **Primary**: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- **Supporting**: [docs/WORKFLOWS.md](../../docs/WORKFLOWS.md)

## System Layers

### 1. Frontend Layer
- React Dashboard with real-time monitoring
- WebSocket client for live updates
- Web3 wallet integration (Wagmi/Viem)

### 2. Agent Layer (MCP-Powered)
| Agent | Purpose | MCP Tools |
|-------|---------|-----------|
| Protocol Agent | Register protocols, fund pools | `register_protocol`, `fund_pool` |
| Researcher Agent | Clone repos, scan contracts | `clone_repo`, `compile`, `deploy_fresh`, `scan_contract` |
| Validator Agent | Execute exploits, update registry | `spawn_sandbox`, `execute_exploit`, `update_registry` |
| Payment Agent | Process USDC bounty payments | `release_bounty`, `check_balance`, `track_payment` |

### 3. Backend Services
- Node.js API Server (REST + WebSocket)
- BullMQ job queues (Redis)
- Scan scheduler
- State reconciliation worker

### 4. Blockchain Layer
| Network | Chain ID | Purpose |
|---------|----------|---------|
| Local Anvil | 31337 | Target contracts, validation sandbox |
| Base Sepolia | 84532 | Payment infrastructure (testnet) |
| Base Mainnet | 8453 | Production (future) |

### 5. Storage Layer
- PostgreSQL (via Supabase): Protocol metadata, bounty history
- Redis: Agent state, message queue
- IPFS: Encrypted vulnerability proofs

## Key Design Decision

**GitHub URL Registration**: Protocols register repository URLs instead of deployed contract addresses. This enables:
- Fresh deployment per scan (state isolation)
- Reproducible results (same source = same behavior)
- Version control (scan specific commits/branches)
- No exploited state pollution between agents

## Network Configuration

```
Development:
├── Anvil (8545) - Target contracts
├── Anvil (8546) - Validation sandbox
└── Base Sepolia - Payment contracts

Production:
├── Base Mainnet - All contracts
└── Backup RPC endpoints
```

## Change Specifications

- [Backend Architecture Hardening](../changes/archive/2026-02-06-backend-architecture-hardening/) - tsyringe DI, payment service decomposition, type safety, structured logging
