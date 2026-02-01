# CI/CD Quick Start Guide

This guide provides quick instructions for setting up and using the CI/CD pipeline for AI tests.

## Setup (One-time)

### 1. Configure GitHub Secrets

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

```
ANTHROPIC_API_KEY            # Your Anthropic Claude API key
BASE_SEPOLIA_RPC_URL        # Blockchain RPC endpoint
PROTOCOL_REGISTRY_ADDRESS   # Smart contract address
VALIDATION_REGISTRY_ADDRESS # Smart contract address
BOUNTY_POOL_ADDRESS         # Smart contract address
```

### 2. Configure Local Environment

```bash
cd backend
cp .env.test.example .env.test
# Edit .env.test and add your ANTHROPIC_API_KEY
```

## Running Tests Locally

### Quick Commands

```bash
# Run all E2E tests (AI disabled, fast)
npm test

# Run E2E tests explicitly
npm run test:e2e

# Run AI tests (requires ANTHROPIC_API_KEY)
npm run test:ai

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

### With AI Enabled

```bash
# Set environment variable and run AI tests
AI_ANALYSIS_ENABLED=true npm run test:ai
```

## CI/CD Pipeline

### Workflow Overview

```
Push/PR → E2E Tests (5-10 min) → AI Tests (15-30 min) → Summary
          ↓                       ↓
          Fast Fail              Only if E2E passes
```

### What Runs When

**On Push/Pull Request**:
1. E2E Tests run automatically with `AI_ANALYSIS_ENABLED=false`
2. If E2E tests pass, AI Tests run with `AI_ANALYSIS_ENABLED=true`
3. Summary job reports overall status

**Manual Workflow**:
- Can be triggered manually from GitHub Actions UI

### Viewing Results

1. Go to GitHub repository → Actions tab
2. Click on your workflow run
3. View individual job logs:
   - E2E Tests (AI Disabled)
   - AI Integration Tests
   - Test Suite Summary
4. Download artifacts for detailed reports

## Test Files

### Naming Convention

```
Regular tests:  *.test.ts      (runs in E2E suite)
AI tests:       *.ai.test.ts   (runs in AI suite)
```

### Example Structure

```
backend/
  src/
    agents/
      researcher/
        __tests__/
          setup.ts                              # Test setup
          integration/
            ai-pipeline.ai.test.ts             # AI test (requires API)
            researcher-flow.test.ts            # E2E test (no API)
```

## Writing Tests

### Regular E2E Test

```typescript
// user.test.ts
import { describe, it, expect } from 'vitest';

describe('User API', () => {
  it('should create user', async () => {
    // Test core functionality
    // AI_ANALYSIS_ENABLED will be false
  });
});
```

### AI Integration Test

```typescript
// ai-analysis.ai.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('AI Analysis', () => {
  it('should analyze code with AI', async () => {
    // Enable AI for this test
    vi.stubEnv('AI_ANALYSIS_ENABLED', 'true');

    // Test AI functionality
    // Requires ANTHROPIC_API_KEY
  }, { timeout: 60000 }); // Longer timeout for AI
});
```

## Environment Variables

### For E2E Tests

```bash
AI_ANALYSIS_ENABLED=false  # AI disabled (default)
DATABASE_URL=postgresql://test:test@localhost:5432/thunder_test
REDIS_URL=redis://localhost:6379/1
```

### For AI Tests

```bash
AI_ANALYSIS_ENABLED=true   # AI enabled
ANTHROPIC_API_KEY=sk-...   # Your API key
ANTHROPIC_MODEL=claude-opus-4-5-20251101
AI_ANALYSIS_TIMEOUT=120000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENT_REQUESTS=5
```

## Troubleshooting

### Tests Fail Locally

```bash
# Check database is running
docker ps | grep postgres

# Check Redis is running
docker ps | grep redis

# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- path/to/test.test.ts
```

### AI Tests Fail

```bash
# Check API key is set
echo $ANTHROPIC_API_KEY

# Run with AI enabled
AI_ANALYSIS_ENABLED=true npm run test:ai

# Check AI configuration
grep "AI_" .env.test
```

### CI/CD Fails

1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Check service health (PostgreSQL, Redis)
4. Compare local vs CI environment variables

## Common Issues

### "API key not found"

**Solution**: Add `ANTHROPIC_API_KEY` to GitHub Secrets or local `.env.test`

### "Tests timeout"

**Solution**: Increase timeout in test file or workflow YAML

### "Database connection failed"

**Solution**:
- Local: Start PostgreSQL with `docker-compose up -d postgres`
- CI: Check service health in workflow logs

### "AI tests skipped in CI"

**Reason**: E2E tests failed, so AI tests were skipped (by design)
**Solution**: Fix E2E tests first

## Performance Tips

1. **Run E2E tests before AI tests locally** to catch issues early
2. **Use watch mode** during development: `npm run test:watch`
3. **Focus on specific files** when debugging: `npm test -- file.test.ts`
4. **Check coverage** to ensure adequate testing: `npm run test:coverage`

## Best Practices

1. Write E2E tests first (faster feedback)
2. Add AI tests only for AI-specific features
3. Mock AI responses in E2E tests
4. Use appropriate timeouts (30s for E2E, 60s+ for AI)
5. Keep test files focused and specific
6. Clean up test data after each test

## Resources

- Full documentation: `CI_CD_TESTING_STRATEGY.md`
- Change summary: `CI_CD_CHANGES_SUMMARY.md`
- Vitest docs: https://vitest.dev/
- GitHub Actions docs: https://docs.github.com/en/actions
- Anthropic API docs: https://docs.anthropic.com/

## Quick Reference

| Command | Description | AI Enabled |
|---------|-------------|------------|
| `npm test` | Run all tests | No |
| `npm run test:e2e` | Run E2E tests only | No |
| `npm run test:ai` | Run AI tests only | Yes |
| `npm run test:watch` | Watch mode | No |
| `npm run test:coverage` | With coverage | No |
| `npm run test:ci` | CI E2E tests | No |
| `npm run test:ai:ci` | CI AI tests | Yes |

## Need Help?

1. Check `CI_CD_TESTING_STRATEGY.md` for detailed documentation
2. Review test logs in GitHub Actions
3. Run tests locally with verbose output: `npm test -- --reporter=verbose`
4. Open an issue with logs and configuration details
