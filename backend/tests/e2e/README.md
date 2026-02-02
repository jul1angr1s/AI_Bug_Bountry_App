# E2E Demonstration Tests

This directory contains end-to-end (E2E) tests for the complete demonstration workflow of the Thunder Security platform.

## Overview

The E2E tests verify the complete workflow from protocol registration to payment processing:

1. **Protocol Registration** - Register Thunder Loan protocol via API
2. **Protocol Agent Processing** - Clone, compile, and verify protocol
3. **Researcher Agent Scanning** - Scan for vulnerabilities and generate proofs
4. **Validator Agent Validation** - Validate proofs using LLM analysis
5. **Payment Processing** - Process bounty payments via blockchain
6. **Verification** - Verify entire workflow completed successfully

## Test Environment

### Real Components (Not Mocked)
- **BullMQ Queues** - Real queue processing with Redis
- **PostgreSQL Database** - Real database operations via Prisma
- **Redis** - Real Redis instance for queue management

### Mocked Components
- **Blockchain (Ethers.js)** - Mocked blockchain interactions
  - Contract calls (BountyPool, ProtocolRegistry, ValidationRegistry)
  - Transaction confirmations
  - USDC transfers
- **Kimi API** - Mocked LLM responses
  - Vulnerability analysis
  - Proof validation
  - API errors and timeouts

## Prerequisites

Before running E2E tests, ensure you have:

1. **Docker** running (for PostgreSQL and Redis)
2. **Node.js 20+** installed
3. **Environment variables** configured

### Required Services

Start the required services using Docker Compose:

```bash
# From backend directory
docker-compose up -d postgres redis
```

Verify services are running:

```bash
docker ps
```

You should see:
- `thunder-postgres` - PostgreSQL database
- `thunder-redis` - Redis server

### Environment Variables

Create a `.env` or `.env.test` file with:

```env
# Database
DATABASE_URL="postgresql://thunder:thunder_dev_2024@localhost:5432/thunder_security?schema=public"

# Redis
REDIS_URL="redis://:redis_dev_2024@localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="redis_dev_2024"

# Supabase (for auth - can be dummy values for tests)
SUPABASE_URL="https://test.supabase.co"
SUPABASE_ANON_KEY="test-anon-key"
SUPABASE_SERVICE_ROLE_KEY="test-service-role-key"

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# Kimi API (mocked in tests, but needs to be set to avoid errors)
KIMI_API_KEY="test-api-key"
KIMI_API_URL="https://integrate.api.nvidia.com/v1"
KIMI_MODEL="moonshotai/kimi-k2.5"
```

### Database Setup

Run Prisma migrations to set up the test database:

```bash
npm run prisma:migrate
```

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test

```bash
npx vitest run tests/e2e/demonstration-workflow.test.ts
```

### Run in Watch Mode

```bash
npx vitest watch tests/e2e
```

### Run with Verbose Output

```bash
npx vitest run tests/e2e --reporter=verbose
```

## Test Structure

```
tests/e2e/
├── README.md                           # This file
├── setup.ts                            # Test environment setup
├── demonstration-workflow.test.ts      # Main E2E test file
└── mocks/
    ├── blockchain.ts                   # Blockchain interaction mocks
    └── kimi.ts                         # Kimi API mocks
```

## Test Files

### `setup.ts`
- Database initialization and cleanup
- Redis queue management
- Test utility functions (waitFor, createTestProtocol, etc.)

### `mocks/blockchain.ts`
- Mock Ethers.js provider
- Mock contract interactions (BountyPool, ProtocolRegistry, etc.)
- Mock transaction responses and receipts

### `mocks/kimi.ts`
- Mock LLM API responses
- Mock vulnerability analysis results
- Mock proof validation responses

### `demonstration-workflow.test.ts`
- Complete workflow test (protocol → scan → validation → payment)
- Error handling tests (registration failure, scan failure, insufficient funds)

## Test Workflow

The main E2E test simulates this workflow:

```
1. Register Protocol (Thunder Loan)
   ↓
2. Protocol Agent Processes
   - Clone repository
   - Compile contracts
   - Verify contracts
   ↓
3. Researcher Agent Scans
   - Analyze code
   - Find vulnerabilities
   - Generate proofs
   ↓
4. Validator Agent Validates
   - Decrypt proofs
   - LLM validation
   - Update findings
   ↓
5. Payment Agent Processes
   - Create payment records
   - Execute blockchain transactions
   - Confirm payments
   ↓
6. Verification
   - Verify all steps completed
   - Check payment txHash
   - Validate final state
```

## Test Duration

The complete demonstration workflow test is designed to complete in under **4 minutes** as specified in the project requirements.

Individual tests may complete faster:
- Protocol registration failure: ~10 seconds
- Scan failure: ~10 seconds
- Payment failure: ~10 seconds

## Cleanup

After running tests, the test suite automatically:
- Clears all database records
- Obliterates all Redis queues
- Disconnects from services

If needed, manually clean up:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: Deletes all data)
docker-compose down -v
```

## Troubleshooting

### Redis Connection Errors

If you see `ECONNREFUSED` errors:

```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis
docker-compose up -d redis
```

### Database Connection Errors

If you see database connection errors:

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
npm run prisma:migrate
```

### Test Timeout Errors

If tests timeout, ensure:
- Docker services are running
- Redis is accepting connections
- Database migrations are up to date
- No other processes are using ports 5432 or 6379

### Kimi API Errors

The Kimi API is mocked in tests, but you may still need to set the `KIMI_API_KEY` environment variable to avoid initialization errors. Use a dummy value like `test-api-key`.

## CI/CD Integration

For CI/CD pipelines, use the following setup:

```yaml
# Example GitHub Actions workflow
- name: Start Services
  run: |
    docker-compose up -d postgres redis
    sleep 5  # Wait for services to be ready

- name: Run Database Migrations
  run: npm run prisma:migrate

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    DATABASE_URL: postgresql://thunder:thunder_dev_2024@localhost:5432/thunder_security?schema=public
    REDIS_URL: redis://:redis_dev_2024@localhost:6379
    KIMI_API_KEY: test-api-key
    SUPABASE_URL: https://test.supabase.co
    SUPABASE_ANON_KEY: test-anon-key
    SUPABASE_SERVICE_ROLE_KEY: test-service-role-key

- name: Stop Services
  run: docker-compose down
```

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Use the setup utilities from `setup.ts`
3. Mock external dependencies (blockchain, APIs)
4. Use real queues and database
5. Include comprehensive assertions
6. Add cleanup in `afterEach` or `afterAll`
7. Keep test duration reasonable (<5 minutes)
8. Add clear console logging for test progress

## Related Documentation

- [Integration Tests](../integration/README.md) - Similar tests but with real blockchain fork
- [API Documentation](../../docs/api/README.md) - API endpoints tested
- [Architecture](../../docs/architecture/README.md) - System architecture
