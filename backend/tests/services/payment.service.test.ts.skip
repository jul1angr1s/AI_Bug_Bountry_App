import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PrismaClient, Payment, Vulnerability, Protocol, Proof, Severity, PaymentStatus } from '@prisma/client';

// Mock dependencies
const mockPrismaClient = {
  payment: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  vulnerability: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  proof: {
    findFirst: vi.fn(),
  },
  protocol: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  fundingEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

const mockValidationClient = {
  getValidation: vi.fn(),
};

const mockBountyClient = {
  calculateBountyAmount: vi.fn(),
  getProtocolBalance: vi.fn(),
  releaseBounty: vi.fn(),
};

const mockUsdcClient = {
  getAllowance: vi.fn(),
  getBalance: vi.fn(),
  generateApprovalTxData: vi.fn(),
  formatUSDC: vi.fn(),
  parseUSDC: vi.fn(),
};

// Mock modules
vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: () => mockPrismaClient,
}));

vi.mock('../../src/blockchain/contracts/ValidationRegistryClient.js', () => ({
  ValidationRegistryClient: vi.fn(() => mockValidationClient),
}));

vi.mock('../../src/blockchain/contracts/BountyPoolClient.js', () => ({
  BountyPoolClient: vi.fn(() => mockBountyClient),
  BountySeverity: {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFORMATIONAL: 4,
  },
}));

vi.mock('../../src/blockchain/contracts/USDCClient.js', () => ({
  default: vi.fn(() => mockUsdcClient),
}));

// Import service after mocks are set up
const {
  createPaymentFromValidation,
  processPayment,
  getPaymentById,
  getPaymentsByProtocol,
  getPaymentsByResearcher,
  getPaymentStats,
  PaymentNotFoundError,
  ValidationNotFoundError,
  InsufficientFundsError,
} = await import('../../src/services/payment.service.js');

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentFromValidation', () => {
    const mockValidationId = '0x' + 'a'.repeat(64);
    const mockProofHash = '0x' + 'b'.repeat(64);
    const mockResearcherAddress = '0x' + '1'.repeat(40);

    it('should create payment from validated proof', async () => {
      const mockValidation = {
        exists: true,
        validationId: mockValidationId,
        outcome: 0, // CONFIRMED
        proofHash: mockProofHash,
        validatorAgent: mockResearcherAddress,
        severity: 0,
        vulnerabilityType: 'REENTRANCY',
        timestamp: BigInt(Date.now() / 1000),
      };

      const mockProof = {
        id: 'proof-1',
        onChainValidationId: mockValidationId,
        encryptedPayload: 'encrypted-data',
        finding: {
          id: 'finding-1',
          severity: 'CRITICAL' as Severity,
          scan: {
            protocolId: 'protocol-1',
          },
        },
      };

      const mockVulnerability = {
        id: 'vuln-1',
        protocolId: 'protocol-1',
        vulnerabilityHash: mockProofHash,
        severity: 'CRITICAL' as Severity,
        status: 'ACKNOWLEDGED',
        bounty: 5000,
        discoveredAt: new Date(),
      };

      const mockPayment = {
        id: 'payment-1',
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING' as PaymentStatus,
        researcherAddress: mockResearcherAddress,
        queuedAt: new Date(),
        txHash: null,
        onChainBountyId: null,
        paidAt: null,
        reconciled: false,
        reconciledAt: null,
        failureReason: null,
        retryCount: 0,
        vulnerability: mockVulnerability,
      };

      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockPrismaClient.proof.findFirst.mockResolvedValue(mockProof);
      mockPrismaClient.vulnerability.findFirst.mockResolvedValue(null);
      mockPrismaClient.vulnerability.create.mockResolvedValue(mockVulnerability);
      mockBountyClient.calculateBountyAmount.mockResolvedValue(5000);
      mockPrismaClient.payment.findFirst.mockResolvedValue(null);
      mockPrismaClient.payment.create.mockResolvedValue(mockPayment);
      mockPrismaClient.vulnerability.update.mockResolvedValue(mockVulnerability);

      const result = await createPaymentFromValidation(mockValidationId);

      expect(result).toBeDefined();
      expect(result.id).toBe('payment-1');
      expect(result.amount).toBe(5000);
      expect(result.status).toBe('PENDING');
      expect(mockValidationClient.getValidation).toHaveBeenCalledWith(mockValidationId);
      expect(mockPrismaClient.payment.create).toHaveBeenCalled();
    });

    it('should throw error if validation not found', async () => {
      mockValidationClient.getValidation.mockResolvedValue({
        exists: false,
      });

      await expect(createPaymentFromValidation(mockValidationId)).rejects.toThrow(ValidationNotFoundError);
    });

    it('should throw error if validation not confirmed', async () => {
      mockValidationClient.getValidation.mockResolvedValue({
        exists: true,
        outcome: 1, // REJECTED
        validationId: mockValidationId,
      });

      await expect(createPaymentFromValidation(mockValidationId)).rejects.toThrow('Cannot create payment for non-confirmed validation');
    });

    it('should return existing payment if duplicate', async () => {
      const mockValidation = {
        exists: true,
        validationId: mockValidationId,
        outcome: 0,
        proofHash: mockProofHash,
        validatorAgent: mockResearcherAddress,
        severity: 0,
        vulnerabilityType: 'REENTRANCY',
        timestamp: BigInt(Date.now() / 1000),
      };

      const mockProof = {
        id: 'proof-1',
        onChainValidationId: mockValidationId,
        encryptedPayload: 'encrypted-data',
        finding: {
          id: 'finding-1',
          severity: 'CRITICAL' as Severity,
          scan: { protocolId: 'protocol-1' },
        },
      };

      const mockVulnerability = {
        id: 'vuln-1',
        protocolId: 'protocol-1',
        vulnerabilityHash: mockProofHash,
        severity: 'CRITICAL' as Severity,
        status: 'ACKNOWLEDGED',
        bounty: 5000,
        discoveredAt: new Date(),
      };

      const existingPayment = {
        id: 'existing-payment-1',
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'COMPLETED' as PaymentStatus,
        researcherAddress: mockResearcherAddress,
        queuedAt: new Date(),
        txHash: '0xabc',
        onChainBountyId: mockValidationId,
        paidAt: new Date(),
        reconciled: true,
        reconciledAt: new Date(),
        failureReason: null,
        retryCount: 0,
        vulnerability: mockVulnerability,
      };

      mockValidationClient.getValidation.mockResolvedValue(mockValidation);
      mockPrismaClient.proof.findFirst.mockResolvedValue(mockProof);
      mockPrismaClient.vulnerability.findFirst.mockResolvedValue(mockVulnerability);
      mockBountyClient.calculateBountyAmount.mockResolvedValue(5000);
      mockPrismaClient.payment.findFirst.mockResolvedValue(existingPayment);
      mockPrismaClient.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await createPaymentFromValidation(mockValidationId);

      expect(result.id).toBe('existing-payment-1');
      expect(mockPrismaClient.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('processPayment', () => {
    const mockPaymentId = 'payment-1';
    const mockValidationId = '0x' + 'a'.repeat(64);
    const mockResearcherAddress = '0x' + '1'.repeat(40);
    const mockTxHash = '0x' + 'c'.repeat(64);

    it('should process payment successfully', async () => {
      const mockPayment = {
        id: mockPaymentId,
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING' as PaymentStatus,
        researcherAddress: mockResearcherAddress,
        queuedAt: new Date(),
        txHash: null,
        onChainBountyId: null,
        paidAt: null,
        reconciled: false,
        reconciledAt: null,
        failureReason: null,
        retryCount: 0,
        vulnerability: {
          id: 'vuln-1',
          protocolId: 'protocol-1',
          severity: 'CRITICAL' as Severity,
          protocol: {
            id: 'protocol-1',
            onChainProtocolId: '0x' + '2'.repeat(64),
            availableBounty: 10000,
            paidBounty: 0,
            totalBountyPool: 10000,
          },
        },
      };

      const mockProof = {
        id: 'proof-1',
        onChainValidationId: mockValidationId,
        status: 'VALIDATED',
      };

      const mockReleaseResult = {
        txHash: mockTxHash,
        bountyId: '0x' + 'd'.repeat(64),
        amount: BigInt(5000000000), // 5000 USDC in base units
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: 12345,
      };

      const updatedPayment = {
        ...mockPayment,
        status: 'COMPLETED' as PaymentStatus,
        txHash: mockTxHash,
        onChainBountyId: mockReleaseResult.bountyId,
        paidAt: new Date(mockReleaseResult.timestamp * 1000),
        reconciled: true,
        reconciledAt: new Date(),
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaClient.proof.findFirst.mockResolvedValue(mockProof);
      mockBountyClient.getProtocolBalance.mockResolvedValue(10000);
      mockBountyClient.releaseBounty.mockResolvedValue(mockReleaseResult);
      mockPrismaClient.payment.update.mockResolvedValue(updatedPayment);
      mockPrismaClient.protocol.update.mockResolvedValue({});
      mockPrismaClient.fundingEvent.create.mockResolvedValue({});
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await processPayment(mockPaymentId);

      expect(result).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.txHash).toBe(mockTxHash);
      expect(mockBountyClient.releaseBounty).toHaveBeenCalled();
      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPaymentId },
          data: expect.objectContaining({
            status: 'COMPLETED',
            txHash: mockTxHash,
          }),
        })
      );
    });

    it('should throw error if payment not found', async () => {
      mockPrismaClient.payment.findUnique.mockResolvedValue(null);

      await expect(processPayment(mockPaymentId)).rejects.toThrow(PaymentNotFoundError);
    });

    it('should throw error if insufficient funds', async () => {
      const mockPayment = {
        id: mockPaymentId,
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING' as PaymentStatus,
        researcherAddress: mockResearcherAddress,
        vulnerability: {
          id: 'vuln-1',
          protocolId: 'protocol-1',
          severity: 'CRITICAL' as Severity,
          protocol: {
            id: 'protocol-1',
            onChainProtocolId: '0x' + '2'.repeat(64),
          },
        },
      };

      const mockProof = {
        id: 'proof-1',
        onChainValidationId: mockValidationId,
        status: 'VALIDATED',
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaClient.proof.findFirst.mockResolvedValue(mockProof);
      mockBountyClient.getProtocolBalance.mockResolvedValue(1000); // Insufficient

      await expect(processPayment(mockPaymentId)).rejects.toThrow(InsufficientFundsError);
    });

    it('should handle network errors and update payment status', async () => {
      const mockPayment = {
        id: mockPaymentId,
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'PENDING' as PaymentStatus,
        researcherAddress: mockResearcherAddress,
        retryCount: 0,
        vulnerability: {
          id: 'vuln-1',
          protocolId: 'protocol-1',
          severity: 'CRITICAL' as Severity,
          protocol: {
            id: 'protocol-1',
            onChainProtocolId: '0x' + '2'.repeat(64),
          },
        },
      };

      const mockProof = {
        id: 'proof-1',
        onChainValidationId: mockValidationId,
        status: 'VALIDATED',
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaClient.proof.findFirst.mockResolvedValue(mockProof);
      mockBountyClient.getProtocolBalance.mockResolvedValue(10000);
      mockBountyClient.releaseBounty.mockRejectedValue(new Error('Network timeout'));
      mockPrismaClient.payment.update.mockResolvedValue({});

      await expect(processPayment(mockPaymentId)).rejects.toThrow('Network timeout');

      expect(mockPrismaClient.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPaymentId },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: expect.stringContaining('Network timeout'),
          }),
        })
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with details when found', async () => {
      const mockPayment = {
        id: 'payment-1',
        vulnerabilityId: 'vuln-1',
        amount: 5000,
        currency: 'USDC',
        status: 'COMPLETED' as PaymentStatus,
        researcherAddress: '0x' + '1'.repeat(40),
        queuedAt: new Date(),
        txHash: '0xabc',
        onChainBountyId: '0x' + 'a'.repeat(64),
        paidAt: new Date(),
        reconciled: true,
        reconciledAt: new Date(),
        failureReason: null,
        retryCount: 0,
        vulnerability: {
          id: 'vuln-1',
          protocolId: 'protocol-1',
          vulnerabilityHash: '0x' + 'b'.repeat(64),
          severity: 'CRITICAL' as Severity,
          status: 'ACKNOWLEDGED',
          discoveredAt: new Date(),
        },
      };

      mockPrismaClient.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaClient.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentById('payment-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('payment-1');
      expect(result.amount).toBe(5000);
      expect(mockPrismaClient.payment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
        })
      );
    });

    it('should throw error when payment not found', async () => {
      mockPrismaClient.payment.findUnique.mockResolvedValue(null);

      await expect(getPaymentById('non-existent')).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('getPaymentsByProtocol', () => {
    it('should return paginated payments with filters', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          vulnerabilityId: 'vuln-1',
          amount: 5000,
          currency: 'USDC',
          status: 'COMPLETED' as PaymentStatus,
          researcherAddress: '0x' + '1'.repeat(40),
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-1',
            protocolId: 'protocol-1',
            vulnerabilityHash: '0x' + 'b'.repeat(64),
            severity: 'CRITICAL' as Severity,
            status: 'ACKNOWLEDGED',
            discoveredAt: new Date(),
          },
        },
      ];

      mockPrismaClient.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaClient.payment.count.mockResolvedValue(1);
      mockPrismaClient.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentsByProtocol('protocol-1', {
        status: 'COMPLETED',
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalCount).toBe(1);
      expect(result.pagination.currentPage).toBe(1);
      expect(mockPrismaClient.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vulnerability: { protocolId: 'protocol-1' },
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaClient.payment.findMany.mockResolvedValue([]);
      mockPrismaClient.payment.count.mockResolvedValue(50);

      const result = await getPaymentsByProtocol('protocol-1', {
        page: 2,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrevious).toBe(true);
    });
  });

  describe('getPaymentsByResearcher', () => {
    it('should calculate total earnings correctly', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          amount: 5000,
          status: 'COMPLETED' as PaymentStatus,
          vulnerability: { severity: 'CRITICAL' as Severity, protocolId: 'protocol-1' },
        },
        {
          id: 'payment-2',
          amount: 2000,
          status: 'COMPLETED' as PaymentStatus,
          vulnerability: { severity: 'HIGH' as Severity, protocolId: 'protocol-1' },
        },
        {
          id: 'payment-3',
          amount: 1000,
          status: 'PENDING' as PaymentStatus,
          vulnerability: { severity: 'MEDIUM' as Severity, protocolId: 'protocol-1' },
        },
      ];

      mockPrismaClient.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaClient.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentsByResearcher('0x' + '1'.repeat(40));

      expect(result.totalEarnings).toBe(7000); // Only COMPLETED payments
      expect(result.paymentCountBySeverity.CRITICAL).toBe(1);
      expect(result.paymentCountBySeverity.HIGH).toBe(1);
      expect(result.paymentCountBySeverity.MEDIUM).toBe(0); // PENDING not counted
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaClient.payment.findMany.mockResolvedValue([]);
      mockPrismaClient.proof.findFirst.mockResolvedValue(null);

      await getPaymentsByResearcher('0x' + '1'.repeat(40), { startDate, endDate });

      expect(mockPrismaClient.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('getPaymentStats', () => {
    it('should return aggregated payment statistics', async () => {
      const mockPayments = [
        { amount: 5000, status: 'COMPLETED' as PaymentStatus, paidAt: new Date() },
        { amount: 2000, status: 'COMPLETED' as PaymentStatus, paidAt: new Date() },
        { amount: 1000, status: 'PENDING' as PaymentStatus, paidAt: null },
        { amount: 500, status: 'FAILED' as PaymentStatus, paidAt: null },
      ];

      mockPrismaClient.payment.findMany.mockResolvedValue(mockPayments);

      const result = await getPaymentStats();

      expect(result.totalPayments).toBe(4);
      expect(result.totalAmountPaid).toBe(7000);
      expect(result.averagePaymentAmount).toBe(3500);
      expect(result.paymentsByStatus.COMPLETED).toBe(2);
      expect(result.paymentsByStatus.PENDING).toBe(1);
      expect(result.paymentsByStatus.FAILED).toBe(1);
    });

    it('should generate time series data when groupBy is day', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockPayments = [
        { amount: 5000, status: 'COMPLETED' as PaymentStatus, paidAt: now },
        { amount: 2000, status: 'COMPLETED' as PaymentStatus, paidAt: yesterday },
      ];

      mockPrismaClient.payment.findMany.mockResolvedValue(mockPayments);

      const result = await getPaymentStats({ groupBy: 'day', days: 7 });

      expect(result.timeSeries).toBeDefined();
      expect(result.timeSeries?.length).toBe(7);
      expect(result.timeSeries?.every(item => 'date' in item && 'count' in item && 'amount' in item)).toBe(true);
    });

    it('should filter by protocol', async () => {
      mockPrismaClient.payment.findMany.mockResolvedValue([]);

      await getPaymentStats({ protocolId: 'protocol-1' });

      expect(mockPrismaClient.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vulnerability: { protocolId: 'protocol-1' },
          }),
        })
      );
    });
  });
});
