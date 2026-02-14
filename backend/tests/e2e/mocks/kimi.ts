/**
 * Kimi API Mock for E2E Tests
 *
 * Mocks LLM API responses for:
 * - Vulnerability analysis
 * - Proof validation
 * - API errors and timeouts
 */

import { vi } from 'vitest';
import type { KimiLLMClient } from '../../../src/lib/llm.js';

/**
 * Mock vulnerability analysis response
 */
export function createMockVulnerabilityAnalysis(
  vulnerabilityType: string,
  isValid: boolean = true,
  confidence: number = 95
): {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  severity?: string;
  exploitability?: string;
} {
  return {
    isValid,
    confidence,
    reasoning: `The provided proof demonstrates a valid ${vulnerabilityType} vulnerability. The exploit code correctly identifies and exploits the vulnerability by leveraging the contract's state management flaw. The attack vector is realistic and the impact is significant.`,
    severity: isValid ? 'HIGH' : 'LOW',
    exploitability: isValid ? 'Easy' : 'Hard',
  };
}

/**
 * Mock proof validation response (VALIDATED)
 */
export function createValidatedProofResponse(vulnerabilityType: string = 'Reentrancy'): {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  severity: string;
  exploitability: string;
} {
  return {
    isValid: true,
    confidence: 95,
    reasoning: `After thorough analysis, this proof demonstrates a valid ${vulnerabilityType} vulnerability. The exploit code:

1. **Correctly identifies the vulnerability**: The target contract has a state update after external call pattern, which is the classic ${vulnerabilityType} vulnerability.

2. **Demonstrates exploitability**: The proof of concept shows how an attacker can re-enter the contract during execution to drain funds or manipulate state.

3. **Realistic attack vector**: The attack can be executed by any malicious contract interacting with the vulnerable function.

4. **Significant impact**: Successful exploitation could lead to complete drainage of contract funds or critical state corruption.

The proof is technically sound and demonstrates deep understanding of the vulnerability.`,
    severity: 'HIGH',
    exploitability: 'Easy',
  };
}

/**
 * Mock proof validation response (REJECTED)
 */
export function createRejectedProofResponse(reason: string = 'Invalid proof'): {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  severity: string;
  exploitability: string;
} {
  return {
    isValid: false,
    confidence: 20,
    reasoning: `The proof does not demonstrate a valid vulnerability. ${reason}. The exploit code fails to show a realistic attack vector or does not properly exploit the claimed vulnerability.`,
    severity: 'LOW',
    exploitability: 'Hard',
  };
}

/**
 * Mock LLM chat response
 */
export function createMockChatResponse(
  content: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number } = {
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
  }
): {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} {
  return {
    content,
    usage,
  };
}

/**
 * Setup Kimi API mocks for successful validation
 */
export function setupKimiMocksForValidation(
  kimiClient: KimiLLMClient,
  vulnerabilityType: string = 'Reentrancy'
): void {
  console.log('[E2E Mocks] Setting up Kimi API mocks for successful validation...');

  // Mock the analyzeProof method to return validated response
  vi.spyOn(kimiClient, 'analyzeProof').mockResolvedValue(
    createValidatedProofResponse(vulnerabilityType)
  );

  // Mock the chat method if needed
  vi.spyOn(kimiClient, 'chat').mockResolvedValue(
    createMockChatResponse(
      JSON.stringify(createValidatedProofResponse(vulnerabilityType))
    )
  );

  console.log('[E2E Mocks] Kimi API mocks configured for validation');
}

/**
 * Setup Kimi API mocks for rejection
 */
export function setupKimiMocksForRejection(
  kimiClient: KimiLLMClient,
  reason: string = 'Invalid proof'
): void {
  console.log('[E2E Mocks] Setting up Kimi API mocks for rejection...');

  // Mock the analyzeProof method to return rejected response
  vi.spyOn(kimiClient, 'analyzeProof').mockResolvedValue(
    createRejectedProofResponse(reason)
  );

  // Mock the chat method if needed
  vi.spyOn(kimiClient, 'chat').mockResolvedValue(
    createMockChatResponse(JSON.stringify(createRejectedProofResponse(reason)))
  );

  console.log('[E2E Mocks] Kimi API mocks configured for rejection');
}

/**
 * Setup Kimi API mocks for timeout/error
 */
export function setupKimiMocksForError(
  kimiClient: KimiLLMClient,
  errorMessage: string = 'API timeout'
): void {
  console.log('[E2E Mocks] Setting up Kimi API mocks for error...');

  // Mock the analyzeProof method to throw error
  vi.spyOn(kimiClient, 'analyzeProof').mockRejectedValue(new Error(errorMessage));

  // Mock the chat method to throw error
  vi.spyOn(kimiClient, 'chat').mockRejectedValue(new Error(errorMessage));

  console.log('[E2E Mocks] Kimi API mocks configured for error');
}

/**
 * Setup Kimi API mocks for health check
 */
export function setupKimiMocksForHealthCheck(
  kimiClient: KimiLLMClient,
  isHealthy: boolean = true
): void {
  console.log('[E2E Mocks] Setting up Kimi API mocks for health check...');

  // Mock the healthCheck method
  vi.spyOn(kimiClient, 'healthCheck').mockResolvedValue(isHealthy);

  console.log(`[E2E Mocks] Kimi API health check mocked: ${isHealthy}`);
}

/**
 * Create mock LLM client for testing (without actual API calls)
 */
export function createMockKimiClient(): Partial<KimiLLMClient> {
  return {
    chat: vi.fn().mockResolvedValue(
      createMockChatResponse(JSON.stringify(createValidatedProofResponse()))
    ),

    analyzeProof: vi.fn().mockResolvedValue(createValidatedProofResponse()),

    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Mock response for deep code analysis
 */
export function createMockDeepAnalysisResponse(
  findings: Array<{
    type: string;
    severity: string;
    confidence: number;
    description: string;
  }> = [
    {
      type: 'Reentrancy',
      severity: 'HIGH',
      confidence: 0.95,
      description: 'Reentrancy vulnerability in withdraw function',
    },
  ]
): {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} {
  const analysisContent = `# Deep Vulnerability Analysis

## Findings Summary

${findings
  .map(
    (f, i) => `
### ${i + 1}. ${f.type} (${f.severity})
- **Confidence**: ${Math.round(f.confidence * 100)}%
- **Description**: ${f.description}
`
  )
  .join('\n')}

## Analysis Details

The code analysis reveals ${findings.length} potential vulnerability/vulnerabilities. Each finding has been validated through static analysis and pattern matching against known vulnerability types.
`;

  return createMockChatResponse(analysisContent);
}

/**
 * Restore all Kimi API mocks
 */
export function restoreKimiMocks(): void {
  vi.restoreAllMocks();
}

/**
 * Mock LLM response for specific vulnerability types
 */
export const MOCK_VULNERABILITY_RESPONSES: Record<
  string,
  {
    isValid: boolean;
    confidence: number;
    reasoning: string;
    severity: string;
    exploitability: string;
  }
> = {
  Reentrancy: createValidatedProofResponse('Reentrancy'),
  IntegerOverflow: createValidatedProofResponse('Integer Overflow'),
  AccessControl: createValidatedProofResponse('Access Control'),
  Delegation: createValidatedProofResponse('Delegation'),
  UncheckedReturn: createValidatedProofResponse('Unchecked Return Value'),
  FrontRunning: createValidatedProofResponse('Front-Running'),
  TimestampDependence: createValidatedProofResponse('Timestamp Dependence'),
  Invalid: createRejectedProofResponse('The proof does not demonstrate a real vulnerability'),
};
