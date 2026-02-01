# Researcher Agent Tests

This directory contains integration and unit tests for the Researcher Agent and its AI-enhanced pipeline.

## Test Structure

```
__tests__/
├── integration/
│   └── ai-pipeline.ai.test.ts  # Full 7-step pipeline integration tests
├── setup.ts                     # Vitest setup file
└── README.md                    # This file
```

## Test Coverage

### AI Pipeline Integration Tests (`ai-pipeline.ai.test.ts`)

Tests the complete 7-step research pipeline with AI integration:

1. **Full 7-step pipeline with AI enabled** - End-to-end test with mocked LLM
2. **Pipeline skips AI step when AI_ANALYSIS_ENABLED=false** - Feature flag test
3. **Knowledge base rebuild endpoint** - API test (placeholder for future implementation)
4. **API returns AI findings with all metadata** - API response validation
5. **Cache invalidation on knowledge base version change** - Redis cache test

### Test Cases Breakdown

#### Test Case 1: Full Pipeline E2E
- Creates a scan job
- Executes all 7 steps (CLONE → COMPILE → DEPLOY → ANALYZE → AI_DEEP_ANALYSIS → PROOF_GENERATION → SUBMIT)
- Verifies each step completes successfully
- Validates AI enhancement with mocked LLM
- Checks final scan state and findings count

#### Test Case 2: Feature Flag Test
- Sets `AI_ANALYSIS_ENABLED=false`
- Verifies AI step is skipped
- Confirms pipeline uses only Slither findings
- Validates step metadata reflects disabled state

#### Test Case 3: Knowledge Base Rebuild
- Tests future knowledge base rebuild endpoint
- Placeholder implementation for `/api/v1/ai/knowledge-base/rebuild`
- Validates rebuild response structure

#### Test Case 4: API Response Validation
- Creates AI-enhanced findings
- Tests GET `/api/v1/scans/:id/findings` endpoint
- Validates all AI metadata fields are returned
- Tests filtering by `analysisMethod=AI`
- Verifies response includes:
  - `aiConfidenceScore`
  - `remediationSuggestion`
  - `codeSnippet`
  - `analysisMethod`

#### Test Case 5: Cache Invalidation
- Tests Redis cache invalidation on knowledge base version change
- Validates cache keys are cleared when version updates
- Confirms cache persists when version is unchanged

## Running Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup test environment:**
   ```bash
   cp .env.test.example .env.test
   # Edit .env.test with your test database credentials
   ```

3. **Setup test database:**
   ```bash
   # Run Prisma migrations on test database
   DATABASE_URL="postgresql://user:password@localhost:5432/thunder_test" npm run prisma:migrate
   ```

4. **Start Redis (for cache tests):**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine

   # Or using local Redis
   redis-server
   ```

### Run All Tests

```bash
npm test
```

### Run AI Pipeline Tests Only

```bash
npm run test:ai
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

## Environment Variables

The tests use the following environment variables:

- `DATABASE_URL` - PostgreSQL test database URL
- `REDIS_HOST` - Redis host for cache tests (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `AI_ANALYSIS_ENABLED` - Enable/disable AI analysis (default: true)
- `MOCK_EXTERNAL_SERVICES` - Mock external services like LLM API (default: false)

## Mocking Strategy

### Database
- Uses real Prisma client with test database
- Creates and cleans up test data in `beforeAll`/`afterAll` hooks

### Redis
- Uses real Redis client for cache tests
- Can be mocked by setting `MOCK_EXTERNAL_SERVICES=true`

### LLM API
- Mocked by default in tests
- Mock responses defined in test constants:
  - `mockLLMResponse` - Simulated AI-enhanced findings
  - `mockSlitherFindings` - Simulated Slither static analysis output

### Express App
- Uses supertest to test API endpoints
- Auth middleware is mocked to bypass authentication

## Test Data

### Test Protocol
- ID: `test-protocol-001`
- Name: `Test Protocol`
- GitHub URL: `https://github.com/test/test-protocol`
- Contract: `contracts/VulnerableToken.sol`

### Test Findings
- **Reentrancy** - HIGH severity (Slither finding)
- **Unprotected Selfdestruct** - CRITICAL severity (Slither finding)
- **Integer Overflow** - MEDIUM severity (AI-discovered)

## Troubleshooting

### Database Connection Errors
```bash
# Ensure PostgreSQL is running
pg_isready

# Check DATABASE_URL in .env.test
echo $DATABASE_URL
```

### Redis Connection Errors
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### Test Timeouts
- Default timeout: 30 seconds
- Increase in `vitest.config.ts` if needed:
  ```typescript
  testTimeout: 60000 // 60 seconds
  ```

### Mock Issues
- Clear vi.mock cache between tests
- Use `vi.clearAllMocks()` in `afterEach`
- Check `setup.ts` for global mocks

## Future Enhancements

- [ ] Add unit tests for individual steps
- [ ] Add E2E tests with real Slither integration
- [ ] Implement actual LLM API tests (with Claude API)
- [ ] Add knowledge base rebuild endpoint implementation
- [ ] Add performance benchmarks
- [ ] Add chaos testing for failure scenarios

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names: `it('should...')`
3. Include both success and failure paths
4. Clean up test data in `afterAll` hooks
5. Mock external services appropriately
6. Add JSDoc comments for complex test logic

## References

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Redis Testing Best Practices](https://redis.io/docs/manual/testing/)
