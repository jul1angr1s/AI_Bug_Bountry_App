# Researcher Agent Scanning Pipeline - Flow Diagram

## Complete End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SCAN REQUEST INITIATED                            │
│                    (POST /api/scans or BullMQ Job)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESEARCHER AGENT WORKER                          │
│                         (worker.ts - Job Handler)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Find available RESEARCHER agent (status: ONLINE)                    │
│  2. Create AgentRun record (start tracking)                             │
│  3. Update agent status → SCANNING                                      │
│  4. Assign scan to agent                                                │
│  5. Emit scan:started WebSocket event                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: CLONE REPOSITORY                            │
│                      (steps/clone.ts) [10-20%]                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - scanId, protocolId                                                  │
│    - repoUrl (GitHub HTTPS)                                              │
│    - targetBranch, targetCommitHash (optional)                           │
│                                                                          │
│  Process:                                                                │
│    1. Sanitize scanId and protocolId                                     │
│    2. Validate GitHub URL format                                         │
│    3. Create directory: /tmp/thunder-repos/{protocolId}/{scanId}         │
│    4. Clone repo (shallow: --depth 1)                                    │
│    5. Checkout branch/commit if specified                                │
│                                                                          │
│  Output:                                                                 │
│    ✓ clonedPath: /tmp/thunder-repos/...                                  │
│    ✓ branch: main                                                        │
│    ✓ commitHash: abc123def...                                            │
│                                                                          │
│  WebSocket: scan:progress (20%, "Repository cloned")                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 2: COMPILE CONTRACTS                           │
│                      (steps/compile.ts) [30-40%]                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - clonedPath: /tmp/thunder-repos/...                                  │
│    - contractPath: contracts/MyContract.sol                              │
│    - contractName: MyContract                                            │
│                                                                          │
│  Process:                                                                │
│    1. Check for foundry.toml                                             │
│    2. Initialize Foundry if needed: forge init --force                   │
│    3. Install dependencies: forge install --no-commit                    │
│    4. Compile: forge build --force                                       │
│    5. Parse stdout/stderr for errors/warnings                            │
│    6. Extract ABI from: out/{ContractFile}.sol/{ContractName}.json       │
│    7. Extract bytecode from artifact                                     │
│                                                                          │
│  Output:                                                                 │
│    ✓ success: true                                                       │
│    ✓ artifactsPath: /tmp/thunder-repos/.../out                           │
│    ✓ abi: [...] (JSON array)                                             │
│    ✓ bytecode: 0x60806040...                                             │
│    ✓ errors: [] (if any)                                                 │
│    ✓ warnings: [] (if any)                                               │
│                                                                          │
│  WebSocket: scan:progress (40%, "Compilation successful")                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 3: DEPLOY TO ANVIL                             │
│                      (steps/deploy.ts) [50-60%]                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - abi: [...] (from compilation)                                       │
│    - bytecode: 0x60806040...                                             │
│    - contractName: MyContract                                            │
│                                                                          │
│  Process:                                                                │
│    1. Find free port: 8545-8645                                          │
│    2. Start Anvil: anvil --port 8547 --host 127.0.0.1                    │
│    3. Wait for Anvil ready (check with eth_blockNumber)                  │
│    4. Create ethers provider: http://127.0.0.1:8547                      │
│    5. Get signer (Anvil's test account #0)                               │
│    6. Create ContractFactory(abi, bytecode, signer)                      │
│    7. Deploy: factory.deploy()                                           │
│    8. Wait for deployment confirmation                                   │
│                                                                          │
│  Output:                                                                 │
│    ✓ deploymentAddress: 0x5FbDB2315678afecb367f032d93F642f64180aa3       │
│    ✓ anvilPort: 8547                                                     │
│    ✓ anvilProcess: ChildProcess (for cleanup)                            │
│    ✓ provider: JsonRpcProvider                                           │
│    ✓ transactionHash: 0x1234...                                          │
│                                                                          │
│  WebSocket: scan:progress (60%, "Deployment complete")                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 4: STATIC ANALYSIS                             │
│                      (steps/analyze.ts) [70-80%]                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - clonedPath: /tmp/thunder-repos/...                                  │
│    - contractPath: contracts/MyContract.sol                              │
│    - contractName: MyContract                                            │
│                                                                          │
│  Process:                                                                │
│    1. Run Slither: slither . --json - --exclude-dependencies             │
│    2. Parse JSON from stdout                                             │
│    3. Extract detectors from results                                     │
│    4. For each detector:                                                 │
│       a. Map impact → Severity (HIGH → CRITICAL, etc.)                   │
│       b. Map check → vulnerability type (reentrancy-eth → REENTRANCY)    │
│       c. Extract file path, line number, function                        │
│       d. Calculate confidence score (high: 0.9, medium: 0.7, low: 0.5)   │
│    5. Filter findings:                                                   │
│       - Remove confidence < 0.4                                          │
│       - Remove INFO with confidence < 0.7                                │
│       - Remove test files                                                │
│    6. Store findings in database                                         │
│                                                                          │
│  Output:                                                                 │
│    ✓ findings: [                                                         │
│        {                                                                 │
│          vulnerabilityType: "REENTRANCY",                                │
│          severity: "CRITICAL",                                           │
│          filePath: "contracts/MyContract.sol",                           │
│          lineNumber: 45,                                                 │
│          functionSelector: "withdraw",                                   │
│          description: "Reentrancy in withdraw function",                 │
│          confidenceScore: 0.85                                           │
│        }                                                                 │
│      ]                                                                   │
│    ✓ toolsUsed: ["slither"]                                              │
│                                                                          │
│  Database: Create Finding records for each vulnerability                 │
│  WebSocket: scan:progress (80%, "Found 3 vulnerabilities")               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 5: PROOF GENERATION                              │
│                    (steps/proof-generation.ts) [90-95%]                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - scanId                                                              │
│    - findings: [...] (from database)                                     │
│    - clonedPath: /tmp/thunder-repos/...                                  │
│    - deploymentAddress: 0x5FbDB...                                       │
│                                                                          │
│  Process (for each finding):                                             │
│    1. Generate unique proof ID: nanoid(16)                               │
│    2. Generate reproduction steps based on vulnerability type:           │
│       - REENTRANCY: Create malicious contract, recursive call            │
│       - ACCESS_CONTROL: Call from unauthorized account                   │
│       - ARBITRARY_SEND: Send to attacker address                         │
│       - etc.                                                             │
│    3. Generate expected outcome description                              │
│    4. Create proof structure:                                            │
│       {                                                                  │
│         id: "proof-abc123",                                              │
│         findingId: "finding-xyz789",                                     │
│         vulnerabilityType: "REENTRANCY",                                 │
│         severity: "CRITICAL",                                            │
│         location: { filePath, lineNumber, functionSelector },            │
│         exploitDetails: { reproductionSteps, expectedOutcome },          │
│         contractDetails: { deploymentAddress },                          │
│         metadata: { generatedAt, scanId, confidenceScore }               │
│       }                                                                  │
│    5. Serialize to JSON                                                  │
│    6. Base64 encode (encryption placeholder for MVP)                     │
│    7. Generate placeholder signature                                     │
│    8. Store in database with status: ENCRYPTED                           │
│                                                                          │
│  Output:                                                                 │
│    ✓ proofs: [ProofData, ProofData, ...]                                 │
│    ✓ proofsCreated: 3                                                    │
│                                                                          │
│  Database: Create Proof records for each finding                         │
│  WebSocket: scan:progress (95%, "Proofs generated")                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 6: SUBMIT TO VALIDATOR                           │
│                    (steps/submit.ts) [98-100%]                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Input:                                                                  │
│    - scanId, protocolId                                                  │
│    - proofs: [...] (from database)                                       │
│    - targetCommitHash                                                    │
│    - anvilProcess: ChildProcess                                          │
│                                                                          │
│  Process:                                                                │
│    1. Get all proofs for scan from database                              │
│    2. For each proof:                                                    │
│       a. Create submission message:                                      │
│          {                                                               │
│            scanId, protocolId, proofId, findingId,                       │
│            commitHash, signature, encryptedPayload,                      │
│            timestamp                                                     │
│          }                                                               │
│       b. Publish to Redis channel: "PROOF_SUBMISSION"                    │
│       c. Update proof status: ENCRYPTED → SUBMITTED                      │
│    3. Clean up Anvil:                                                    │
│       a. Send SIGTERM (graceful shutdown)                                │
│       b. Wait 5 seconds                                                  │
│       c. Send SIGKILL if still running (force)                           │
│    4. Verify cleanup completed                                           │
│                                                                          │
│  Output:                                                                 │
│    ✓ proofsSubmitted: 3                                                  │
│    ✓ submissionTimestamp: "2026-01-31T12:00:00.000Z"                     │
│    ✓ cleanupCompleted: true                                              │
│                                                                          │
│  Redis: Publish to PROOF_SUBMISSION channel                              │
│  Database: Update Proof.status → SUBMITTED                               │
│  Process: Kill Anvil (SIGTERM → SIGKILL)                                 │
│  WebSocket: scan:progress (100%, "Submission complete")                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SCAN COMPLETION                                 │
│                     (worker.ts - Final Steps)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Update scan state: RUNNING → SUCCEEDED                               │
│  2. Update scan.findingsCount                                            │
│  3. Emit scan:completed WebSocket event                                  │
│  4. Complete AgentRun record (duration, metrics)                         │
│  5. Update agent status: SCANNING → ONLINE                               │
│  6. Increment agent.scansCompleted                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RESULTS AVAILABLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Database Tables Updated:                                                │
│    ✓ Scan (state: SUCCEEDED, findingsCount: 3)                           │
│    ✓ ScanStepRecord (6 records, all status: COMPLETED)                   │
│    ✓ Finding (3 records with vulnerability details)                      │
│    ✓ Proof (3 records with encrypted payloads, status: SUBMITTED)        │
│    ✓ AgentRun (completed with duration metrics)                          │
│                                                                          │
│  Redis Queue:                                                            │
│    ✓ Job marked as completed                                             │
│    ✓ PROOF_SUBMISSION messages published (3)                             │
│                                                                          │
│  WebSocket Events:                                                       │
│    ✓ scan:started                                                        │
│    ✓ scan:progress (6 updates: 10%, 20%, 30%, 40%, 60%, 80%, 95%, 100%) │
│    ✓ scan:completed                                                      │
│                                                                          │
│  Cleanup:                                                                │
│    ✓ Anvil process terminated                                            │
│    ✓ /tmp directory can be cleaned (manual or cron)                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ERROR OCCURS                                   │
│                     (Any step throws exception)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP-SPECIFIC CATCH BLOCK                           │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Call cleanupResources(anvilProcess)                                  │
│     - Kill Anvil if running                                              │
│  2. Call handleStepFailure()                                             │
│     - Mark ScanStepRecord as FAILED                                      │
│     - Store error code and message                                       │
│     - Emit scan:progress with FAILED state                               │
│  3. Re-throw error to worker                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      WORKER ERROR HANDLER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Record AgentRun failure:                                             │
│     - Store error code, message, stack trace                             │
│     - Mark as completed with error                                       │
│  2. Update agent status: SCANNING → ERROR                                │
│  3. Mark scan as failed in database                                      │
│  4. Emit scan:completed with FAILED state                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Timing Estimates

| Step | Min Time | Max Time | Typical |
|------|----------|----------|---------|
| CLONE | 5s | 60s | 15s |
| COMPILE | 10s | 180s | 45s |
| DEPLOY | 3s | 15s | 8s |
| ANALYZE | 30s | 600s | 120s |
| PROOF_GEN | 1s | 10s | 3s |
| SUBMIT | 1s | 5s | 2s |
| **TOTAL** | **50s** | **870s** | **193s** |

---

**Implementation Status:** ✅ COMPLETE
**Date:** 2026-01-31
