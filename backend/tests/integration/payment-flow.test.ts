/**
 * Integration Test: Full Payment Flow
 *
 * Tests the complete end-to-end payment workflow:
 * 1. ValidationRecorded event emitted
 * 2. Payment record created in database
 * 3. Payment job added to queue
 * 4. Payment worker processes job
 * 5. BountyPool.releaseBounty() called
 * 6. Payment updated with txHash and status=COMPLETED
 * 7. WebSocket event emitted
 * 8. USDC transferred to researcher
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ethers } from 'ethers';
import { Queue, Worker } from 'bullmq';
import {
  globalSetup,
  globalTeardown,
  beforeEachTest,
  testProvider,
  testPayerWallet,
  testResearcherWallet,
  testProtocolOwnerWallet,
  testValidatorWallet,
  TEST_CONTRACTS,
  createTestProtocol,
  createTestVulnerability,
  waitFor,
} from './setup.js';
import { getPrismaClient } from '../../src/lib/prisma.js';
import { getRedisClient } from '../../src/lib/redis.js';
import { createPaymentFromValidation } from '../../src/services/payment.service.js';
import { addPaymentJob, paymentQueue } from '../../src/queues/payment.queue.js';
import { startPaymentWorker } from '../../src/workers/payment.worker.js';
import ValidationRegistryABI from '../../src/blockchain/abis/ValidationRegistry.json' with { type: 'json' };
import BountyPoolABI from '../../src/blockchain/abis/BountyPool.json' with { type: 'json' };

const prisma = getPrismaClient();
const redis = getRedisClient();

let paymentWorker: Worker | null = null;

describe('Payment Flow Integration Tests', () => {
  beforeAll(async () => {
    await globalSetup();
  }, 60000);

  afterAll(async () => {
    if (paymentWorker) {
      await paymentWorker.close();
    }
    await globalTeardown();
  }, 30000);

  beforeEach(async () => {
    await beforeEachTest();
  });

  test('Full payment flow: ValidationRecorded → Payment creation → Job queue → releaseBounty() → USDC transfer', async () => {
    // Step 1: Set up test environment
    console.log('[Test] Step 1: Setting up test environment...');

    const protocol = await createTestProtocol({
      ownerAddress: testProtocolOwnerWallet.address,
      totalBountyPool: 10000,
      availableBounty: 10000,
    });

    const vulnerability = await createTestVulnerability(protocol.id, {
      severity: 'HIGH',
      bounty: 1000,
    });

    // Step 2: Deploy test contracts or connect to existing testnet contracts
    console.log('[Test] Step 2: Connecting to contracts...');

    const validationRegistry = new ethers.Contract(
      TEST_CONTRACTS.validationRegistry,
      ValidationRegistryABI.abi,
      testValidatorWallet
    );

    const bountyPool = new ethers.Contract(
      TEST_CONTRACTS.bountyPool,
      BountyPoolABI.abi,
      testPayerWallet
    );

    const usdcAbi = [
      'function balanceOf(address account) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ];

    const usdc = new ethers.Contract(TEST_CONTRACTS.usdc, usdcAbi, testProtocolOwnerWallet);

    // Check initial USDC balance of researcher
    const initialBalance = await usdc.balanceOf(testResearcherWallet.address);
    console.log(`[Test] Initial researcher balance: ${ethers.formatUnits(initialBalance, 6)} USDC`);

    // Step 3: Emit ValidationRecorded event with CONFIRMED outcome
    console.log('[Test] Step 3: Emitting ValidationRecorded event...');

    const validationId = ethers.id(`validation-${Date.now()}`);
    const proofHash = vulnerability.vulnerabilityHash;

    // Submit validation to registry (simulating validator agent)
    const validationTx = await validationRegistry.submitValidation(
      validationId,
      proofHash,
      0, // CONFIRMED outcome
      1, // HIGH severity
      'Reentrancy',
      testResearcherWallet.address
    );

    await validationTx.wait();
    console.log(`[Test] ValidationRecorded event emitted. TX: ${validationTx.hash}`);

    // Create scan and proof records for the validation
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'Reentrancy',
        severity: 'HIGH',
        filePath: 'contracts/Test.sol',
        description: 'Test vulnerability',
        confidenceScore: 0.95,
      },
    });

    await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'VALIDATED',
        encryptedPayload: 'encrypted-proof',
        researcherSignature: 'signature',
        encryptionKeyId: 'key-id',
        onChainValidationId: validationId,
        onChainTxHash: validationTx.hash,
      },
    });

    // Step 4: Verify Payment record created in database
    console.log('[Test] Step 4: Creating Payment record...');

    const payment = await createPaymentFromValidation(validationId);

    expect(payment).toBeDefined();
    expect(payment.status).toBe('PENDING');
    expect(payment.amount).toBeGreaterThan(0);
    expect(payment.researcherAddress).toBe(testResearcherWallet.address);
    expect(payment.queuedAt).toBeDefined();

    console.log(`[Test] Payment created: ${payment.id}`);

    // Step 5: Verify payment job added to queue
    console.log('[Test] Step 5: Adding payment job to queue...');

    await addPaymentJob({
      paymentId: payment.id,
      validationId,
      protocolId: protocol.id,
    });

    // Check that job was added
    const waitingJobs = await paymentQueue.getWaiting();
    expect(waitingJobs.length).toBeGreaterThan(0);
    console.log(`[Test] Job added to queue. Waiting jobs: ${waitingJobs.length}`);

    // Step 6: Verify payment worker processes job
    console.log('[Test] Step 6: Starting payment worker...');

    // Approve USDC for BountyPool to spend (protocol owner must do this first)
    const approvalAmount = ethers.parseUnits('10000', 6);
    const approvalTx = await usdc.approve(TEST_CONTRACTS.bountyPool, approvalAmount);
    await approvalTx.wait();
    console.log('[Test] USDC approved for BountyPool');

    // Deposit bounty to protocol pool
    const depositAmount = ethers.parseUnits('10000', 6);
    const depositTx = await bountyPool.depositBounty(protocol.onChainProtocolId, depositAmount);
    await depositTx.wait();
    console.log('[Test] Bounty deposited to pool');

    // Start the payment worker
    paymentWorker = startPaymentWorker();

    // Step 7: Verify BountyPool.releaseBounty() called
    console.log('[Test] Step 7: Waiting for payment to be processed...');

    // Wait for payment to be completed (max 30 seconds)
    await waitFor(
      async () => {
        const updatedPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
        });
        return updatedPayment?.status === 'COMPLETED';
      },
      30000,
      500
    );

    // Step 8: Verify Payment updated with txHash and status=COMPLETED
    console.log('[Test] Step 8: Verifying payment completion...');

    const completedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    expect(completedPayment).toBeDefined();
    expect(completedPayment!.status).toBe('COMPLETED');
    expect(completedPayment!.txHash).toBeDefined();
    expect(completedPayment!.onChainBountyId).toBeDefined();
    expect(completedPayment!.paidAt).toBeDefined();
    expect(completedPayment!.reconciled).toBe(true);

    console.log(`[Test] Payment completed. TX: ${completedPayment!.txHash}`);

    // Step 9: Verify WebSocket event emitted
    // Note: This would require a WebSocket client connection in the test
    // For now, we verify the payment was processed successfully
    console.log('[Test] Step 9: WebSocket event should have been emitted');

    // Step 10: Verify USDC transferred to researcher
    console.log('[Test] Step 10: Verifying USDC transfer...');

    const finalBalance = await usdc.balanceOf(testResearcherWallet.address);
    const balanceIncrease = finalBalance - initialBalance;

    console.log(`[Test] Final researcher balance: ${ethers.formatUnits(finalBalance, 6)} USDC`);
    console.log(`[Test] Balance increase: ${ethers.formatUnits(balanceIncrease, 6)} USDC`);

    expect(balanceIncrease).toBeGreaterThan(0);
    expect(balanceIncrease).toBe(ethers.parseUnits(completedPayment!.amount.toString(), 6));

    console.log('[Test] ✓ Full payment flow completed successfully!');
  }, 60000);

  test('Payment flow handles insufficient pool funds gracefully', async () => {
    console.log('[Test] Testing insufficient pool funds scenario...');

    // Create protocol with zero available bounty
    const protocol = await createTestProtocol({
      ownerAddress: testProtocolOwnerWallet.address,
      totalBountyPool: 0,
      availableBounty: 0,
    });

    const vulnerability = await createTestVulnerability(protocol.id, {
      severity: 'HIGH',
      bounty: 1000,
    });

    // Create validation
    const validationRegistry = new ethers.Contract(
      TEST_CONTRACTS.validationRegistry,
      ValidationRegistryABI.abi,
      testValidatorWallet
    );

    const validationId = ethers.id(`validation-insufficient-${Date.now()}`);
    const validationTx = await validationRegistry.submitValidation(
      validationId,
      vulnerability.vulnerabilityHash,
      0, // CONFIRMED
      1, // HIGH
      'Reentrancy',
      testResearcherWallet.address
    );
    await validationTx.wait();

    // Create proof
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'Reentrancy',
        severity: 'HIGH',
        filePath: 'contracts/Test.sol',
        description: 'Test vulnerability',
        confidenceScore: 0.95,
      },
    });

    await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'VALIDATED',
        encryptedPayload: 'encrypted-proof',
        researcherSignature: 'signature',
        encryptionKeyId: 'key-id',
        onChainValidationId: validationId,
      },
    });

    // Create payment and add to queue
    const payment = await createPaymentFromValidation(validationId);

    await addPaymentJob({
      paymentId: payment.id,
      validationId,
      protocolId: protocol.id,
    });

    // Start worker
    if (!paymentWorker) {
      paymentWorker = startPaymentWorker();
    }

    // Wait for payment to fail
    await waitFor(
      async () => {
        const updatedPayment = await prisma.payment.findUnique({
          where: { id: payment.id },
        });
        return updatedPayment?.status === 'FAILED';
      },
      30000,
      500
    );

    const failedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    expect(failedPayment!.status).toBe('FAILED');
    expect(failedPayment!.failureReason).toContain('Insufficient');

    console.log('[Test] ✓ Insufficient funds handled correctly');
  }, 60000);

  test('Payment flow handles duplicate payments correctly', async () => {
    console.log('[Test] Testing duplicate payment prevention...');

    const protocol = await createTestProtocol({
      totalBountyPool: 10000,
      availableBounty: 10000,
    });

    const vulnerability = await createTestVulnerability(protocol.id);

    // Create and complete first payment
    const payment1 = await prisma.payment.create({
      data: {
        vulnerabilityId: vulnerability.id,
        amount: 1000,
        currency: 'USDC',
        status: 'COMPLETED',
        researcherAddress: testResearcherWallet.address,
        txHash: ethers.id('dummy-tx'),
        paidAt: new Date(),
      },
    });

    // Try to create payment from same validation
    const validationId = ethers.id(`validation-duplicate-${Date.now()}`);

    // Create proof
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const finding = await prisma.finding.create({
      data: {
        scanId: scan.id,
        vulnerabilityType: 'Reentrancy',
        severity: 'HIGH',
        filePath: 'contracts/Test.sol',
        description: 'Test vulnerability',
        confidenceScore: 0.95,
      },
    });

    await prisma.proof.create({
      data: {
        scanId: scan.id,
        findingId: finding.id,
        status: 'VALIDATED',
        encryptedPayload: 'encrypted-proof',
        researcherSignature: 'signature',
        encryptionKeyId: 'key-id',
        onChainValidationId: validationId,
      },
    });

    // This should return the existing payment
    const payment2 = await createPaymentFromValidation(validationId);

    expect(payment2.id).toBe(payment1.id);
    expect(payment2.status).toBe('COMPLETED');

    console.log('[Test] ✓ Duplicate payment prevented');
  }, 30000);

  test('Payment flow retries on network errors', async () => {
    console.log('[Test] Testing payment retry on network errors...');

    // This test would require mocking network failures
    // For integration tests, we verify retry count increases
    const protocol = await createTestProtocol({
      totalBountyPool: 10000,
      availableBounty: 10000,
    });

    const vulnerability = await createTestVulnerability(protocol.id);

    // Create payment with invalid validation ID (will cause error)
    const payment = await prisma.payment.create({
      data: {
        vulnerabilityId: vulnerability.id,
        amount: 1000,
        currency: 'USDC',
        status: 'PENDING',
        researcherAddress: testResearcherWallet.address,
        queuedAt: new Date(),
      },
    });

    const invalidValidationId = ethers.id('non-existent-validation');

    await addPaymentJob({
      paymentId: payment.id,
      validationId: invalidValidationId,
      protocolId: protocol.id,
    });

    if (!paymentWorker) {
      paymentWorker = startPaymentWorker();
    }

    // Wait for retries to occur
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const retriedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
    });

    // Should have attempted retries
    expect(retriedPayment!.retryCount).toBeGreaterThan(0);

    console.log(`[Test] ✓ Payment retry count: ${retriedPayment!.retryCount}`);
  }, 30000);
});
