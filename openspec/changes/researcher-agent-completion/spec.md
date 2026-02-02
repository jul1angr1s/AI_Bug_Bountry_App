# Researcher Agent Completion Specification

## Overview

This specification defines the completion of the Researcher Agent, which performs automated vulnerability scanning of smart contracts using Kimi 2.5 LLM, generates exploit proof-of-concept code, and creates Finding records for the Validator Agent.

## Technical Specification

### ADDED Requirements

### Requirement: System SHALL scan smart contracts for vulnerabilities using LLM
The system SHALL use Kimi 2.5 LLM to analyze Solidity contracts and identify security vulnerabilities.

#### Scenario: Researcher Agent picks up scan job
- **GIVEN** Protocol record exists with status=ACTIVE
- **WHEN** Researcher Agent worker processes scan queue job
- **THEN** system SHALL create Scan record with status=RUNNING
- **THEN** system SHALL fetch Protocol data (contractPath, githubUrl, branch)
- **THEN** system SHALL extract contract source code from cloned repository

#### Scenario: Agent deploys contract to local Anvil fork
- **GIVEN** contract source code is available
- **WHEN** Researcher Agent prepares analysis environment
- **THEN** system SHALL start local Anvil fork (Base Sepolia)
- **THEN** system SHALL compile contract using Foundry
- **THEN** system SHALL deploy contract to local fork
- **THEN** system SHALL update Scan.currentStep = "Deploy"
- **THEN** system SHALL broadcast WebSocket event `scan:progress` with { scanId, progress: 25, step: "Deploy" }

#### Scenario: Agent analyzes contract with Kimi LLM
- **GIVEN** contract is deployed on local fork
- **WHEN** Researcher Agent begins vulnerability analysis
- **THEN** system SHALL construct LLM analysis prompt:
  ```
  Analyze this Solidity smart contract for security vulnerabilities.

  Contract Source:
  {contract_source_code}

  Focus Areas:
  - Access control vulnerabilities
  - Reentrancy attacks
  - Oracle manipulation
  - Flash loan attacks
  - Storage collisions
  - Integer overflow/underflow
  - Front-running vulnerabilities

  For each vulnerability found:
  1. Describe the vulnerability clearly
  2. Assess severity (CRITICAL, HIGH, MEDIUM, LOW)
  3. Explain the exploit vector
  4. Estimate potential financial impact

  Response Format:
  - Vulnerability: [Title]
  - Severity: [CRITICAL/HIGH/MEDIUM/LOW]
  - Description: [Detailed explanation]
  - Exploit Vector: [Step-by-step attack path]
  ```
- **THEN** system SHALL send prompt to Kimi 2.5 API with model="k1.5-all"
- **THEN** system SHALL update Scan.currentStep = "Analyze"
- **THEN** system SHALL broadcast WebSocket event `scan:progress` with { scanId, progress: 50, step: "Analyze" }

#### Scenario: LLM identifies oracle manipulation vulnerability
- **GIVEN** Thunder Loan contract uses price oracle in `getCalculatedFee()`
- **WHEN** Kimi LLM analyzes contract
- **THEN** LLM SHALL identify vulnerability: "Oracle Manipulation in Fee Calculation"
- **THEN** LLM SHALL assess severity=CRITICAL
- **THEN** LLM SHALL describe exploit: "Attacker can manipulate oracle price feed during flash loan execution window to reduce fees"

### Requirement: System SHALL generate exploit proof-of-concept code
The system SHALL automatically generate executable PoC code demonstrating identified vulnerabilities.

#### Scenario: Agent generates PoC for oracle manipulation
- **GIVEN** LLM identified oracle manipulation vulnerability
- **WHEN** Researcher Agent generates proof
- **THEN** system SHALL construct second LLM prompt:
  ```
  Generate an exploit proof-of-concept (PoC) in Solidity for the following vulnerability.

  Vulnerability: Oracle Manipulation in Fee Calculation
  Contract: ThunderLoan
  Description: {vulnerability_description}

  Requirements:
  - Write a Foundry test file that demonstrates the exploit
  - Include setup, exploit execution, and assertion of success
  - Add comments explaining each step
  - Use realistic attack parameters
  - Demonstrate measurable financial impact

  Template:
  ```solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.0;

  import "forge-std/Test.sol";
  import "../src/protocol/ThunderLoan.sol";

  contract ExploitPoC is Test {
      // Setup and exploit code here
  }
  ```
  ```
- **THEN** system SHALL send prompt to Kimi 2.5 API
- **THEN** system SHALL parse LLM response to extract Solidity code
- **THEN** system SHALL update Scan.currentStep = "Generate Proof"
- **THEN** system SHALL broadcast WebSocket event `scan:progress` with { scanId, progress: 75, step: "Generate Proof" }

#### Scenario: PoC code compilation validation
- **GIVEN** LLM generated PoC Solidity code
- **WHEN** Researcher Agent validates proof
- **THEN** system SHALL write PoC to temporary file
- **THEN** system SHALL attempt to compile using `forge build`
- **THEN** if compilation fails, system SHALL request LLM to fix syntax errors
- **THEN** system SHALL retry compilation up to 3 times
- **THEN** if compilation succeeds, system SHALL mark proof as valid

### Requirement: System SHALL create Finding records with encrypted proofs
The system SHALL store vulnerability findings with encrypted exploit proofs in the database.

#### Scenario: Agent creates Finding record
- **GIVEN** vulnerability identified and PoC generated successfully
- **WHEN** Researcher Agent submits finding
- **THEN** system SHALL encrypt proof code using AES-256
- **THEN** system SHALL create Finding record:
  - protocolId = scanned protocol ID
  - scanId = current scan ID
  - title = "Oracle Manipulation in Fee Calculation"
  - description = LLM vulnerability description
  - severity = CRITICAL
  - proof = encrypted PoC code
  - status = PENDING_VALIDATION
  - researcherAddress = platform agent address (0x0000...AgentBot)
  - discoveredAt = current timestamp
- **THEN** system SHALL update Scan.findingsCount += 1
- **THEN** system SHALL broadcast WebSocket event `finding:discovered` with { findingId, scanId, protocolId, severity }

#### Scenario: Agent creates multiple findings for multiple vulnerabilities
- **GIVEN** LLM identified 3 vulnerabilities (1 CRITICAL, 2 HIGH)
- **WHEN** Researcher Agent processes results
- **THEN** system SHALL generate PoC for each vulnerability
- **THEN** system SHALL create 3 separate Finding records
- **THEN** system SHALL queue 3 validation jobs

### Requirement: System SHALL trigger Validator Agent queue
The system SHALL automatically queue validation jobs for each discovered finding.

#### Scenario: Finding triggers validation queue
- **GIVEN** Finding created with status=PENDING_VALIDATION
- **WHEN** Finding record is saved
- **THEN** system SHALL add job to validation queue with payload { findingId }
- **THEN** system SHALL log: "Queued validation for findingId={id}"

### Requirement: System SHALL update scan status and notify completion
The system SHALL mark scans as complete and broadcast final status.

#### Scenario: Scan completes successfully
- **GIVEN** all vulnerabilities processed and findings created
- **WHEN** Researcher Agent finishes processing
- **THEN** system SHALL update Scan record:
  - status = SUCCEEDED
  - completedAt = current timestamp
  - currentStep = "Submit"
  - progress = 100
- **THEN** system SHALL update Protocol.lastScannedAt = current timestamp
- **THEN** system SHALL broadcast WebSocket event `scan:complete` with { scanId, status: "SUCCEEDED", findingsCount }

#### Scenario: Scan fails with error
- **GIVEN** contract compilation fails or LLM API error occurs
- **WHEN** Researcher Agent encounters unrecoverable error
- **THEN** system SHALL update Scan.status = FAILED
- **THEN** system SHALL store error message in Scan.errorMessage
- **THEN** system SHALL broadcast WebSocket event `scan:failed` with { scanId, error }

### Requirement: System SHALL handle scan errors with retry logic
The system SHALL gracefully handle failures and retry transient errors.

#### Scenario: Contract clone fails
- **GIVEN** GitHub repository is unavailable (404 or network error)
- **WHEN** Researcher Agent attempts to clone
- **THEN** system SHALL log error: "Failed to clone repository: {error}"
- **THEN** system SHALL throw error to trigger BullMQ retry
- **THEN** system SHALL retry job with exponential backoff (1m, 2m, 4m)
- **THEN** after 3 retries, system SHALL update Scan.status = FAILED

#### Scenario: Kimi API timeout
- **GIVEN** LLM analysis exceeds 90 second timeout
- **WHEN** Researcher Agent waits for response
- **THEN** system SHALL abort request and throw timeout error
- **THEN** system SHALL retry job up to 3 times
- **THEN** after max retries, system SHALL mark Scan.status = FAILED

#### Scenario: Contract compilation error
- **GIVEN** contract has syntax errors or missing dependencies
- **WHEN** Foundry compilation fails
- **THEN** system SHALL log compilation errors
- **THEN** system SHALL update Scan.status = FAILED
- **THEN** system SHALL store error in Scan.errorMessage
- **THEN** system SHALL NOT retry (compilation errors are not transient)

### Requirement: System SHALL provide real-time progress updates via WebSocket
The system SHALL broadcast scan progress events for UI real-time updates.

#### Scenario: Broadcast progress at each stage
- **WHEN** Scan.currentStep = "Deploy"
- **THEN** WebSocket event `scan:progress` SHALL emit { scanId, progress: 25, step: "Deploy" }
- **WHEN** Scan.currentStep = "Analyze"
- **THEN** WebSocket event `scan:progress` SHALL emit { scanId, progress: 50, step: "Analyze" }
- **WHEN** Scan.currentStep = "Generate Proof"
- **THEN** WebSocket event `scan:progress` SHALL emit { scanId, progress: 75, step: "Generate Proof" }
- **WHEN** Scan.currentStep = "Submit"
- **THEN** WebSocket event `scan:progress` SHALL emit { scanId, progress: 100, step: "Submit" }

## Implementation Notes

### Technology Stack
- **Queue**: BullMQ with Redis backend
- **LLM**: Moonshot AI Kimi 2.5 API (model: k1.5-all)
- **Blockchain**: Anvil (local Ethereum fork)
- **Compiler**: Foundry (forge build)
- **Encryption**: Node.js crypto module (AES-256-CBC)

### Researcher Service Architecture
```typescript
// backend/src/services/researcher.service.ts
export class ResearcherService {
  async scanProtocol(protocolId: string, scanId: string): Promise<void> {
    // 1. Clone repository
    // 2. Deploy to Anvil fork
    // 3. Analyze with LLM
    // 4. Generate PoCs for vulnerabilities
    // 5. Create Finding records
    // 6. Queue validation jobs
    // 7. Mark scan complete
  }

  async analyzeContract(contractCode: string): Promise<Vulnerability[]> {
    // Call Kimi API for vulnerability analysis
  }

  async generateProof(vulnerability: Vulnerability): Promise<string> {
    // Call Kimi API to generate PoC code
  }

  async encryptProof(proofCode: string): Promise<string> {
    // Encrypt using AES-256
  }
}
```

### BullMQ Queue Configuration
```typescript
// backend/src/queues/scan.queue.ts
export const scanQueue = new Queue('scan', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    timeout: 300000, // 5 minute job timeout
  },
});

export const scanWorker = new Worker('scan', async (job) => {
  const { protocolId, scanId } = job.data;
  return await researcherService.scanProtocol(protocolId, scanId);
}, {
  connection: redis,
  concurrency: 2, // Process 2 scans in parallel
});
```

### Proof Encryption Strategy
```typescript
const algorithm = 'aes-256-cbc';
const key = process.env.PROOF_ENCRYPTION_KEY; // 32-byte key
const iv = crypto.randomBytes(16);

function encryptProof(proofCode: string): string {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(proofCode, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

### Prompt Engineering for Vulnerability Detection
The analysis prompt is engineered to:
1. Focus on common DeFi vulnerability patterns
2. Request structured output (Vulnerability, Severity, Description, Exploit Vector)
3. Emphasize financial impact assessment
4. Use Thunder Loan as reference example

### Performance Optimization
- **Concurrency**: Process 2 scans in parallel
- **Timeouts**: 90s for LLM calls, 5m for total job
- **Caching**: Cache Foundry compilation artifacts
- **Batching**: Generate PoCs for multiple vulnerabilities in single LLM call

## Success Criteria

- [ ] Researcher Agent scans Thunder Loan in <60 seconds
- [ ] LLM identifies oracle manipulation vulnerability
- [ ] PoC code generated and compiles successfully
- [ ] Finding created with encrypted proof
- [ ] Validation queue triggered automatically
- [ ] WebSocket events broadcast progress in real-time
- [ ] Retry logic handles transient failures
- [ ] Failed scans logged with error details
- [ ] Multiple vulnerabilities processed correctly
- [ ] Anvil fork cleaned up after scan
