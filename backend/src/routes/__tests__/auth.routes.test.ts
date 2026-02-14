import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Wallet } from 'ethers';
import request from 'supertest';
import express, { Express } from 'express';

// Mock Supabase before importing routes
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: vi.fn(),
        createUser: vi.fn(),
        updateUserById: vi.fn(),
        generateLink: vi.fn(),
      },
    },
  },
}));

import authRoutes from '../auth.routes.js';
import { supabaseAdmin } from '../../lib/supabase.js';

// Cast to access mock functions
const mockSupabaseAdmin = supabaseAdmin as any;

// Create Express app for testing
let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  vi.clearAllMocks();
});

describe('SIWE Authentication Routes', () => {
  let testWallet: Wallet;
  let testMessage: string;

  beforeEach(() => {
    testWallet = Wallet.createRandom();
    testMessage = `Sign in to Thunder Security Bug Bounty Platform\n\nWallet: ${testWallet.address}\nNonce: test-nonce-${Date.now()}`;
  });

  describe('POST /api/v1/auth/siwe', () => {
    // Test 1: Valid signature creates new user
    it('should verify valid SIWE signature and create new user', async () => {
      const signature = await testWallet.signMessage(testMessage);

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-new-123',
            email: `${testWallet.address.toLowerCase()}@wallet.local`,
          },
        },
        error: null,
      });

      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: `https://test.supabase.co/auth/v1/verify?token=magic-token-new&type=magiclink`,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: testWallet.address,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.access_token).toBe('magic-token-new');
      expect(response.body.user).toEqual({
        id: 'user-new-123',
        wallet_address: testWallet.address,
      });

      // Verify createUser was called with correct parameters
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: `${testWallet.address.toLowerCase()}@wallet.local`,
          user_metadata: expect.objectContaining({
            wallet_address: testWallet.address,
            siwe_verified: true,
          }),
        })
      );
    });

    // Test 2: Valid signature updates existing user
    it('should verify valid signature and update existing user on re-authentication', async () => {
      const signature = await testWallet.signMessage(testMessage);

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            {
              id: 'user-existing-456',
              email: `${testWallet.address.toLowerCase()}@wallet.local`,
              user_metadata: {
                wallet_address: testWallet.address,
                siwe_verified: true,
                verified_at: '2026-02-06T00:00:00Z',
              },
            },
          ],
        },
      });

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: { user: { id: 'user-existing-456' } },
        error: null,
      });

      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: `https://test.supabase.co/auth/v1/verify?token=magic-token-existing&type=magiclink`,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: testWallet.address,
        });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('user-existing-456');

      // Verify createUser was NOT called
      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();

      // Verify updateUserById was called
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        'user-existing-456',
        expect.objectContaining({
          user_metadata: expect.objectContaining({
            wallet_address: testWallet.address,
            siwe_verified: true,
          }),
        })
      );
    });

    // Test 3: Invalid signature rejected
    it('should reject invalid SIWE signature (different signer)', async () => {
      const differentWallet = Wallet.createRandom();
      const invalidSignature = await differentWallet.signMessage(testMessage);

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature: invalidSignature,
          walletAddress: testWallet.address, // Different from signer
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid signature' });
      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    // Test 4: Mismatched wallet addresses
    it('should reject mismatched wallet address', async () => {
      const signature = await testWallet.signMessage(testMessage);
      const differentAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: differentAddress,
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid signature' });
    });

    // Test 5: Invalid wallet address format
    it('should reject invalid wallet address format (400 validation error)', async () => {
      const signature = await testWallet.signMessage(testMessage);

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: 'not-a-valid-address',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request body');
      expect(response.body).toHaveProperty('details');
    });

    // Test 6: Missing required fields
    it('should reject request missing required fields (400 validation error)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          // Missing signature and walletAddress
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request body');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'signature' }),
          expect.objectContaining({ field: 'walletAddress' }),
        ])
      );
    });

    // Test 7: Invalid signature format
    it('should reject invalid signature format (400 validation error)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature: 'not-a-hex-string',
          walletAddress: testWallet.address,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request body');
    });

    // Test 8: Supabase user creation error
    it('should return 500 when Supabase user creation fails', async () => {
      const signature = await testWallet.signMessage(testMessage);

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: new Error('Supabase connection failed'),
      });

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: testWallet.address,
        });

      expect(response.status).toBe(500);
    });

    // Test 9: Supabase token generation error
    it('should return 500 when magic link token generation fails', async () => {
      const signature = await testWallet.signMessage(testMessage);

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: `${testWallet.address.toLowerCase()}@wallet.local`,
          },
        },
        error: null,
      });

      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: new Error('Token generation failed'),
      });

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: testWallet.address,
        });

      expect(response.status).toBe(500);
    });

    // Test 10: Case-insensitive wallet address handling
    it('should handle case-insensitive wallet addresses correctly', async () => {
      const signature = await testWallet.signMessage(testMessage);
      const upperCaseAddress = testWallet.address.toUpperCase();

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
      });

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-case-123',
            email: `${testWallet.address.toLowerCase()}@wallet.local`,
          },
        },
        error: null,
      });

      mockSupabaseAdmin.auth.admin.generateLink.mockResolvedValue({
        data: {
          properties: {
            action_link: `https://test.supabase.co/auth/v1/verify?token=token-case&type=magiclink`,
          },
        },
        error: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/siwe')
        .send({
          message: testMessage,
          signature,
          walletAddress: upperCaseAddress, // Use uppercase
        });

      expect(response.status).toBe(200);
      expect(response.body.user.wallet_address).toBe(upperCaseAddress);
    });
  });
});
