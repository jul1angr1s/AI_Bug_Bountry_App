# Design: x.402 Payment Gating for Platform Sustainability

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Protocol/Researcher)              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ POST /api/v1/protocols/register                             ││
│  │ Headers: X-Payment-Receipt: <txHash>                        ││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              x402PaymentGate Middleware                     │ │
│  │                                                             │ │
│  │  if (no payment receipt) {                                  │ │
│  │    return 402 {                                             │ │
│  │      x402: { amount: 1000000, asset: USDC, ... }           │ │
│  │    }                                                        │ │
│  │  }                                                          │ │
│  │                                                             │ │
│  │  if (valid receipt) {                                       │ │
│  │    proceed to handler                                       │ │
│  │  }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────────────────────┐   │
│  │ EscrowService     │  │ Protocol Registration              │   │
│  │ - depositEscrow() │  │ (existing flow)                    │   │
│  │ - deductFee()     │  │                                    │   │
│  │ - getBalance()    │  │                                    │   │
│  └─────────┬─────────┘  └───────────────────────────────────┘   │
└────────────┼────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Base Sepolia                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ PlatformEscrow                                             │  │
│  │ - depositEscrow(agent, amount)                            │  │
│  │ - deductSubmissionFee(agent, findingId)                   │  │
│  │ - collectProtocolFee(protocol, protocolId)                │  │
│  │                                                           │  │
│  │ Fees:                                                     │  │
│  │ - Protocol registration: 1 USDC (1000000)                 │  │
│  │ - Finding submission: 0.5 USDC (500000)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ USDC (EXISTING - 0x036CbD53...)                           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Payment Flows

### Protocol Registration (x.402 Gate)

```
┌─────────────────┐
│ Protocol Agent  │
│ POST /protocols │
│ /register       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     No payment?     ┌─────────────────┐
│ x402 Middleware │────────────────────►│ 402 Response    │
│                 │                      │ {               │
│                 │                      │   x402: {       │
│                 │                      │     amount: 1M, │
│                 │                      │     asset: USDC │
│                 │                      │   }             │
│                 │                      │ }               │
└────────┬────────┘                      └─────────────────┘
         │
         │ Valid X-Payment-Receipt header
         ▼
┌─────────────────┐
│ Verify payment  │
│ on-chain        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Continue to     │
│ ProtocolRegistry│
│ .registerProtocol()
└─────────────────┘
```

### Researcher Finding Submission (Escrow Deduction)

```
┌─────────────────┐
│ Researcher      │
│ Submit Finding  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Escrow    │
│ Balance         │
│ >= 0.5 USDC?    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
   YES        NO
    │         │
    │    ┌────┴────────┐
    │    │ 402 Response│
    │    │ Insufficient│
    │    │ Balance     │
    │    └─────────────┘
    │
    ▼
┌─────────────────┐
│ Deduct 0.5 USDC │
│ from escrow     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Submit finding  │
│ to Validator    │
└─────────────────┘
```

## x.402 Response Format

```json
{
  "error": "Payment Required",
  "message": "Protocol registration requires a 1 USDC payment via x.402",
  "x402": {
    "version": "1.0",
    "amount": "1000000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "chain": "base-sepolia",
    "recipient": "0x...",
    "memo": "Protocol registration fee",
    "expiresAt": "2026-02-05T16:00:00.000Z"
  },
  "instructions": {
    "step1": "Approve USDC spending for the platform escrow contract",
    "step2": "Include X-Payment-Receipt header with transaction hash",
    "step3": "Retry the request with payment proof"
  }
}
```

## Database Schema

```prisma
model AgentEscrow {
  id              String   @id
  agentIdentityId String   @unique
  balance         BigInt   @default(0)
  totalDeposited  BigInt   @default(0)
  totalDeducted   BigInt   @default(0)
  
  transactions    EscrowTransaction[]
}

model EscrowTransaction {
  id              String                @id
  agentEscrowId   String
  transactionType EscrowTransactionType
  amount          BigInt
  txHash          String?
  findingId       String?
  protocolId      String?
  createdAt       DateTime
}

enum EscrowTransactionType {
  DEPOSIT
  WITHDRAWAL
  SUBMISSION_FEE
  PROTOCOL_FEE
}

model X402PaymentRequest {
  id               String            @id
  requestType      X402RequestType
  requesterAddress String
  amount           BigInt
  status           X402PaymentStatus
  protocolId       String?
  paymentReceipt   String?
  txHash           String?
  expiresAt        DateTime
  createdAt        DateTime
  completedAt      DateTime?
}
```

## Smart Contract Interface

### PlatformEscrow.sol

```solidity
interface IPlatformEscrow {
    function depositEscrow(uint256 amount) external;
    function depositEscrowFor(address agent, uint256 amount) external;
    function deductSubmissionFee(address agent, bytes32 findingId) external;
    function collectProtocolFee(address protocol, bytes32 protocolId) external;
    function withdrawEscrow(uint256 amount) external;
    function getEscrowBalance(address agent) external view returns (uint256);
    function canSubmitFinding(address agent) external view returns (bool);
    function getRemainingSubmissions(address agent) external view returns (uint256);
    function submissionFee() external view returns (uint256);
    function protocolRegistrationFee() external view returns (uint256);
}
```

## Fee Configuration

| Fee Type | Amount | Purpose |
|----------|--------|---------|
| Protocol Registration | 1 USDC | Platform access fee |
| Finding Submission | 0.5 USDC | Quality incentive |

## Environment Variables

```env
# x.402 Payment Gating
PLATFORM_ESCROW_ADDRESS=0x...
PLATFORM_WALLET_ADDRESS=0x...
SKIP_X402_PAYMENT_GATE=false  # Set to true for testing
```

## Security Considerations

1. **ReentrancyGuard**: All payment functions are protected
2. **SafeERC20**: Secure token transfers
3. **Role-based Access**: Only PLATFORM_ROLE can deduct fees
4. **Receipt Verification**: Transaction hash validated on-chain
5. **Expiration**: Payment requests expire after 30 minutes
