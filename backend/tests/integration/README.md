# Integration Tests for Phase 4 Payment Flow

This directory contains comprehensive integration tests for the Phase 4 payment automation system.

## Test Files

### 1. payment-flow.test.ts
Tests the complete end-to-end payment workflow:
- ValidationRecorded event emission
- Payment record creation
- Job queue processing
- Payment worker execution
- BountyPool.releaseBounty() transaction
- Payment status updates
- WebSocket event emission
- USDC transfer verification

**Test Cases:**
- ✅ Full payment flow (ValidationRecorded → USDC transfer)
- ✅ Insufficient pool funds handling
- ✅ Duplicate payment prevention
- ✅ Network error retry logic

### 2. reconciliation-flow.test.ts
Tests the payment reconciliation workflow:
- BountyReleased event reconciliation
- Orphaned payment detection
- Amount mismatch detection
- Missing payment detection
- Periodic reconciliation job
- PaymentReconciliation record creation

**Test Cases:**
- ✅ BountyReleased event updates Payment with reconciled flag
- ✅ Orphaned payment detection (event without database record)
- ✅ Amount mismatch between database and blockchain
- ✅ Missing payment detection (database without on-chain confirmation)
- ✅ Periodic reconciliation job execution
- ✅ Discrepancy resolution workflow

### 3. usdc-approval-flow.test.ts
Tests the USDC approval workflow:
- USDC allowance queries
- Approval transaction generation
- Transaction signing and submission
- Allowance verification
- Balance queries
- Error handling

**Test Cases:**
- ✅ Query USDC allowance (initially 0)
- ✅ Generate approval transaction via API
- ✅ Sign and submit approval transaction
- ✅ Verify allowance updated on-chain
- ✅ Query USDC balance
- ✅ Invalid spender rejection
- ✅ Zero amount rejection
- ✅ Negative amount rejection
- ✅ Multiple approvals update correctly
- ✅ Balance updates after transfer
- ✅ Gas estimation for approval
- ✅ Non-existent spender handling
- ✅ Empty address balance query

## Setup

### Prerequisites

1. **Foundry (Anvil)** - For local blockchain fork
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **PostgreSQL** - Separate test database
   ```bash
   createdb thunder_test
   ```

3. **Redis** - Separate test instance or database
   ```bash
   # Use database 1 for tests (default is 0)
   redis-cli SELECT 1
   ```

4. **Node.js 20+** and dependencies
   ```bash
   npm install
   ```

### Environment Variables

Copy `.env.test.example` to `.env.test` and configure:

```bash
# Database (use separate test database)
DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test"

# Redis (use separate test Redis db)
REDIS_URL="redis://localhost:6379/1"

# Blockchain
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"

# Contract Addresses (Base Sepolia testnet)
PROTOCOL_REGISTRY_ADDRESS="0x..."
VALIDATION_REGISTRY_ADDRESS="0x..."
BOUNTY_POOL_ADDRESS="0x..."

# Test Wallets (Anvil's default test accounts)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
PRIVATE_KEY2="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
```

## Running Tests

### Run all integration tests
```bash
npm run test:integration
```

### Run specific test file
```bash
npm run test:integration -- payment-flow.test.ts
```

### Run with coverage
```bash
npm run test:integration -- --coverage
```

### Run in watch mode
```bash
npm run test:integration -- --watch
```

### Run specific test case
```bash
npm run test:integration -- -t "Full payment flow"
```

## Test Environment

### Anvil Fork
- The tests automatically start an Anvil fork of Base Sepolia
- Fork includes all deployed contracts and their state
- Each test gets a fresh fork state
- Anvil is automatically stopped after tests complete

### Test Wallets
Tests use Anvil's default test accounts (pre-funded with 10000 ETH):
- **Payer Wallet**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (has PAYER_ROLE)
- **Researcher Wallet**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (receives payments)
- **Protocol Owner**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (deposits bounty)
- **Validator**: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (submits validations)

### USDC Funding
- Tests impersonate a USDC whale address on Base Sepolia
- Transfer 100,000 USDC to each test wallet
- USDC address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Database
- Tests use a separate test database
- Database is cleared before each test
- All records are cleaned up after tests

### Redis
- Tests use Redis database 1 (production uses 0)
- All queues are cleared before each test
- Connections are closed after tests

## Test Architecture

### Setup Flow
1. `global-setup.js` - Validates environment and dependencies
2. `setup.ts` - Starts Anvil, initializes wallets, funds accounts
3. `beforeEach` - Clears database and Redis for each test

### Test Flow
1. Create test data (protocols, vulnerabilities, payments)
2. Execute blockchain transactions (events, approvals, transfers)
3. Verify database updates
4. Verify on-chain state
5. Check job queue processing
6. Validate WebSocket events (where applicable)

### Teardown Flow
1. `afterEach` - Optional cleanup
2. Stop Anvil
3. Disconnect from database and Redis
4. `global-teardown.js` - Final cleanup

## Helper Functions

### Test Data Creation
```typescript
createTestProtocol(options?)  // Create protocol in database
createTestVulnerability(protocolId, options?)  // Create vulnerability
createTestPayment(vulnerabilityId, options?)  // Create payment
```

### Utilities
```typescript
waitFor(condition, timeout, interval)  // Wait for async condition
```

### Test Wallets
```typescript
testPayerWallet  // Wallet with PAYER_ROLE
testResearcherWallet  // Receives bounty payments
testProtocolOwnerWallet  // Deposits bounty to pool
testValidatorWallet  // Submits validations
```

### Contracts
```typescript
TEST_CONTRACTS.protocolRegistry
TEST_CONTRACTS.validationRegistry
TEST_CONTRACTS.bountyPool
TEST_CONTRACTS.usdc
```

## Debugging

### View Anvil Output
```bash
# Anvil logs are printed to console during tests
# Look for [Anvil] prefix in output
```

### Check Database State
```bash
# Connect to test database
psql thunder_test

# View payments
SELECT * FROM "Payment";

# View reconciliations
SELECT * FROM "PaymentReconciliation";
```

### Check Redis Queues
```bash
# Connect to Redis
redis-cli

# Select test database
SELECT 1

# View queue jobs
KEYS *payment*
```

### Run Single Test with Logs
```bash
npm run test:integration -- -t "Full payment flow" --verbose
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Integration Tests
  run: |
    # Start services
    docker-compose -f docker-compose.test.yml up -d postgres redis

    # Wait for services
    sleep 5

    # Run migrations
    npm run prisma:migrate

    # Run tests
    npm run test:integration
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/thunder_test
    REDIS_URL: redis://localhost:6379/1
    BASE_SEPOLIA_RPC_URL: ${{ secrets.BASE_SEPOLIA_RPC_URL }}
    PROTOCOL_REGISTRY_ADDRESS: ${{ secrets.PROTOCOL_REGISTRY_ADDRESS }}
    VALIDATION_REGISTRY_ADDRESS: ${{ secrets.VALIDATION_REGISTRY_ADDRESS }}
    BOUNTY_POOL_ADDRESS: ${{ secrets.BOUNTY_POOL_ADDRESS }}
```

## Troubleshooting

### "Anvil not found"
Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### "Database connection failed"
Ensure PostgreSQL is running and test database exists:
```bash
createdb thunder_test
```

### "Redis connection failed"
Ensure Redis is running:
```bash
redis-server
```

### "Contract addresses not set"
Check `.env.test` file has all contract addresses from Base Sepolia deployment.

### "USDC funding failed"
Ensure Base Sepolia RPC URL is working and whale address has USDC.

### Tests timeout
Increase timeout in jest config or individual tests:
```typescript
test('name', async () => {
  // test code
}, 120000); // 2 minutes
```

## Coverage Reports

After running tests with coverage, reports are generated in:
- `coverage/integration/lcov-report/index.html` - HTML report
- `coverage/integration/lcov.info` - LCOV format
- Console output - Summary

Open HTML report:
```bash
open coverage/integration/lcov-report/index.html
```

## Best Practices

1. **Isolation**: Each test should be independent and isolated
2. **Cleanup**: Always clean up resources (database, Redis, Anvil)
3. **Timeouts**: Set appropriate timeouts for blockchain operations
4. **Assertions**: Verify both database and on-chain state
5. **Error Handling**: Test both success and failure scenarios
6. **Documentation**: Comment complex test logic
7. **Parallel**: Run tests sequentially to avoid conflicts (maxWorkers: 1)

## Contributing

When adding new integration tests:
1. Follow existing test structure
2. Use helper functions from `setup.ts`
3. Clean up all created resources
4. Add documentation to this README
5. Ensure tests pass in CI/CD pipeline
6. Update coverage thresholds if needed
