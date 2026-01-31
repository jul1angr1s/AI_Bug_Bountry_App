import { exec } from 'child_process';
import { promisify } from 'util';
import { Severity } from '@prisma/client';

const execAsync = promisify(exec);

export interface AnalyzeStepParams {
  clonedPath: string;
  contractPath: string;
  contractName: string;
}

export interface VulnerabilityFinding {
  vulnerabilityType: string;
  severity: Severity;
  filePath: string;
  lineNumber?: number;
  functionSelector?: string;
  description: string;
  confidenceScore: number;
}

export interface AnalyzeStepResult {
  findings: VulnerabilityFinding[];
  rawOutput?: any;
  toolsUsed: string[];
}

/**
 * ANALYZE Step - Run static analysis tools on contracts
 *
 * This step:
 * 1. Runs Slither static analyzer
 * 2. Parses JSON output
 * 3. Maps findings to database schema
 * 4. Filters out false positives
 * 5. Returns vulnerability findings
 */
export async function executeAnalyzeStep(params: AnalyzeStepParams): Promise<AnalyzeStepResult> {
  const { clonedPath, contractPath, contractName } = params;

  console.log(`[Analyze] Running static analysis on ${contractName}...`);

  const findings: VulnerabilityFinding[] = [];
  const toolsUsed: string[] = [];

  // Run Slither
  try {
    const slitherFindings = await runSlither(clonedPath, contractPath);
    findings.push(...slitherFindings);
    toolsUsed.push('slither');

    console.log(`[Analyze] Slither found ${slitherFindings.length} issues`);
  } catch (error) {
    console.error('[Analyze] Slither analysis failed:', error);
    // Continue with other tools
  }

  // Filter out low-confidence findings and false positives
  const filteredFindings = filterFindings(findings);

  console.log(`[Analyze] Analysis complete: ${filteredFindings.length} findings after filtering`);

  return {
    findings: filteredFindings,
    toolsUsed,
  };
}

/**
 * Run Slither static analyzer
 */
async function runSlither(clonedPath: string, contractPath: string): Promise<VulnerabilityFinding[]> {
  try {
    console.log('[Analyze] Running Slither...');

    // Run slither with JSON output
    const { stdout, stderr } = await execAsync(
      'slither . --json - --exclude-dependencies',
      {
        cwd: clonedPath,
        timeout: 300000, // 5 minute timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
      }
    );

    // Slither outputs JSON to stdout
    let jsonOutput;

    try {
      // Try to parse JSON from stdout
      jsonOutput = JSON.parse(stdout);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from mixed output
      const jsonMatch = stdout.match(/\{[\s\S]*"success"[\s\S]*\}/);
      if (jsonMatch) {
        jsonOutput = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Slither JSON output');
      }
    }

    if (!jsonOutput.success) {
      console.error('[Analyze] Slither reported errors:', jsonOutput.error);
      return [];
    }

    // Parse results
    const findings: VulnerabilityFinding[] = [];

    if (jsonOutput.results && jsonOutput.results.detectors) {
      for (const detector of jsonOutput.results.detectors) {
        const finding = parseSlitherDetector(detector, contractPath);
        if (finding) {
          findings.push(finding);
        }
      }
    }

    return findings;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('slither: command not found') || errorMessage.includes('slither: not found')) {
      console.error('[Analyze] Slither is not installed or not in PATH');
      // Return empty array instead of throwing - analysis is optional for MVP
      return [];
    }

    console.error('[Analyze] Slither execution failed:', errorMessage);
    return [];
  }
}

/**
 * Parse Slither detector output into our finding format
 */
function parseSlitherDetector(detector: any, contractPath: string): VulnerabilityFinding | null {
  try {
    // Map Slither impact to our Severity
    const severity = mapSlitherImpactToSeverity(detector.impact);

    // Map Slither check to vulnerability type
    const vulnerabilityType = mapSlitherCheckToType(detector.check);

    // Extract location information
    let filePath = contractPath;
    let lineNumber: number | undefined;
    let functionSelector: string | undefined;

    if (detector.elements && detector.elements.length > 0) {
      const element = detector.elements[0];

      if (element.source_mapping && element.source_mapping.filename_relative) {
        filePath = element.source_mapping.filename_relative;
      }

      if (element.source_mapping && element.source_mapping.lines && element.source_mapping.lines.length > 0) {
        lineNumber = element.source_mapping.lines[0];
      }

      // Try to extract function signature if available
      if (element.type === 'function' && element.name) {
        functionSelector = element.name;
      }
    }

    // Calculate confidence score based on Slither's confidence rating
    const confidenceScore = mapSlitherConfidenceToScore(detector.confidence);

    return {
      vulnerabilityType,
      severity,
      filePath,
      lineNumber,
      functionSelector,
      description: detector.description || detector.check || 'Unknown vulnerability',
      confidenceScore,
    };

  } catch (error) {
    console.error('[Analyze] Failed to parse Slither detector:', error);
    return null;
  }
}

/**
 * Map Slither impact to our Severity enum
 */
function mapSlitherImpactToSeverity(impact: string): Severity {
  const impactLower = (impact || '').toLowerCase();

  switch (impactLower) {
    case 'high':
      return Severity.CRITICAL;
    case 'medium':
      return Severity.HIGH;
    case 'low':
      return Severity.MEDIUM;
    case 'informational':
      return Severity.INFO;
    default:
      return Severity.LOW;
  }
}

/**
 * Map Slither check name to vulnerability type
 */
function mapSlitherCheckToType(check: string): string {
  // Common Slither checks mapped to vulnerability types
  const checkMapping: Record<string, string> = {
    'reentrancy-eth': 'REENTRANCY',
    'reentrancy-no-eth': 'REENTRANCY',
    'reentrancy-benign': 'REENTRANCY',
    'reentrancy-events': 'REENTRANCY',
    'uninitialized-state': 'UNINITIALIZED_STORAGE',
    'uninitialized-local': 'UNINITIALIZED_VARIABLE',
    'arbitrary-send': 'ARBITRARY_SEND',
    'controlled-delegatecall': 'DELEGATECALL',
    'suicidal': 'SELFDESTRUCT',
    'unprotected-upgrade': 'ACCESS_CONTROL',
    'timestamp': 'TIMESTAMP_DEPENDENCE',
    'tx-origin': 'TX_ORIGIN',
    'unchecked-transfer': 'UNCHECKED_RETURN_VALUE',
    'weak-prng': 'WEAK_RANDOMNESS',
  };

  return checkMapping[check] || check.toUpperCase().replace(/-/g, '_');
}

/**
 * Map Slither confidence to our score (0-1)
 */
function mapSlitherConfidenceToScore(confidence: string): number {
  const confidenceLower = (confidence || '').toLowerCase();

  switch (confidenceLower) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.5;
    default:
      return 0.6;
  }
}

/**
 * Filter out false positives and low-confidence findings
 */
function filterFindings(findings: VulnerabilityFinding[]): VulnerabilityFinding[] {
  return findings.filter((finding) => {
    // Skip very low confidence findings
    if (finding.confidenceScore < 0.4) {
      return false;
    }

    // Skip informational findings with low confidence
    if (finding.severity === Severity.INFO && finding.confidenceScore < 0.7) {
      return false;
    }

    // Filter out known false positives
    const description = finding.description.toLowerCase();

    // Example: Skip findings in test files
    if (finding.filePath.includes('test') || finding.filePath.includes('Test')) {
      return false;
    }

    return true;
  });
}
