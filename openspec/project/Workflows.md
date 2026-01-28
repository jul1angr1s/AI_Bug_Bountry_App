# Workflows: Autonomous Bug Bounty Orchestrator

## Table of Contents
1. [System Initialization](#1-system-initialization)
2. [Protocol Registration Flow](#2-protocol-registration-flow)
3. [Vulnerability Scanning Flow](#3-vulnerability-scanning-flow)
4. [Exploit Validation Flow](#4-exploit-validation-flow)
5. [Bounty Payment Flow](#5-bounty-payment-flow)
6. [Agent-to-Agent Communication](#6-agent-to-agent-communication)
7. [Dashboard Real-time Updates](#7-dashboard-real-time-updates)
8. [Error Handling & Recovery](#8-error-handling--recovery)

---

## 1. System Initialization

**Hybrid Setup:** Local Anvil (targets + sandbox) + Base Sepolia (payments)

```mermaid
flowchart TD
    Start([System Startup]) --> LoadEnv[Load Environment<br/>Variables]
    LoadEnv --> InitDB[Initialize PostgreSQL<br/>Run Prisma Migrations]
    InitDB --> InitRedis[Connect to Redis<br/>Initialize Queues]

    InitRedis --> StartServices{Start Services<br/>in Parallel}

    StartServices --> API[Start Express API<br/>Port 4000]
    StartServices --> WS[Initialize Socket.io<br/>WebSocket Server]
    StartServices --> Queue[Start BullMQ<br/>Workers]

    API --> HealthCheck1[API Health Check]
    WS --> HealthCheck2[WebSocket Ready]
    Queue --> HealthCheck3[Queue Workers Active]

    HealthCheck1 --> SpawnAgents
    HealthCheck2 --> SpawnAgents
    HealthCheck3 --> SpawnAgents

    SpawnAgents[Spawn MCP Agents] --> PA[Initialize<br/>Protocol Agent]
    SpawnAgents --> RA[Initialize<br/>Researcher Agent]
    SpawnAgents --> VA[Initialize<br/>Validator Agent]

    PA --> A2A[Agent-to-Agent<br/>Bus Ready]
    RA --> A2A
    VA --> A2A

    A2A --> ConnectChains{Connect to<br/>Both Chains}

    ConnectChains --> ConnectAnvil[Connect Local Anvil<br/>Chain 31337<br/>Port 8545]
    ConnectChains --> ConnectSepolia[Connect Base Sepolia<br/>Chain 84532]

    ConnectAnvil -->|Success| AnvilReady[Anvil Ready<br/>Target Contracts]
    ConnectAnvil -->|Fail| StartAnvil[Start Anvil<br/>Locally]
    StartAnvil --> AnvilReady

    ConnectSepolia -->|Success| SepoliaReady[Sepolia Ready<br/>Payment Contracts]
    ConnectSepolia -->|Fail| RetryChain[Retry with<br/>Fallback RPC]
    RetryChain --> ConnectSepolia

    AnvilReady --> StartSandbox[Start Sandbox Anvil<br/>Port 8546]
    StartSandbox --> BothReady{Both Chains<br/>Ready?}
    SepoliaReady --> BothReady

    BothReady --> LoadContracts[Load Contract ABIs<br/>Anvil + Sepolia]
    LoadContracts --> SystemReady([System Ready<br/>Accepting Requests])

    style Start fill:#e1f5ff
    style SystemReady fill:#e1ffe1
    style PA fill:#e1f5ff
    style RA fill:#ffe1e1
    style VA fill:#e1ffe1
    style AnvilReady fill:#fff4e1
    style SepoliaReady fill:#ffe1f0
```

---

## 2. Protocol Registration Flow

**GitHub-Based Registration:** Protocols submit GitHub repo URLs, not deployed contract addresses.

```mermaid
flowchart TD
    subgraph "Frontend - Dashboard"
        User([Protocol Owner]) --> Form[Fill Registration Form<br/>GitHub URL, Contract Path, Terms]
        Form --> Submit[Submit to API]
    end

    subgraph "Backend - API Layer"
        Submit --> Validate[Validate Input<br/>Zod Schema]
        Validate -->|Invalid| Error1[Return 400<br/>Validation Error]
        Validate -->|Valid| CheckDupe{GitHub URL Already<br/>Registered?}
        CheckDupe -->|Yes| Error2[Return 409<br/>Already Exists]
        CheckDupe -->|No| QueueReg[Queue Registration<br/>Job]
    end

    subgraph "Agent Layer - Protocol Agent"
        QueueReg --> PA[Protocol Agent<br/>Receives Task]
        PA --> CloneRepo[Clone GitHub Repo<br/>at Specified Branch/Commit]
        CloneRepo -->|Invalid| Error3[Repo Not Found<br/>or Access Denied]
        CloneRepo -->|Valid| FindContract[Locate Contract<br/>at contractPath]
        FindContract -->|Not Found| Error5[Contract File<br/>Not Found]
        FindContract -->|Found| CompileCode[Compile with Foundry<br/>Verify Bytecode]
        CompileCode -->|Fail| Error6[Compilation<br/>Failed]
        CompileCode -->|Success| Analyze[Initial Security<br/>Analysis]
        Analyze --> CalcRisk[Calculate Risk<br/>Score]
    end

    subgraph "Blockchain Layer (Base Sepolia)"
        CalcRisk --> RegisterOnChain[Call ProtocolRegistry<br/>registerProtocol]
        RegisterOnChain --> WaitTx{Transaction<br/>Confirmed?}
        WaitTx -->|Pending| WaitTx
        WaitTx -->|Success| StoreDB[Store in PostgreSQL]
        WaitTx -->|Fail| Error4[Registration Failed<br/>Revert Reason]
    end

    subgraph "Storage & Notification"
        StoreDB --> CacheRepo[Cache Cloned Repo<br/>for Future Scans]
        CacheRepo --> IndexProtocol[Index for<br/>Researcher Agents]
        IndexProtocol --> NotifyWS[Emit WebSocket<br/>Event: protocol_registered]
        NotifyWS --> UpdateDash[Dashboard Updates<br/>Protocol List]
    end

    UpdateDash --> FundPrompt[Prompt User:<br/>Fund Bounty Pool]
    FundPrompt --> FundFlow[Continue to<br/>Funding Flow]

    style User fill:#f0f0f0
    style PA fill:#e1f5ff
    style CloneRepo fill:#e1ffe1
    style RegisterOnChain fill:#ffe1f0
```

### Protocol Registration Sequence

```mermaid
sequenceDiagram
    participant User as Protocol Owner
    participant FE as Frontend
    participant API as Backend API
    participant PA as Protocol Agent
    participant GH as GitHub
    participant BC as Base Sepolia
    participant DB as PostgreSQL
    participant Cache as Code Cache

    User->>FE: Fill registration form<br/>(githubUrl, branch, contractPath)
    FE->>API: POST /api/protocols
    API->>API: Validate request (Zod)
    API->>PA: Queue registration task

    PA->>GH: Clone repo at branch/commit
    GH-->>PA: Repository contents

    PA->>PA: Locate contract at contractPath
    PA->>PA: Compile with Foundry
    PA->>PA: Analyze & calculate risk score

    PA->>BC: registerProtocol(githubUrl, terms)
    BC-->>PA: Transaction hash

    PA->>BC: Wait for confirmation
    BC-->>PA: Receipt (success)

    PA->>DB: INSERT protocol record
    PA->>Cache: Store compiled artifacts

    PA->>API: Registration complete
    API->>FE: WebSocket: protocol_registered
    FE->>User: Show success + fund prompt
```

---

## 3. Vulnerability Scanning Flow

```mermaid
flowchart TD
    subgraph "Scan Scheduler"
        Cron([Cron Job<br/>Every 5 min]) --> FetchActive[Fetch Active<br/>Protocols]
        FetchActive --> PriorityQueue[Sort by Priority<br/>Last Scan Time]
        PriorityQueue --> DistributeJobs[Distribute to<br/>Researcher Agents]
    end

    subgraph "Researcher Agent - Static Analysis"
        DistributeJobs --> RA[Researcher Agent<br/>Receives Target]
        RA --> FetchBytecode[Fetch Contract<br/>Bytecode]
        FetchBytecode --> Decompile[Decompile to<br/>Readable Form]
        Decompile --> StaticScan[Run Static Analysis<br/>Patterns]

        StaticScan --> CheckReentrancy[Check: Reentrancy]
        StaticScan --> CheckOverflow[Check: Overflow]
        StaticScan --> CheckAccess[Check: Access Control]
        StaticScan --> CheckOracle[Check: Oracle Manipulation]
    end

    subgraph "Vulnerability Detection"
        CheckReentrancy --> Findings{Vulnerabilities<br/>Found?}
        CheckOverflow --> Findings
        CheckAccess --> Findings
        CheckOracle --> Findings

        Findings -->|No| LogClean[Log: Clean Scan<br/>Update Timestamp]
        Findings -->|Yes| Classify[Classify Severity<br/>Critical/High/Medium/Low]
    end

    subgraph "Proof Generation"
        Classify --> GenExploit[Generate Exploit<br/>Proof-of-Concept]
        GenExploit --> CreateSteps[Document Exploit<br/>Steps]
        CreateSteps --> EncryptProof[Encrypt Proof<br/>Payload]
        EncryptProof --> StoreIPFS[Store in IPFS<br/>Get CID]
        StoreIPFS --> SubmitToValidator[Submit to<br/>Validator Agent]
    end

    LogClean --> UpdateDB1[Update Last Scan<br/>Timestamp]
    SubmitToValidator --> UpdateDB2[Log Finding<br/>Pending Validation]

    style Cron fill:#f0e1ff
    style RA fill:#ffe1e1
    style Findings fill:#fff4e1
```

### Vulnerability Detection Patterns

```mermaid
flowchart LR
    subgraph "Detection Rules"
        R1[Reentrancy<br/>call before state update]
        R2[Integer Overflow<br/>unchecked math pre-0.8]
        R3[Access Control<br/>missing onlyOwner]
        R4[Oracle Manipulation<br/>single-block price]
        R5[Flash Loan<br/>unsafe callback]
    end

    subgraph "Severity Classification"
        R1 --> Critical
        R2 --> High
        R5 --> Critical
        R3 --> High
        R4 --> Critical
    end

    subgraph "Bounty Multiplier"
        Critical -->|2.0x| Payout1[Base * 2.0]
        High -->|1.5x| Payout2[Base * 1.5]
        Medium -->|1.0x| Payout3[Base * 1.0]
        Low -->|0.5x| Payout4[Base * 0.5]
    end

    style Critical fill:#ff6b6b
    style High fill:#ffa06b
    style Medium fill:#ffd56b
    style Low fill:#6bff6b
```

---

## 4. Exploit Validation Flow

**Cross-Chain Validation:** Execute on Local Anvil → Record on Base Sepolia

```mermaid
flowchart TD
    subgraph "Validator Agent Receives Proof"
        Receive([Receive Encrypted<br/>Proof from RA]) --> Decrypt[Decrypt Proof<br/>Payload]
        Decrypt --> Parse[Parse Exploit<br/>Instructions]
        Parse --> Validate{Valid Proof<br/>Format?}
        Validate -->|No| Reject1[Reject: Invalid Format<br/>Notify RA]
        Validate -->|Yes| PrepSandbox[Prepare Sandbox<br/>Environment]
    end

    subgraph "LOCAL ANVIL - Sandbox (Port 8546)"
        PrepSandbox --> SpawnAnvil[Spawn Sandbox Anvil<br/>Fork from Port 8545]
        SpawnAnvil --> CopyState[Copy Target Contract<br/>State from Main Anvil]
        CopyState --> SetupState[Setup Required<br/>State Variables]
        SetupState --> DeployExploit[Deploy Exploit<br/>Contract]
    end

    subgraph "LOCAL ANVIL - Exploit Execution"
        DeployExploit --> ExecuteExploit[Execute Exploit<br/>Transaction]
        ExecuteExploit --> CaptureState[Capture State<br/>Changes]
        CaptureState --> AnalyzeResult{Exploit<br/>Successful?}

        AnalyzeResult -->|No| RecordFail[Record: FALSE<br/>Exploit Failed]
        AnalyzeResult -->|Yes| RecordSuccess[Record: TRUE<br/>Vulnerability Confirmed]
    end

    subgraph "BASE SEPOLIA - Registry Update"
        RecordFail --> UpdateReg1[Update ERC-8004<br/>on Sepolia<br/>Status = FALSE]
        RecordSuccess --> UpdateReg2[Update ERC-8004<br/>on Sepolia<br/>Status = TRUE]

        UpdateReg1 --> NotifyRA1[Notify RA:<br/>Validation Failed]
        UpdateReg2 --> TriggerPayment[Trigger x402 Payment<br/>on Base Sepolia]
    end

    subgraph "Cleanup"
        NotifyRA1 --> Cleanup[Destroy Sandbox<br/>Clean Resources]
        TriggerPayment --> Cleanup
        Cleanup --> Ready([Ready for Next<br/>Validation])
    end

    style Receive fill:#e1ffe1
    style SpawnAnvil fill:#fff4e1
    style CopyState fill:#fff4e1
    style ExecuteExploit fill:#fff4e1
    style AnalyzeResult fill:#fff4e1
    style UpdateReg1 fill:#ffe1f0
    style UpdateReg2 fill:#ffe1f0
    style TriggerPayment fill:#ffe1f0
```

### Sandbox Isolation (Local Anvil)

```mermaid
flowchart TB
    subgraph "Host System"
        Backend[Backend Service]
    end

    subgraph "LOCAL ANVIL - Main (Port 8545)"
        subgraph "Target Contracts"
            TargetMain[VulnerableVault<br/>MockDeFi<br/>TestToken]
        end
    end

    subgraph "LOCAL ANVIL - Sandbox (Port 8546)"
        subgraph "Forked State"
            Anvil[Anvil Sandbox<br/>Chain 31338]
            Fork[State Fork<br/>from Main Anvil]
        end

        subgraph "Exploit Execution"
            Target[Target Contract<br/>Copy]
            Exploit[Exploit Contract]
            Forge[Forge Test<br/>Runner]
        end
    end

    subgraph "BASE SEPOLIA (Chain 84532)"
        Registry[ERC-8004 Registry]
        Payment[BountyPool]
    end

    Backend -->|1. Fork state| TargetMain
    TargetMain -->|Copy| Fork

    Backend -->|2. Deploy exploit| Forge
    Forge --> Exploit
    Exploit -->|3. Attack| Target

    Target -->|4. State changes| Result[Execution Result]
    Result -->|5. Report TRUE/FALSE| Backend

    Backend -->|6. Update registry| Registry
    Registry -->|7. Trigger payment| Payment

    style TargetMain fill:#fff4e1
    style Anvil fill:#fff4e1
    style Fork fill:#fff4e1
    style Exploit fill:#ffe1e1
    style Registry fill:#ffe1f0
    style Payment fill:#ffe1f0
```

---

## 5. Bounty Payment Flow

**All payments occur on Base Sepolia (Chain 84532) using testnet USDC**

```mermaid
flowchart TD
    subgraph "BASE SEPOLIA - Payment Trigger"
        RegistryUpdate([ERC-8004 Registry<br/>Status = TRUE<br/>Chain 84532]) --> EventEmit[Emit ValidationConfirmed<br/>Event on Sepolia]
        EventEmit --> ContractListen[BountyPool Contract<br/>Listens for Event]
    end

    subgraph "BASE SEPOLIA - Payment Calculation"
        ContractListen --> FetchDetails[Fetch Validation<br/>Details]
        FetchDetails --> GetSeverity[Get Vulnerability<br/>Severity]
        GetSeverity --> CalcAmount[Calculate Bounty<br/>Base * Multiplier]
        CalcAmount --> CheckPool{Pool Has<br/>Sufficient USDC?}

        CheckPool -->|No| QueuePayment[Queue Payment<br/>Notify Protocol Owner]
        CheckPool -->|Yes| ExecutePayment[Execute x402<br/>USDC Transfer]
    end

    subgraph "BASE SEPOLIA - USDC Transfer"
        ExecutePayment --> TransferUSDC[Transfer USDC<br/>0x036CbD53...<br/>to Researcher Wallet]
        TransferUSDC --> ConfirmTx{Transaction<br/>Confirmed?}

        ConfirmTx -->|Pending| WaitBlock[Wait for<br/>Block Confirmation]
        WaitBlock --> ConfirmTx
        ConfirmTx -->|Success| EmitPayment[Emit PaymentReleased<br/>Event]
        ConfirmTx -->|Fail| RetryPayment[Retry Payment<br/>Log Error]
    end

    subgraph "Backend - Post-Payment"
        EmitPayment --> UpdateDB[Update Database<br/>Payment Record]
        UpdateDB --> NotifyAll[Notify All Parties]

        NotifyAll --> NotifyRA[Notify Researcher<br/>Payment Received]
        NotifyAll --> NotifyPA[Notify Protocol<br/>Vulnerability + Payment]
        NotifyAll --> UpdateDash[Update Dashboard<br/>WebSocket Event]
    end

    RetryPayment --> ExecutePayment
    QueuePayment --> MonitorPool[Monitor Pool<br/>for Funding]
    MonitorPool -->|Funded| ExecutePayment

    style RegistryUpdate fill:#f0e1ff
    style TransferUSDC fill:#ffe1f0
    style EmitPayment fill:#e1ffe1
    style ExecutePayment fill:#ffe1f0
```

### Payment Sequence Diagram (Base Sepolia)

```mermaid
sequenceDiagram
    participant VA as Validator Agent
    participant Anvil as Local Anvil<br/>(Exploit Result)
    participant Reg as ValidationRegistry<br/>(Base Sepolia)
    participant BP as BountyPool<br/>(Base Sepolia)
    participant USDC as USDC Token<br/>(Base Sepolia)
    participant RW as Researcher Wallet
    participant DB as Database
    participant WS as WebSocket

    Note over Anvil: Exploit executed locally
    Anvil->>VA: Exploit result: TRUE

    Note over Reg,USDC: All payment ops on Base Sepolia (84532)
    VA->>Reg: recordResult(validationId, TRUE)
    Reg->>Reg: Store validation result
    Reg-->>BP: Emit ValidationConfirmed event

    BP->>Reg: getValidationDetails(proofHash)
    Reg-->>BP: Return severity, researcher

    BP->>BP: Calculate bounty amount
    BP->>USDC: balanceOf(bountyPool)
    USDC-->>BP: Return balance

    alt Sufficient Balance
        BP->>USDC: safeTransfer(researcher, amount)
        USDC->>RW: Credit USDC (Sepolia)
        USDC-->>BP: Transfer success
        BP->>BP: Emit PaymentReleased
    else Insufficient Balance
        BP->>BP: Queue payment
        BP-->>VA: Insufficient funds error
    end

    BP->>DB: Record payment
    DB-->>BP: Confirmed

    BP->>WS: Emit payment_released
    WS-->>WS: Broadcast to clients
```

---

## 6. Agent-to-Agent Communication

```mermaid
flowchart TD
    subgraph "Message Types"
        M1[SCAN_REQUEST<br/>PA → RA]
        M2[PROOF_SUBMISSION<br/>RA → VA]
        M3[VALIDATION_RESULT<br/>VA → RA]
        M4[STATUS_UPDATE<br/>Any → Dashboard]
    end

    subgraph "Communication Bus"
        Bus[Agent Message Bus<br/>Redis PubSub]

        PA[Protocol Agent] -->|Publish| Bus
        RA[Researcher Agent] -->|Publish| Bus
        VA[Validator Agent] -->|Publish| Bus

        Bus -->|Subscribe| PA
        Bus -->|Subscribe| RA
        Bus -->|Subscribe| VA
    end

    subgraph "Message Structure"
        Msg[/"
        {
          type: MessageType,
          from: AgentId,
          to: AgentId,
          payload: encrypted,
          signature: ed25519,
          timestamp: unix
        }
        "/]
    end

    subgraph "Security Layer"
        Encrypt[End-to-End<br/>Encryption]
        Sign[Message<br/>Signing]
        Verify[Signature<br/>Verification]

        Encrypt --> Msg
        Sign --> Msg
        Msg --> Verify
    end

    style Bus fill:#fff4e1
    style PA fill:#e1f5ff
    style RA fill:#ffe1e1
    style VA fill:#e1ffe1
```

### A2A Message Flow

```mermaid
sequenceDiagram
    participant PA as Protocol Agent
    participant Bus as Message Bus
    participant RA as Researcher Agent
    participant VA as Validator Agent

    Note over PA,VA: Protocol Registration & Scan Request
    PA->>Bus: SCAN_REQUEST {protocolId, priority}
    Bus->>RA: Deliver SCAN_REQUEST
    RA->>RA: Begin scanning protocol

    Note over PA,VA: Vulnerability Found
    RA->>RA: Generate encrypted proof
    RA->>Bus: PROOF_SUBMISSION {proofHash, encryptedData}
    Bus->>VA: Deliver PROOF_SUBMISSION

    Note over PA,VA: Validation Process
    VA->>VA: Spawn sandbox
    VA->>VA: Execute exploit
    VA->>VA: Record result

    VA->>Bus: VALIDATION_RESULT {proofHash, status: TRUE}
    Bus->>RA: Deliver VALIDATION_RESULT
    Bus->>PA: Deliver VALIDATION_RESULT

    Note over PA,VA: Payment Triggered Automatically
```

---

## 7. Dashboard Real-time Updates

```mermaid
flowchart TD
    subgraph "Backend Events"
        E1[Protocol Registered]
        E2[Scan Started]
        E3[Vulnerability Found]
        E4[Validation Complete]
        E5[Payment Released]
    end

    subgraph "Socket.io Server"
        WSS[WebSocket Server<br/>Port 4000]

        E1 --> WSS
        E2 --> WSS
        E3 --> WSS
        E4 --> WSS
        E5 --> WSS
    end

    subgraph "Event Routing"
        WSS --> Room1[Room: protocols]
        WSS --> Room2[Room: scans]
        WSS --> Room3[Room: vulnerabilities]
        WSS --> Room4[Room: payments]
        WSS --> Room5[Room: agents]
    end

    subgraph "Frontend Handlers"
        Room1 --> H1[Update Protocol List]
        Room2 --> H2[Update Scan Status]
        Room3 --> H3[Show Alert + Update List]
        Room4 --> H4[Update Payment History]
        Room5 --> H5[Update Agent Status]
    end

    subgraph "Dashboard Components"
        H1 --> C1[ProtocolTable]
        H2 --> C2[ScanProgress]
        H3 --> C3[VulnerabilityAlert]
        H4 --> C4[PaymentHistory]
        H5 --> C5[AgentStatusCards]
    end

    style WSS fill:#fff4e1
    style H3 fill:#ffe1e1
    style H4 fill:#e1ffe1
```

### WebSocket Event Types

```mermaid
classDiagram
    class WebSocketEvent {
        +string type
        +string room
        +object payload
        +number timestamp
    }

    class ProtocolEvent {
        +protocol_registered
        +protocol_updated
        +pool_funded
    }

    class ScanEvent {
        +scan_started
        +scan_progress
        +scan_completed
    }

    class VulnerabilityEvent {
        +vulnerability_found
        +validation_pending
        +validation_complete
    }

    class PaymentEvent {
        +payment_pending
        +payment_released
        +payment_failed
    }

    class AgentEvent {
        +agent_online
        +agent_offline
        +agent_busy
    }

    WebSocketEvent <|-- ProtocolEvent
    WebSocketEvent <|-- ScanEvent
    WebSocketEvent <|-- VulnerabilityEvent
    WebSocketEvent <|-- PaymentEvent
    WebSocketEvent <|-- AgentEvent
```

---

## 8. Error Handling & Recovery

```mermaid
flowchart TD
    subgraph "Error Categories"
        E1[Network Errors<br/>RPC Timeout, API Down]
        E2[Validation Errors<br/>Invalid Proof, Bad Format]
        E3[Blockchain Errors<br/>Tx Failed, Gas Issues]
        E4[Agent Errors<br/>Crash, Timeout]
    end

    subgraph "Error Detection"
        E1 --> Detect[Error Handler<br/>Middleware]
        E2 --> Detect
        E3 --> Detect
        E4 --> Detect
    end

    subgraph "Recovery Strategies"
        Detect --> Classify{Error Type}

        Classify -->|Transient| Retry[Exponential Backoff<br/>Retry 3x]
        Classify -->|Permanent| Log[Log Error<br/>Alert Admin]
        Classify -->|Blockchain| Resubmit[Increase Gas<br/>Resubmit Tx]
        Classify -->|Agent| Restart[Restart Agent<br/>Resume State]
    end

    subgraph "Fallback Actions"
        Retry -->|Success| Continue[Continue Flow]
        Retry -->|Fail| Fallback[Fallback RPC<br/>or Queue for Later]

        Log --> Notify[Notify Admin<br/>Discord/Slack]

        Resubmit -->|Success| Continue
        Resubmit -->|Fail| RefundQueue[Queue Refund<br/>or Manual Review]

        Restart -->|Success| Continue
        Restart -->|Fail| ManualRestart[Manual Intervention<br/>Required]
    end

    subgraph "State Recovery"
        Continue --> Checkpoint[Save Checkpoint<br/>Redis State]
        Fallback --> Checkpoint

        Checkpoint --> Resume[Resume from<br/>Last Good State]
    end

    style Detect fill:#ffe1e1
    style Continue fill:#e1ffe1
    style Notify fill:#fff4e1
```

### Retry Configuration

```mermaid
flowchart LR
    subgraph "Retry Policy"
        Attempt1[Attempt 1<br/>Immediate] -->|Fail| Wait1[Wait 1s]
        Wait1 --> Attempt2[Attempt 2]
        Attempt2 -->|Fail| Wait2[Wait 2s]
        Wait2 --> Attempt3[Attempt 3]
        Attempt3 -->|Fail| Wait3[Wait 4s]
        Wait3 --> Attempt4[Attempt 4]
        Attempt4 -->|Fail| GiveUp[Max Retries<br/>Queue/Alert]
    end

    subgraph "Circuit Breaker"
        Monitor[Error Rate<br/>Monitor] -->|>50%| Open[Circuit Open<br/>Fail Fast]
        Open -->|30s| HalfOpen[Half Open<br/>Test Request]
        HalfOpen -->|Success| Closed[Circuit Closed<br/>Resume Normal]
        HalfOpen -->|Fail| Open
    end

    style Attempt1 fill:#e1ffe1
    style GiveUp fill:#ffe1e1
    style Open fill:#ffe1e1
    style Closed fill:#e1ffe1
```

---

## Complete System Flow Summary

**Hybrid Architecture: Local Anvil (31337) + Base Sepolia (84532)**

```mermaid
flowchart TB
    subgraph "Phase 1: Setup (BASE SEPOLIA)"
        P1A[Protocol Owner<br/>Registers on Sepolia]
        P1B[Funds Bounty Pool<br/>with Sepolia USDC]
    end

    subgraph "Phase 1b: Deploy Target (LOCAL ANVIL)"
        P1C[Deploy Target Contract<br/>to Local Anvil]
    end

    subgraph "Phase 2: Scanning (LOCAL ANVIL)"
        P2A[Researcher Agent<br/>Queries Protocols]
        P2B[Scan Target on<br/>Local Anvil]
        P2C[Vulnerability<br/>Detected]
    end

    subgraph "Phase 3: Proof"
        P3A[Generate Exploit<br/>PoC]
        P3B[Encrypt & Store<br/>in IPFS]
        P3C[Submit to<br/>Validator]
    end

    subgraph "Phase 4: Validation (LOCAL ANVIL)"
        P4A[Spawn Sandbox<br/>Fork Local State]
        P4B[Execute Exploit<br/>on Sandbox]
        P4C[Capture Result<br/>TRUE/FALSE]
    end

    subgraph "Phase 5: Registry (BASE SEPOLIA)"
        P5A[Update ERC-8004<br/>on Sepolia]
    end

    subgraph "Phase 6: Payment (BASE SEPOLIA)"
        P6A[BountyPool<br/>Triggers x402]
        P6B[USDC Transfer<br/>on Sepolia]
        P6C[All Parties<br/>Notified]
    end

    P1A --> P1B --> P1C
    P1C --> P2A --> P2B --> P2C
    P2C --> P3A --> P3B --> P3C
    P3C --> P4A --> P4B --> P4C
    P4C -->|TRUE| P5A --> P6A --> P6B --> P6C
    P4C -->|FALSE| P2B

    P6C --> P2B

    style P1A fill:#ffe1f0
    style P1B fill:#ffe1f0
    style P1C fill:#fff4e1
    style P2B fill:#fff4e1
    style P2C fill:#ffe1e1
    style P4A fill:#fff4e1
    style P4B fill:#fff4e1
    style P5A fill:#ffe1f0
    style P6A fill:#ffe1f0
    style P6B fill:#ffe1f0
```

### Chain Separation Summary

| Phase | Chain | Purpose |
|-------|-------|---------|
| Protocol Registration | Base Sepolia (84532) | Metadata + bounty terms |
| Bounty Funding | Base Sepolia (84532) | USDC deposit |
| Target Deployment | Local Anvil (31337) | Contracts to scan |
| Vulnerability Scanning | Local Anvil (31337) | Fast local analysis |
| Exploit Validation | Local Anvil Sandbox (31338) | Isolated exploit execution |
| Registry Update | Base Sepolia (84532) | ERC-8004 state change |
| Payment Release | Base Sepolia (84532) | x402 USDC transfer |

### Why This Architecture?

1. **Fast Iteration**: Target contracts on local Anvil = instant feedback
2. **Real Payment Testing**: USDC on Sepolia = realistic payment flow
3. **Isolation**: Sandbox on separate Anvil = no state pollution
4. **Clear Upgrade Path**: Sepolia → Mainnet is straightforward
