import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server.js';
import { getPrismaClient } from '../../src/lib/prisma.js';
import { generateAuthToken } from '../../src/lib/auth.js';

const prisma = getPrismaClient();

describe('Payment Proposal Integration Tests', () => {
  let authToken: string;
  let testProtocolId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test-proposal@example.com',
        passwordHash: 'hashed-password',
        walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      },
    });
    testUserId = user.id;
    authToken = generateAuthToken({ userId: user.id });

    // Create test protocol with bounty pool
    const protocol = await prisma.protocol.create({
      data: {
        contractAddress: '0x1234567890123456789012345678901234567890',
        network: 'BASE_SEPOLIA',
        githubUrl: 'https://github.com/test/repo',
        branch: 'main',
        status: 'ACTIVE',
        totalBountyPool: 50,
        availableBounty: 50,
        paidBounty: 0,
      },
    });
    testProtocolId = protocol.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.protocol.deleteMany({
      where: { id: testProtocolId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/payments/propose', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'This is a valid justification for testing purposes',
        });

      expect(response.status).toBe(401);
    });

    it('should accept valid payment proposal', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'This is a valid justification for testing purposes',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('protocolId', testProtocolId);
      expect(response.body.data).toHaveProperty('recipientAddress', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
      expect(response.body.data).toHaveProperty('severity', 'HIGH');
      expect(response.body.data).toHaveProperty('amount', 5);
      expect(response.body.data).toHaveProperty('status', 'PENDING_REVIEW');
      expect(response.body).toHaveProperty('message', 'Payment proposal submitted successfully');
    });

    it('should calculate correct amount for HIGH severity', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'Valid justification for HIGH severity payment',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(5);
    });

    it('should calculate correct amount for MEDIUM severity', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'MEDIUM',
          justification: 'Valid justification for MEDIUM severity payment',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(3);
    });

    it('should calculate correct amount for LOW severity', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'LOW',
          justification: 'Valid justification for LOW severity payment',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.amount).toBe(1);
    });

    it('should reject invalid protocol ID', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: 'invalid-uuid',
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'Valid justification text here',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid Ethereum address', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: 'invalid-address',
          severity: 'HIGH',
          justification: 'Valid justification text here',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid severity level', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'INVALID',
          justification: 'Valid justification text here',
        });

      expect(response.status).toBe(400);
    });

    it('should reject justification that is too short', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'Too short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('at least 20 characters');
    });

    it('should reject justification that is too long', async () => {
      const longText = 'a'.repeat(501);
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: longText,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('less than 500 characters');
    });

    it('should reject proposal for non-existent protocol', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: '123e4567-e89b-12d3-a456-426614174000',
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH',
          justification: 'Valid justification for non-existent protocol',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PROTOCOL_NOT_FOUND');
    });

    it('should reject proposal when insufficient balance', async () => {
      // Create protocol with low balance
      const lowBalanceProtocol = await prisma.protocol.create({
        data: {
          contractAddress: '0x9876543210987654321098765432109876543210',
          network: 'BASE_SEPOLIA',
          githubUrl: 'https://github.com/test/repo2',
          branch: 'main',
          status: 'ACTIVE',
          totalBountyPool: 2,
          availableBounty: 2,
          paidBounty: 0,
        },
      });

      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: lowBalanceProtocol.id,
          recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          severity: 'HIGH', // Requires 5 USDC but only 2 available
          justification: 'Valid justification for high severity payment',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(response.body.error.message).toContain('Insufficient pool balance');

      // Cleanup
      await prisma.protocol.delete({
        where: { id: lowBalanceProtocol.id },
      });
    });

    it('should require all fields', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should trim and validate recipient address properly', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '  0x71C7656EC7ab88b098defB751B7401B5f6d8976F  ',
          severity: 'HIGH',
          justification: 'Testing address trimming behavior',
        });

      // Should fail because validator doesn't trim by default
      expect(response.status).toBe(400);
    });

    it('should accept valid proposal with MEDIUM severity', async () => {
      const response = await request(app)
        .post('/api/v1/payments/propose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          protocolId: testProtocolId,
          recipientAddress: '0x3A2B1C4D5E6F7890abcdef1234567890abcdefB14',
          severity: 'MEDIUM',
          justification: 'Emergency payment for critical bug discovery outside normal flow',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.severity).toBe('MEDIUM');
      expect(response.body.data.amount).toBe(3);
      expect(response.body.data.recipientAddress).toBe('0x3A2B1C4D5E6F7890abcdef1234567890abcdefB14');
    });
  });
});
