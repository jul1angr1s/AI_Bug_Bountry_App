/**
 * Integration Tests: x.402 Payment Gate Middleware
 *
 * Tests the x.402 payment gate middleware behavior in the Express route context.
 * Uses supertest with a minimal Express app to test actual HTTP responses.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Use vi.hoisted so mock objects are available when vi.mock factories run (hoisted above imports)
const { mockPrisma, mockEscrowService } = vi.hoisted(() => {
  const mockPrisma = {
    x402PaymentRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  const mockEscrowService = {
    canSubmitFinding: vi.fn(),
    getEscrowBalance: vi.fn(),
  };
  return { mockPrisma, mockEscrowService };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(() => ({
      getTransactionReceipt: vi.fn().mockResolvedValue(null),
    })),
    id: vi.fn((_sig: string) => '0x' + 'a'.repeat(64)),
    getAddress: vi.fn((addr: string) => addr),
  },
}));

vi.mock('../../src/services/escrow.service.js', () => ({
  escrowService: mockEscrowService,
  EscrowService: vi.fn(() => mockEscrowService),
}));

import {
  x402ProtocolRegistrationGate,
  x402FindingSubmissionGate,
} from '../../src/middleware/x402-payment-gate.middleware.js';

function createTestApp() {
  const app = express();
  app.use(express.json());

  app.post(
    '/protocols',
    x402ProtocolRegistrationGate(),
    (_req, res) => res.status(201).json({ success: true })
  );

  app.post(
    '/scans',
    x402FindingSubmissionGate(),
    (_req, res) => res.status(201).json({ success: true })
  );

  return app;
}

describe('x402 Payment Gate Integration', () => {
  let app: express.Application;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.x402PaymentRequest.findFirst.mockResolvedValue(null);
    mockPrisma.x402PaymentRequest.create.mockResolvedValue({ id: 'test' });
    app = createTestApp();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Protocol Registration Gate', () => {
    test('returns 402 when no receipt provided and SKIP_X402_PAYMENT_GATE=false', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'false';
      app = createTestApp();

      const res = await request(app)
        .post('/protocols')
        .send({ ownerAddress: '0x1234' });

      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Payment Required');
    });

    test('returns 402 response with valid x.402 format', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'false';
      app = createTestApp();

      const res = await request(app)
        .post('/protocols')
        .send({ ownerAddress: '0x1234' });

      expect(res.status).toBe(402);
      expect(res.body.x402).toBeDefined();
      expect(res.body.x402.version).toBe('1.0');
      expect(res.body.x402.amount).toBe('1000000');
      expect(res.body.x402.asset).toBeDefined();
      expect(res.body.x402.chain).toBe('base-sepolia');
      expect(res.body.x402.recipient).toBeDefined();
    });

    test('passes when SKIP_X402_PAYMENT_GATE=true', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'true';
      app = createTestApp();

      const res = await request(app)
        .post('/protocols')
        .send({ ownerAddress: '0x1234' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Finding Submission Gate', () => {
    test('returns 400 when no researcher wallet provided', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'false';
      app = createTestApp();

      const res = await request(app)
        .post('/scans')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Bad Request');
    });

    test('returns 402 when researcher has no escrow balance', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'false';
      app = createTestApp();
      mockEscrowService.canSubmitFinding.mockResolvedValue(false);
      mockEscrowService.getEscrowBalance.mockResolvedValue({
        balance: BigInt(0),
        totalDeposited: BigInt(0),
        totalDeducted: BigInt(0),
        remainingSubmissions: 0,
      });

      const res = await request(app)
        .post('/scans')
        .send({ researcherAddress: '0x1234567890abcdef1234567890abcdef12345678' });

      expect(res.status).toBe(402);
      expect(res.body.error).toBe('Insufficient Escrow Balance');
    });

    test('passes when researcher has sufficient escrow balance', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'false';
      app = createTestApp();
      mockEscrowService.canSubmitFinding.mockResolvedValue(true);

      const res = await request(app)
        .post('/scans')
        .send({ researcherAddress: '0x1234567890abcdef1234567890abcdef12345678' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('passes when SKIP_X402_PAYMENT_GATE=true', async () => {
      process.env.SKIP_X402_PAYMENT_GATE = 'true';
      app = createTestApp();

      const res = await request(app)
        .post('/scans')
        .send({});

      expect(res.status).toBe(201);
    });
  });
});
