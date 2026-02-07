/**
 * Unit Tests: x.402 Receipt Verification
 *
 * Tests the verifyX402Receipt function for proper on-chain verification,
 * replay prevention, and input validation.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock ethers before importing the module
vi.mock('ethers', () => {
  const mockProvider = {
    getTransactionReceipt: vi.fn(),
  };

  return {
    ethers: {
      JsonRpcProvider: vi.fn(() => mockProvider),
      id: vi.fn((sig: string) => '0x' + 'a'.repeat(64)),
      getAddress: vi.fn((addr: string) => addr),
    },
  };
});

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    x402PaymentRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock escrow service
vi.mock('../../src/services/escrow.service.js', () => ({
  escrowService: {
    canSubmitFinding: vi.fn(),
    getEscrowBalance: vi.fn(),
  },
}));

import { verifyX402Receipt } from '../../src/middleware/x402-payment-gate.middleware.js';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();
const mockProvider = new ethers.JsonRpcProvider() as any;

describe('verifyX402Receipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no replay found
    (prisma.x402PaymentRequest.findFirst as any).mockResolvedValue(null);
  });

  test('returns false for missing fields', async () => {
    const result = await verifyX402Receipt(
      { txHash: '', amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing');
  });

  test('returns false for missing amount', async () => {
    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
  });

  test('returns false for missing payer', async () => {
    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
  });

  test('returns false for invalid tx hash format', async () => {
    const result = await verifyX402Receipt(
      { txHash: 'invalid-hash', amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid transaction hash format');
  });

  test('returns false for too-short tx hash', async () => {
    const result = await verifyX402Receipt(
      { txHash: '0xabc', amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid transaction hash format');
  });

  test('returns false for non-existent tx (mock provider returns null)', async () => {
    mockProvider.getTransactionReceipt.mockResolvedValue(null);

    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Transaction not found');
  });

  test('returns false for failed tx (status=0)', async () => {
    mockProvider.getTransactionReceipt.mockResolvedValue({
      status: 0,
      logs: [],
    });

    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Transaction failed');
  });

  test('returns false when USDC transfer to wrong recipient', async () => {
    const wrongRecipient = '0x' + '0'.repeat(24) + 'b'.repeat(40);
    mockProvider.getTransactionReceipt.mockResolvedValue({
      status: 1,
      logs: [{
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        topics: [
          '0x' + 'a'.repeat(64), // Transfer topic
          '0x' + '0'.repeat(24) + '1234567890abcdef1234567890abcdef12345678', // from
          wrongRecipient, // to (wrong)
        ],
        data: '0x00000000000000000000000000000000000000000000000000000000000f4240', // 1000000
      }],
    });

    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
  });

  test('returns false when amount too low', async () => {
    const platformWallet = (process.env.PLATFORM_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000').toLowerCase();
    const paddedWallet = '0x' + '0'.repeat(24) + platformWallet.slice(2);

    mockProvider.getTransactionReceipt.mockResolvedValue({
      status: 1,
      logs: [{
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        topics: [
          '0x' + 'a'.repeat(64),
          '0x' + '0'.repeat(24) + '1234567890abcdef1234567890abcdef12345678',
          paddedWallet,
        ],
        data: '0x0000000000000000000000000000000000000000000000000000000000000001', // 1 (way too low)
      }],
    });

    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    // This might succeed in dev mode fallback, but the transfer check should fail
    expect(result.valid).toBe(false);
  });

  test('prevents replay (same tx hash rejected on second use)', async () => {
    (prisma.x402PaymentRequest.findFirst as any).mockResolvedValue({
      id: 'existing-id',
      txHash: '0x' + 'a'.repeat(64),
      status: 'COMPLETED',
    });

    const result = await verifyX402Receipt(
      { txHash: '0x' + 'a'.repeat(64), amount: '1000000', payer: '0x1234', timestamp: '' },
      '1000000'
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('replay');
  });
});
