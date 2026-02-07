/**
 * Unit Tests: Escrow Fee Deduction
 *
 * Tests the EscrowService.deductSubmissionFee method for proper
 * balance validation, fee deduction, and transaction recording.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock objects are available when vi.mock factories run (hoisted above imports)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    agentIdentity: {
      findUnique: vi.fn(),
    },
    agentEscrow: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    escrowTransaction: {
      create: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(() => ({})),
    Wallet: vi.fn(() => ({})),
    Contract: vi.fn(() => ({})),
  },
}));

import { EscrowService } from '../../src/services/escrow.service.js';

describe('EscrowService.deductSubmissionFee', () => {
  let service: EscrowService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EscrowService();
  });

  test('throws when agent not found', async () => {
    mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

    await expect(
      service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', 'finding-1')
    ).rejects.toThrow('Agent escrow not found');
  });

  test('throws when escrow balance not initialized', async () => {
    mockPrisma.agentIdentity.findUnique.mockResolvedValue({
      id: 'agent-1',
      walletAddress: '0x1234',
      escrowBalance: null,
    });

    await expect(
      service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', 'finding-1')
    ).rejects.toThrow('Agent escrow not found');
  });

  test('throws when balance < 500000', async () => {
    mockPrisma.agentIdentity.findUnique.mockResolvedValue({
      id: 'agent-1',
      walletAddress: '0x1234',
      escrowBalance: {
        id: 'escrow-1',
        agentIdentityId: 'agent-1',
        balance: BigInt(100000), // Only 0.1 USDC
        totalDeposited: BigInt(100000),
        totalDeducted: BigInt(0),
      },
    });

    await expect(
      service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', 'finding-1')
    ).rejects.toThrow('Insufficient escrow balance');
  });

  test('decrements balance by 500000 on successful deduction', async () => {
    mockPrisma.agentIdentity.findUnique.mockResolvedValue({
      id: 'agent-1',
      walletAddress: '0x1234',
      escrowBalance: {
        id: 'escrow-1',
        agentIdentityId: 'agent-1',
        balance: BigInt(1000000), // 1 USDC
        totalDeposited: BigInt(1000000),
        totalDeducted: BigInt(0),
      },
    });

    mockPrisma.agentEscrow.update.mockResolvedValue({});
    mockPrisma.escrowTransaction.create.mockResolvedValue({});

    // Mock getEscrowBalance for the return value
    const getBalanceSpy = vi.spyOn(service, 'getEscrowBalance').mockResolvedValue({
      balance: BigInt(500000),
      totalDeposited: BigInt(1000000),
      totalDeducted: BigInt(500000),
      remainingSubmissions: 1,
    });

    await service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', 'finding-1');

    expect(mockPrisma.agentEscrow.update).toHaveBeenCalledWith({
      where: { agentIdentityId: 'agent-1' },
      data: {
        balance: { decrement: BigInt(500000) },
        totalDeducted: { increment: BigInt(500000) },
      },
    });

    getBalanceSpy.mockRestore();
  });

  test('creates EscrowTransaction with type SUBMISSION_FEE', async () => {
    mockPrisma.agentIdentity.findUnique.mockResolvedValue({
      id: 'agent-1',
      walletAddress: '0x1234',
      escrowBalance: {
        id: 'escrow-1',
        agentIdentityId: 'agent-1',
        balance: BigInt(1000000),
        totalDeposited: BigInt(1000000),
        totalDeducted: BigInt(0),
      },
    });

    mockPrisma.agentEscrow.update.mockResolvedValue({});
    mockPrisma.escrowTransaction.create.mockResolvedValue({});

    const getBalanceSpy = vi.spyOn(service, 'getEscrowBalance').mockResolvedValue({
      balance: BigInt(500000),
      totalDeposited: BigInt(1000000),
      totalDeducted: BigInt(500000),
      remainingSubmissions: 1,
    });

    await service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', 'finding-1');

    expect(mockPrisma.escrowTransaction.create).toHaveBeenCalledWith({
      data: {
        agentEscrowId: 'escrow-1',
        transactionType: 'SUBMISSION_FEE',
        amount: BigInt(500000),
        findingId: 'finding-1',
      },
    });

    getBalanceSpy.mockRestore();
  });

  test('records findingId in transaction', async () => {
    const specificFindingId = 'finding-abc-123';

    mockPrisma.agentIdentity.findUnique.mockResolvedValue({
      id: 'agent-1',
      walletAddress: '0x1234',
      escrowBalance: {
        id: 'escrow-1',
        agentIdentityId: 'agent-1',
        balance: BigInt(2000000),
        totalDeposited: BigInt(2000000),
        totalDeducted: BigInt(0),
      },
    });

    mockPrisma.agentEscrow.update.mockResolvedValue({});
    mockPrisma.escrowTransaction.create.mockResolvedValue({});

    const getBalanceSpy = vi.spyOn(service, 'getEscrowBalance').mockResolvedValue({
      balance: BigInt(1500000),
      totalDeposited: BigInt(2000000),
      totalDeducted: BigInt(500000),
      remainingSubmissions: 3,
    });

    await service.deductSubmissionFee('0x1234567890abcdef1234567890abcdef12345678', specificFindingId);

    const createCall = mockPrisma.escrowTransaction.create.mock.calls[0][0];
    expect(createCall.data.findingId).toBe(specificFindingId);

    getBalanceSpy.mockRestore();
  });
});
