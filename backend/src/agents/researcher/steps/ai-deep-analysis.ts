import { Severity } from '@prisma/client';
import type { VulnerabilityFinding } from './analyze.js';
import { getKimiClient, KimiLLMClient } from '../../../lib/llm.js';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    console.log('[AI Deep Analysis] Starting AI-powered analysis...');

    // Step 1: Read contract source code
    const contractFullPath = join(clonedPath, contractPath);
    let contractSource: string;

    try {
      contractSource = readFileSync(contractFullPath, 'utf-8');
      console.log(`[AI Deep Analysis] Read contract source (${contractSource.length} chars)`);
    } catch (readError) {
      console.error('[AI Deep Analysis] Failed to read contract source:', readError);
      throw new Error(`Cannot read contract file: ${contractPath}`);
    }

    // Step 2: Initialize Kimi LLM client
    const kimiClient = getKimiClient();

    // Step 3: Enhance existing Slither findings with AI insights
    const enhancedFindings: VulnerabilityFinding[] = [];
    let enhancedCount = 0;

    if (slitherFindings.length > 0) {
      console.log(`[AI Deep Analysis] Enhancing ${slitherFindings.length} Slither findings...`);

      for (const finding of slitherFindings) {
        try {
          const enhanced = await enhanceFindingWithAI(
            kimiClient,
            finding,
            contractSource,
            contractName
          );
          enhancedFindings.push(enhanced);
          enhancedCount++;
        } catch (enhanceError) {
          console.warn(
            `[AI Deep Analysis] Failed to enhance finding, using original:`,
            enhanceError
          );
          enhancedFindings.push(finding);
        }
      }
    }

    // Step 4: Discover new vulnerabilities using AI
    console.log('[AI Deep Analysis] Searching for new vulnerabilities with AI...');
    const newFindings = await discoverNewVulnerabilities(
      kimiClient,
      contractSource,
      contractName,
      contractPath,
      slitherFindings
    );

    // Combine enhanced and new findings
    const allFindings = [...enhancedFindings, ...newFindings];

    const processingTime = Date.now() - startTime;

    console.log('[AI Deep Analysis] AI analysis complete:');
    console.log(`  - Enhanced findings: ${enhancedCount}`);
    console.log(`  - New findings: ${newFindings.length}`);
    console.log(`  - Total findings: ${allFindings.length}`);
    console.log(`  - Processing time: ${processingTime}ms`);

    return {
      findings: allFindings,
      metrics: {
        totalFindings: allFindings.length,
        enhancedFindings: enhancedCount,
        newFindings: newFindings.length,
        processingTimeMs: processingTime,
        modelUsed: 'moonshotai/kimi-k2.5',
      },
      aiEnhanced: true,
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

/**
 * Enhance a single Slither finding with AI-powered insights
 */
async function enhanceFindingWithAI(
  kimiClient: KimiLLMClient,
  finding: VulnerabilityFinding,
  contractSource: string,
  contractName: string
): Promise<VulnerabilityFinding> {
  const systemPrompt = `You are an expert Solidity security auditor. Your task is to enhance static analysis findings with deeper insights, better descriptions, and actionable remediation suggestions.

Analyze the finding objectively and provide:
1. Enhanced description with context
2. Severity assessment (CRITICAL/HIGH/MEDIUM/LOW)
3. Confidence score (0-100)
4. Specific remediation steps`;

  const userPrompt = `Enhance this security finding from static analysis:

**Contract**: ${contractName}
**Vulnerability Type**: ${finding.vulnerabilityType}
**Current Description**: ${finding.description}
**Location**: Line ${finding.lineNumber || 'unknown'}, Function: ${finding.functionSelector || 'N/A'}

**Contract Code (excerpt)**:
\`\`\`solidity
${contractSource.slice(0, 5000)}${contractSource.length > 5000 ? '\n... (truncated)' : ''}
\`\`\`

**Instructions**:
1. Provide a clearer, more detailed description of the vulnerability
2. Assess the severity (CRITICAL/HIGH/MEDIUM/LOW)
3. Rate confidence in this finding (0-100)
4. Suggest specific remediation steps

**Response Format (JSON)**:
{
  "description": "Enhanced description...",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "confidence": 85,
  "remediation": "Specific steps to fix..."
}

Respond with ONLY the JSON object.`;

  try {
    const response = await kimiClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.3, // Low temperature for consistency
      2000, // Moderate token limit
      false // Disable thinking mode for structured output
    );

    // Parse JSON response - extract from code blocks or plain text
    let enhancement: { description?: string; severity?: string; confidence?: number; remediation?: string };

    // Try to extract from JSON code block
    const codeBlockMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      enhancement = JSON.parse(codeBlockMatch[1]);
    } else {
      // Try to find standalone JSON object
      const jsonMatch = response.content.match(/\{[^{]*"description"[^}]*\}/);
      if (jsonMatch) {
        enhancement = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    // Return enhanced finding
    return {
      ...finding,
      description: enhancement.description || finding.description,
      severity: mapSeverity(enhancement.severity) || finding.severity,
      confidenceScore: enhancement.confidence || finding.confidenceScore,
    };
  } catch (error) {
    console.warn('[AI Deep Analysis] Enhancement failed, using original finding');
    return finding;
  }
}

/**
 * Discover new vulnerabilities using AI analysis
 */
async function discoverNewVulnerabilities(
  kimiClient: KimiLLMClient,
  contractSource: string,
  contractName: string,
  contractPath: string,
  existingFindings: VulnerabilityFinding[]
): Promise<VulnerabilityFinding[]> {
  const systemPrompt = `You are an expert Solidity security auditor specializing in finding vulnerabilities that automated tools miss.

Focus on:
- Business logic flaws
- Access control issues
- Integer overflow/underflow
- Reentrancy patterns
- Front-running vulnerabilities
- Oracle manipulation
- Flash loan attacks
- Gas optimization issues that could be exploited

Be thorough but only report HIGH confidence findings.`;

  const existingTypes = existingFindings.map((f) => f.vulnerabilityType).join(', ');

  const userPrompt = `Analyze this Solidity smart contract for security vulnerabilities:

**Contract**: ${contractName}
**Already Found**: ${existingTypes || 'None'}

**Contract Source**:
\`\`\`solidity
${contractSource.slice(0, 8000)}${contractSource.length > 8000 ? '\n... (truncated)' : ''}
\`\`\`

**Instructions**:
1. Identify NEW vulnerabilities not already found
2. Focus on high-severity issues
3. Only report findings with HIGH confidence (>70)
4. Provide specific line numbers if possible

**Response Format (JSON Array)**:
[
  {
    "vulnerabilityType": "REENTRANCY|ACCESS_CONTROL|INTEGER_OVERFLOW|etc",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "description": "Detailed description...",
    "lineNumber": 42,
    "confidence": 85,
    "remediation": "How to fix..."
  }
]

If no new vulnerabilities found, return empty array: []

Respond with ONLY the JSON array.`;

  try {
    const response = await kimiClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.4, // Slightly higher temperature for discovery
      8000, // Higher token limit for analysis
      false // Disable thinking mode for structured output
    );

    // Extract JSON array from response
    let newVulns: Array<{ vulnerabilityType?: string; severity?: string; description?: string; lineNumber?: number; confidence?: number; remediation?: string }>;

    // Try to extract from JSON code block
    const codeBlockMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      newVulns = JSON.parse(codeBlockMatch[1]);
    } else {
      // Try to find standalone JSON array
      const arrayMatch = response.content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        newVulns = JSON.parse(arrayMatch[0]);
      } else {
        // Check for empty array
        if (response.content.includes('[]')) {
          console.log('[AI Deep Analysis] No new vulnerabilities found by AI');
          return [];
        }
        throw new Error('No valid JSON array found in response');
      }
    }

    // Convert to VulnerabilityFinding format
    const newFindings: VulnerabilityFinding[] = newVulns
      .filter((v) => (v.confidence ?? 0) >= 70) // Only high confidence
      .map((v) => ({
        vulnerabilityType: v.vulnerabilityType || 'UNKNOWN',
        severity: mapSeverity(v.severity) || Severity.MEDIUM,
        filePath: contractPath,
        lineNumber: v.lineNumber,
        functionSelector: undefined,
        description: `[AI-Discovered] ${v.description || 'No description'}${
          v.remediation ? `\n\nRemediation: ${v.remediation}` : ''
        }`,
        confidenceScore: v.confidence || 70,
      }));

    console.log(`[AI Deep Analysis] AI discovered ${newFindings.length} new vulnerabilities`);
    return newFindings;
  } catch (error) {
    console.error('[AI Deep Analysis] New vulnerability discovery failed:', error);
    return [];
  }
}

/**
 * Map severity string to Prisma Severity enum
 */
function mapSeverity(severityStr: string): Severity {
  const normalized = severityStr?.toUpperCase();
  switch (normalized) {
    case 'CRITICAL':
      return Severity.CRITICAL;
    case 'HIGH':
      return Severity.HIGH;
    case 'MEDIUM':
      return Severity.MEDIUM;
    case 'LOW':
      return Severity.LOW;
    default:
      return Severity.MEDIUM;
  }
}
