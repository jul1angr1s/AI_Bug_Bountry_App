# Security Specification

## Overview

Defense-in-depth security strategy covering AI agents, smart contracts, backend, and infrastructure.

## Source Documentation
- **Primary**: [project/Security.md](../../project/Security.md)
- **Supporting**: [project/Skills.md](../../project/Skills.md) (Trail of Bits Skills)

## Security Layers

### 1. AI & Agent Security
- **System Prompt Guardrails**: Strict output format enforcement, refusal instructions
- **Context Sanitation**: Sanitize external repo inputs (prevent indirect prompt injection)
- **Output Validation**: All LLM outputs pass through Zod schema before actioning
- **Sandbox Isolation**: Validation agents run in network-restricted containers

### 2. Smart Contract Security
- **Access Control (RBAC)**: OpenZeppelin AccessControl with granular roles
  - `DEFAULT_ADMIN_ROLE` - Cold storage multisig
  - `VALIDATOR_ROLE` - Validator agent hot wallet only
  - `PAYOUT_ROLE` - BountyPool contract only
- **Reentrancy Protection**: `nonReentrant` modifier on all payment functions
- **Bounty Caps**: `maxPayout` per protocol, global daily circuit breaker
- **Checks-Effects-Interactions**: State update before external calls
- **Emergency Pause**: Pausable functionality on BountyPool

### 3. Backend Security
- **Row Level Security (RLS)**: Enabled on all Supabase tables
- **Input Validation**: Zod schemas on all API inputs
- **Rate Limiting**: Redis-based limits (see API spec)
- **CORS Policy**: Restrict to specific frontend domains
- **Helmet Headers**: CSP, HSTS, No-Sniff

### 4. Infrastructure Security
- **Container Hardening**: Non-root user, minimal base images
- **Secret Management**: Runtime injection, no hardcoded secrets
- **Image Scanning**: Trivy in CI pipeline
- **Dependency Auditing**: npm audit in CI

## Anti-MEV Front-Running Protection

**Threat**: MEV bot observes `submitValidation` tx, clones it with bot address to steal bounty.

**Mitigation**: Cryptographic identity binding
1. Researcher signs payload + wallet address before encryption
2. Validator decrypts and checks `decrypted.identity.researcher` matches `tx.researcher`
3. Mismatch = rejection (bot cannot forge signature)

## Key Management (Validator Encryption)

**MVP**: Environment variables (VALIDATOR_ENCRYPTION_PRIVATE_KEY)
**Production Path**: AWS KMS → HashiCorp Vault → HSM

**Rotation Policy**:
- MVP: Manual on suspected compromise
- Production: Quarterly with 7-day overlap

## Required Skills (Trail of Bits)
- `building-secure-contracts` - Security patterns
- `entry-point-analyzer` - Attack surface analysis
- `static-analysis` - Slither/Semgrep integration
- `property-based-testing` - Foundry invariant tests

## Requirements

### Requirement: Proof encryption and signing
All researcher proofs MUST be encrypted for the Validator Agent and MUST include a researcher signature over the plaintext payload.

#### Scenario: Proof is generated
- **WHEN** a researcher produces a proof
- **THEN** the proof is encrypted for the validator and includes a researcher signature

### Requirement: Access controls for scan data
The system SHALL restrict write access to scans, findings, and proofs to service-role credentials and SHALL allow protocol owners to read their protocol scan results.

#### Scenario: Unauthorized write attempt
- **WHEN** a non-service client attempts to write scan data
- **THEN** the request is denied

### Requirement: Audit logging for agent actions
The system MUST log agent actions for scan creation, step transitions, proof submissions, and cancellations.

#### Scenario: Proof submission logged
- **WHEN** a proof is submitted
- **THEN** an audit log entry is recorded with agent id, scan id, and timestamp

### Requirement: Safe handling of repository inputs
The Researcher Agent MUST sanitize repository inputs and constrain execution to prevent code execution outside the sandbox.

#### Scenario: Repository includes unsafe path
- **WHEN** a repository includes a path traversal or unsafe script
- **THEN** the agent rejects the input and records a security error
