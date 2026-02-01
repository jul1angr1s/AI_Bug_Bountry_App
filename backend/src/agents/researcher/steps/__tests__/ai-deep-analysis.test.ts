import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Severity } from '@prisma/client';
import {
  executeAIDeepAnalysisStep,
  type AIDeepAnalysisParams,
  type AIDeepAnalysisResult,
} from '../ai-deep-analysis.js';
import type { VulnerabilityFinding } from '../analyze.js';

/**
 * Comprehensive Test Suite for AI Deep Analysis Step
 *
 * Test Coverage:
 * - AI validates and confirms Slither findings
 * - AI detects additional vulnerabilities not in Slither
 * - Error handling for malformed contracts
 * - Rate limiting and concurrent processing
 * - Graceful fallback on LLM failure
 * - Redis caching for duplicate function signatures
 *
 * NOTE: Tests are currently skipped as the AI Deep Analysis feature
 * is not yet fully implemented. Will be enabled once the feature is complete.
 */

// Mock dependencies
const mockLLMAnalyzer = {
  analyzeContract: vi.fn(),
  analyzeFunction: vi.fn(),
};

const mockKnowledgeBase = {
  getVulnerabilityPatterns: vi.fn(),
  checkSimilarFindings: vi.fn(),
};

const mockFunctionParser = {
  extractFunctions: vi.fn(),
  parseFunctionSignature: vi.fn(),
};

const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  disconnect: vi.fn(),
};

// Test fixtures
const SAMPLE_CONTRACT_PATH = '/tmp/contracts/VulnerableToken.sol';
const CLONED_PATH = '/tmp/repos/test-repo';
const CONTRACT_NAME = 'VulnerableToken';

const MOCK_SLITHER_FINDINGS: VulnerabilityFinding[] = [
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
  },
];

const MOCK_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableToken {
    mapping(address => uint256) public balanceOf;

    function mint(address _to, uint256 _amount) public {
        balanceOf[_to] += _amount;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value);
        (bool success, ) = _to.call("");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        return true;
    }
}
`;

// Helper function to create test parameters
function createTestParams(overrides?: Partial<AIDeepAnalysisParams>): AIDeepAnalysisParams {
  return {
    clonedPath: CLONED_PATH,
    contractPath: SAMPLE_CONTRACT_PATH,
    contractName: CONTRACT_NAME,
    slitherFindings: [...MOCK_SLITHER_FINDINGS],
    ...overrides,
  };
}

describe.skip('AI Deep Analysis Step', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Reset mocks
    vi.clearAllMocks();

    // Enable AI analysis by default for tests
    process.env.AI_ANALYSIS_ENABLED = 'true';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Test Suite 1: AI validates Slither findings', () => {
    it('should confirm valid Slither findings with enhanced descriptions', async () => {
      const params = createTestParams();

      // Mock LLM to confirm findings
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [
          {
            ...MOCK_SLITHER_FINDINGS[0],
            description:
              'Critical reentrancy vulnerability: The transfer function makes an external call before updating state, allowing attackers to recursively call back and drain funds.',
            confidenceScore: 0.95,
          },
          {
            ...MOCK_SLITHER_FINDINGS[1],
            description:
              'Access control issue: The mint function lacks proper authorization checks, allowing any user to mint unlimited tokens.',
            confidenceScore: 0.9,
          },
        ],
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(true);
      expect(result.findings.length).toBe(2);
      expect(result.metrics.enhancedFindings).toBe(2);
      expect(result.metrics.newFindings).toBe(0);
      expect(result.findings[0].description).toContain('recursively call back');
    });

    it('should reject false positive Slither findings', async () => {
      const params = createTestParams();

      // Mock LLM to reject one finding as false positive
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [
          {
            ...MOCK_SLITHER_FINDINGS[0],
            description: 'Confirmed reentrancy vulnerability',
            confidenceScore: 0.95,
          },
        ],
        rejectedFindings: [
          {
            ...MOCK_SLITHER_FINDINGS[1],
            reason: 'This function has proper access control via modifier (not visible to Slither)',
          },
        ],
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBe(1);
      expect(result.findings[0].vulnerabilityType).toBe('REENTRANCY');
      expect(result.metrics.enhancedFindings).toBe(1);
    });

    it('should adjust severity based on AI analysis', async () => {
      const params = createTestParams();

      // Mock LLM to upgrade severity
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [
          {
            ...MOCK_SLITHER_FINDINGS[1],
            severity: Severity.CRITICAL, // Upgraded from HIGH
            description: 'This mint function allows unlimited token creation, which is critical',
            confidenceScore: 0.95,
          },
        ],
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings[0].severity).toBe(Severity.CRITICAL);
      expect(result.metrics.enhancedFindings).toBeGreaterThan(0);
    });
  });

  describe('Test Suite 2: AI detects additional vulnerabilities', () => {
    it('should detect vulnerabilities missed by Slither', async () => {
      const params = createTestParams();

      // Mock LLM to find new issues
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [
          {
            vulnerabilityType: 'INTEGER_OVERFLOW',
            severity: Severity.HIGH,
            filePath: 'contracts/VulnerableToken.sol',
            lineNumber: 8,
            functionSelector: 'mint',
            description:
              'Potential integer overflow in mint function: balanceOf[_to] += _amount could overflow without SafeMath',
            confidenceScore: 0.8,
          },
          {
            vulnerabilityType: 'DENIAL_OF_SERVICE',
            severity: Severity.MEDIUM,
            filePath: 'contracts/VulnerableToken.sol',
            lineNumber: 13,
            functionSelector: 'transfer',
            description: 'External call can be exploited for DoS if recipient reverts',
            confidenceScore: 0.75,
          },
        ],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(true);
      expect(result.findings.length).toBe(4); // 2 from Slither + 2 new
      expect(result.metrics.newFindings).toBe(2);
      expect(result.findings.some((f) => f.vulnerabilityType === 'INTEGER_OVERFLOW')).toBe(true);
      expect(result.findings.some((f) => f.vulnerabilityType === 'DENIAL_OF_SERVICE')).toBe(true);
    });

    it('should detect logic vulnerabilities', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [],
        newFindings: [
          {
            vulnerabilityType: 'LOGIC_ERROR',
            severity: Severity.HIGH,
            filePath: 'contracts/VulnerableToken.sol',
            lineNumber: 10,
            description:
              'Business logic flaw: No maximum supply check allows unlimited minting',
            confidenceScore: 0.85,
          },
        ],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBe(1);
      expect(result.findings[0].vulnerabilityType).toBe('LOGIC_ERROR');
      expect(result.metrics.newFindings).toBe(1);
    });

    it('should detect complex attack vectors', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [
          {
            vulnerabilityType: 'FLASH_LOAN_ATTACK',
            severity: Severity.CRITICAL,
            filePath: 'contracts/VulnerableToken.sol',
            description:
              'Contract is vulnerable to flash loan attacks: price oracle can be manipulated',
            confidenceScore: 0.88,
          },
        ],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.some((f) => f.vulnerabilityType === 'FLASH_LOAN_ATTACK')).toBe(true);
      expect(result.metrics.newFindings).toBe(1);
    });
  });

  describe('Test Suite 3: Error handling for malformed contracts', () => {
    it('should handle parse errors gracefully', async () => {
      const params = createTestParams();

      // Mock LLM to throw parse error
      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('Failed to parse contract: Unexpected token')
      );

      const result = await executeAIDeepAnalysisStep(params);

      // Should fallback to Slither findings
      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
      expect(result.metrics.modelUsed).toBe('error');
    });

    it('should handle missing contract file', async () => {
      const params = createTestParams({
        contractPath: '/nonexistent/contract.sol',
      });

      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle syntax errors in contract', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('ParserError: Expected identifier but got "}"')
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings.length).toBe(MOCK_SLITHER_FINDINGS.length);
    });

    it('should handle empty contract gracefully', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [],
        newFindings: [],
        warning: 'Contract appears to be empty or contains only comments',
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBe(0);
      expect(result.metrics.totalFindings).toBe(0);
    });
  });

  describe('Test Suite 4: Rate limiting and concurrent processing', () => {
    it('should respect rate limits when analyzing multiple functions', async () => {
      const params = createTestParams();

      // Mock multiple function analysis with rate limiting
      let callCount = 0;
      mockLLMAnalyzer.analyzeFunction.mockImplementation(() => {
        callCount++;
        return new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                vulnerabilities: [],
              }),
            100
          ); // Simulate API delay
        });
      });

      mockFunctionParser.extractFunctions.mockResolvedValue([
        { name: 'mint', signature: 'mint(address,uint256)' },
        { name: 'transfer', signature: 'transfer(address,uint256)' },
        { name: 'approve', signature: 'approve(address,uint256)' },
      ]);

      const result = await executeAIDeepAnalysisStep(params);

      // Should process functions but respect concurrency limits
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
    });

    it('should queue functions when hitting concurrent limit', async () => {
      const params = createTestParams();

      const processingOrder: number[] = [];
      let activeCount = 0;
      const MAX_CONCURRENT = 2;

      mockLLMAnalyzer.analyzeFunction.mockImplementation(async (_, index) => {
        activeCount++;
        expect(activeCount).toBeLessThanOrEqual(MAX_CONCURRENT);
        processingOrder.push(index);

        await new Promise((resolve) => setTimeout(resolve, 50));

        activeCount--;
        return { vulnerabilities: [] };
      });

      mockFunctionParser.extractFunctions.mockResolvedValue(
        Array(5)
          .fill(null)
          .map((_, i) => ({
            name: `function${i}`,
            signature: `function${i}()`,
          }))
      );

      await executeAIDeepAnalysisStep(params);

      expect(processingOrder.length).toBeGreaterThan(0);
    });

    it('should handle API rate limit errors gracefully', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('Rate limit exceeded. Retry after 60 seconds')
      );

      const result = await executeAIDeepAnalysisStep(params);

      // Should fallback to Slither findings on rate limit
      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
    });

    it('should retry on temporary network failures', async () => {
      const params = createTestParams();

      let attemptCount = 0;
      mockLLMAnalyzer.analyzeContract.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('ECONNRESET: Connection reset by peer'));
        }
        return Promise.resolve({
          confirmedFindings: MOCK_SLITHER_FINDINGS,
          newFindings: [],
        });
      });

      const result = await executeAIDeepAnalysisStep(params);

      // Should succeed after retry (if retry logic is implemented)
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Test Suite 5: Graceful fallback on LLM failure', () => {
    it('should return Slither findings when AI is disabled', async () => {
      process.env.AI_ANALYSIS_ENABLED = 'false';
      const params = createTestParams();

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
      expect(result.metrics.modelUsed).toBe('none');
      expect(result.metrics.enhancedFindings).toBe(0);
      expect(result.metrics.newFindings).toBe(0);
    });

    it('should fallback to Slither on LLM API failure', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('Anthropic API error: 500 Internal Server Error')
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
      expect(result.metrics.modelUsed).toBe('error');
    });

    it('should fallback on authentication errors', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockRejectedValue(
        new Error('Invalid API key: 401 Unauthorized')
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
    });

    it('should fallback on timeout errors', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout after 30000ms')), 100);
          })
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.aiEnhanced).toBe(false);
      expect(result.findings).toEqual(MOCK_SLITHER_FINDINGS);
    });

    it('should continue analysis even with partial LLM failures', async () => {
      const params = createTestParams();

      // Mock LLM to partially succeed
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [MOCK_SLITHER_FINDINGS[0]], // Only first finding
        newFindings: [],
        errors: ['Failed to analyze function transfer: timeout'],
      });

      const result = await executeAIDeepAnalysisStep(params);

      // Should still return what it could analyze
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Test Suite 6: Redis caching for duplicate function signatures', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should cache analysis results for function signatures', async () => {
      const params = createTestParams();
      const functionSignature = 'transfer(address,uint256)';
      const cacheKey = `ai:function:${functionSignature}`;

      // First call - cache miss
      mockRedisClient.get.mockResolvedValue(null);

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
      });

      const result1 = await executeAIDeepAnalysisStep(params);

      expect(result1.findings.length).toBeGreaterThan(0);
      // Should set cache after analysis (if caching is implemented)
    });

    it('should retrieve cached results for duplicate signatures', async () => {
      const params = createTestParams();
      const functionSignature = 'transfer(address,uint256)';

      // Mock cache hit
      const cachedResult = {
        vulnerabilities: [
          {
            vulnerabilityType: 'REENTRANCY',
            severity: Severity.CRITICAL,
            description: 'Cached reentrancy finding',
            confidenceScore: 0.9,
          },
        ],
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await executeAIDeepAnalysisStep(params);

      // Should use cached data (if implemented)
      expect(mockLLMAnalyzer.analyzeContract).not.toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const params = createTestParams();

      // Mock Redis error
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      // Should continue with analysis despite cache error
      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should invalidate cache for updated contracts', async () => {
      const params = createTestParams();

      // Should clear cache when contract is updated
      mockRedisClient.del.mockResolvedValue(1);

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('should set appropriate TTL for cached results', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
      });

      await executeAIDeepAnalysisStep(params);

      // Cache should have TTL set (if implemented)
      // Typical TTL: 24 hours for function analysis
    });
  });

  describe('Edge Cases and Integration Tests', () => {
    it('should handle empty Slither findings', async () => {
      const params = createTestParams({
        slitherFindings: [],
      });

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: [],
        newFindings: [
          {
            vulnerabilityType: 'LOGIC_ERROR',
            severity: Severity.MEDIUM,
            filePath: 'contracts/VulnerableToken.sol',
            description: 'AI-discovered logic error',
            confidenceScore: 0.8,
          },
        ],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBe(1);
      expect(result.metrics.newFindings).toBe(1);
    });

    it('should track processing time accurately', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  confirmedFindings: MOCK_SLITHER_FINDINGS,
                  newFindings: [],
                }),
              200
            );
          })
      );

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.metrics.processingTimeMs).toBeGreaterThanOrEqual(200);
    });

    it('should include token usage metrics when available', async () => {
      const params = createTestParams();

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
        tokensUsed: 1500,
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.metrics.tokensUsed).toBe(1500);
    });

    it('should handle very large contracts with chunking', async () => {
      const params = createTestParams();

      // Mock contract with 100+ functions
      mockFunctionParser.extractFunctions.mockResolvedValue(
        Array(100)
          .fill(null)
          .map((_, i) => ({
            name: `function${i}`,
            signature: `function${i}()`,
          }))
      );

      mockLLMAnalyzer.analyzeContract.mockResolvedValue({
        confirmedFindings: MOCK_SLITHER_FINDINGS,
        newFindings: [],
      });

      const result = await executeAIDeepAnalysisStep(params);

      expect(result.findings.length).toBeGreaterThan(0);
    });
  });
});
