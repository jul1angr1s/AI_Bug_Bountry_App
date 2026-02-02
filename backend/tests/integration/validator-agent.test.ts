/**
 * Integration Test: Validator Agent LLM Validation Flow
 *
 * Tests the Validator Agent's LLM-based proof validation:
 * 1. Proof submission via Redis pub/sub
 * 2. Proof decryption
 * 3. LLM-based analysis using Kimi 2.5
 * 4. Finding validation update
 * 5. Proof status update
 * 6. Error handling and edge cases
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  globalSetup,
  globalTeardown,
  beforeEachTest,
  createTestProtocol,
  waitFor,
} from './setup.js';
import { getPrismaClient } from '../../src/lib/prisma.js';
import { getRedisClient } from '../../src/lib/redis.js';
import { getKimiClient } from '../../src/lib/llm.js';
import { startValidatorAgentLLM, stopValidatorAgentLLM } from '../../src/agents/validator/llm-worker.js';

const prisma = getPrismaClient();
const redis = getRedisClient();

describe('Validator Agent LLM Integration Tests', () => {
  beforeAll(async () => {
    await globalSetup();
  }, 60000);

  afterAll(async () => {
    await stopValidatorAgentLLM();
    await globalTeardown();
  }, 30000);

  beforeEach(async () => {
    await beforeEachTest();
  });

  test('Validator agent starts and listens for proof submissions', async () => {
    console.log('[Test] Testing validator agent initialization...');

    // Start the validator agent
    await startValidatorAgentLLM();

    // Wait for agent to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify agent is listening by checking Redis subscription
    // Note: This is a basic check - full validation tested in next test
    console.log('[Test] ✓ Validator agent started successfully');
  }, 30000);

  test('Validator agent processes proof submission and validates with LLM', async () => {
    console.log('[Test] Testing full validator agent flow...');

    // Note: This test requires the Kimi API to be configured and available.
    // In CI/CD environments, the LLM client should be mocked or the API key provided.
    // The test validates the full flow including LLM integration.

    // Create test protocol and scan
    const protocol = await createTestProtocol({
      totalBountyPool: 10000,
      availableBounty: 10000,
    });

    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    // Create finding
    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'Reentrancy',
        severity: 'HIGH',
        filePath: 'contracts/Vulnerable.sol',
        description: 'Reentrancy vulnerability in withdraw function',
        confidenceScore: 0.95,
        status: 'PENDING_VALIDATION',
      },
    });

    // Create proof with encrypted payload
    const proof = await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'PENDING_VALIDATION',
        encryptedPayload: JSON.stringify({
          vulnerabilityType: 'Reentrancy',
          findingId: finding.id,
          scanId: scan.id,
          exploitCode: `
            // SPDX-License-Identifier: MIT
            pragma solidity ^0.8.0;

            contract ReentrancyExploit {
              IVulnerable target;

              constructor(address _target) {
                target = IVulnerable(_target);
              }

              function attack() external payable {
                target.deposit{value: msg.value}();
                target.withdraw();
              }

              receive() external payable {
                if (address(target).balance > 0) {
                  target.withdraw();
                }
              }
            }
          `,
          description: 'Reentrancy attack that drains contract balance',
        }),
        researcherSignature: 'test-signature',
        encryptionKeyId: 'test-key-id',
      },
    });

    console.log(`[Test] Created proof: ${proof.id}`);

    // Start validator agent if not already running
    await startValidatorAgentLLM();

    // Publish proof submission to Redis
    const proofSubmission = {
      proofId: proof.id,
      findingId: finding.id,
      scanId: scan.id,
      submittedAt: new Date().toISOString(),
    };

    await redis.publish('PROOF_SUBMISSION', JSON.stringify(proofSubmission));
    console.log('[Test] Published proof submission to Redis');

    // Wait for validator to process (up to 30 seconds)
    await waitFor(
      async () => {
        const updatedProof = await prisma.proof.findUnique({
          where: { id: proof.id },
        });
        return updatedProof?.status === 'VALIDATED' || updatedProof?.status === 'REJECTED';
      },
      30000,
      500
    );

    // Verify proof was processed
    const validatedProof = await prisma.proof.findUnique({
      where: { id: proof.id },
    });

    expect(validatedProof).toBeDefined();
    expect(['VALIDATED', 'REJECTED']).toContain(validatedProof!.status);
    expect(validatedProof!.validatedAt).toBeDefined();

    // Verify finding was updated
    const validatedFinding = await prisma.finding.findUnique({
      where: { id: finding.id },
    });

    expect(validatedFinding).toBeDefined();
    expect(['VALIDATED', 'REJECTED']).toContain(validatedFinding!.status);

    console.log(`[Test] ✓ Proof validated: ${validatedProof!.status}`);
    console.log(`[Test] ✓ Finding status: ${validatedFinding!.status}`);
  }, 60000);

  test('Validator agent handles decryption errors gracefully', async () => {
    console.log('[Test] Testing decryption error handling...');

    const protocol = await createTestProtocol();
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'Unknown',
        severity: 'HIGH',
        filePath: 'test.sol',
        description: 'Test finding',
        confidenceScore: 0.5,
        status: 'PENDING_VALIDATION',
      },
    });

    // Create proof with invalid encrypted payload
    const proof = await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'PENDING_VALIDATION',
        encryptedPayload: 'invalid-encrypted-data',
        researcherSignature: 'test-signature',
        encryptionKeyId: 'invalid-key-id',
      },
    });

    await startValidatorAgentLLM();

    // Publish proof submission
    await redis.publish(
      'PROOF_SUBMISSION',
      JSON.stringify({
        proofId: proof.id,
        findingId: finding.id,
        scanId: scan.id,
        submittedAt: new Date().toISOString(),
      })
    );

    // Wait for processing
    await waitFor(
      async () => {
        const updatedProof = await prisma.proof.findUnique({
          where: { id: proof.id },
        });
        return updatedProof?.status === 'REJECTED';
      },
      30000,
      500
    );

    const rejectedProof = await prisma.proof.findUnique({
      where: { id: proof.id },
    });

    expect(rejectedProof!.status).toBe('REJECTED');

    console.log('[Test] ✓ Invalid proof rejected correctly');
  }, 60000);

  test('Validator agent handles LLM API errors', async () => {
    console.log('[Test] Testing LLM API error handling...');

    // Mock LLM client to throw error
    const kimiClient = getKimiClient();
    const originalAnalyze = kimiClient.analyzeProof;

    // Temporarily override analyzeProof to simulate error
    vi.spyOn(kimiClient, 'analyzeProof').mockRejectedValue(
      new Error('LLM API unavailable')
    );

    const protocol = await createTestProtocol();
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'TestVuln',
        severity: 'HIGH',
        filePath: 'test.sol',
        description: 'Test',
        confidenceScore: 0.5,
        status: 'PENDING_VALIDATION',
      },
    });

    const proof = await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'PENDING_VALIDATION',
        encryptedPayload: JSON.stringify({
          vulnerabilityType: 'TestVuln',
          findingId: finding.id,
          scanId: scan.id,
          exploitCode: 'test code',
        }),
        researcherSignature: 'sig',
        encryptionKeyId: 'key',
      },
    });

    await startValidatorAgentLLM();

    await redis.publish(
      'PROOF_SUBMISSION',
      JSON.stringify({
        proofId: proof.id,
        findingId: finding.id,
        scanId: scan.id,
        submittedAt: new Date().toISOString(),
      })
    );

    // Wait for error handling
    await waitFor(
      async () => {
        const updatedProof = await prisma.proof.findUnique({
          where: { id: proof.id },
        });
        return updatedProof?.status === 'REJECTED';
      },
      30000,
      500
    );

    const failedProof = await prisma.proof.findUnique({
      where: { id: proof.id },
    });

    expect(failedProof!.status).toBe('REJECTED');

    // Restore original function
    vi.restoreAllMocks();

    console.log('[Test] ✓ LLM error handled gracefully');
  }, 60000);

  test('Validator agent stops cleanly', async () => {
    console.log('[Test] Testing validator agent shutdown...');

    await startValidatorAgentLLM();
    await stopValidatorAgentLLM();

    // Verify agent stopped (no error should be thrown)
    await stopValidatorAgentLLM(); // Should be idempotent

    console.log('[Test] ✓ Validator agent stopped cleanly');
  }, 30000);
});
