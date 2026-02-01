import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Job } from 'bullmq';

// Mock dependencies
const mockPrismaClient = {
  payment: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedisClient = {
  status: 'ready',
};

const mockBountyClient = {
  releaseBounty: jest.fn(),
};

const mockValidationClient = {
  getValidation: jest.fn(),
};

const mockEmitPaymentReleased = jest.fn();
const mockEmitPaymentFailed = jest.fn();

const mockWorker = {
  on: jest.fn(),
  close: jest.fn(),
};

// Mock modules
jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  getRedisClient: () => mockRedisClient,
}));

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

jest.unstable_mockModule('../../src/blockchain/contracts/BountyPoolClient.js', () => ({
  BountyPoolClient: jest.fn(() => mockBountyClient),
  BountySeverity: {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFORMATIONAL: 4,
  },
}));

jest.unstable_mockModule('../../src/blockchain/contracts/ValidationRegistryClient.js', () => ({
  ValidationRegistryClient: jest.fn(() => mockValidationClient),
  ValidationOutcome: {
    CONFIRMED: 0,
    REJECTED: 1,
    INCONCLUSIVE: 2,
  },
}));

jest.unstable_mockModule('../../src/blockchain/config.js', () => ({
  RESEARCHER_ADDRESS: '0x' + '1'.repeat(40),
  usdcConfig: {
    decimals: 6,
  },
}));

jest.unstable_mockModule('../../src/websocket/events.js', () => ({
  emitPaymentReleased: mockEmitPaymentReleased,
  emitPaymentFailed: mockEmitPaymentFailed,
}));

jest.unstable_mockModule('bullmq', () => ({
  Worker: jest.fn((queueName, processor, options) => {
    // Store processor for testing
    mockWorker.processor = processor;
    return mockWorker;
  }),
}));

// Import after mocks
const { startPaymentWorker, stopPaymentWorker } = await import('../../src/workers/payment.worker.js');

describe('PaymentWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('job processing', () => {
    it('should process payment successfully', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
          protocolId: 'protocol-1',
        },
      };

      const mockValidation = {
        exists: true,
        outcome: 0, // CONFIRMED
        validationId: jobData.validationId,
      };

      const mockReleaseResult = {
        txHash: '0x' + 'b'.repeat(64),
        bountyId: '0x' + 'c'.repeat(64),
        amount: BigInt(5000000000),
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: 12345,
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockBountyClient.releaseBounty.mockResolvedValue(mockReleaseResult);
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockPrismaClient.payment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
        })
      );

      expect(mockValidationClient.getValidation).toHaveBeenCalledWith(jobData.validationId);

      expect(mockBountyClient.releaseBounty).toHaveBeenCalledWith(
        'protocol-1',
        jobData.validationId,
        mockPayment.researcherAddress,
        0 // BountySeverity.CRITICAL
      );

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            txHash: mockReleaseResult.txHash,
          }),
        })
      );

      expect(mockEmitPaymentReleased).toHaveBeenCalled();
    });

    it('should skip duplicate payment', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'COMPLETED', // Already completed
        txHash: '0x' + 'existing'.repeat(5),
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockBountyClient.releaseBounty).not.toHaveBeenCalled();
      expect(mockEmitPaymentReleased).not.toHaveBeenCalled();
    });

    it('should fail on invalid researcher address', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'PENDING',
        researcherAddress: null, // Invalid
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: 'Missing or invalid researcher address',
          }),
        })
      );

      expect(mockEmitPaymentFailed).toHaveBeenCalled();
    });

    it('should fail on non-confirmed validation', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      const mockValidation = {
        exists: true,
        outcome: 1, // REJECTED
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: expect.stringContaining('REJECTED'),
          }),
        })
      );

      expect(mockEmitPaymentFailed).toHaveBeenCalled();
    });

    it('should handle insufficient funds error', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      const mockValidation = {
        exists: true,
        outcome: 0,
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockBountyClient.releaseBounty.mockRejectedValue(new Error('Insufficient pool balance'));
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: 'Insufficient pool balance',
          }),
        })
      );

      expect(mockEmitPaymentFailed).toHaveBeenCalled();
    });

    it('should retry on network errors', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      const mockValidation = {
        exists: true,
        outcome: 0,
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockBountyClient.releaseBounty.mockRejectedValue(new Error('Network timeout'));
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();

      await expect(worker.processor(mockJob)).rejects.toThrow('Network timeout');

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            retryCount: 1,
          }),
        })
      );
    });

    it('should increment retry count on validation errors', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockRejectedValue(new Error('Validation fetch failed'));
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();

      await expect(worker.processor(mockJob)).rejects.toThrow('Failed to verify validation');

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            retryCount: 1,
          }),
        })
      );
    });
  });

  describe('worker lifecycle', () => {
    it('should start worker with correct configuration', () => {
      const worker = startPaymentWorker();

      expect(worker).toBeDefined();
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should stop worker gracefully', async () => {
      const worker = startPaymentWorker();
      mockWorker.close.mockResolvedValue(undefined);

      await stopPaymentWorker(worker);

      expect(mockWorker.close).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    it('should emit WebSocket event on success', async () => {
      const jobData = {
        paymentId: 'payment-1',
        validationId: '0x' + 'a'.repeat(64),
        protocolId: 'protocol-1',
      };

      const mockJob = {
        id: 'job-1',
        data: jobData,
        attemptsMade: 0,
      } as Job;

      const mockPayment = {
        id: 'payment-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING',
        researcherAddress: '0x' + '1'.repeat(40),
        retryCount: 0,
        vulnerability: {
          severity: 'CRITICAL',
        },
      };

      const mockValidation = {
        exists: true,
        outcome: 0,
      };

      const mockReleaseResult = {
        txHash: '0x' + 'b'.repeat(64),
        bountyId: '0x' + 'c'.repeat(64),
        amount: BigInt(5000000000),
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: 12345,
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockBountyClient.releaseBounty.mockResolvedValue(mockReleaseResult);
      mockPrismaClient.payment.update.mockResolvedValue({});

      const worker = startPaymentWorker();
      await worker.processor(mockJob);

      expect(mockEmitPaymentReleased).toHaveBeenCalledWith(
        'protocol-1',
        'payment-1',
        5000,
        mockReleaseResult.txHash,
        mockPayment.researcherAddress,
        expect.any(Date),
        jobData.validationId,
        'CRITICAL'
      );
    });
  });
});
