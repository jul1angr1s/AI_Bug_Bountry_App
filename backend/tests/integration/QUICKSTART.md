# Integration Tests Quick Start Guide

Get up and running with Phase 4 payment flow integration tests in 5 minutes.

## Prerequisites Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Foundry/Anvil installed
- [ ] Environment variables configured

## Quick Setup (5 minutes)

### 1. Install Foundry (if not already installed)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:
```bash
anvil --version
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Setup Test Database
```bash
# Create test database
createdb thunder_test

# Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test" npm run prisma:migrate
```

### 4. Configure Environment
Copy the example environment file:
```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your values:
```bash
# Minimum required configuration
DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test"
REDIS_URL="redis://localhost:6379/1"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"

# Contract addresses (get from your Base Sepolia deployment)
PROTOCOL_REGISTRY_ADDRESS="0x..."
VALIDATION_REGISTRY_ADDRESS="0x..."
BOUNTY_POOL_ADDRESS="0x..."

# Test wallets (use Anvil defaults - safe for testing only)
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
PRIVATE_KEY2="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
```

### 5. Run Tests
```bash
# Run all integration tests
npm run test:integration

# Or run specific test suites
npm run test:integration:payment
npm run test:integration:reconciliation
npm run test:integration:usdc
```

## What Gets Tested?

### Payment Flow (payment-flow.test.ts)
✅ Complete payment workflow from ValidationRecorded event to USDC transfer
✅ Insufficient funds handling
✅ Duplicate payment prevention
✅ Network error retry logic

### Reconciliation Flow (reconciliation-flow.test.ts)
✅ BountyReleased event reconciliation
✅ Orphaned payment detection
✅ Amount mismatch detection
✅ Missing payment detection
✅ Periodic reconciliation job
✅ Discrepancy resolution

### USDC Approval Flow (usdc-approval-flow.test.ts)
✅ Allowance queries
✅ Approval transaction generation
✅ Transaction signing and submission
✅ Balance queries
✅ Error handling (invalid amounts, addresses)

## Test Output Example

```
 PASS  tests/integration/payment-flow.test.ts (45.2s)
  Payment Flow Integration Tests
    ✓ Full payment flow: ValidationRecorded → USDC transfer (15234ms)
    ✓ Payment flow handles insufficient pool funds (8921ms)
    ✓ Payment flow handles duplicate payments (5432ms)
    ✓ Payment flow retries on network errors (7654ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        45.234s
```

## Common Issues & Solutions

### ❌ "Anvil not found"
**Solution:** Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### ❌ "Database connection failed"
**Solution:** Check PostgreSQL is running and database exists
```bash
# Check Postgres status
pg_isready

# Create database if missing
createdb thunder_test
```

### ❌ "Redis connection failed"
**Solution:** Start Redis server
```bash
# macOS (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Or run manually
redis-server
```

### ❌ "Contract addresses not set"
**Solution:** Add your Base Sepolia contract addresses to `.env.test`
```bash
PROTOCOL_REGISTRY_ADDRESS="0xYourAddress..."
VALIDATION_REGISTRY_ADDRESS="0xYourAddress..."
BOUNTY_POOL_ADDRESS="0xYourAddress..."
```

### ❌ Tests timeout
**Solution:** Increase timeout or check RPC connection
```bash
# Check RPC is accessible
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Next Steps

### View Coverage Report
```bash
# Run tests with coverage
npm run test:integration -- --coverage

# Open HTML report
open coverage/integration/lcov-report/index.html
```

### Debug Specific Test
```bash
# Run single test with verbose output
npm run test:integration -- -t "Full payment flow" --verbose

# Run in watch mode for development
npm run test:integration -- --watch
```

### Add to CI/CD
The integration tests are configured to run in GitHub Actions. See `.github/workflows/integration-tests.yml`.

Required secrets:
- `BASE_SEPOLIA_RPC_URL`
- `PROTOCOL_REGISTRY_ADDRESS`
- `VALIDATION_REGISTRY_ADDRESS`
- `BOUNTY_POOL_ADDRESS`

## Tips for Success

1. **Use separate test database** - Never point tests at development or production DB
2. **Use Redis database 1** - Keep test data isolated from development (db 0)
3. **Check Anvil logs** - Tests print Anvil output prefixed with `[Anvil]`
4. **Run tests sequentially** - Integration tests use `maxWorkers: 1` to avoid conflicts
5. **Clean state** - Database and Redis are cleared before each test

## Getting Help

- Read full documentation: [README.md](./README.md)
- Check test files for examples: `*.test.ts`
- Review setup helpers: `setup.ts`
- Open an issue if you find a bug

## Test Data Summary

### Test Wallets (Anvil Defaults)
All wallets are pre-funded with:
- 10,000 ETH (for gas)
- 100,000 USDC (for testing)

| Role | Address | Private Key |
|------|---------|-------------|
| Payer | `0xf39Fd...92266` | `0xac097...2ff80` |
| Researcher | `0x70997...dc79C8` | `0x59c69...8690d` |
| Protocol Owner | `0x3C44C...293BC` | `0x5de41...365a` |
| Validator | `0x90F79...93b906` | `0x7c852...007a6` |

### Contract Addresses
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **ProtocolRegistry**: Your deployed address
- **ValidationRegistry**: Your deployed address
- **BountyPool**: Your deployed address

### Test Parameters
- Block time: 1 second (Anvil)
- Test timeout: 60 seconds per test
- Max workers: 1 (sequential)
- Coverage threshold: TBD

## Success Criteria

All tests should pass with:
- ✅ Payment flow executes end-to-end
- ✅ USDC transfers complete on-chain
- ✅ Database reconciliation accurate
- ✅ Error handling works correctly
- ✅ No hanging processes after tests
- ✅ Clean test isolation

Happy Testing! 🚀
