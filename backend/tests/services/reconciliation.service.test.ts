import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';

// Mock dependencies
const mockPrismaClient = {
  payment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  paymentReconciliation: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  eventListenerState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const mockRedisClient = {
  status: 'ready',
};

const mockQueue = {
  add: vi.fn(),
  getRepeatableJobs: vi.fn(),
  removeRepeatableByKey: vi.fn(),
  close: vi.fn(),
};

const mockProvider = {
  getBlockNumber: vi.fn(),
};

const mockContract = {
  queryFilter: vi.fn(),
  filters: {
    BountyReleased: vi.fn(),
  },
  interface: {
    parseLog: vi.fn(),
  },
};

// Mock modules
vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

vi.mock('../../src/lib/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
}));

vi.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
}));

vi.mock('../../src/blockchain/config.js', () => ({
  provider: mockProvider,
  contractAddresses: {
    bountyPool: '0x' + '1'.repeat(40),
  },
  usdcConfig: {
    decimals: 6,
  },
}));

vi.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(() => mockContract),
    EventLog: class EventLog {},
    formatUnits: ethers.formatUnits,
  },
}));

// Import service after mocks
const {
  ReconciliationService,
  ReconciliationStatus,
  getReconciliationService,
} = await import('../../src/services/reconciliation.service.js');

describe('ReconciliationService', () => {
  let service: InstanceType<typeof ReconciliationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReconciliationService();
  });

  describe('initializePeriodicReconciliation', () => {
    it('should schedule periodic reconciliation job', async () => {
      mockQueue.getRepeatableJobs.mockResolvedValue([]);
      mockQueue.add.mockResolvedValue({});

      await service.initializePeriodicReconciliation();

      expect(mockQueue.add).toHaveBeenCalledWith(
        'payment-reconciliation',
        {},
        expect.objectContaining({
          repeat: {
            pattern: '*/10 * * * *', // Every 10 minutes
          },
          jobId: 'payment-reconciliation-periodic',
        })
      );
    });

    it('should remove existing repeatable jobs before adding new one', async () => {
      const existingJob = { key: 'old-job-key' };
      mockQueue.getRepeatableJobs.mockResolvedValue([existingJob]);
      mockQueue.removeRepeatableByKey.mockResolvedValue(true);
      mockQueue.add.mockResolvedValue({});

      await service.initializePeriodicReconciliation();

      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalledWith('old-job-key');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('reconcile', () => {
    it('should detect missing payments', async () => {
      const mockEvent = {
        bountyId: '0x' + 'a'.repeat(64),
        protocolId: '0x' + 'b'.repeat(64),
        validationId: '0x' + 'c'.repeat(64),
        researcher: '0x' + '1'.repeat(40),
        severity: 0,
        amount: BigInt(5000000000), // 5000 USDC
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        txHash: '0x' + 'd'.repeat(64),
        blockNumber: 12345,
      };

      // Mock blockchain event query
      mockProvider.getBlockNumber.mockResolvedValue(43200);
      mockContract.filters.BountyReleased.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValue([
        {
          topics: [],
          data: '0x',
          transactionHash: mockEvent.txHash,
          blockNumber: mockEvent.blockNumber,
        },
      ]);
      mockContract.interface.parseLog.mockReturnValue({
        name: 'BountyReleased',
        args: mockEvent,
      });

      // No database payments (missing payment scenario)
      mockPrismaClient.payment.findMany.mockResolvedValue([]);
      mockPrismaClient.paymentReconciliation.findFirst.mockResolvedValue(null);
      mockPrismaClient.paymentReconciliation.create.mockResolvedValue({});
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(0);

      await service.reconcile();

      expect(mockPrismaClient.paymentReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: null,
            onChainBountyId: mockEvent.validationId,
            txHash: mockEvent.txHash,
            amount: 5000,
            status: ReconciliationStatus.MISSING_PAYMENT,
          }),
        })
      );
    });

    it('should detect unconfirmed payments', async () => {
      const mockPayment = {
        id: 'payment-1',
        onChainBountyId: '0x' + 'e'.repeat(64),
        txHash: '0x' + 'f'.repeat(64),
        amount: 5000,
        status: 'COMPLETED',
        paidAt: new Date(),
      };

      // No blockchain events (unconfirmed payment scenario)
      mockProvider.getBlockNumber.mockResolvedValue(43200);
      mockContract.filters.BountyReleased.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValue([]);

      // Database has completed payment
      mockPrismaClient.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrismaClient.paymentReconciliation.findFirst.mockResolvedValue(null);
      mockPrismaClient.paymentReconciliation.create.mockResolvedValue({});
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(0);

      await service.reconcile();

      expect(mockPrismaClient.paymentReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentId: mockPayment.id,
            status: ReconciliationStatus.UNCONFIRMED_PAYMENT,
          }),
        })
      );
    });

    it('should detect amount mismatches', async () => {
      const validationId = '0x' + 'c'.repeat(64);
      const mockEvent = {
        bountyId: '0x' + 'a'.repeat(64),
        protocolId: '0x' + 'b'.repeat(64),
        validationId,
        researcher: '0x' + '1'.repeat(40),
        severity: 0,
        amount: BigInt(5000000000), // 5000 USDC
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        txHash: '0x' + 'd'.repeat(64),
        blockNumber: 12345,
      };

      const mockPayment = {
        id: 'payment-1',
        onChainBountyId: validationId,
        txHash: '0x' + 'd'.repeat(64),
        amount: 3000, // Mismatch!
        status: 'COMPLETED',
        researcherAddress: '0x' + '1'.repeat(40),
        paidAt: new Date(),
      };

      mockProvider.getBlockNumber.mockResolvedValue(43200);
      mockContract.filters.BountyReleased.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValue([
        {
          topics: [],
          data: '0x',
          transactionHash: mockEvent.txHash,
          blockNumber: mockEvent.blockNumber,
        },
      ]);
      mockContract.interface.parseLog.mockReturnValue({
        name: 'BountyReleased',
        args: mockEvent,
      });

      mockPrismaClient.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrismaClient.paymentReconciliation.findFirst.mockResolvedValue(null);
      mockPrismaClient.paymentReconciliation.create.mockResolvedValue({});
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(0);

      await service.reconcile();

      expect(mockPrismaClient.paymentReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReconciliationStatus.AMOUNT_MISMATCH,
            notes: expect.stringContaining('Database amount: 3000'),
          }),
        })
      );
    });

    it('should auto-resolve missing txHash', async () => {
      const validationId = '0x' + 'c'.repeat(64);
      const researcherAddress = '0x' + '1'.repeat(40);
      const mockEvent = {
        bountyId: '0x' + 'a'.repeat(64),
        protocolId: '0x' + 'b'.repeat(64),
        validationId,
        researcher: researcherAddress,
        severity: 0,
        amount: BigInt(5000000000), // 5000 USDC
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        txHash: '0x' + 'd'.repeat(64),
        blockNumber: 12345,
      };

      const mockPayment = {
        id: 'payment-1',
        onChainBountyId: validationId,
        txHash: null, // Missing txHash
        amount: 5000,
        status: 'COMPLETED',
        researcherAddress,
        paidAt: new Date(),
        reconciled: false,
      };

      mockProvider.getBlockNumber.mockResolvedValue(43200);
      mockContract.filters.BountyReleased.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValue([
        {
          topics: [],
          data: '0x',
          transactionHash: mockEvent.txHash,
          blockNumber: mockEvent.blockNumber,
        },
      ]);
      mockContract.interface.parseLog.mockReturnValue({
        name: 'BountyReleased',
        args: mockEvent,
      });

      mockPrismaClient.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrismaClient.payment.update.mockResolvedValue({});
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(0);

      await service.reconcile();

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            txHash: mockEvent.txHash,
            reconciled: true,
          }),
        })
      );
    });

    it('should alert when discrepancy count exceeds threshold', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockProvider.getBlockNumber.mockResolvedValue(43200);
      mockContract.filters.BountyReleased.mockReturnValue({});
      mockContract.queryFilter.mockResolvedValue([]);
      mockPrismaClient.payment.findMany.mockResolvedValue([]);
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(15); // >10

      await service.reconcile();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('HIGH DISCREPANCY COUNT ALERT: 15')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getReconciliationReport', () => {
    it('should return comprehensive reconciliation metrics', async () => {
      mockPrismaClient.payment.count
        .mockResolvedValueOnce(100) // totalPayments
        .mockResolvedValueOnce(85); // reconciledCount

      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(5); // discrepancyCount

      mockPrismaClient.payment.findFirst.mockResolvedValue({
        reconciledAt: new Date('2024-01-15'),
      });

      mockPrismaClient.paymentReconciliation.groupBy.mockResolvedValue([
        { status: ReconciliationStatus.MISSING_PAYMENT, _count: { status: 3 } },
        { status: ReconciliationStatus.AMOUNT_MISMATCH, _count: { status: 2 } },
      ]);

      const result = await service.getReconciliationReport();

      expect(result.totalPayments).toBe(100);
      expect(result.reconciledCount).toBe(85);
      expect(result.pendingCount).toBe(15);
      expect(result.discrepancyCount).toBe(5);
      expect(result.reconciliationRate).toBe(85);
      expect(result.discrepanciesByStatus).toEqual({
        [ReconciliationStatus.MISSING_PAYMENT]: 3,
        [ReconciliationStatus.AMOUNT_MISMATCH]: 2,
      });
    });

    it('should filter report by date range', async () => {
      const since = new Date('2024-01-01');

      mockPrismaClient.payment.count.mockResolvedValue(50);
      mockPrismaClient.paymentReconciliation.count.mockResolvedValue(0);
      mockPrismaClient.payment.findFirst.mockResolvedValue(null);
      mockPrismaClient.paymentReconciliation.groupBy.mockResolvedValue([]);

      await service.getReconciliationReport(since);

      expect(mockPrismaClient.payment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paidAt: { gte: since },
          }),
        })
      );
    });
  });

  describe('getDiscrepancies', () => {
    it('should return list of discrepancies with filtering', async () => {
      const mockDiscrepancies = [
        {
          id: 'disc-1',
          paymentId: 'payment-1',
          onChainBountyId: '0x' + 'a'.repeat(64),
          txHash: '0x' + 'b'.repeat(64),
          amount: 5000,
          status: ReconciliationStatus.MISSING_PAYMENT,
          discoveredAt: new Date(),
          resolvedAt: null,
          notes: null,
        },
      ];

      mockPrismaClient.paymentReconciliation.findMany.mockResolvedValue(mockDiscrepancies);

      const result = await service.getDiscrepancies(ReconciliationStatus.MISSING_PAYMENT);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ReconciliationStatus.MISSING_PAYMENT);
      expect(mockPrismaClient.paymentReconciliation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ReconciliationStatus.MISSING_PAYMENT },
        })
      );
    });

    it('should sort discrepancies by specified field', async () => {
      mockPrismaClient.paymentReconciliation.findMany.mockResolvedValue([]);

      await service.getDiscrepancies(undefined, 'amount');

      expect(mockPrismaClient.paymentReconciliation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'desc' },
        })
      );
    });

    it('should return unresolved discrepancies by default', async () => {
      mockPrismaClient.paymentReconciliation.findMany.mockResolvedValue([]);

      await service.getDiscrepancies();

      expect(mockPrismaClient.paymentReconciliation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { not: ReconciliationStatus.RESOLVED },
          },
        })
      );
    });
  });

  describe('resolveDiscrepancy', () => {
    it('should resolve discrepancy successfully', async () => {
      const discrepancyId = 'disc-1';
      const mockDiscrepancy = {
        id: discrepancyId,
        status: ReconciliationStatus.MISSING_PAYMENT,
        notes: 'Original notes',
      };

      mockPrismaClient.paymentReconciliation.findUnique.mockResolvedValue(mockDiscrepancy);
      mockPrismaClient.paymentReconciliation.update.mockResolvedValue({});

      await service.resolveDiscrepancy(discrepancyId, 'Manually verified');

      expect(mockPrismaClient.paymentReconciliation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: discrepancyId },
          data: expect.objectContaining({
            status: ReconciliationStatus.RESOLVED,
            notes: 'Manually verified',
          }),
        })
      );
    });

    it('should throw error if discrepancy not found', async () => {
      mockPrismaClient.paymentReconciliation.findUnique.mockResolvedValue(null);

      await expect(service.resolveDiscrepancy('non-existent')).rejects.toThrow('Discrepancy not found');
    });

    it('should throw error if already resolved', async () => {
      mockPrismaClient.paymentReconciliation.findUnique.mockResolvedValue({
        id: 'disc-1',
        status: ReconciliationStatus.RESOLVED,
      });

      await expect(service.resolveDiscrepancy('disc-1')).rejects.toThrow('Discrepancy already resolved');
    });
  });

  describe('getReconciliationService singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getReconciliationService();
      const instance2 = getReconciliationService();

      expect(instance1).toBe(instance2);
    });
  });
});
