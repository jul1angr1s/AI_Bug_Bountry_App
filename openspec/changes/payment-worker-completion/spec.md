# Payment Worker Completion Specification

## Overview

This specification defines the completion of the Payment Worker, which automatically processes bounty payments to researchers by interacting with the BountyPool smart contract on Base Sepolia blockchain after findings are validated.

## Technical Specification

### ADDED Requirements

### Requirement: System SHALL process payment queue jobs automatically
The system SHALL process payments from BullMQ queue when triggered by validated findings.

#### Scenario: Payment Worker picks up payment job
- **GIVEN** Payment record exists with status=QUEUED
- **WHEN** Payment Worker processes payment queue job
- **THEN** system SHALL fetch Payment record by ID
- **THEN** system SHALL fetch related Finding record
- **THEN** system SHALL update Payment.status = PROCESSING
- **THEN** system SHALL broadcast WebSocket event `payment:processing` with { paymentId, findingId }

### Requirement: System SHALL validate payment eligibility before submission
The system SHALL verify payment meets all criteria before submitting on-chain transaction.

#### Scenario: Validate finding is confirmed valid
- **GIVEN** Payment is being processed
- **WHEN** Payment Worker validates eligibility
- **THEN** system SHALL verify Finding.status = VALIDATED
- **THEN** system SHALL verify Finding.confidence >= 80
- **THEN** if finding not validated, system SHALL update Payment.status = FAILED with reason "Finding not validated"
- **THEN** if finding validated, system SHALL proceed to balance check

#### Scenario: Verify payment not already processed
- **GIVEN** Payment eligibility check in progress
- **WHEN** Payment Worker checks duplicate payments
- **THEN** system SHALL query Payment table for existing records with same findingId and status=COMPLETED
- **THEN** if duplicate exists, system SHALL update Payment.status = FAILED with reason "Payment already completed"
- **THEN** if no duplicate, system SHALL proceed

### Requirement: System SHALL check bounty pool balance before transaction
The system SHALL verify BountyPool contract has sufficient USDC balance to pay bounty.

#### Scenario: Check USDC balance in bounty pool
- **GIVEN** payment eligibility validated
- **WHEN** Payment Worker checks balance
- **THEN** system SHALL call BountyPoolClient.getBalance()
- **THEN** system SHALL fetch USDC.balanceOf(bountyPoolAddress)
- **THEN** system SHALL compare balance with Payment.amount
- **THEN** if balance < amount, system SHALL update Payment.status = FAILED with reason "Insufficient bounty pool balance"
- **THEN** if balance >= amount, system SHALL proceed to transaction submission

### Requirement: System SHALL submit on-chain payment transaction
The system SHALL interact with BountyPool smart contract to release USDC bounty to researcher address.

#### Scenario: Submit releaseBounty transaction
- **GIVEN** balance check passed
- **WHEN** Payment Worker submits transaction
- **THEN** system SHALL call BountyPoolClient.releaseBounty(researcherAddress, amountUsdc, findingId)
- **THEN** system SHALL sign transaction with platform wallet private key
- **THEN** system SHALL submit transaction to Base Sepolia RPC
- **THEN** system SHALL receive transaction hash
- **THEN** system SHALL update Payment.txHash = received hash
- **THEN** system SHALL log: "Submitted payment transaction: {txHash}"

#### Scenario: Calculate gas price for optimal submission
- **GIVEN** preparing to submit transaction
- **WHEN** Payment Worker estimates gas
- **THEN** system SHALL fetch current Base Sepolia gas price
- **THEN** system SHALL use EIP-1559 with maxFeePerGas = baseFee * 1.5
- **THEN** system SHALL set maxPriorityFeePerGas = 2 gwei
- **THEN** system SHALL estimate gas limit using eth_estimateGas
- **THEN** system SHALL add 20% buffer to estimated gas limit

### Requirement: System SHALL monitor transaction confirmation
The system SHALL wait for transaction to be confirmed on-chain before marking payment complete.

#### Scenario: Wait for transaction confirmation
- **GIVEN** transaction submitted with txHash
- **WHEN** Payment Worker monitors confirmation
- **THEN** system SHALL poll transaction receipt every 5 seconds
- **THEN** system SHALL wait for confirmations >= 12 blocks
- **THEN** system SHALL timeout after 10 minutes of waiting
- **THEN** if transaction reverted, system SHALL update Payment.status = FAILED with reason from revert
- **THEN** if transaction confirmed, system SHALL proceed to completion

#### Scenario: Transaction confirmed successfully
- **GIVEN** transaction has 12+ confirmations
- **WHEN** Payment Worker receives confirmation
- **THEN** system SHALL update Payment record:
  - status = COMPLETED
  - paidAt = current timestamp
  - confirmedAt = block timestamp
- **THEN** system SHALL update Finding.paidOut = true
- **THEN** system SHALL broadcast WebSocket event `payment:completed` with { paymentId, txHash, amount }
- **THEN** system SHALL log: "Payment completed: {paymentId}, tx: {txHash}"

### Requirement: System SHALL handle transaction failures with retry logic
The system SHALL gracefully handle blockchain errors and retry with exponential backoff.

#### Scenario: Transaction fails with nonce too low error
- **GIVEN** transaction submission returns "nonce too low" error
- **WHEN** Payment Worker processes error
- **THEN** system SHALL fetch current nonce from blockchain
- **THEN** system SHALL retry transaction with updated nonce
- **THEN** system SHALL NOT increment retry count (immediate retry)

#### Scenario: Transaction fails with insufficient funds
- **GIVEN** platform wallet has insufficient ETH for gas
- **WHEN** transaction fails with "insufficient funds for gas"
- **THEN** system SHALL update Payment.status = FAILED with reason "Insufficient gas funds"
- **THEN** system SHALL NOT retry
- **THEN** system SHALL send alert to admin: "Platform wallet needs ETH funding"

#### Scenario: RPC provider returns timeout
- **GIVEN** Base Sepolia RPC is unresponsive
- **WHEN** transaction submission times out
- **THEN** system SHALL throw error to trigger BullMQ retry
- **THEN** system SHALL retry job with exponential backoff (2m, 4m, 8m)
- **THEN** system SHALL try up to 5 attempts
- **THEN** after max retries, system SHALL update Payment.status = FAILED

#### Scenario: Transaction stuck in mempool
- **GIVEN** transaction submitted but not confirmed after 10 minutes
- **WHEN** Payment Worker timeout triggers
- **THEN** system SHALL check if transaction is still pending
- **THEN** if pending, system SHALL submit replacement transaction with higher gas price (gasPrice * 1.2)
- **THEN** system SHALL cancel original transaction by sending 0 ETH to self with same nonce
- **THEN** system SHALL update Payment.txHash with new transaction

### Requirement: System SHALL provide payment retry mechanism
The system SHALL allow manual retry of failed payments via API endpoint.

#### Scenario: Admin retries failed payment
- **GIVEN** Payment exists with status=FAILED
- **WHEN** admin calls POST `/api/v1/payments/:id/retry`
- **THEN** system SHALL verify payment is eligible for retry (status=FAILED)
- **THEN** system SHALL reset Payment.status = QUEUED
- **THEN** system SHALL increment Payment.retryCount
- **THEN** system SHALL add new job to payment queue with { paymentId }
- **THEN** system SHALL return 200 OK with message "Payment queued for retry"

#### Scenario: Prevent retry of completed payments
- **GIVEN** Payment has status=COMPLETED
- **WHEN** admin attempts POST `/api/v1/payments/:id/retry`
- **THEN** system SHALL return 400 Bad Request with error "Cannot retry completed payment"

### Requirement: System SHALL emit WebSocket events for payment status
The system SHALL broadcast real-time payment status updates for UI.

#### Scenario: Broadcast payment processing
- **WHEN** Payment.status changes to PROCESSING
- **THEN** WebSocket SHALL emit `payment:processing` to room `payment:{paymentId}`
- **THEN** event payload SHALL include { paymentId, status: "PROCESSING", findingId }

#### Scenario: Broadcast payment completed
- **WHEN** Payment.status changes to COMPLETED
- **THEN** WebSocket SHALL emit `payment:completed` to room `payment:{paymentId}`
- **THEN** WebSocket SHALL emit `payment:completed` to room `protocol:{protocolId}`
- **THEN** event payload SHALL include { paymentId, txHash, amount, researcherAddress, paidAt }

#### Scenario: Broadcast payment failed
- **WHEN** Payment.status changes to FAILED
- **THEN** WebSocket SHALL emit `payment:failed` to room `payment:{paymentId}`
- **THEN** event payload SHALL include { paymentId, failureReason, retryCount }

### Requirement: System SHALL run payment worker on server startup
The system SHALL initialize Payment Worker process when backend server starts.

#### Scenario: Server starts payment worker
- **GIVEN** backend server is starting up
- **WHEN** server initialization runs
- **THEN** system SHALL create BullMQ Worker instance for "payment" queue
- **THEN** system SHALL register payment job processor function
- **THEN** system SHALL set concurrency to 5 (process 5 payments in parallel)
- **THEN** system SHALL connect to Redis queue
- **THEN** system SHALL log: "Payment Worker started"

## Implementation Notes

### Technology Stack
- **Queue**: BullMQ with Redis backend
- **Blockchain**: Base Sepolia (Ethereum L2)
- **RPC Provider**: Alchemy or Infura
- **Smart Contract**: BountyPool (custom contract)
- **Wallet**: ethers.js Wallet with private key

### Payment Service Architecture
```typescript
// backend/src/services/payment.service.ts
export class PaymentService {
  async processPayment(paymentId: string): Promise<void> {
    // 1. Validate payment eligibility
    // 2. Check bounty pool balance
    // 3. Submit blockchain transaction
    // 4. Monitor confirmation
    // 5. Update Payment record
    // 6. Broadcast WebSocket events
  }

  async validateEligibility(payment: Payment): Promise<boolean> {
    // Verify finding validated, no duplicates
  }

  async checkBalance(amount: number): Promise<boolean> {
    // Check USDC balance in BountyPool
  }

  async submitTransaction(
    researcherAddress: string,
    amount: number,
    findingId: string
  ): Promise<string> {
    // Submit releaseBounty() transaction
  }

  async waitForConfirmation(txHash: string): Promise<TransactionReceipt> {
    // Poll for 12 block confirmations
  }
}
```

### BountyPool Client
```typescript
// backend/src/blockchain/bounty-pool-client.ts
export class BountyPoolClient {
  private contract: Contract;
  private wallet: Wallet;

  constructor() {
    const provider = new JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    this.wallet = new Wallet(process.env.PLATFORM_WALLET_PRIVATE_KEY, provider);
    this.contract = new Contract(
      process.env.BOUNTY_POOL_ADDRESS,
      BountyPoolABI,
      this.wallet
    );
  }

  async releaseBounty(
    researcherAddress: string,
    amountUsdc: number,
    findingId: string
  ): Promise<string> {
    const amountWei = parseUnits(amountUsdc.toString(), 6); // USDC has 6 decimals
    const tx = await this.contract.releaseBounty(
      researcherAddress,
      amountWei,
      findingId
    );
    return tx.hash;
  }

  async getBalance(): Promise<number> {
    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, this.wallet);
    const balance = await usdcContract.balanceOf(this.contract.address);
    return formatUnits(balance, 6);
  }
}
```

### BullMQ Queue Configuration
```typescript
// backend/src/queues/payment.queue.ts
export const paymentQueue = new Queue('payment', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 120000, // 2 minutes
    },
    timeout: 600000, // 10 minute job timeout
  },
});

export const paymentWorker = new Worker('payment', async (job) => {
  const { paymentId } = job.data;
  return await paymentService.processPayment(paymentId);
}, {
  connection: redis,
  concurrency: 5,
});
```

### Transaction Retry Strategy
```typescript
const MAX_RETRIES = 5;
const BASE_DELAY = 120000; // 2 minutes
const GAS_PRICE_MULTIPLIER = 1.2;

async function submitWithRetry(tx: Transaction): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const gasPrice = await provider.getGasPrice();
      tx.maxFeePerGas = gasPrice.mul(120).div(100); // 20% buffer
      const receipt = await wallet.sendTransaction(tx);
      return receipt.hash;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      await sleep(BASE_DELAY * Math.pow(2, attempt - 1));
    }
  }
}
```

### Error Classification
- **Retriable**: RPC timeout, nonce conflicts, gas price too low
- **Non-retriable**: Insufficient balance, invalid address, contract paused
- **Manual Review**: Transaction stuck >30 minutes

### Security Considerations
- Platform wallet private key stored in environment variable
- Payment amount validated against Finding severity thresholds
- Duplicate payment checks prevent double-spending
- Transaction monitoring prevents stuck payments

## Success Criteria

- [ ] Payment Worker processes payments automatically
- [ ] Bounty pool balance checked before submission
- [ ] Transactions submitted with optimal gas price
- [ ] Confirmations monitored (12 blocks)
- [ ] Payment records updated with txHash
- [ ] Failed payments retry with exponential backoff
- [ ] Manual retry API endpoint functional
- [ ] WebSocket events broadcast in real-time
- [ ] Platform wallet alerts trigger on low balance
- [ ] No duplicate payments for same finding
