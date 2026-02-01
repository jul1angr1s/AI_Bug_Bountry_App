# AI Testing Guide

## Overview

This guide covers testing patterns, mocking strategies, and best practices for testing AI-enhanced vulnerability analysis. The AI system requires special testing considerations due to external API dependencies, non-deterministic behavior, and integration complexity.

## Testing Philosophy

### Core Principles

1. **Isolation**: Tests should not depend on external AI APIs by default
2. **Determinism**: Use mocked responses for consistent, repeatable tests
3. **Coverage**: Test both AI-enabled and AI-disabled code paths
4. **Graceful Degradation**: Verify fallback behavior on AI failures
5. **Performance**: Keep tests fast (<30s) using mocks
6. **Integration**: Provide optional real API tests for validation

### Test Pyramid

```
         ┌─────────────┐
         │  E2E Tests  │  ← Optional: Real API (AI tag)
         │   (slow)    │
         └─────────────┘
       ┌─────────────────┐
       │ Integration Tests│  ← Mocked API, Real DB
       │    (medium)      │
       └─────────────────┘
    ┌──────────────────────┐
    │    Unit Tests        │  ← Fully mocked
    │      (fast)          │
    └──────────────────────┘
```

## Test Structure

### Directory Organization

```
backend/
├── src/
│   └── agents/
│       └── researcher/
│           ├── ai/
│           │   ├── embeddings.ts
│           │   ├── knowledge-base.ts
│           │   ├── function-parser.ts
│           │   ├── llm-analyzer.ts
│           │   ├── report-generator.ts
│           │   └── __tests__/
│           │       ├── embeddings.test.ts
│           │       ├── knowledge-base.test.ts
│           │       ├── function-parser.test.ts
│           │       ├── llm-analyzer.test.ts
│           │       ├── report-generator.test.ts
│           │       └── fixtures/
│           │           ├── contracts/
│           │           │   ├── VulnerableToken.sol
│           │           │   ├── SafeToken.sol
│           │           │   └── ComplexVault.sol
│           │           ├── llm-responses.json
│           │           └── README.md
│           ├── steps/
│           │   ├── ai-deep-analysis.ts
│           │   └── __tests__/
│           │       └── ai-deep-analysis.test.ts
│           └── __tests__/
│               ├── integration/
│               │   └── ai-pipeline.ai.test.ts
│               └── setup.ts
└── tests/
    ├── fixtures/
    │   └── knowledge-base/
    └── helpers/
        └── mock-anthropic.ts
```

## Mock Patterns for LLM

### Pattern 1: Mock Anthropic Client

Create a reusable mock factory in `/backend/tests/helpers/mock-anthropic.ts`:

```typescript
import { vi } from 'vitest';

export interface MockLLMResponse {
  content: string;
  stopReason: 'end_turn' | 'max_tokens';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export function createMockAnthropicClient(responses: MockLLMResponse[]) {
  let callCount = 0;

  return {
    messages: {
      create: vi.fn(async (params: any) => {
        const response = responses[callCount % responses.length];
        callCount++;

        return {
          id: `msg-mock-${callCount}`,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: response.content,
            },
          ],
          model: params.model,
          stop_reason: response.stopReason,
          usage: response.usage,
        };
      }),
    },
  };
}

// Usage in tests
import { createMockAnthropicClient } from '../../../tests/helpers/mock-anthropic.js';

describe('LLM Analyzer', () => {
  it('should analyze contract vulnerabilities', async () => {
    const mockClient = createMockAnthropicClient([
      {
        content: JSON.stringify({
          findings: [
            {
              type: 'reentrancy',
              severity: 'critical',
              description: 'AI-detected reentrancy',
            },
          ],
        }),
        stopReason: 'end_turn',
        usage: { inputTokens: 1500, outputTokens: 500 },
      },
    ]);

    // Inject mock
    const analyzer = new LLMAnalyzer(mockClient);
    const result = await analyzer.analyze(contractCode);

    expect(result.findings).toHaveLength(1);
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
  });
});
```

### Pattern 2: Environment-Based Mocking

Automatically mock based on environment variable:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { createMockAnthropicClient } from '../../../tests/helpers/mock-anthropic.js';

function getAnthropicClient() {
  if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
    return createMockAnthropicClient(defaultMockResponses);
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const anthropicClient = getAnthropicClient();
```

### Pattern 3: Fixture-Based Responses

Load responses from fixture files:

```typescript
import llmResponses from './fixtures/llm-responses.json';

export function getMockResponseFor(contractType: string, query: string) {
  return llmResponses.find(
    r => r.contractType === contractType && r.query.includes(query)
  );
}

// Usage
const mockResponse = getMockResponseFor('VulnerableToken', 'reentrancy');
expect(mockResponse).toBeDefined();
```

## Test Fixtures

### Contract Fixtures

Located in `/backend/src/agents/researcher/ai/__tests__/fixtures/contracts/`:

#### VulnerableToken.sol (53 lines)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableToken {
    mapping(address => uint256) public balanceOf;

    // ❌ Reentrancy vulnerability
    function transfer(address _to, uint256 _value) public {
        (bool success, ) = _to.call(""); // External call BEFORE state update
        require(success, "Transfer failed");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
    }

    // ❌ Missing access control
    function mint(address _to, uint256 _amount) public {
        balanceOf[_to] += _amount;
    }
}
```

#### SafeToken.sol (46 lines)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SafeToken {
    mapping(address => uint256) public balanceOf;
    address public owner;
    bool private locked;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // ✅ Secure implementation
    function transfer(address _to, uint256 _value) public nonReentrant {
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
    }

    // ✅ Access control
    function mint(address _to, uint256 _amount) public onlyOwner {
        balanceOf[_to] += _amount;
    }
}
```

### LLM Response Fixtures

Located in `/backend/src/agents/researcher/ai/__tests__/fixtures/llm-responses.json`:

```json
[
  {
    "query": "Analyze this contract for reentrancy vulnerabilities",
    "contractType": "VulnerableToken",
    "response": "I've identified a critical reentrancy vulnerability...",
    "findings": [
      {
        "type": "reentrancy",
        "severity": "critical",
        "location": "transfer function, line 32-34",
        "description": "External call made before state update",
        "recommendation": "Move the external call after state updates",
        "codeSnippet": "(bool success, ) = _to.call(\"\");\nrequire(success);\nbalanceOf[msg.sender] -= _value;"
      }
    ]
  }
]
```

## Running Tests

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ai": "vitest run ai-pipeline",
    "test:unit": "vitest run --dir src/agents/researcher/ai/__tests__",
    "test:integration": "vitest run --dir src/agents/researcher/__tests__/integration",
    "test:watch": "vitest watch",
    "test:coverage": "vitest --coverage",
    "test:ai-real": "AI_ANALYSIS_ENABLED=true MOCK_EXTERNAL_SERVICES=false vitest run --grep '@ai-real'"
  }
}
```

### Running Locally

#### Unit Tests (Fast, No External Deps)

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm test embeddings.test.ts

# Watch mode for development
npm run test:watch
```

#### Integration Tests (Medium, Mocked API, Real DB)

```bash
# Setup test database
createdb thunder_test
DATABASE_URL="postgresql://user:pass@localhost/thunder_test" npm run prisma:migrate

# Run integration tests
npm run test:integration

# Specific integration test
npm test ai-pipeline.ai.test.ts
```

#### E2E Tests with Real API (Slow, Optional)

```bash
# Requires ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=sk-ant-...
export AI_ANALYSIS_ENABLED=true
export MOCK_EXTERNAL_SERVICES=false

# Run tests tagged with @ai-real
npm run test:ai-real
```

### Test Tagging

Tag tests that require real API:

```typescript
// Unit test (default)
describe('Function Parser', () => {
  it('should parse Solidity functions', async () => {
    // Fast, no external deps
  });
});

// Integration test (mocked API)
describe('AI Deep Analysis', () => {
  it('should enhance findings with mocked LLM', async () => {
    // Uses mock responses
  });
});

// E2E test (real API) - Tagged with @ai-real
describe('Real API Integration', () => {
  it.skipIf(process.env.MOCK_EXTERNAL_SERVICES === 'true')(
    'should analyze with real Claude API @ai-real',
    async () => {
      // Calls actual Anthropic API
    },
    { timeout: 60000 } // Longer timeout for real API
  );
});
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: AI Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run test:unit
        env:
          MOCK_EXTERNAL_SERVICES: 'true'

  integration-tests:
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

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm ci
      - run: npm run prisma:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test

      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test
          REDIS_URL: redis://redis:6379
          MOCK_EXTERNAL_SERVICES: 'true'

  # Optional: Real API tests (only on main branch)
  e2e-real-api:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm ci
      - run: npm run test:ai-real
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          AI_ANALYSIS_ENABLED: 'true'
          MOCK_EXTERNAL_SERVICES: 'false'
```

## Debugging Failed Tests

### Enable Debug Logging

```bash
# Enable Vitest debug output
DEBUG=vitest:* npm test

# Enable application debug logs
DEBUG=ai:* npm test

# Combined
DEBUG=* npm test
```

### Capture Request/Response

```typescript
import { vi } from 'vitest';

describe('LLM Analyzer', () => {
  it('should log request and response', async () => {
    const mockCreate = vi.fn(async (params) => {
      console.log('LLM Request:', JSON.stringify(params, null, 2));

      const response = { /* mock response */ };
      console.log('LLM Response:', JSON.stringify(response, null, 2));

      return response;
    });

    // Test with logging mock
    const analyzer = new LLMAnalyzer({ messages: { create: mockCreate } });
    await analyzer.analyze(contractCode);
  });
});
```

### Inspect Fixtures

```bash
# View contract fixture
cat src/agents/researcher/ai/__tests__/fixtures/contracts/VulnerableToken.sol

# View LLM responses
cat src/agents/researcher/ai/__tests__/fixtures/llm-responses.json | jq '.[0]'

# Validate JSON fixtures
npm run lint:fixtures
```

### Common Issues

#### Issue: "ANTHROPIC_API_KEY not set"

```bash
# Ensure mocking is enabled
export MOCK_EXTERNAL_SERVICES=true
npm test

# Or use .env.test
echo "MOCK_EXTERNAL_SERVICES=true" >> .env.test
```

#### Issue: "Database connection failed"

```bash
# Check DATABASE_URL in .env.test
cat .env.test | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Reset test database
dropdb thunder_test && createdb thunder_test
npm run prisma:migrate
```

#### Issue: "Redis connection timeout"

```bash
# Check Redis is running
redis-cli ping

# Use different Redis DB for tests
export REDIS_URL=redis://localhost:6379/1
```

#### Issue: "Test timeout"

```typescript
// Increase timeout for specific test
it('slow AI analysis', async () => {
  // ...
}, { timeout: 60000 }); // 60 seconds

// Or in vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 30000, // Global timeout
  },
});
```

## Test Coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# Target coverage thresholds
npm run test:coverage -- --coverage.threshold.lines=80
```

### Target Coverage

Aim for these coverage targets:

| Component | Lines | Branches | Functions |
|-----------|-------|----------|-----------|
| embeddings.ts | 90% | 80% | 90% |
| knowledge-base.ts | 85% | 75% | 85% |
| function-parser.ts | 90% | 85% | 90% |
| llm-analyzer.ts | 80% | 70% | 80% |
| report-generator.ts | 85% | 75% | 85% |
| ai-deep-analysis.ts | 90% | 85% | 90% |

### Coverage Configuration

In `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/agents/researcher/ai/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

## Best Practices

### 1. Deterministic Tests

```typescript
// ❌ Bad: Non-deterministic
it('should analyze contract', async () => {
  const result = await realLLMAnalyzer.analyze(code);
  expect(result.findings.length).toBeGreaterThan(0); // Could fail
});

// ✅ Good: Deterministic with mocks
it('should analyze contract', async () => {
  const mockAnalyzer = createMockAnalyzer([mockResponse]);
  const result = await mockAnalyzer.analyze(code);
  expect(result.findings).toEqual(expectedFindings); // Predictable
});
```

### 2. Test Both Paths

```typescript
describe('AI Deep Analysis', () => {
  it('should enhance findings when AI enabled', async () => {
    vi.stubEnv('AI_ANALYSIS_ENABLED', 'true');
    const result = await executeAIDeepAnalysisStep(params);
    expect(result.aiEnhanced).toBe(true);
  });

  it('should skip AI when disabled', async () => {
    vi.stubEnv('AI_ANALYSIS_ENABLED', 'false');
    const result = await executeAIDeepAnalysisStep(params);
    expect(result.aiEnhanced).toBe(false);
  });
});
```

### 3. Test Error Handling

```typescript
describe('Error Handling', () => {
  it('should fallback on API error', async () => {
    const mockAnalyzer = createMockAnalyzer([]);
    mockAnalyzer.analyze = vi.fn().mockRejectedValue(
      new Error('API timeout')
    );

    const result = await executeAIDeepAnalysisStep({
      ...params,
      analyzer: mockAnalyzer,
    });

    // Should fallback to Slither findings
    expect(result.aiEnhanced).toBe(false);
    expect(result.findings).toEqual(params.slitherFindings);
  });
});
```

### 4. Isolated Tests

```typescript
// ❌ Bad: Tests depend on each other
let sharedState;

it('test 1', () => {
  sharedState = { findings: [] };
});

it('test 2', () => {
  sharedState.findings.push({ ... }); // Depends on test 1
});

// ✅ Good: Each test independent
describe('AI Analysis', () => {
  beforeEach(() => {
    // Fresh state for each test
    mockAnalyzer = createMockAnalyzer([]);
  });

  it('test 1', () => {
    // Independent
  });

  it('test 2', () => {
    // Independent
  });
});
```

### 5. Meaningful Assertions

```typescript
// ❌ Bad: Vague assertions
expect(result).toBeTruthy();
expect(result.findings.length).toBeGreaterThan(0);

// ✅ Good: Specific assertions
expect(result.aiEnhanced).toBe(true);
expect(result.findings).toHaveLength(3);
expect(result.findings[0]).toMatchObject({
  vulnerabilityType: 'REENTRANCY',
  severity: 'CRITICAL',
  analysisMethod: 'AI',
  aiConfidenceScore: 0.95,
});
```

## Performance Testing

### Measure Processing Time

```typescript
it('should complete analysis within 5 seconds', async () => {
  const start = Date.now();

  await executeAIDeepAnalysisStep(params);

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000);
});
```

### Monitor Token Usage

```typescript
it('should not exceed token budget', async () => {
  const result = await executeAIDeepAnalysisStep(params);

  expect(result.metrics.tokensUsed).toBeLessThan(5000);
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Anthropic API Testing](https://docs.anthropic.com/claude/reference)
- [Test Fixtures](../src/agents/researcher/ai/__tests__/fixtures/)

## Related Documentation

- [AI_ANALYSIS.md](./AI_ANALYSIS.md) - System architecture
- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) - KB management
- [TESTING.md](../TESTING.md) - General testing guide
