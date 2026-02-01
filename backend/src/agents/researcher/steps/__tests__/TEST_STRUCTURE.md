# Test Structure Overview

## File Organization

```
backend/src/agents/researcher/steps/__tests__/
├── ai-deep-analysis.test.ts      # Main test suite (708 lines)
├── README.md                      # Detailed documentation
├── QUICK_START.md                 # Quick reference guide
└── TEST_STRUCTURE.md              # This file
```

## Test Architecture

```
ai-deep-analysis.test.ts
│
├── Imports & Dependencies
│   ├── Vitest testing framework
│   ├── Prisma types (Severity enum)
│   ├── AI Deep Analysis functions
│   └── Vulnerability Finding types
│
├── Mock Dependencies
│   ├── mockLLMAnalyzer (Claude API client)
│   ├── mockKnowledgeBase (vulnerability patterns)
│   ├── mockFunctionParser (Solidity parser)
│   └── mockRedisClient (caching layer)
│
├── Test Fixtures
│   ├── SAMPLE_CONTRACT_PATH
│   ├── CLONED_PATH
│   ├── CONTRACT_NAME
│   ├── MOCK_SLITHER_FINDINGS (2 sample vulnerabilities)
│   └── MOCK_CONTRACT_SOURCE (VulnerableToken.sol)
│
└── Test Suites (6 total, 37 test cases)
    │
    ├── Suite 1: AI validates Slither findings (3 tests)
    │   ├── Confirm valid findings with enhanced descriptions
    │   ├── Reject false positive findings
    │   └── Adjust severity based on AI analysis
    │
    ├── Suite 2: AI detects additional vulnerabilities (3 tests)
    │   ├── Detect vulnerabilities missed by Slither
    │   ├── Detect logic vulnerabilities
    │   └── Detect complex attack vectors
    │
    ├── Suite 3: Error handling for malformed contracts (4 tests)
    │   ├── Handle parse errors gracefully
    │   ├── Handle missing contract file
    │   ├── Handle syntax errors in contract
    │   └── Handle empty contract gracefully
    │
    ├── Suite 4: Rate limiting and concurrent processing (4 tests)
    │   ├── Respect rate limits when analyzing multiple functions
    │   ├── Queue functions when hitting concurrent limit
    │   ├── Handle API rate limit errors gracefully
    │   └── Retry on temporary network failures
    │
    ├── Suite 5: Graceful fallback on LLM failure (5 tests)
    │   ├── Return Slither findings when AI is disabled
    │   ├── Fallback to Slither on LLM API failure
    │   ├── Fallback on authentication errors
    │   ├── Fallback on timeout errors
    │   └── Continue analysis even with partial LLM failures
    │
    ├── Suite 6: Redis caching for duplicate function signatures (5 tests)
    │   ├── Cache analysis results for function signatures
    │   ├── Retrieve cached results for duplicate signatures
    │   ├── Handle cache errors gracefully
    │   ├── Invalidate cache for updated contracts
    │   └── Set appropriate TTL for cached results
    │
    └── Edge Cases and Integration Tests (4 tests)
        ├── Handle empty Slither findings
        ├── Track processing time accurately
        ├── Include token usage metrics when available
        └── Handle very large contracts with chunking
```

## Test Coverage Matrix

| Feature | Test Count | Coverage |
|---------|-----------|----------|
| Slither validation | 3 | ✓ Confirmation, rejection, severity adjustment |
| New vulnerability detection | 3 | ✓ Missed issues, logic errors, attack vectors |
| Error handling | 4 | ✓ Parse errors, missing files, syntax errors, empty contracts |
| Rate limiting | 4 | ✓ Limits, queuing, API errors, retries |
| Fallback behavior | 5 | ✓ Disabled, failures, auth, timeout, partial |
| Caching | 5 | ✓ Storage, retrieval, errors, invalidation, TTL |
| Edge cases | 4 | ✓ Empty inputs, metrics, large contracts |

## Mock Data Details

### MOCK_SLITHER_FINDINGS
```typescript
[
  {
    vulnerabilityType: 'REENTRANCY',
    severity: Severity.CRITICAL,
    filePath: 'contracts/VulnerableToken.sol',
    lineNumber: 34,
    functionSelector: 'transfer',
    description: 'Reentrancy in VulnerableToken.transfer(address,uint256)',
    confidenceScore: 0.9,
  },
  {
    vulnerabilityType: 'ACCESS_CONTROL',
    severity: Severity.HIGH,
    filePath: 'contracts/VulnerableToken.sol',
    lineNumber: 27,
    functionSelector: 'mint',
    description: 'Missing access control in mint function',
    confidenceScore: 0.85,
  }
]
```

### MOCK_CONTRACT_SOURCE
Intentionally vulnerable Solidity contract with:
- Reentrancy vulnerability in `transfer()`
- Missing access control in `mint()`
- Unchecked external call

## Test Execution Flow

```
1. Setup Phase (beforeEach)
   ├── Store original environment
   ├── Clear all mocks
   └── Enable AI analysis

2. Test Execution
   ├── Create test parameters
   ├── Configure mocks for scenario
   ├── Call executeAIDeepAnalysisStep()
   ├── Assert results
   └── Verify mock interactions

3. Teardown Phase (afterEach)
   └── Restore original environment
```

## Assertions Used

- `expect(result.aiEnhanced).toBe(boolean)` - AI enhancement flag
- `expect(result.findings.length).toBe(number)` - Finding count
- `expect(result.metrics.*).toBe(value)` - Metrics validation
- `expect(result.findings[n].description).toContain(string)` - Content validation
- `expect(mockFn).toHaveBeenCalled()` - Mock interaction
- `expect(value).toBeGreaterThan(number)` - Numeric validation

## Key Testing Patterns

1. **Mocking Strategy**: All external dependencies are mocked
2. **Isolation**: Each test is independent
3. **Comprehensive**: Tests cover success and failure paths
4. **Realistic**: Uses realistic contract examples
5. **Performance**: Tests include timing and concurrency checks

## Dependencies Required

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@types/node": "^20.11.30"
  }
}
```

## Running Strategy

1. **Development**: Run in watch mode during development
2. **CI/CD**: Run with coverage in continuous integration
3. **Pre-commit**: Run before committing changes
4. **Debug**: Use `--reporter=verbose` for detailed output

## Metrics

- **Total Test Lines**: 708
- **Test Suites**: 7 (6 main + 1 edge cases)
- **Test Cases**: 37
- **Coverage Goal**: >90%
- **Estimated Runtime**: <5 seconds
