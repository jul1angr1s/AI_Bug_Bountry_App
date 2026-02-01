# Quick Start Guide - AI Deep Analysis Tests

## Installation

First, install Vitest if not already installed:

```bash
cd backend
npm install --save-dev vitest @vitest/ui @types/node
```

## Running Tests

### Run all tests in this file
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts
```

### Run in watch mode (auto-rerun on file changes)
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts --watch
```

### Run with detailed output
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts --reporter=verbose
```

### Run specific test suite
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts -t "AI validates Slither findings"
```

### Run specific test case
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts -t "should confirm valid Slither findings"
```

## Expected Output

When tests run successfully, you should see:

```
✓ src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts (37)
  ✓ AI Deep Analysis Step (37)
    ✓ Test Suite 1: AI validates Slither findings (3)
      ✓ should confirm valid Slither findings with enhanced descriptions
      ✓ should reject false positive Slither findings
      ✓ should adjust severity based on AI analysis
    ✓ Test Suite 2: AI detects additional vulnerabilities (3)
      ✓ should detect vulnerabilities missed by Slither
      ✓ should detect logic vulnerabilities
      ✓ should detect complex attack vectors
    ✓ Test Suite 3: Error handling for malformed contracts (4)
      ✓ should handle parse errors gracefully
      ✓ should handle missing contract file
      ✓ should handle syntax errors in contract
      ✓ should handle empty contract gracefully
    ✓ Test Suite 4: Rate limiting and concurrent processing (4)
      ✓ should respect rate limits when analyzing multiple functions
      ✓ should queue functions when hitting concurrent limit
      ✓ should handle API rate limit errors gracefully
      ✓ should retry on temporary network failures
    ✓ Test Suite 5: Graceful fallback on LLM failure (5)
      ✓ should return Slither findings when AI is disabled
      ✓ should fallback to Slither on LLM API failure
      ✓ should fallback on authentication errors
      ✓ should fallback on timeout errors
      ✓ should continue analysis even with partial LLM failures
    ✓ Test Suite 6: Redis caching for duplicate function signatures (5)
      ✓ should cache analysis results for function signatures
      ✓ should retrieve cached results for duplicate signatures
      ✓ should handle cache errors gracefully
      ✓ should invalidate cache for updated contracts
      ✓ should set appropriate TTL for cached results
    ✓ Edge Cases and Integration Tests (4)
      ✓ should handle empty Slither findings
      ✓ should track processing time accurately
      ✓ should include token usage metrics when available
      ✓ should handle very large contracts with chunking

Test Files  1 passed (1)
     Tests  37 passed (37)
  Start at  XX:XX:XX
  Duration  XXXms
```

## Troubleshooting

### Tests not found
Make sure you're in the backend directory:
```bash
cd /Users/0xjul1/Documents/Local_Dev/AI_Bug_Bountry_App/backend
```

### Import errors
The tests use ES modules. Make sure your package.json has:
```json
{
  "type": "module"
}
```

### TypeScript errors
Install type definitions:
```bash
npm install --save-dev @types/node
```

### Vitest not found
Install Vitest:
```bash
npm install --save-dev vitest
```

## Next Steps

1. Run the tests to ensure they pass
2. Review the test coverage
3. Implement the actual AI analysis functionality
4. Update tests as needed when implementation changes

## Notes

- All tests currently use mocks (no real API calls)
- Tests are designed to validate the current placeholder implementation
- As you implement the AI analysis features, update the mocks and add integration tests
- Consider adding a vitest.config.ts for custom configuration
