# Testing Guide

This guide covers setting up and running tests for the AI Bug Bounty Backend.

## Quick Start

### 1. Install Test Dependencies

```bash
cd backend
npm install
```

This will install:
- `vitest` - Fast unit test framework
- `supertest` - HTTP assertion library for API testing
- `@vitest/coverage-v8` - Code coverage reporting
- `@types/supertest` - TypeScript types for supertest

### 2. Setup Test Environment

```bash
# Copy example test environment file
cp .env.test.example .env.test

# Edit with your test database credentials
nano .env.test
```

Example `.env.test`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test"
REDIS_URL="redis://localhost:6379/1"
NODE_ENV="test"
AI_ANALYSIS_ENABLED="true"
```

### 3. Setup Test Database

```bash
# Create test database
createdb thunder_test

# Run Prisma migrations
DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test" npm run prisma:migrate
```

### 4. Start Redis (for cache tests)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using local Redis
redis-server
```

### 5. Run Tests

```bash
# Run all tests
npm test

# Run AI pipeline integration tests only
npm run test:ai

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
backend/
├── src/
│   └── agents/
│       └── researcher/
│           └── __tests__/
│               ├── integration/
│               │   └── ai-pipeline.ai.test.ts  # AI pipeline integration tests (543 lines)
│               ├── setup.ts                     # Vitest setup configuration
│               └── README.md                    # Detailed test documentation
├── vitest.config.ts                            # Vitest configuration
├── package.json                                # Updated with test scripts and dependencies
└── TESTING.md                                  # This file
```

## AI Pipeline Integration Tests

The main test file (`ai-pipeline.ai.test.ts`) contains comprehensive integration tests for the 7-step research pipeline:

### Test Cases (5 Total)

1. **Full 7-step pipeline with AI enabled** (~100 lines)
   - End-to-end test of complete pipeline
   - Tests all steps: CLONE → COMPILE → DEPLOY → ANALYZE → AI_DEEP_ANALYSIS → PROOF_GENERATION → SUBMIT
   - Uses mocked LLM responses
   - Validates step transitions and final state

2. **Pipeline skips AI step when AI_ANALYSIS_ENABLED=false** (~50 lines)
   - Feature flag test
   - Verifies AI step is bypassed
   - Confirms Slither findings are used
   - Validates step metadata

3. **Knowledge base rebuild endpoint** (~30 lines)
   - API endpoint test (placeholder for future implementation)
   - Tests POST `/api/v1/ai/knowledge-base/rebuild`
   - Validates rebuild response structure

4. **API returns AI findings with all metadata fields** (~80 lines)
   - Tests GET `/api/v1/scans/:id/findings`
   - Validates AI-enhanced metadata:
     - `aiConfidenceScore`
     - `remediationSuggestion`
     - `codeSnippet`
     - `analysisMethod`
   - Tests filtering by `analysisMethod=AI`

5. **Cache invalidation on knowledge base version change** (~70 lines)
   - Redis cache tests
   - Validates cache invalidation on KB version change
   - Confirms cache persistence when version unchanged

### Additional Tests

- **Error Handling Tests** (~60 lines)
  - AI analysis failure graceful fallback
  - Empty Slither findings handling
  - API parameter validation

## Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
{
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/agents/researcher/__tests__/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  }
}
```

### Test Scripts

```json
{
  "test": "vitest",                    // Run all tests
  "test:ai": "vitest run ai-pipeline", // Run AI tests only
  "test:watch": "vitest watch",        // Watch mode
  "test:coverage": "vitest --coverage" // Coverage report
}
```

## Mocking Strategy

### Database
- **Real Prisma Client** with separate test database
- Cleanup in `beforeAll` / `afterAll` hooks

### Redis
- **Real Redis Client** for cache tests
- Uses separate Redis DB (e.g., db 1)

### LLM API
- **Mocked by default** using Vitest mocks
- Mock responses defined in test constants
- Can be configured via `MOCK_EXTERNAL_SERVICES=true`

### Express App
- **Supertest** for API endpoint testing
- Auth middleware mocked to bypass authentication

## Test Data

### Fixtures

**Test Protocol:**
```javascript
{
  id: 'test-protocol-001',
  name: 'Test Protocol',
  githubUrl: 'https://github.com/test/test-protocol',
  contractPath: 'contracts/VulnerableToken.sol',
  contractName: 'VulnerableToken',
}
```

**Mock Slither Findings:**
```javascript
[
  {
    vulnerabilityType: 'REENTRANCY',
    severity: 'HIGH',
    description: 'Reentrancy in withdraw function',
    confidenceScore: 0.8,
  },
  {
    vulnerabilityType: 'UNPROTECTED_SELFDESTRUCT',
    severity: 'CRITICAL',
    description: 'Unprotected selfdestruct call',
    confidenceScore: 0.9,
  },
]
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL
cat .env.test | grep DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Verify Redis config
cat .env.test | grep REDIS
```

### Test Timeout Errors

Increase timeout in `vitest.config.ts`:
```typescript
testTimeout: 60000 // 60 seconds
```

### Import Errors

```bash
# Ensure Prisma client is generated
npm run prisma:generate

# Rebuild TypeScript
npm run build
```

## Running Specific Tests

```bash
# Run specific test file
npm test ai-pipeline.ai.test.ts

# Run specific test case
npm test -t "Full 7-step pipeline"

# Run tests matching pattern
npm test -t "AI"

# Run with verbose output
npm test -- --reporter=verbose
```

## Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# Coverage files generated in:
coverage/
├── index.html      # HTML report (open in browser)
├── coverage.json   # JSON report
└── lcov.info       # LCOV format
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

      redis:
        image: redis:alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run prisma:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

      - run: npm test
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
```

## Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Always clean up test data in `afterAll`
3. **Mocking** - Mock external services (LLM API, blockchain)
4. **Descriptive Names** - Use clear, descriptive test names
5. **Both Paths** - Test success and failure scenarios
6. **Fast Tests** - Keep tests fast (< 30s per test)

## Next Steps

- [ ] Run initial test suite: `npm test`
- [ ] Install dependencies: `npm install`
- [ ] Configure test database in `.env.test`
- [ ] Review test coverage report
- [ ] Add additional test cases as needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest GitHub](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Redis Testing](https://redis.io/docs/manual/testing/)

## Support

For issues or questions:
1. Check the test README: `backend/src/agents/researcher/__tests__/README.md`
2. Review test output for detailed error messages
3. Enable verbose logging: `npm test -- --reporter=verbose`
