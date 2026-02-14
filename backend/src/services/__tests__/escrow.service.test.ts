import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Hoisted mocks - vi.hoisted ensures these are available when vi.mock factories
// execute (vi.mock calls are hoisted above all other code by vitest).
// =============================================================================

const { mockPrisma, mockEscrowClient } = vi.hoisted(() => {
  const mockPrisma: any = {
    agentIdentity: {
      findUnique: vi.fn(),
    },
    agentEscrow: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    escrowTransaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockEscrowClient: any = {
    verifyUsdcTransfer: vi.fn(),
    getAddress: vi.fn().mockReturnValue('0xescrowcontract'),
    getBalance: vi.fn().mockResolvedValue(BigInt(5000000)),
    deductSubmissionFee: vi.fn().mockResolvedValue({
      txHash: '0xdeducttx',
      feeAmount: BigInt(500000),
      remainingBalance: BigInt(4500000),
      blockNumber: 12345,
    }),
    getSubmissionFee: vi.fn().mockResolvedValue(BigInt(500000)),
    getProtocolRegistrationFee: vi.fn().mockResolvedValue(BigInt(1000000)),
    canSubmitFinding: vi.fn().mockResolvedValue(true),
  };

  return { mockPrisma, mockEscrowClient };
});

// =============================================================================
// vi.mock calls (hoisted to top by vitest; factory closures reference hoisted vars)
// =============================================================================

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    agentIdentity = mockPrisma.agentIdentity;
    agentEscrow = mockPrisma.agentEscrow;
    escrowTransaction = mockPrisma.escrowTransaction;
    $transaction = mockPrisma.$transaction;
  },
}));

vi.mock('../../blockchain/contracts/PlatformEscrowClient.js', () => ({
  PlatformEscrowClient: class MockPlatformEscrowClient {
    verifyUsdcTransfer = mockEscrowClient.verifyUsdcTransfer;
    getAddress = mockEscrowClient.getAddress;
    getBalance = mockEscrowClient.getBalance;
    deductSubmissionFee = mockEscrowClient.deductSubmissionFee;
    getSubmissionFee = mockEscrowClient.getSubmissionFee;
    getProtocolRegistrationFee = mockEscrowClient.getProtocolRegistrationFee;
    canSubmitFinding = mockEscrowClient.canSubmitFinding;
  },
}));

// =============================================================================
// Import service under test (after mocks are declared)
// =============================================================================
import { EscrowService } from '../escrow.service.js';

// =============================================================================
// Test data factories
// =============================================================================

function makeAgent(overrides: Record<string, any> = {}) {
  return {
    id: 'agent-001',
    walletAddress: '0xagent123',
    escrowBalance: {
      id: 'escrow-001',
      agentIdentityId: 'agent-001',
      balance: BigInt(5000000), // 5 USDC
      totalDeposited: BigInt(10000000),
      totalDeducted: BigInt(5000000),
    },
    ...overrides,
  };
}

function makeAgentWithoutEscrow(overrides: Record<string, any> = {}) {
  return {
    id: 'agent-002',
    walletAddress: '0xagent456',
    escrowBalance: null,
    ...overrides,
  };
}

function makeTransaction(overrides: Record<string, any> = {}) {
  return {
    id: 'tx-001',
    agentEscrowId: 'escrow-001',
    transactionType: 'DEPOSIT',
    amount: BigInt(1000000),
    txHash: '0xtxhash',
    findingId: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('EscrowService', () => {
  let service: EscrowService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    service = new EscrowService();

    // Restore default mock return values that clearAllMocks wipes
    mockEscrowClient.getAddress.mockReturnValue('0xescrowcontract');
    mockEscrowClient.getBalance.mockResolvedValue(BigInt(5000000));
    mockEscrowClient.getSubmissionFee.mockResolvedValue(BigInt(500000));
    mockEscrowClient.getProtocolRegistrationFee.mockResolvedValue(BigInt(1000000));
    mockEscrowClient.deductSubmissionFee.mockResolvedValue({
      txHash: '0xdeducttx',
      feeAmount: BigInt(500000),
      remainingBalance: BigInt(4500000),
      blockNumber: 12345,
    });
  });

  // ===========================================================================
  // depositEscrow
  // ===========================================================================
  describe('depositEscrow', () => {
    it('creates new escrow balance for agent without existing balance', async () => {
      const agent = makeAgentWithoutEscrow();
      const newEscrow = {
        id: 'escrow-new',
        agentIdentityId: agent.id,
        balance: BigInt(1000000),
        totalDeposited: BigInt(1000000),
      };

      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)         // depositEscrow lookup
        .mockResolvedValueOnce({              // getEscrowBalance lookup
          ...agent,
          escrowBalance: {
            id: 'escrow-new',
            balance: BigInt(1000000),
            totalDeposited: BigInt(1000000),
            totalDeducted: BigInt(0),
          },
        });
      mockPrisma.agentEscrow.create.mockResolvedValue(newEscrow);
      mockPrisma.agentEscrow.findUnique.mockResolvedValue(newEscrow);
      mockPrisma.escrowTransaction.create.mockResolvedValue({});
      mockPrisma.escrowTransaction.findFirst.mockResolvedValue(null);

      const result = await service.depositEscrow('0xagent456', BigInt(1000000));

      expect(mockPrisma.agentEscrow.create).toHaveBeenCalledTimes(1);
      expect(result.balance).toBe(BigInt(1000000));
    });

    it('updates existing escrow balance for agent with balance', async () => {
      const agent = makeAgent();

      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)         // depositEscrow lookup
        .mockResolvedValueOnce({              // getEscrowBalance lookup
          ...agent,
          escrowBalance: {
            ...agent.escrowBalance,
            balance: BigInt(6000000),
            totalDeposited: BigInt(11000000),
          },
        });
      mockPrisma.agentEscrow.update.mockResolvedValue({});
      mockPrisma.escrowTransaction.create.mockResolvedValue({});

      const result = await service.depositEscrow('0xagent123', BigInt(1000000));

      expect(mockPrisma.agentEscrow.update).toHaveBeenCalledTimes(1);
      const updateCall = mockPrisma.agentEscrow.update.mock.calls[0][0];
      expect(updateCall.data.balance).toEqual({ increment: BigInt(1000000) });
      expect(updateCall.data.totalDeposited).toEqual({ increment: BigInt(1000000) });
    });

    it('throws when agent not found', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      await expect(
        service.depositEscrow('0xunknown', BigInt(1000000))
      ).rejects.toThrow('Agent not found');
    });

    it('verifies on-chain USDC transfer when txHash provided', async () => {
      const agent = makeAgent();

      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)
        .mockResolvedValueOnce(agent);
      mockPrisma.escrowTransaction.findFirst.mockResolvedValue(null);
      mockPrisma.agentEscrow.update.mockResolvedValue({});
      mockPrisma.escrowTransaction.create.mockResolvedValue({});

      mockEscrowClient.verifyUsdcTransfer.mockResolvedValue({
        valid: true,
        actualAmount: BigInt(1000000),
        sender: '0xagent123',
      });

      await service.depositEscrow('0xagent123', BigInt(1000000), '0xtxhash');

      expect(mockEscrowClient.verifyUsdcTransfer).toHaveBeenCalledWith(
        '0xtxhash',
        '0xescrowcontract',
        BigInt(1000000)
      );
    });

    it('throws when on-chain verification fails', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      mockEscrowClient.verifyUsdcTransfer.mockResolvedValue({
        valid: false,
        actualAmount: BigInt(0),
        sender: '',
      });

      await expect(
        service.depositEscrow('0xagent123', BigInt(1000000), '0xbadtx')
      ).rejects.toThrow('verification failed');
    });

    it('throws when sender does not match depositor', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      mockEscrowClient.verifyUsdcTransfer.mockResolvedValue({
        valid: true,
        actualAmount: BigInt(1000000),
        sender: '0xdifferentwallet',
      });

      await expect(
        service.depositEscrow('0xagent123', BigInt(1000000), '0xtxhash')
      ).rejects.toThrow('Sender mismatch');
    });

    it('throws on replay attack with duplicate txHash', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);
      mockPrisma.escrowTransaction.findFirst.mockResolvedValue(makeTransaction());

      mockEscrowClient.verifyUsdcTransfer.mockResolvedValue({
        valid: true,
        actualAmount: BigInt(1000000),
        sender: '0xagent123',
      });

      await expect(
        service.depositEscrow('0xagent123', BigInt(1000000), '0xtxhash')
      ).rejects.toThrow('replay detected');
    });

    it('creates escrow transaction record after deposit', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)
        .mockResolvedValueOnce(agent);
      mockPrisma.agentEscrow.update.mockResolvedValue({});
      mockPrisma.escrowTransaction.create.mockResolvedValue({});

      await service.depositEscrow('0xagent123', BigInt(1000000));

      expect(mockPrisma.escrowTransaction.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.escrowTransaction.create.mock.calls[0][0];
      expect(createCall.data.transactionType).toBe('DEPOSIT');
      expect(createCall.data.amount).toBe(BigInt(1000000));
    });

    it('lowercases wallet address for lookup', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)
        .mockResolvedValueOnce(agent);
      mockPrisma.agentEscrow.update.mockResolvedValue({});
      mockPrisma.escrowTransaction.create.mockResolvedValue({});

      await service.depositEscrow('0xAGENT123', BigInt(1000000));

      const whereArg = mockPrisma.agentIdentity.findUnique.mock.calls[0][0].where;
      expect(whereArg.walletAddress).toBe('0xagent123');
    });
  });

  // ===========================================================================
  // deductSubmissionFee
  // ===========================================================================
  describe('deductSubmissionFee', () => {
    it('deducts submission fee from escrow balance', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)         // deductSubmissionFee lookup
        .mockResolvedValueOnce({              // getEscrowBalance lookup
          ...agent,
          escrowBalance: {
            ...agent.escrowBalance,
            balance: BigInt(4500000),
            totalDeducted: BigInt(5500000),
          },
        });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.deductSubmissionFee(
        '0xagent123',
        'finding-001'
      );

      expect(result.balance).toBe(BigInt(4500000));
    });

    it('throws when agent not found', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      await expect(
        service.deductSubmissionFee('0xunknown', 'finding-001')
      ).rejects.toThrow('Agent escrow not found');
    });

    it('throws when agent has no escrow balance', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(
        makeAgentWithoutEscrow()
      );

      await expect(
        service.deductSubmissionFee('0xagent456', 'finding-001')
      ).rejects.toThrow('Agent escrow not found');
    });

    it('throws when insufficient balance', async () => {
      const agent = makeAgent({
        escrowBalance: {
          id: 'escrow-001',
          agentIdentityId: 'agent-001',
          balance: BigInt(100000), // 0.1 USDC, less than 0.5 USDC fee
          totalDeposited: BigInt(100000),
          totalDeducted: BigInt(0),
        },
      });
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      await expect(
        service.deductSubmissionFee('0xagent123', 'finding-001')
      ).rejects.toThrow('Insufficient escrow balance');
    });

    it('uses atomic transaction for deduction', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)
        .mockResolvedValueOnce(agent);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.deductSubmissionFee('0xagent123', 'finding-001');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('lowercases wallet address for lookup', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique
        .mockResolvedValueOnce(agent)
        .mockResolvedValueOnce(agent);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.deductSubmissionFee('0xAGENT123', 'finding-001');

      const whereArg = mockPrisma.agentIdentity.findUnique.mock.calls[0][0].where;
      expect(whereArg.walletAddress).toBe('0xagent123');
    });
  });

  // ===========================================================================
  // getEscrowBalance
  // ===========================================================================
  describe('getEscrowBalance', () => {
    it('returns balance details for agent with escrow', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.getEscrowBalance('0xagent123');

      expect(result.balance).toBe(BigInt(5000000));
      expect(result.totalDeposited).toBe(BigInt(10000000));
      expect(result.totalDeducted).toBe(BigInt(5000000));
      expect(result.remainingSubmissions).toBe(10); // 5000000 / 500000
    });

    it('returns zero balance for unknown agent', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      const result = await service.getEscrowBalance('0xunknown');

      expect(result.balance).toBe(BigInt(0));
      expect(result.totalDeposited).toBe(BigInt(0));
      expect(result.totalDeducted).toBe(BigInt(0));
      expect(result.remainingSubmissions).toBe(0);
    });

    it('returns zero balance for agent without escrow', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(
        makeAgentWithoutEscrow()
      );

      const result = await service.getEscrowBalance('0xagent456');

      expect(result.balance).toBe(BigInt(0));
      expect(result.remainingSubmissions).toBe(0);
    });

    it('calculates remaining submissions correctly', async () => {
      const agent = makeAgent({
        escrowBalance: {
          id: 'escrow-001',
          agentIdentityId: 'agent-001',
          balance: BigInt(2500000), // 2.5 USDC = 5 submissions
          totalDeposited: BigInt(5000000),
          totalDeducted: BigInt(2500000),
        },
      });
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.getEscrowBalance('0xagent123');

      expect(result.remainingSubmissions).toBe(5);
    });

    it('truncates partial submissions in remaining count', async () => {
      const agent = makeAgent({
        escrowBalance: {
          id: 'escrow-001',
          agentIdentityId: 'agent-001',
          balance: BigInt(750000), // 0.75 USDC = 1 full submission (truncated)
          totalDeposited: BigInt(1000000),
          totalDeducted: BigInt(250000),
        },
      });
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.getEscrowBalance('0xagent123');

      expect(result.remainingSubmissions).toBe(1); // Truncated from 1.5
    });

    it('lowercases wallet address for lookup', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      await service.getEscrowBalance('0xABCDEF');

      const whereArg = mockPrisma.agentIdentity.findUnique.mock.calls[0][0].where;
      expect(whereArg.walletAddress).toBe('0xabcdef');
    });
  });

  // ===========================================================================
  // canSubmitFinding
  // ===========================================================================
  describe('canSubmitFinding', () => {
    it('returns true when agent has sufficient balance', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.canSubmitFinding('0xagent123');

      expect(result).toBe(true);
    });

    it('returns false when agent has no escrow', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      const result = await service.canSubmitFinding('0xunknown');

      expect(result).toBe(false);
    });

    it('returns false when balance is below submission fee', async () => {
      const agent = makeAgent({
        escrowBalance: {
          id: 'escrow-001',
          agentIdentityId: 'agent-001',
          balance: BigInt(100000), // 0.1 USDC < 0.5 USDC fee
          totalDeposited: BigInt(100000),
          totalDeducted: BigInt(0),
        },
      });
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.canSubmitFinding('0xagent123');

      expect(result).toBe(false);
    });

    it('returns true when balance exactly equals submission fee', async () => {
      const agent = makeAgent({
        escrowBalance: {
          id: 'escrow-001',
          agentIdentityId: 'agent-001',
          balance: BigInt(500000), // Exactly 0.5 USDC
          totalDeposited: BigInt(500000),
          totalDeducted: BigInt(0),
        },
      });
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);

      const result = await service.canSubmitFinding('0xagent123');

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // getTransactionHistory
  // ===========================================================================
  describe('getTransactionHistory', () => {
    it('returns transaction history for agent with escrow', async () => {
      const agent = makeAgent();
      const transactions = [
        makeTransaction({ id: 'tx-001', transactionType: 'DEPOSIT' }),
        makeTransaction({ id: 'tx-002', transactionType: 'SUBMISSION_FEE' }),
      ];
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);
      mockPrisma.escrowTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getTransactionHistory('0xagent123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx-001');
      expect(result[1].transactionType).toBe('SUBMISSION_FEE');
    });

    it('returns empty array for unknown agent', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(null);

      const result = await service.getTransactionHistory('0xunknown');

      expect(result).toEqual([]);
    });

    it('returns empty array for agent without escrow', async () => {
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(
        makeAgentWithoutEscrow()
      );

      const result = await service.getTransactionHistory('0xagent456');

      expect(result).toEqual([]);
    });

    it('orders transactions by createdAt descending', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);
      mockPrisma.escrowTransaction.findMany.mockResolvedValue([]);

      await service.getTransactionHistory('0xagent123');

      const findManyArg = mockPrisma.escrowTransaction.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('queries transactions by escrow balance ID', async () => {
      const agent = makeAgent();
      mockPrisma.agentIdentity.findUnique.mockResolvedValue(agent);
      mockPrisma.escrowTransaction.findMany.mockResolvedValue([]);

      await service.getTransactionHistory('0xagent123');

      const findManyArg = mockPrisma.escrowTransaction.findMany.mock.calls[0][0];
      expect(findManyArg.where.agentEscrowId).toBe('escrow-001');
    });
  });

  // ===========================================================================
  // getSubmissionFee
  // ===========================================================================
  describe('getSubmissionFee', () => {
    it('returns submission fee from on-chain contract', async () => {
      const result = await service.getSubmissionFee();

      expect(result).toBe(BigInt(500000));
    });

    it('returns default fee when contract call fails', async () => {
      mockEscrowClient.getSubmissionFee.mockRejectedValue(
        new Error('Contract not deployed')
      );

      const result = await service.getSubmissionFee();

      expect(result).toBe(BigInt(500000)); // 0.5 USDC default
    });
  });

  // ===========================================================================
  // getProtocolRegistrationFee
  // ===========================================================================
  describe('getProtocolRegistrationFee', () => {
    it('returns protocol registration fee from on-chain contract', async () => {
      const result = await service.getProtocolRegistrationFee();

      expect(result).toBe(BigInt(1000000));
    });

    it('returns default fee when contract call fails', async () => {
      mockEscrowClient.getProtocolRegistrationFee.mockRejectedValue(
        new Error('Contract not deployed')
      );

      const result = await service.getProtocolRegistrationFee();

      expect(result).toBe(BigInt(1000000)); // 1 USDC default
    });
  });
});
