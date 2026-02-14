/**
 * Integration Test: WebSocket Event Emissions
 *
 * Tests the WebSocket event system:
 * 1. Payment events (released, failed)
 * 2. Scan events (started, progress, completed)
 * 3. Agent task updates
 * 4. Protocol status changes
 * 5. Vulnerability status changes
 * 6. Bounty pool updates
 *
 * Note: These tests verify the event emission functions work correctly.
 * Full client-server integration would require socket.io-client package.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Server } from 'socket.io';
import { createServer } from 'http';
import {
  globalSetup,
  globalTeardown,
  beforeEachTest,
  createTestProtocol,
  createTestVulnerability,
  createTestPayment,
} from './setup.js';
import { getPrismaClient } from '../../src/lib/prisma.js';
import { setSocketIO, getSocketIO } from '../../src/websocket/events.js';
import {
  emitPaymentReleased,
  emitPaymentFailed,
  emitScanStarted,
  emitScanProgress,
  emitScanCompleted,
  emitAgentTaskUpdate,
  emitProtocolStatusChange,
  emitVulnerabilityStatusChanged,
  emitBountyPoolUpdated,
} from '../../src/websocket/events.js';

const prisma = getPrismaClient();

let testServer: any;
let testIo: Server;

describe('WebSocket Events Integration Tests', () => {
  beforeAll(async () => {
    await globalSetup();

    // Create test WebSocket server
    testServer = createServer();
    testIo = new Server(testServer, {
      cors: {
        origin: '*',
      },
    });

    // Start server on random port
    const port = 3001 + Math.floor(Math.random() * 1000);
    await new Promise<void>((resolve) => {
      testServer.listen(port, () => {
        console.log(`[Test] WebSocket test server listening on port ${port}`);
        resolve();
      });
    });

    // Set the server instance for event emitters
    setSocketIO(testIo);
  }, 60000);

  afterAll(async () => {
    if (testIo) {
      testIo.close();
    }
    if (testServer) {
      testServer.close();
    }
    await globalTeardown();
  }, 30000);

  beforeEach(async () => {
    await beforeEachTest();
  });

  test('Payment released event is emitted without errors', async () => {
    console.log('[Test] Testing payment:released event emission...');

    const protocol = await createTestProtocol();
    const vulnerability = await createTestVulnerability(protocol.id);
    const payment = await createTestPayment(vulnerability.id, {
      status: 'COMPLETED',
      amount: 1000,
    });

    // Emit payment released event - should not throw
    await expect(
      emitPaymentReleased(
        protocol.id,
        payment.id,
        1000,
        '0x1234567890abcdef',
        '0xResearcherAddress',
        new Date(),
        'validation-123',
        'HIGH'
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Payment released event emitted successfully');
  }, 30000);

  test('Payment failed event is emitted without errors', async () => {
    console.log('[Test] Testing payment:failed event emission...');

    const protocol = await createTestProtocol();
    const vulnerability = await createTestVulnerability(protocol.id);
    const payment = await createTestPayment(vulnerability.id, {
      status: 'FAILED',
    });

    await expect(
      emitPaymentFailed(
        protocol.id,
        payment.id,
        'Insufficient pool balance',
        2,
        'validation-456'
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Payment failed event emitted successfully');
  }, 30000);

  test('Scan started event is emitted without errors', async () => {
    console.log('[Test] Testing scan:started event emission...');

    const protocol = await createTestProtocol();
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'RUNNING',
      },
    });

    await expect(
      emitScanStarted(
        scan.id,
        protocol.id,
        'researcher-agent',
        'main',
        'abc123'
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Scan started event emitted successfully');
  }, 30000);

  test('Scan progress event is emitted without errors', async () => {
    console.log('[Test] Testing scan:progress event emission...');

    const protocol = await createTestProtocol();
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'RUNNING',
      },
    });

    await expect(
      emitScanProgress(
        scan.id,
        protocol.id,
        'analyze',
        'RUNNING',
        50,
        'Analyzing contracts...'
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Scan progress event emitted successfully');
  }, 30000);

  test('Scan completed event is emitted without errors', async () => {
    console.log('[Test] Testing scan:completed event emission...');

    const protocol = await createTestProtocol();
    const scan = await prisma.scan.create({
      data: {
        protocolId: protocol.id,
        state: 'SUCCEEDED',
      },
    });

    const startedAt = new Date(Date.now() - 60000); // 1 minute ago

    await expect(
      emitScanCompleted(
        scan.id,
        protocol.id,
        'SUCCEEDED',
        3,
        startedAt
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Scan completed event emitted successfully');
  }, 30000);

  test('Agent task update event is emitted without errors', async () => {
    console.log('[Test] Testing agent:task_update event emission...');

    await expect(
      emitAgentTaskUpdate(
        'validator-agent',
        'Analyzing proof',
        75,
        new Date(Date.now() + 10000)
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Agent task update event emitted successfully');
  }, 30000);

  test('Protocol status change event is emitted without errors', async () => {
    console.log('[Test] Testing protocol:status_changed event emission...');

    const protocol = await createTestProtocol();

    await expect(
      emitProtocolStatusChange(protocol.id, {
        status: 'ACTIVE',
        registrationState: 'ACTIVE',
        registrationTxHash: '0xabc123',
        riskScore: 0.25,
      })
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Protocol status change event emitted successfully');
  }, 30000);

  test('Vulnerability status change event is emitted without errors', async () => {
    console.log('[Test] Testing vuln:status_changed event emission...');

    const protocol = await createTestProtocol();
    const vulnerability = await createTestVulnerability(protocol.id);

    await expect(
      emitVulnerabilityStatusChanged(
        protocol.id,
        vulnerability.id,
        'PENDING',
        'ACKNOWLEDGED',
        'HIGH',
        { paymentAmount: 1000 }
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Vulnerability status change event emitted successfully');
  }, 30000);

  test('Bounty pool update event is emitted without errors', async () => {
    console.log('[Test] Testing bounty_pool:updated event emission...');

    const protocol = await createTestProtocol({
      totalBountyPool: 10000,
      availableBounty: 10000,
    });

    await expect(
      emitBountyPoolUpdated(
        protocol.id,
        10000,
        9000,
        1000,
        'PAYMENT_RELEASED',
        1000
      )
    ).resolves.not.toThrow();

    console.log('[Test] ✓ Bounty pool update event emitted successfully');
  }, 30000);

  test('Socket IO instance is properly set and accessible', async () => {
    console.log('[Test] Testing Socket IO instance management...');

    const io = getSocketIO();
    expect(io).toBeDefined();
    expect(io).toBe(testIo);

    console.log('[Test] ✓ Socket IO instance accessible');
  }, 30000);
});
