# Security & Hardening Strategy: Autonomous Bug Bounty Orchestrator

## Overview

This document outlines the security architecture, hardening measures, and best practices required to secure the Autonomous Bug Bounty Orchestrator. The strategy focuses on **Defense in Depth**, ensuring security at the Agent, Contract, Backend, and Infrastructure layers without relying on paid external licenses.

---

## 1. AI & Agent Security (Local LLM Hardening)

Running local LLMs (Ollama) introduces specific attack vectors covering prompt injection, hallucination, and sandbox escapes.

### 1.1 Model & Prompt Hardening
- **System Prompt Guardrails**: All agent system prompts must include strict output format enforcement and "refusal" instructions for unsafe operations.
- **Context Sanitation**: Sanitize all inputs from external repositories (code comments, READMEs) before feeding them to the LLM to prevent **Indirect Prompt Injection**.
- **Output Validation**: never execute LLM-generated code directly. All outputs must pass through a strict parser/validator (e.g., Zod schema) before actioning.

### 1.2 Sandbox Isolation (The "Air Gap")
- **Container Isolation**: Validation Agents must run in ephemeral, network-restricted Docker containers.
  - No internet access (deny egress) except to the local Anvil node.
  - Read-only file system (except `/tmp`).
  - Resource limits (CPU/RAM caps) to prevent DoS.
- **Agent Identity**: Each agent process runs with a unique, least-privilege system user (never `root`).

---

## 2. Smart Contract Security (On-Chain Hardening)

Since the platform handles USDC payments, smart contract security is critical.

### 2.1 Access Control (RBAC)
- **Role-Based Access**: Implement granular `AccessControl` (OpenZeppelin).
  - `DEFAULT_ADMIN_ROLE`: Cold storage multisig (Project DAO).
  - `VALIDATOR_ROLE`: Only assigned to the Validator Agent's hot wallet.
  - `PAYOUT_ROLE`: Only assigned to the BountyPool contract.
- **Timelocks**: Critical protocol upgrades or parameter changes (e.g., fee changes) must go through a TimeLock contract (e.g., 24h delay).

### 2.2 Payment Security
- **Bounty Caps**: Enforce a `maxPayout` per protocol and a global `circuitBreaker` limit per day to contain damage from compromised agents.
- **Pull over Push**: Implement "Pull" payments (Withdraw pattern) where possible to avoid reentrancy in payment loops, or strictly follow **Checks-Effects-Interactions**.
- **Reentrancy Guards**: Apply `nonReentrant` modifiers to all external functions changing state or transferring funds.
- **Emergency Pause**: Implement `Pausable` functionality to freeze the BountyPool in case of detected anomalies.

### 2.3 Verification & Compliance
- **Source Verification**: All target contracts must be verified on Basescan (via API) before a bounty scan allows them.
- **Bytecode Matching**: The Researcher Agent must compile the GitHub code `src` and verify the bytecode hash matches the on-chain deployed bytecode to prevent "Source Code mismatch" attacks.

---

## 3. Backend & Data Security (Supabase Hardening)

Leveraging Supabase requires strict configuration to prevent data leaks.

### 3.1 Row Level Security (RLS)
- **Deny by Default**: Enable RLS on ALL tables.
- **Policy Enforcement**:
  - `Public Read`: Allowed for Protocol metadata, Bounty stats.
  - `Owner Write`: Protocols can only be edited by the wallet address owner (`ownerAddress` = `auth.uid()`).
  - `Agent Write`: Validation results can only be written by the Validator Agent's Service Role (verified via API key).
  - `Researcher Read`: Researchers can only see *their* pending/rejected vulnerabilities. Confirmed ones are public.

### 3.2 API Hardening
- **Rate Limiting**: Implement strict Redis-based rate limiting on all API routes (e.g., `Scan Request`: 5/hour per user).
- **Input Validation**: Use **Zod** for strict schema validation on all request bodies. Reject any properties not explicitly defined.
- **Helmet Headers**: Secure Express with `helmet()` (Content Security Policy, HSTS, No-Sniff).
- **CORS Policy**: Restrict CORS to specific frontend domains; deny `*`.

### 3.3 Supabase Config
- **Disable Public Schemas**: Revoke `anon` and `authenticated` access to `public` schema tables unless explicitly granted via RLS policies.
- **Service Key Protection**: The `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the client-side code. It stays strictly in the Backend/Edge Functions.

---

## 4. Infrastructure Security (Docker & DevOps)

### 4.1 Container Hardening
- **Non-Root User**: All Dockerfiles must switch to a non-root user (`USER node` or `USER app`) at the end of the build.
- **Minimal Base Images**: Use Alpine or Distroless images (`gcr.io/distroless/nodejs`) to reduce the attack surface (no shell, no package managers).
- **Image Scanning**: Integrate `trivy` or `docker scan` in the CI pipeline to block builds with critical CVEs.

### 4.2 Secrets Management
- **No Hardcoded Secrets**: Scan codebase with `gitleaks` or `trufflehog` in pre-commit hooks.
- **Env Var Injection**: Inject secrets (Private Keys, API Keys) strictly at runtime vs build time. Use Railway/Supabase secret managers.

### 4.3 CI/CD Security
- **Branch Protection**: Require 1 review + status checks (tests, linting) for merging to `main`.
- **Signed Commits**: Enforce GPG signing for commits.
- **Dependency Auditing**: Run `npm audit` in CI pipeline to block vulnerable dependencies.

---

## 5. Operational Security (Monitoring & Response)

### 5.1 Anomaly Detection
- **Wallet Monitoring**: Monitor the BountyPool hot wallet for unexpected drains. If balance drops > 50% in 1 hour -> Auto-Pause Contract.
- **Agent Health Checks**: Monitor Agent heartbeat. If Validator Agent goes silent -> Pause Scanning Queue.

### 5.2 Logging & Audit
- **Immutable Audit Log**: All critical actions (Bounty Payout, Protocol Registration, Vulnerability Confirmation) must be logged to the `AuditLog` table and potentially pinned to IPFS for immutability.
- **Sanitized Logs**: Ensure logs do *not* contain PII, private keys, or full prompts (to prevent leaking prompt engineering IP).

### 5.3 Incident Response Plan
1. **Detect**: Alert from Monitoring (Sentry / PagerDuty).
2. **Contain**: Trigger `Emergency Pause` on BountyPool contract.
3. **Analyze**: Review Agent Logs and Transaction History.
4. **Patch**: Fix vulnerability (Agent logic or Contract code).
5. **Recover**: Upgrade contract via Proxy or restart Agents. resume operations.

---

---

## 6. Front-Running Protection (Anti-MEV)

Since the platform operates on a public blockchain (Base Sepolia/Mainnet), vulnerability submissions are susceptible to MEV bots observing the mempool and front-running the `submitValidation` transaction to claim the bounty.

### 6.1 Threat Model
1. **The Attack**: A MEV bot observes a pending transaction to `submitValidation(protocolId, proofHash, researcherAddress, ipfsCid)`.
2. **The Clone**: The bot creates a clone transaction with `researcherAddress = botAddress` but keeps the same `proofHash` and `ipfsCid`.
3. **The Front-Run**: The bot submits this with higher gas fees, ensuring it is mined before the original researcher's transaction.
4. **The Impact**: If the Validator Agent simply decrypts the IPFS payload and pays the `researcherAddress` listed in the contract, the bot steals the bounty without doing any work.

### 6.2 Mitigation Strategy: Cryptographic Binding
To prevent this, the *contents* of the encrypted proof must be cryptographically bound to the *submitter*.

1. **Identity Binding**: The encrypted JSON payload must explicitly contain the `researcherAddress` and a `signature` of the payload signed by that address.
   ```json
   {
     "payload": { ...exploit_details... },
     "identity": {
       "researcher": "0x7099...",
       "signature": "0x382a..." // signing "timestamp + protocolId + proofHash"
     }
   }
   ```
2. **Validator Check**: The Validator Agent performs a critical check after decrypting:
   - Does `decrypted.identity.researcher` match `chain.getValidation(id).researcher`?
   - Is the `signature` valid for that address?

### 6.3 Enforcement Logic
- **If Match**: The submission is valid.
- **If Mismatch**: The submission is flagged as a **Front-Running Attempt**. The Validator Agent rejects the validation (records `FALSE` or `ERROR`) and may blacklist the submission address.
- **Bot Failure**: Since the MEV bot cannot generate a valid signature for the original researcher's address (without their private key) nor decrypt/modify the payload to insert their own address (without the Validator's private key), the attack is mathematically impossible.

---

## Security Checklist for Acceptance

| Category | Item | Verified |
|----------|------|----------|
| **Agent** | System prompts contain refusal guardrails | ⬜ |
| **Agent** | Sandbox container has no internet access | ⬜ |
| **Contract** | ReentrancyGuard on all payment functions | ⬜ |
| **Contract** | AccessControl roles properly separated | ⬜ |
| **Backend** | Supabase RLS enabled on all tables | ⬜ |
| **Backend** | Zod validation on all API inputs | ⬜ |
| **Infra** | Docker containers run as non-root | ⬜ |
| **Infra** | CI pipeline includes `npm audit` & `trufflehog` | ⬜ |
| **Ops** | Emergency Pause functionality tested | ⬜ |
| **Ops** | Audit logging implemented for payouts | ⬜ |

