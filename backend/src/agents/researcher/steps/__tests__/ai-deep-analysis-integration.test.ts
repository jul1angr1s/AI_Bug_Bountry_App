/**
 * Integration test for AI Deep Analysis step
 *
 * Run with: npx tsx src/agents/researcher/steps/__tests__/ai-deep-analysis-integration.test.ts
 */

import dotenv from 'dotenv';
import { executeAIDeepAnalysisStep } from '../ai-deep-analysis.js';
import type { VulnerabilityFinding } from '../analyze.js';
import { Severity } from '@prisma/client';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

dotenv.config();

// Sample vulnerable contract for testing
const VULNERABLE_CONTRACT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // VULNERABILITY: Reentrancy attack possible
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // External call before state update (VULNERABLE!)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // State update after external call (TOO LATE!)
        balances[msg.sender] -= amount;
    }

    // VULNERABILITY: No access control
    function emergencyWithdraw() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    function getBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}
`;

// Mock Slither findings (simulating what Slither would find)
const mockSlitherFindings: VulnerabilityFinding[] = [
  {
    vulnerabilityType: 'REENTRANCY',
    severity: Severity.HIGH,
    filePath: 'contracts/VulnerableBank.sol',
    lineNumber: 14,
    functionSelector: 'withdraw(uint256)',
    description: 'Reentrancy vulnerability in withdraw function',
    confidenceScore: 85,
  },
];

async function runIntegrationTest() {
  console.log('========================================');
  console.log('AI Deep Analysis Integration Test');
  console.log('========================================\n');

  // Step 1: Setup test environment
  console.log('[1/5] Setting up test environment...');
  const testDir = '/tmp/ai-deep-analysis-test';

  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, 'contracts'), { recursive: true });

  const contractPath = 'contracts/VulnerableBank.sol';
  const contractFullPath = join(testDir, contractPath);

  writeFileSync(contractFullPath, VULNERABLE_CONTRACT);
  console.log(`✓ Created test contract at ${contractFullPath}\n`);

  // Step 2: Check AI analysis is enabled
  console.log('[2/5] Checking AI analysis configuration...');
  const aiEnabled = process.env.AI_ANALYSIS_ENABLED === 'true';

  if (!aiEnabled) {
    console.error('✗ AI_ANALYSIS_ENABLED is not set to true');
    console.error('  Please set AI_ANALYSIS_ENABLED=true in backend/.env\n');
    process.exit(1);
  }

  console.log('✓ AI analysis enabled\n');

  // Step 3: Run AI Deep Analysis
  console.log('[3/5] Running AI Deep Analysis...');
  console.log(`  Input: ${mockSlitherFindings.length} Slither findings`);
  console.log('  Contract: VulnerableBank.sol (reentrancy + access control issues)\n');

  const startTime = Date.now();

  try {
    const result = await executeAIDeepAnalysisStep({
      clonedPath: testDir,
      contractPath: contractPath,
      contractName: 'VulnerableBank',
      slitherFindings: mockSlitherFindings,
    });

    const duration = Date.now() - startTime;

    console.log('✓ AI Deep Analysis completed\n');

    // Step 4: Analyze results
    console.log('[4/5] Analyzing results...');
    console.log('─────────────────────────────────────');
    console.log('Metrics:');
    console.log(`  Total findings:     ${result.metrics.totalFindings}`);
    console.log(`  Enhanced findings:  ${result.metrics.enhancedFindings}`);
    console.log(`  New findings:       ${result.metrics.newFindings}`);
    console.log(`  Processing time:    ${duration}ms`);
    console.log(`  Model used:         ${result.metrics.modelUsed}`);
    console.log(`  AI enhanced:        ${result.aiEnhanced ? 'Yes' : 'No'}`);
    console.log('─────────────────────────────────────\n');

    // Step 5: Display findings
    console.log('[5/5] Detailed Findings:');
    console.log('─────────────────────────────────────');

    result.findings.forEach((finding, idx) => {
      console.log(`\nFinding ${idx + 1}:`);
      console.log(`  Type:       ${finding.vulnerabilityType}`);
      console.log(`  Severity:   ${finding.severity}`);
      console.log(`  Confidence: ${finding.confidenceScore}%`);
      console.log(`  Location:   ${finding.filePath}:${finding.lineNumber || 'N/A'}`);
      console.log(`  Function:   ${finding.functionSelector || 'N/A'}`);
      console.log(`  Description:`);
      const descLines = finding.description.split('\n');
      descLines.forEach((line) => {
        console.log(`    ${line}`);
      });
    });

    console.log('\n─────────────────────────────────────');

    // Validation
    console.log('\n========================================');
    console.log('Test Validation');
    console.log('========================================');

    let passed = true;

    // Check that AI enhancement happened
    if (!result.aiEnhanced) {
      console.log('✗ FAIL: AI enhancement did not occur');
      passed = false;
    } else {
      console.log('✓ PASS: AI enhancement occurred');
    }

    // Check that we have findings
    if (result.findings.length === 0) {
      console.log('✗ FAIL: No findings returned');
      passed = false;
    } else {
      console.log(`✓ PASS: ${result.findings.length} findings returned`);
    }

    // Check that enhanced count matches or exceeds input
    if (result.metrics.enhancedFindings < mockSlitherFindings.length) {
      console.log(`✗ FAIL: Expected ${mockSlitherFindings.length} enhanced, got ${result.metrics.enhancedFindings}`);
      passed = false;
    } else {
      console.log(`✓ PASS: ${result.metrics.enhancedFindings} findings enhanced`);
    }

    // Check if AI discovered new vulnerabilities
    if (result.metrics.newFindings > 0) {
      console.log(`✓ BONUS: AI discovered ${result.metrics.newFindings} new vulnerabilities!`);
    }

    // Check model used
    if (result.metrics.modelUsed !== 'moonshotai/kimi-k2.5') {
      console.log(`✗ FAIL: Wrong model used: ${result.metrics.modelUsed}`);
      passed = false;
    } else {
      console.log(`✓ PASS: Correct model used (${result.metrics.modelUsed})`);
    }

    console.log('\n========================================');

    if (passed) {
      console.log('✅ All tests PASSED!');
      console.log('========================================\n');

      console.log('Summary:');
      console.log(`  - AI Deep Analysis is working correctly`);
      console.log(`  - Enhanced ${result.metrics.enhancedFindings} Slither findings`);
      console.log(`  - Discovered ${result.metrics.newFindings} new vulnerabilities`);
      console.log(`  - Total findings: ${result.metrics.totalFindings}`);
      console.log(`  - Processing time: ${duration}ms`);
      console.log('\nThe Researcher Agent is ready for production use! 🚀\n');
    } else {
      console.log('❌ Some tests FAILED');
      console.log('========================================\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Test failed with error:');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      rmSync(testDir, { recursive: true, force: true });
      console.log('Cleaned up test directory');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run test
runIntegrationTest();
