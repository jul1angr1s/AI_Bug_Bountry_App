# Proposal: x.402 Payment Gating for Platform Sustainability

## Summary

Implement x.402 payment protocol integration to create a sustainable economic model where protocols pay 1 USDC to use bug bounty services and researchers pay 0.5 USDC per finding submission.

## Problem

The platform currently lacks a revenue model:
1. **No Protocol Fees**: Protocols can register and use services for free
2. **No Submission Fees**: Researchers can spam low-quality findings with no cost
3. **Unsustainable**: Platform cannot cover operational costs

Without economic incentives, the platform faces:
- Spam submissions degrading validator resources
- No funding for platform development/maintenance
- Misaligned incentives between participants

## Solution

Implement x.402 HTTP payment protocol with escrow mechanism:

### 1. Protocol Registration Gate (1 USDC)
- x.402 middleware intercepts `POST /api/v1/protocols/register`
- Returns HTTP 402 with payment request
- Protocol pays via x.402, receives receipt
- Receipt validated → registration proceeds

### 2. Researcher Submission Escrow (0.5 USDC)
- Researchers pre-fund escrow balance
- 0.5 USDC deducted per finding submission
- Incentivizes quality over quantity

### 3. PlatformEscrow.sol Contract
```solidity
function depositEscrow(address agent, uint256 amount)
function deductSubmissionFee(address agent) onlyRole(PLATFORM_ROLE)
function getBalance(address agent) → uint256
```

## Payment Flows

### Protocol Agent (Pay-per-action)
```
POST /protocols/register
  ↓ x402 middleware
  ← 402 { x402: { amount: 1000000, asset: USDC } }
  → Pay 1 USDC via x.402
  → Receipt validated
  → Registration proceeds with existing ProtocolRegistry
```

### Researcher Agent (Pre-funded escrow)
```
1. Deposit 10 USDC to escrow (covers 20 submissions)
2. Submit finding → 0.5 USDC deducted
3. If balance < 0.5 USDC → submission rejected
```

## Affected Components

| Layer | Component | Change |
|-------|-----------|--------|
| Contracts | PlatformEscrow.sol | NEW |
| Backend | x402PaymentGate.middleware.ts | NEW |
| Backend | EscrowService.ts | NEW |
| Backend | x402Client.ts | NEW |
| API | POST /agents/:id/escrow | NEW |
| API | GET /agents/:id/escrow | NEW |

## Security Considerations

- PlatformEscrow uses SafeERC20 for USDC transfers
- ReentrancyGuard on all payment functions
- Only PLATFORM_ROLE can deduct fees
- x.402 receipts cryptographically verified

## Dependencies

- @coinbase/x402-sdk for payment protocol
- Existing USDC contract (0x036CbD53842c5426634e7929541eC2318f3dCF7e)
- Existing BountyPool pattern for reference

## Outcome

- Sustainable revenue: 1 USDC per protocol + 0.5 USDC per submission
- Reduced spam: Submission fee discourages low-quality findings
- Aligned incentives: Pay-for-value model
- x.402 native: HTTP-native payments, AI-agent friendly
