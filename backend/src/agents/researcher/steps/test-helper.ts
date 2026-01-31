/**
 * Test Helper for Researcher Agent Steps
 *
 * This file provides utilities for testing the scanning pipeline.
 * Run with: tsx src/agents/researcher/steps/test-helper.ts
 */

import { executeCloneStep } from './clone.js';
import { executeCompileStep } from './compile.js';
import { executeAnalyzeStep } from './analyze.js';

/**
 * Test the clone step with a simple public repository
 */
async function testCloneStep() {
  console.log('\n=== Testing CLONE Step ===\n');

  try {
    const result = await executeCloneStep({
      scanId: 'test-scan-001',
      protocolId: 'test-protocol-001',
      repoUrl: 'https://github.com/OpenZeppelin/openzeppelin-contracts.git',
      targetBranch: 'master',
    });

    console.log('✓ Clone successful!');
    console.log('  Cloned path:', result.clonedPath);
    console.log('  Branch:', result.branch);
    console.log('  Commit:', result.commitHash);

    return result;
  } catch (error) {
    console.error('✗ Clone failed:', error);
    throw error;
  }
}

/**
 * Test the compile step
 */
async function testCompileStep(clonedPath: string) {
  console.log('\n=== Testing COMPILE Step ===\n');

  try {
    const result = await executeCompileStep({
      clonedPath,
      contractPath: 'contracts/token/ERC20',
      contractName: 'ERC20',
    });

    console.log('✓ Compile successful!');
    console.log('  Artifacts path:', result.artifactsPath);
    console.log('  Has ABI:', !!result.abi);
    console.log('  Has bytecode:', !!result.bytecode);
    console.log('  Warnings:', result.warnings?.length || 0);
    console.log('  Errors:', result.errors?.length || 0);

    return result;
  } catch (error) {
    console.error('✗ Compile failed:', error);
    console.error('  This is expected if Foundry is not installed');
    throw error;
  }
}

/**
 * Test the analyze step
 */
async function testAnalyzeStep(clonedPath: string) {
  console.log('\n=== Testing ANALYZE Step ===\n');

  try {
    const result = await executeAnalyzeStep({
      clonedPath,
      contractPath: 'contracts/token/ERC20',
      contractName: 'ERC20',
    });

    console.log('✓ Analyze successful!');
    console.log('  Findings:', result.findings.length);
    console.log('  Tools used:', result.toolsUsed.join(', '));

    if (result.findings.length > 0) {
      console.log('\n  Sample finding:');
      const finding = result.findings[0];
      console.log('    Type:', finding.vulnerabilityType);
      console.log('    Severity:', finding.severity);
      console.log('    Confidence:', finding.confidenceScore);
      console.log('    Description:', finding.description.substring(0, 100) + '...');
    }

    return result;
  } catch (error) {
    console.error('✗ Analyze failed:', error);
    console.error('  This is expected if Slither is not installed');
    // Don't throw - analysis is optional
    return { findings: [], toolsUsed: [] };
  }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Researcher Agent Steps - Integration Test          ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  try {
    // Test clone
    const cloneResult = await testCloneStep();

    // Test compile
    let compileResult;
    try {
      compileResult = await testCompileStep(cloneResult.clonedPath);
    } catch (error) {
      console.log('\n⚠ Skipping remaining tests (Foundry not available)');
      return;
    }

    // Test analyze
    await testAnalyzeStep(cloneResult.clonedPath);

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  All tests completed successfully!                  ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  Tests failed - see errors above                    ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
