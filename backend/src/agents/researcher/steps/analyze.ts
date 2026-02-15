import { exec } from 'child_process';
import { promisify } from 'util';
import { Severity } from '@prisma/client';
import { createLogger } from '../../../lib/logger.js';

const log = createLogger('ResearcherAnalyze');

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
  analysisMethod?: 'AI' | 'STATIC' | 'HYBRID';
  aiConfidenceScore?: number;
  remediationSuggestion?: string;
  codeSnippet?: string;
}

export interface AnalyzeStepResult {
  findings: VulnerabilityFinding[];
  rawOutput?: unknown;
  toolsUsed: string[];
  slitherStatus: 'OK' | 'TOOL_UNAVAILABLE' | 'ERROR';
  slitherError?: string;
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

  log.info({ contractName }, 'Running static analysis...');

  const findings: VulnerabilityFinding[] = [];
  const toolsUsed: string[] = [];
  let slitherStatus: AnalyzeStepResult['slitherStatus'] = 'ERROR';
  let slitherError: string | undefined;

  // Run Slither
  try {
    const slitherResult = await runSlither(clonedPath, contractPath);
    const slitherFindings = slitherResult.findings;
    slitherStatus = slitherResult.status;
    slitherError = slitherResult.error;
    findings.push(...slitherFindings);
    toolsUsed.push('slither');

    log.info({ count: slitherFindings.length }, 'Slither found issues');
  } catch (error) {
    log.error({ err: error }, 'Slither analysis failed');
    // Continue with other tools
  }

  // Filter out low-confidence findings and false positives
  const filteredFindings = filterFindings(findings);

  log.info({ count: filteredFindings.length }, 'Analysis complete, findings after filtering');

  return {
    findings: filteredFindings,
    toolsUsed,
    slitherStatus,
    slitherError,
  };
}

/**
 * Run Slither static analyzer
 */
async function runSlither(
  clonedPath: string,
  contractPath: string
): Promise<{ findings: VulnerabilityFinding[]; status: AnalyzeStepResult['slitherStatus']; error?: string }> {
  const commands = [
    `slither ${JSON.stringify(contractPath)} --json - --exclude-dependencies`,
    'slither . --json - --exclude-dependencies',
    `slither ${JSON.stringify(contractPath)} --json - --exclude-dependencies --ignore-compile`,
    'slither . --json - --exclude-dependencies --ignore-compile',
  ];

  let lastError = 'Unknown Slither error';

  try {
    log.info({ contractPath }, 'Running Slither...');

    for (const command of commands) {
      try {
        const { stdout } = await execAsync(command, {
          cwd: clonedPath,
          timeout: 300000, // 5 minute timeout
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
        });

        const parsed = parseSlitherJson(stdout);
        if (!parsed.success) {
          lastError = parsed.error || 'Slither reported unsuccessful execution';
          log.warn({ command, error: lastError }, 'Slither run returned unsuccessful JSON payload');
          continue;
        }

        return {
          findings: parseSlitherFindings(parsed.output, contractPath),
          status: 'OK',
        };
      } catch (error) {
        const commandError = extractExecErrorDetails(error);
        lastError = commandError;

        // Slither sometimes exits non-zero even though it prints a valid JSON payload to stdout.
        // In that case, prefer the JSON payload (it is what we use for detectors) and keep
        // the exit error only as additional context.
        const maybeStdout = getExecStdout(error);
        if (maybeStdout) {
          const parsed = parseSlitherJson(maybeStdout);
          if (parsed.success) {
            log.warn({ command, error: commandError }, 'Slither exited non-zero but produced success JSON; accepting output');
            return {
              findings: parseSlitherFindings(parsed.output, contractPath),
              status: 'OK',
              error: commandError,
            };
          }
        }

        if (commandError.includes('slither: command not found') || commandError.includes('slither: not found')) {
          log.error('Slither is not installed or not in PATH');
          return { findings: [], status: 'TOOL_UNAVAILABLE', error: commandError };
        }

        log.warn({ command, error: commandError }, 'Slither command attempt failed');
      }
    }

    log.error({ error: lastError }, 'Slither execution failed after all attempts');
    return { findings: [], status: 'ERROR', error: lastError };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Unexpected Slither runner failure');
    return { findings: [], status: 'ERROR', error: errorMessage };
  }
}

function parseSlitherJson(stdout: string): { success: boolean; output?: unknown; error?: string } {
  let jsonOutput;

  try {
    jsonOutput = JSON.parse(stdout);
  } catch {
    const jsonMatch = stdout.match(/\{[\s\S]*"success"[\s\S]*\}/);
    if (jsonMatch) {
      jsonOutput = JSON.parse(jsonMatch[0]);
    } else {
      return { success: false, error: 'Failed to parse Slither JSON output' };
    }
  }

  const output = jsonOutput as { success?: boolean; error?: string };
  if (!output.success) {
    return { success: false, error: output.error || 'Slither returned success=false' };
  }

  return { success: true, output: jsonOutput };
}

function parseSlitherFindings(jsonOutput: unknown, contractPath: string): VulnerabilityFinding[] {
  const findings: VulnerabilityFinding[] = [];
  const typed = jsonOutput as { results?: { detectors?: Array<Record<string, unknown>> } };

  if (typed.results && typed.results.detectors) {
    for (const detector of typed.results.detectors) {
      const finding = parseSlitherDetector(detector as {
        impact?: string;
        check?: string;
        description?: string;
        confidence?: string;
        elements?: Array<{ type?: string; source_mapping?: { filename_relative?: string; lines?: number[] }; name?: string }>;
      }, contractPath);
      if (finding) {
        findings.push(finding);
      }
    }
  }

  return findings;
}

function extractExecErrorDetails(error: unknown): string {
  const err = error as { message?: string; stdout?: string; stderr?: string };
  const message = (err.message || '').trim();
  const stderr = (err.stderr || '').trim();
  const stdout = (err.stdout || '').trim();
  const detail = [message, stderr, stdout].filter(Boolean).join(' | ');
  return detail || 'Unknown Slither execution error';
}

function getExecStdout(error: unknown): string {
  const err = error as { stdout?: string };
  return typeof err?.stdout === 'string' ? err.stdout : '';
}

/**
 * Parse Slither detector output into our finding format
 */
function parseSlitherDetector(detector: { impact?: string; check?: string; description?: string; confidence?: string; elements?: Array<{ type?: string; source_mapping?: { filename_relative?: string; lines?: number[] }; name?: string }> }, contractPath: string): VulnerabilityFinding | null {
  try {
    // Map Slither impact to our Severity
    const severity = mapSlitherImpactToSeverity(detector.impact ?? '');

    // Map Slither check to vulnerability type
    const vulnerabilityType = mapSlitherCheckToType(detector.check ?? '');

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
    const confidenceScore = mapSlitherConfidenceToScore(detector.confidence ?? '');

    return {
      vulnerabilityType,
      severity,
      filePath,
      lineNumber,
      functionSelector,
      description: detector.description || detector.check || 'Unknown vulnerability',
      confidenceScore,
      analysisMethod: 'STATIC',
    };

  } catch (error) {
    log.error({ err: error }, 'Failed to parse Slither detector');
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
    // Reentrancy variants
    'reentrancy-eth': 'REENTRANCY',
    'reentrancy-no-eth': 'REENTRANCY',
    'reentrancy-benign': 'REENTRANCY',
    'reentrancy-events': 'REENTRANCY',
    'reentrancy-unlimited-gas': 'REENTRANCY',
    // Storage issues
    'uninitialized-state': 'UNINITIALIZED_STORAGE',
    'uninitialized-local': 'UNINITIALIZED_VARIABLE',
    'uninitialized-storage': 'UNINITIALIZED_STORAGE',
    // Access control
    'arbitrary-send': 'ARBITRARY_SEND',
    'arbitrary-send-eth': 'ARBITRARY_SEND',
    'arbitrary-send-erc20': 'ARBITRARY_SEND',
    'controlled-delegatecall': 'DELEGATECALL',
    'suicidal': 'SELFDESTRUCT',
    'unprotected-upgrade': 'ACCESS_CONTROL',
    'missing-zero-check': 'ACCESS_CONTROL',
    'protected-vars': 'ACCESS_CONTROL',
    // Oracle & Price manipulation
    'oracle-price': 'ORACLE_MANIPULATION',
    'divide-before-multiply': 'ORACLE_MANIPULATION',
    'incorrect-equality': 'BUSINESS_LOGIC',
    'tautology': 'BUSINESS_LOGIC',
    // Integer issues
    'integer-overflow': 'INTEGER_OVERFLOW',
    'integer-underflow': 'INTEGER_OVERFLOW',
    'divide-by-zero': 'INTEGER_OVERFLOW',
    // External calls
    'low-level-calls': 'UNCHECKED_RETURN_VALUE',
    'unchecked-lowlevel': 'UNCHECKED_RETURN_VALUE',
    'unchecked-send': 'UNCHECKED_RETURN_VALUE',
    'unchecked-transfer': 'UNCHECKED_RETURN_VALUE',
    'calls-loop': 'DOS_ATTACK',
    'msg-value-loop': 'DOS_ATTACK',
    // Time and randomness
    'timestamp': 'TIMESTAMP_DEPENDENCE',
    'block-timestamp': 'TIMESTAMP_DEPENDENCE',
    'weak-prng': 'WEAK_RANDOMNESS',
    'tx-origin': 'TX_ORIGIN',
    // Flash loan related
    'flash-loan': 'FLASH_LOAN_ATTACK',
    'price-manipulation': 'ORACLE_MANIPULATION',
    // Storage collision
    'shadowing-state': 'STORAGE_COLLISION',
    'shadowing-local': 'STORAGE_COLLISION',
    'variable-scope': 'STORAGE_COLLISION',
    // Locked ether
    'locked-ether': 'LOCKED_ETHER',
    // Deprecated
    'deprecated-standards': 'DEPRECATED_FUNCTION',
    'solc-version': 'DEPRECATED_FUNCTION',
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
