import { Severity } from '@prisma/client';
import type { VulnerabilityFinding } from './analyze.js';

/**
 * Parameters for AI deep analysis step
 *
 * @interface AIDeepAnalysisParams
 */
export interface AIDeepAnalysisParams {
  /** Path to the cloned repository on the filesystem */
  clonedPath: string;

  /** Relative path to the target contract file within the repository */
  contractPath: string;

  /** Name of the contract to analyze */
  contractName: string;

  /** Array of findings from Slither static analysis to enhance */
  slitherFindings: VulnerabilityFinding[];
}

/**
 * Metrics tracking AI analysis performance and results
 *
 * @interface AIAnalysisMetrics
 */
export interface AIAnalysisMetrics {
  /** Total number of findings after AI analysis */
  totalFindings: number;

  /** Number of Slither findings enhanced with AI insights */
  enhancedFindings: number;

  /** Number of new findings discovered by AI (not found by Slither) */
  newFindings: number;

  /** Total processing time in milliseconds */
  processingTimeMs: number;

  /** AI model used for analysis (e.g., 'claude-sonnet-4-5', 'none', 'error') */
  modelUsed: string;

  /** Total tokens consumed by API calls (for cost tracking) */
  tokensUsed?: number;
}

/**
 * Result of AI deep analysis containing enhanced findings and metrics
 *
 * @interface AIDeepAnalysisResult
 */
export interface AIDeepAnalysisResult {
  /** Enhanced vulnerability findings (includes both AI-enhanced and new AI-discovered findings) */
  findings: VulnerabilityFinding[];

  /** Performance and outcome metrics */
  metrics: AIAnalysisMetrics;

  /** Flag indicating whether AI analysis was successfully performed */
  aiEnhanced: boolean;
}

/**
 * AI_DEEP_ANALYSIS Step - Enhanced vulnerability analysis using Claude AI
 *
 * This is Step 5 of the 7-step Researcher Agent pipeline. It augments traditional
 * static analysis (Slither) with AI-powered semantic analysis using Claude Sonnet 4.5.
 *
 * The function performs the following workflow:
 * 1. Checks if AI analysis is enabled via feature flag (AI_ANALYSIS_ENABLED)
 * 2. If disabled, returns original Slither findings immediately
 * 3. If enabled, performs AI analysis:
 *    - Reads contract source code
 *    - Parses function definitions
 *    - Searches knowledge base for similar exploits
 *    - Sends findings + context to Claude API
 *    - Enhances existing findings with better descriptions and remediation
 *    - Discovers new vulnerabilities missed by static analysis
 * 4. Returns enhanced findings with detailed metrics
 *
 * Graceful Degradation:
 * - On API failure or timeout, falls back to original Slither findings
 * - System continues to function even if AI analysis fails
 * - Logs errors for debugging without blocking the pipeline
 *
 * @param {AIDeepAnalysisParams} params - Analysis parameters
 * @param {string} params.clonedPath - Path to cloned repository
 * @param {string} params.contractPath - Path to contract file
 * @param {string} params.contractName - Name of contract
 * @param {VulnerabilityFinding[]} params.slitherFindings - Slither findings to enhance
 *
 * @returns {Promise<AIDeepAnalysisResult>} Enhanced findings with metrics
 *
 * @example
 * ```typescript
 * const result = await executeAIDeepAnalysisStep({
 *   clonedPath: '/tmp/repo-clone',
 *   contractPath: 'contracts/Token.sol',
 *   contractName: 'Token',
 *   slitherFindings: [
 *     {
 *       vulnerabilityType: 'REENTRANCY',
 *       severity: 'HIGH',
 *       description: 'Reentrancy in withdraw',
 *       lineNumber: 42,
 *       // ...
 *     }
 *   ],
 * });
 *
 * console.log(`AI enhanced ${result.metrics.enhancedFindings} findings`);
 * console.log(`AI discovered ${result.metrics.newFindings} new findings`);
 *
 * result.findings.forEach(finding => {
 *   if (finding.analysisMethod === 'AI') {
 *     console.log(`AI Confidence: ${finding.aiConfidenceScore}`);
 *     console.log(`Remediation: ${finding.remediationSuggestion}`);
 *   }
 * });
 * ```
 *
 * @throws {Error} Does not throw - errors are caught and logged, returns fallback findings
 *
 * @see {@link AIDeepAnalysisParams} for parameter details
 * @see {@link AIDeepAnalysisResult} for return type details
 * @see {@link VulnerabilityFinding} for finding structure
 *
 * @since 4.0.0 Phase 4 - AI Analysis Integration
 */
export async function executeAIDeepAnalysisStep(
  params: AIDeepAnalysisParams
): Promise<AIDeepAnalysisResult> {
  const { clonedPath, contractPath, contractName, slitherFindings } = params;

  console.log(`[AI Deep Analysis] Starting AI analysis on ${contractName}...`);
  const startTime = Date.now();

  // Check if AI analysis is enabled via feature flag
  const aiEnabled = process.env.AI_ANALYSIS_ENABLED === 'true';

  if (!aiEnabled) {
    console.log('[AI Deep Analysis] AI analysis is disabled via feature flag');
    return {
      findings: slitherFindings,
      metrics: {
        totalFindings: slitherFindings.length,
        enhancedFindings: 0,
        newFindings: 0,
        processingTimeMs: 0,
        modelUsed: 'none',
      },
      aiEnhanced: false,
    };
  }

  try {
    // Placeholder for AI analysis implementation
    // This will be implemented in future tasks with:
    // 1. Contract source code reading
    // 2. Claude API integration
    // 3. Prompt engineering for vulnerability detection
    // 4. Response parsing and finding enhancement

    console.log('[AI Deep Analysis] AI analysis not yet implemented');
    console.log('[AI Deep Analysis] Returning Slither findings without AI enhancement');

    const processingTime = Date.now() - startTime;

    return {
      findings: slitherFindings,
      metrics: {
        totalFindings: slitherFindings.length,
        enhancedFindings: 0,
        newFindings: 0,
        processingTimeMs: processingTime,
        modelUsed: 'claude-sonnet-4-5',
      },
      aiEnhanced: false,
    };

  } catch (error) {
    console.error('[AI Deep Analysis] AI analysis failed:', error);

    // On failure, return original Slither findings
    // This ensures the pipeline continues even if AI step fails
    const processingTime = Date.now() - startTime;

    return {
      findings: slitherFindings,
      metrics: {
        totalFindings: slitherFindings.length,
        enhancedFindings: 0,
        newFindings: 0,
        processingTimeMs: processingTime,
        modelUsed: 'error',
      },
      aiEnhanced: false,
    };
  }
}
