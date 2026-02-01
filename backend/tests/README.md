# Phase 4 Payment System Unit Tests

Comprehensive unit test suite for the Phase 4 payment automation functionality.

## Test Coverage

### 1. Payment Service Tests (`services/payment.service.test.ts`)

Tests for payment creation, processing, and retrieval functionality.

**Test Coverage:**
- `createPaymentFromValidation`
  - Create payment from validated proof
  - Throw error if validation not found
  - Throw error if validation not confirmed
  - Return existing payment if duplicate
- `processPayment`
  - Process payment successfully
  - Throw error if payment not found
  - Throw error if insufficient funds
  - Handle network errors and update payment status
- `getPaymentById`
  - Return payment with details when found
  - Throw error when payment not found
- `getPaymentsByProtocol`
  - Return paginated payments with filters
  - Handle pagination correctly
- `getPaymentsByResearcher`
  - Calculate total earnings correctly
  - Filter by date range
- `getPaymentStats`
  - Return aggregated payment statistics
  - Generate time series data when groupBy is day
  - Filter by protocol

**Mock Strategy:**
- Prisma Client for database operations
- ValidationRegistryClient for blockchain validation queries
- BountyPoolClient for bounty calculations and releases
- USDCClient for USDC token operations

### 2. Reconciliation Service Tests (`services/reconciliation.service.test.ts`)

Tests for payment reconciliation and discrepancy detection.

**Test Coverage:**
- `initializePeriodicReconciliation`
  - Schedule periodic reconciliation job
  - Remove existing repeatable jobs before adding new one
- `reconcile`
  - Detect missing payments (events without database records)
  - Detect unconfirmed payments (database records without events)
  - Detect amount mismatches
  - Auto-resolve missing txHash
  - Alert when discrepancy count exceeds threshold (>10)
- `getReconciliationReport`
  - Return comprehensive reconciliation metrics
  - Filter report by date range
- `getDiscrepancies`
  - Return list of discrepancies with filtering
  - Sort discrepancies by specified field
  - Return unresolved discrepancies by default
- `resolveDiscrepancy`
  - Resolve discrepancy successfully
  - Throw error if discrepancy not found
  - Throw error if already resolved

**Mock Strategy:**
- Prisma Client for database operations
- Redis Client for BullMQ
- ethers.js for blockchain event queries
- BullMQ Queue for job scheduling

### 3. USDC Client Tests (`blockchain/USDCClient.test.ts`)

Tests for USDC ERC-20 token interactions.

**Test Coverage:**
- `getAllowance`
  - Return allowance for valid addresses
  - Throw error for invalid owner address
  - Throw error for invalid spender address
  - Handle contract errors
- `getBalance`
  - Return balance for valid address
  - Return zero balance
  - Throw error for invalid address
  - Handle contract errors
- `generateApprovalTxData`
  - Generate approval transaction data
  - Throw error for invalid spender address
  - Throw error for zero amount
  - Throw error for negative amount
  - Throw error if spender is not BountyPool
  - Use default gas limit if estimation fails
- `formatUSDC`
  - Format USDC amounts correctly (1000 USDC, 0 USDC, 1.5 USDC, 0.000001 USDC)
- `parseUSDC`
  - Parse USDC amounts correctly
  - Throw error for invalid amount string
- Helper methods
  - Return USDC address, decimals, symbol, contract instance

**Mock Strategy:**
- ethers.js Contract for ERC-20 interactions
- ethers.js Provider for network operations
- Blockchain config for contract addresses and chain settings

### 4. Payment Worker Tests (`workers/payment.worker.test.ts`)

Tests for the BullMQ payment processing worker.

**Test Coverage:**
- Job processing
  - Process payment successfully
  - Skip duplicate payment
  - Fail on invalid researcher address
  - Fail on non-confirmed validation
  - Handle insufficient funds error
  - Retry on network errors
  - Increment retry count on validation errors
- Worker lifecycle
  - Start worker with correct configuration
  - Stop worker gracefully
- Event handlers
  - Emit WebSocket event on success

**Mock Strategy:**
- Prisma Client for database operations
- Redis Client for BullMQ connection
- BountyPoolClient for bounty releases
- ValidationRegistryClient for validation verification
- WebSocket event emitters
- BullMQ Worker and Job

### 5. Payment Queue Tests (`queues/payment.queue.test.ts`)

Tests for the BullMQ payment processing queue.

**Test Coverage:**
- `addPaymentJob`
  - Add payment job with correct data
  - Create unique job IDs
  - Handle queue errors
- `pauseQueue`
  - Pause the queue
  - Handle pause errors
- `resumeQueue`
  - Resume the queue
  - Handle resume errors
- `getQueueStatus`
  - Return queue status with job counts
  - Return paused status
  - Handle empty queue
- `closePaymentQueue`
  - Close the queue
  - Handle close errors
- Retry configuration
  - Verify correct retry configuration (3 attempts, exponential backoff)

**Mock Strategy:**
- Redis Client for BullMQ connection
- BullMQ Queue

### 6. Event Listener Service Tests (`services/event-listener.service.test.ts`)

Tests for the blockchain event listening infrastructure.

**Test Coverage:**
- `getLastProcessedBlock`
  - Return last processed block if exists
  - Return null if no state exists
  - Handle database errors
- `updateLastProcessedBlock`
  - Create new state if not exists
  - Update existing state
  - Handle database errors
- `replayEvents`
  - Fetch and process historical events
  - Continue processing on handler error
  - Throw error if provider not initialized
- `startListening`
  - Start listening from configured block
  - Resume from last processed block
  - Start from current block if no history
- Error handling with exponential backoff
  - Retry with exponential backoff (1s, 5s, 25s, max 60s)
  - Stop retrying after max attempts (10)
- `shutdown`
  - Shutdown gracefully
  - Not shutdown twice
- `healthCheck`
  - Return true when connected
  - Return false when not connected
  - Return false on provider error
- `getStats`
  - Return listener statistics
  - Reflect retry attempts
- WebSocket URL configuration
  - Use BASE_SEPOLIA_WS_URL from environment
  - Convert HTTPS to WSS if no WS URL provided
  - Convert HTTP to WS

**Mock Strategy:**
- Prisma Client for database operations
- ethers.js WebSocketProvider for blockchain connections
- ethers.js Contract for event subscriptions

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run specific test suites
```bash
npm run test:payment           # Payment service tests
npm run test:reconciliation    # Reconciliation service tests
npm run test:usdc             # USDC client tests
npm run test:worker           # Payment worker tests
npm run test:queue            # Payment queue tests
npm run test:event-listener   # Event listener service tests
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Preset: `ts-jest/presets/default-esm` for ESM support
- Test environment: Node.js
- Coverage threshold: 90% (branches, functions, lines, statements)
- Test match: `**/tests/**/*.test.ts`
- Setup file: `tests/setup.ts`

### Setup File (`tests/setup.ts`)
- Sets test timeout to 10 seconds
- Configures test environment variables
- Mocks DATABASE_URL, REDIS_URL, BASE_SEPOLIA_RPC_URL, etc.

## Coverage Goals

Target: >90% coverage for all Phase 4 payment functionality

**Coverage Areas:**
- ✅ Payment Service (createPaymentFromValidation, processPayment, getPaymentById, etc.)
- ✅ Reconciliation Service (reconcile, getReconciliationReport, getDiscrepancies, etc.)
- ✅ USDC Client (getAllowance, getBalance, generateApprovalTxData, formatUSDC, parseUSDC)
- ✅ Payment Worker (job processing, error handling, retry logic, WebSocket events)
- ✅ Payment Queue (addPaymentJob, pauseQueue, resumeQueue, getQueueStatus)
- ✅ Event Listener Service (getLastProcessedBlock, updateLastProcessedBlock, replayEvents, etc.)

## Mock Patterns

### Prisma Client Mock
```typescript
const mockPrismaClient = {
  payment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    // ... other methods
  },
  // ... other models
};
```

### ethers.js Mock
```typescript
const mockContract = {
  allowance: jest.fn(),
  balanceOf: jest.fn(),
  approve: {
    populateTransaction: jest.fn(),
    estimateGas: jest.fn(),
  },
};
```

### BullMQ Mock
```typescript
const mockQueue = {
  add: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isPaused: jest.fn(),
  getJobCounts: jest.fn(),
};
```

## Best Practices

1. **Clear all mocks between tests**: Use `jest.clearAllMocks()` in `beforeEach`
2. **Test both success and failure paths**: Cover happy path and error scenarios
3. **Verify mock calls**: Use `toHaveBeenCalledWith()` to verify correct arguments
4. **Test edge cases**: Zero amounts, invalid addresses, network errors, etc.
5. **Use descriptive test names**: Clearly describe what is being tested
6. **Group related tests**: Use `describe` blocks to organize tests logically

## Debugging Tests

### Run a single test file
```bash
npm run test:payment
```

### Run tests with verbose output
```bash
npm test -- --verbose
```

### Run tests with coverage for specific file
```bash
npm test -- --coverage --collectCoverageFrom=src/services/payment.service.ts
```

### Debug in VS Code
Add this configuration to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Contributing

When adding new payment functionality:
1. Write tests first (TDD approach)
2. Ensure >90% coverage for new code
3. Update this README with new test descriptions
4. Run full test suite before committing
