import { Severity } from '@prisma/client';
import type { VulnerabilityFinding } from './analyze.js';

export interface AIDeepAnalysisParams {
  clonedPath: string;
  contractPath: string;
  contractName: string;
  slitherFindings: VulnerabilityFinding[];
}

export interface AIAnalysisMetrics {
  totalFindings: number;
  enhancedFindings: number;
  newFindings: number;
  processingTimeMs: number;
  modelUsed: string;
  tokensUsed?: number;
}

export interface AIDeepAnalysisResult {
  findings: VulnerabilityFinding[];
  metrics: AIAnalysisMetrics;
  aiEnhanced: boolean;
}

/**
 * AI_DEEP_ANALYSIS Step - Enhanced vulnerability analysis using Claude AI
 *
 * This step:
 * 1. Takes Slither findings as input
 * 2. Reads contract source code
 * 3. Uses Claude API to perform deep semantic analysis
 * 4. Enhances existing findings with better descriptions
 * 5. Discovers new vulnerabilities missed by static analysis
 * 6. Returns enhanced vulnerability findings
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
