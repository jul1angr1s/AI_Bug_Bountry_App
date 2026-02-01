# CI/CD Testing Strategy

This document outlines the comprehensive testing strategy for the AI Bug Bounty application, including E2E tests and AI integration tests.

## Overview

The testing infrastructure is designed with a **fail-fast approach** that separates expensive AI tests from regular E2E tests:

1. **E2E Tests** (Fast) - Run first with `AI_ANALYSIS_ENABLED=false`
2. **AI Tests** (Slower) - Run after E2E tests pass with `AI_ANALYSIS_ENABLED=true`

This strategy ensures:
- Quick feedback on breaking changes
- Efficient use of CI/CD resources
- Reduced API costs (AI tests only run if E2E tests pass)
- Clear separation of concerns

## Test Framework

### Vitest (Primary)

The project uses **Vitest** as the primary test runner. Jest configuration is maintained for legacy compatibility but all new tests should use Vitest.

**Configuration**: `/Users/0xjul1/Documents/Local_Dev/AI_Bug_Bountry_App/backend/vitest.config.ts`

```typescript
// Key features:
- Globals enabled for describe/it/expect
- Node environment
- 30s timeout for regular tests
- Coverage with v8 provider
- Path alias support (@/ → ./src/)
```

### Jest (Legacy)

Jest configuration is maintained in `backend/jest.config.js` with multi-project support for separating AI tests.

**Projects**:
- `regular` - Standard tests (excludes *.ai.test.ts)
- `ai` - AI integration tests (includes only *.ai.test.ts)

## Test Types

### 1. E2E Tests (Regular)

**Location**: `backend/src/**/*.test.ts`

**Characteristics**:
- Fast execution (< 30s total)
- No external API calls
- AI features disabled
- Database and Redis mocked/in-memory

**Environment**:
```bash
AI_ANALYSIS_ENABLED=false
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/thunder_test
REDIS_URL=redis://localhost:6379/1
```

**Run locally**:
```bash
npm test -- --exclude="**/*.ai.test.ts"
```

### 2. AI Integration Tests

**Location**: `backend/src/**/*.ai.test.ts`

**Characteristics**:
- Slower execution (may take several minutes)
- Requires Anthropic API key
- Real AI analysis with Claude
- Tests full AI pipeline

**Environment**:
```bash
AI_ANALYSIS_ENABLED=true
ANTHROPIC_API_KEY=sk-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101
AI_ANALYSIS_TIMEOUT=120000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENT_REQUESTS=5
```

**Run locally**:
```bash
npm run test:ai
```

## CI/CD Workflow

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

#### Job 1: E2E Tests (Fail Fast)

```yaml
e2e-tests:
  name: E2E Tests (AI Disabled)
  runs-on: ubuntu-latest
  timeout-minutes: 30

  env:
    AI_ANALYSIS_ENABLED: "false"
```

**Purpose**:
- Validate core functionality quickly
- Catch breaking changes early
- Provide fast feedback to developers

**Services**:
- PostgreSQL 15
- Redis 7

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install Foundry (for Solidity)
4. Install dependencies
5. Generate Prisma client
6. Run database migrations
7. Run E2E tests (AI disabled)
8. Upload coverage to Codecov

#### Job 2: AI Tests (After E2E Pass)

```yaml
ai-tests:
  name: AI Integration Tests
  needs: e2e-tests
  runs-on: ubuntu-latest
  timeout-minutes: 45
  if: success()

  env:
    AI_ANALYSIS_ENABLED: "true"
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Purpose**:
- Test AI-powered vulnerability analysis
- Validate AI integration
- Ensure AI pipeline works end-to-end

**Dependencies**:
- Only runs if `e2e-tests` job succeeds
- Skipped if E2E tests fail (saves time and API costs)

**Services**:
- PostgreSQL 15
- Redis 7

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install Foundry
4. Install dependencies
5. Generate Prisma client
6. Run database migrations
7. Run AI tests (AI enabled)
8. Upload coverage to Codecov

#### Job 3: Test Summary

```yaml
test-summary:
  name: Test Suite Summary
  needs: [e2e-tests, ai-tests]
  runs-on: ubuntu-latest
  if: always()
```

**Purpose**:
- Aggregate test results
- Provide clear status summary
- Fail CI if any test suite fails

**Output** (GitHub Step Summary):
```
## Test Suite Results

✅ **E2E Tests**: PASSED
✅ **AI Tests**: PASSED

🎉 **Overall Status**: ALL TESTS PASSED
```

## Environment Configuration

### Development (.env)

```bash
AI_ANALYSIS_ENABLED=true
ANTHROPIC_API_KEY=sk-...  # Your development API key
```

### Testing (.env.test)

**File**: `backend/.env.test`

```bash
# Default configuration (AI disabled for speed)
AI_ANALYSIS_ENABLED=false

# AI configuration (uncomment for AI tests)
# ANTHROPIC_API_KEY=sk-...
ANTHROPIC_MODEL=claude-opus-4-5-20251101
AI_ANALYSIS_TIMEOUT=120000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENT_REQUESTS=5

# Database
DATABASE_URL=postgresql://test:test@localhost:5432/thunder_test

# Redis
REDIS_URL=redis://localhost:6379/1
```

### CI/CD Secrets

Required GitHub Secrets:

1. **ANTHROPIC_API_KEY** - Anthropic Claude API key for AI tests
2. **BASE_SEPOLIA_RPC_URL** - Blockchain RPC endpoint
3. **PROTOCOL_REGISTRY_ADDRESS** - Smart contract address
4. **VALIDATION_REGISTRY_ADDRESS** - Smart contract address
5. **BOUNTY_POOL_ADDRESS** - Smart contract address

## Test Execution Flow

### Local Development

```bash
# Run all tests (excludes AI by default)
npm test

# Run AI tests specifically
npm run test:ai

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### CI/CD Pipeline

```mermaid
graph TD
    A[Push/PR] --> B[E2E Tests]
    B -->|Success| C[AI Tests]
    B -->|Failure| D[❌ Fail Fast]
    C -->|Success| E[✅ All Pass]
    C -->|Failure| F[❌ AI Tests Failed]
    D --> G[Test Summary]
    E --> G
    F --> G
    G --> H{Status}
    H -->|All Pass| I[✅ CI Success]
    H -->|Any Fail| J[❌ CI Failure]
```

### Execution Timeline

**Without AI Tests** (E2E only):
- E2E Tests: ~5-10 minutes
- Total: ~5-10 minutes

**With AI Tests** (Full suite):
- E2E Tests: ~5-10 minutes
- AI Tests: ~15-30 minutes (if E2E passes)
- Total: ~20-40 minutes

## Coverage Reporting

### Codecov Integration

Both E2E and AI tests upload coverage separately:

```yaml
# E2E Coverage
flags: e2e
name: e2e-tests

# AI Coverage
flags: ai
name: ai-tests
```

This allows tracking coverage for:
- Core functionality (E2E)
- AI features (AI tests)
- Combined coverage

### Coverage Thresholds

**Vitest**:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

**Jest** (Legacy):
- Lines: 90%
- Functions: 90%
- Branches: 90%
- Statements: 90%

## Best Practices

### Writing Tests

1. **Use appropriate naming**:
   - Regular tests: `*.test.ts`
   - AI tests: `*.ai.test.ts`

2. **Respect AI flag**:
   ```typescript
   // In test setup
   if (process.env.AI_ANALYSIS_ENABLED === 'true') {
     // Enable real AI calls
   } else {
     // Mock AI responses
   }
   ```

3. **Set appropriate timeouts**:
   ```typescript
   // Regular test
   it('should process quickly', { timeout: 5000 }, async () => {});

   // AI test
   it('should analyze with AI', { timeout: 60000 }, async () => {});
   ```

### Local Testing

1. **Before committing**:
   ```bash
   npm test -- --exclude="**/*.ai.test.ts"
   ```

2. **Before AI changes**:
   ```bash
   npm run test:ai
   ```

3. **Full validation**:
   ```bash
   npm test && npm run test:ai
   ```

### CI/CD Optimization

1. **Fail fast** - E2E tests run first
2. **Conditional execution** - AI tests only if E2E pass
3. **Concurrency control** - Cancel in-progress runs
4. **Caching** - NPM dependencies cached
5. **Timeouts** - Prevent stuck jobs

## Monitoring and Debugging

### Test Artifacts

All test runs upload artifacts:

1. **E2E Test Results**:
   - Coverage reports
   - Test output
   - Retention: 7 days

2. **AI Test Results**:
   - Coverage reports
   - Test output
   - AI response logs
   - Retention: 7 days

### Debugging Failures

**E2E Test Failure**:
1. Check test output in GitHub Actions
2. Review coverage report
3. Run locally: `npm test`
4. Check database/Redis connections

**AI Test Failure**:
1. Verify ANTHROPIC_API_KEY is set
2. Check API rate limits
3. Review AI response in artifacts
4. Run locally with: `AI_ANALYSIS_ENABLED=true npm run test:ai`

## Migration Guide

### From Jest to Vitest

If you have existing Jest tests:

1. **Update imports**:
   ```typescript
   // Before (Jest)
   import { describe, it, expect } from '@jest/globals';

   // After (Vitest)
   import { describe, it, expect } from 'vitest';
   ```

2. **Update mocks**:
   ```typescript
   // Before (Jest)
   jest.mock('./module');

   // After (Vitest)
   vi.mock('./module');
   ```

3. **Run tests**:
   ```bash
   npm test  # Now uses Vitest
   ```

## Future Enhancements

1. **Parallel Test Execution**:
   - Run independent test suites in parallel
   - Reduce total CI time

2. **Test Sharding**:
   - Split large test suites across multiple runners
   - Scale with test suite growth

3. **Performance Benchmarks**:
   - Track test execution time
   - Identify slow tests
   - Optimize bottlenecks

4. **Visual Regression Tests**:
   - Add frontend visual testing
   - Catch UI regressions

5. **Contract Testing**:
   - Add Pact/contract tests
   - Ensure API compatibility

## Troubleshooting

### Common Issues

**Issue**: AI tests fail with "API key not found"
**Solution**: Add ANTHROPIC_API_KEY to GitHub Secrets

**Issue**: E2E tests timeout
**Solution**: Increase timeout in workflow (default: 30 minutes)

**Issue**: Database connection fails
**Solution**: Check PostgreSQL service health in workflow

**Issue**: Tests pass locally but fail in CI
**Solution**: Check environment variables and service availability

### Getting Help

1. Review test logs in GitHub Actions
2. Check artifact uploads for detailed reports
3. Run tests locally with same environment
4. Open issue with test output and configuration

## References

- [Vitest Documentation](https://vitest.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.com/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
