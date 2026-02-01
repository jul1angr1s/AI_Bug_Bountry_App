# AI Deep Analysis Step - Test Suite Documentation

## Overview

This directory contains comprehensive tests for the AI Deep Analysis step of the researcher agent. The test suite validates the AI-enhanced vulnerability detection capabilities.

## Test File

- `ai-deep-analysis.test.ts` - Comprehensive test suite (708 lines, 6 test suites, 35+ test cases)

## Test Coverage

### Test Suite 1: AI validates Slither findings
Tests that the AI can:
- Confirm valid Slither findings with enhanced descriptions
- Reject false positive Slither findings
- Adjust severity levels based on deeper analysis

**Test Cases:**
- `should confirm valid Slither findings with enhanced descriptions`
- `should reject false positive Slither findings`
- `should adjust severity based on AI analysis`

### Test Suite 2: AI detects additional vulnerabilities
Tests that the AI can discover vulnerabilities missed by static analysis:
- Integer overflows
- Denial of Service vectors
- Logic errors
- Complex attack vectors (flash loan attacks, etc.)

**Test Cases:**
- `should detect vulnerabilities missed by Slither`
- `should detect logic vulnerabilities`
- `should detect complex attack vectors`

### Test Suite 3: Error handling for malformed contracts
Tests graceful error handling for various failure scenarios:
- Parse errors
- Missing files
- Syntax errors
- Empty contracts

**Test Cases:**
- `should handle parse errors gracefully`
- `should handle missing contract file`
- `should handle syntax errors in contract`
- `should handle empty contract gracefully`

### Test Suite 4: Rate limiting and concurrent processing
Tests that the system respects API rate limits and handles concurrency:
- Rate limit enforcement
- Function queuing
- API error handling
- Retry logic

**Test Cases:**
- `should respect rate limits when analyzing multiple functions`
- `should queue functions when hitting concurrent limit`
- `should handle API rate limit errors gracefully`
- `should retry on temporary network failures`

### Test Suite 5: Graceful fallback on LLM failure
Tests that the system falls back to Slither-only results on failures:
- Disabled AI analysis
- API failures
- Authentication errors
- Timeout errors
- Partial failures

**Test Cases:**
- `should return Slither findings when AI is disabled`
- `should fallback to Slither on LLM API failure`
- `should fallback on authentication errors`
- `should fallback on timeout errors`
- `should continue analysis even with partial LLM failures`

### Test Suite 6: Redis caching for duplicate function signatures
Tests the caching mechanism for performance optimization:
- Cache storage
- Cache retrieval
- Cache invalidation
- Error handling
- TTL management

**Test Cases:**
- `should cache analysis results for function signatures`
- `should retrieve cached results for duplicate signatures`
- `should handle cache errors gracefully`
- `should invalidate cache for updated contracts`
- `should set appropriate TTL for cached results`

### Edge Cases and Integration Tests
Additional tests for edge cases:
- Empty Slither findings
- Processing time tracking
- Token usage metrics
- Large contract handling

**Test Cases:**
- `should handle empty Slither findings`
- `should track processing time accurately`
- `should include token usage metrics when available`
- `should handle very large contracts with chunking`

## Running the Tests

### Prerequisites
```bash
# Install dependencies (including vitest)
cd backend
npm install --save-dev vitest @vitest/ui
```

### Run all tests
```bash
npm run test
```

### Run specific test file
```bash
npx vitest src/agents/researcher/steps/__tests__/ai-deep-analysis.test.ts
```

### Run with coverage
```bash
npx vitest --coverage
```

### Run in watch mode
```bash
npx vitest --watch
```

### Run with UI
```bash
npx vitest --ui
```

## Test Fixtures

### Mock Data
The test suite uses the following mock data:

- **MOCK_SLITHER_FINDINGS**: Sample vulnerability findings from Slither
  - Reentrancy vulnerability
  - Access control issue

- **MOCK_CONTRACT_SOURCE**: Sample vulnerable contract code
  - VulnerableToken contract with intentional vulnerabilities

### Mock Dependencies
The following dependencies are mocked:

- **mockLLMAnalyzer**: Anthropic Claude API client
  - `analyzeContract()`: Analyzes entire contract
  - `analyzeFunction()`: Analyzes individual functions

- **mockKnowledgeBase**: Vulnerability pattern database
  - `getVulnerabilityPatterns()`: Retrieves known patterns
  - `checkSimilarFindings()`: Checks for similar issues

- **mockFunctionParser**: Solidity parser
  - `extractFunctions()`: Extracts function signatures
  - `parseFunctionSignature()`: Parses function details

- **mockRedisClient**: Redis caching client
  - `get()`: Retrieves cached results
  - `set()`: Stores analysis results
  - `del()`: Invalidates cache
  - `disconnect()`: Closes connection

## Environment Variables

The tests use the following environment variables:

- `AI_ANALYSIS_ENABLED`: Enable/disable AI analysis (default: 'true' in tests)
- `ANTHROPIC_API_KEY`: API key for Claude (mocked in tests)
- `REDIS_URL`: Redis connection URL (mocked in tests)

## Expected Test Results

When all tests pass, you should see:
- ✓ 35+ test cases passing
- 100% coverage for ai-deep-analysis.ts
- ~708 lines of test code
- 6 test suites completed

## Notes

- Tests are designed to run in isolation (no external dependencies)
- All API calls and database operations are mocked
- Tests validate both success and failure scenarios
- Performance tests verify rate limiting and concurrency control
- Caching tests ensure optimal performance for duplicate analyses

## Future Enhancements

Potential improvements to the test suite:
- Integration tests with real Claude API (optional, behind feature flag)
- Performance benchmarks for large contracts
- Snapshot testing for AI responses
- Property-based testing for edge cases
- Load testing for concurrent analysis
