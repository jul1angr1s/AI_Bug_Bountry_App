import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Hoisted mocks - vi.hoisted ensures these are available when vi.mock factories
// execute (vi.mock calls are hoisted above all other code by vitest).
// =============================================================================

const {
  mockPrisma,
  mockBountyPool,
  mockValidationClient,
  mockUsdcClient,
} = vi.hoisted(() => {
  const mockPrisma: any = {
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    vulnerability: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
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
    $transaction: vi.fn(),
  };

  const mockBountyPool = {
    calculateBountyAmount: vi.fn().mockResolvedValue(5.0),
    releaseBounty: vi.fn().mockResolvedValue({
      txHash: '0xtx123',
      bountyId: '0xbounty123',
      blockNumber: 12345,
      amount: 5000000n,
      timestamp: 1700000000,
    }),
    getProtocolBalance: vi.fn().mockResolvedValue(100),
    depositBounty: vi.fn().mockResolvedValue('0xtx'),
  };

  const mockValidationClient = {
    getValidation: vi.fn().mockResolvedValue({
      validationId: 'val-001',
      proofHash: '0xhash123',
      validatorAgent: '0xresearcher',
      outcome: 0, // CONFIRMED
      severity: 1, // HIGH
      vulnerabilityType: 'reentrancy',
      timestamp: BigInt(1700000000),
      exists: true,
    }),
  };

  const mockUsdcClient = {
    getAllowance: vi.fn().mockResolvedValue(0n),
    getBalance: vi.fn().mockResolvedValue(100000000n),
    formatUSDC: vi.fn((amt: bigint) => (Number(amt) / 1000000).toString()),
    parseUSDC: vi.fn((amt: string) => BigInt(Math.round(parseFloat(amt) * 1000000))),
    generateApprovalTxData: vi.fn(),
    getAddress: vi.fn().mockReturnValue('0xusdc'),
    getDecimals: vi.fn().mockReturnValue(6),
    getSymbol: vi.fn().mockReturnValue('USDC'),
  };

  return { mockPrisma, mockBountyPool, mockValidationClient, mockUsdcClient };
});

// =============================================================================
// vi.mock calls (hoisted to top by vitest; factory closures reference hoisted vars)
// =============================================================================

vi.mock('../../lib/prisma.js', () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock('../../blockchain/contracts/BountyPoolClient.js', () => ({
  BountyPoolClient: class MockBountyPoolClient {
    calculateBountyAmount = mockBountyPool.calculateBountyAmount;
    releaseBounty = mockBountyPool.releaseBounty;
    getProtocolBalance = mockBountyPool.getProtocolBalance;
    depositBounty = mockBountyPool.depositBounty;
  },
  BountySeverity: {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFORMATIONAL: 4,
  },
}));

vi.mock('../../blockchain/contracts/ValidationRegistryClient.js', () => ({
  ValidationRegistryClient: class MockValidationRegistryClient {
    getValidation = mockValidationClient.getValidation;
  },
}));

vi.mock('../../blockchain/contracts/USDCClient.js', () => {
  // USDCClient is used as `new USDCClient()` via default export; must be a class/constructor
  return {
    default: class MockUSDCClient {
      getAllowance = mockUsdcClient.getAllowance;
      getBalance = mockUsdcClient.getBalance;
      formatUSDC = mockUsdcClient.formatUSDC;
      parseUSDC = mockUsdcClient.parseUSDC;
      generateApprovalTxData = mockUsdcClient.generateApprovalTxData;
      getAddress = mockUsdcClient.getAddress;
      getDecimals = mockUsdcClient.getDecimals;
      getSymbol = mockUsdcClient.getSymbol;
    },
    USDCClient: class MockUSDCClient {
      getAllowance = mockUsdcClient.getAllowance;
      getBalance = mockUsdcClient.getBalance;
      formatUSDC = mockUsdcClient.formatUSDC;
      parseUSDC = mockUsdcClient.parseUSDC;
      generateApprovalTxData = mockUsdcClient.generateApprovalTxData;
      getAddress = mockUsdcClient.getAddress;
      getDecimals = mockUsdcClient.getDecimals;
      getSymbol = mockUsdcClient.getSymbol;
    },
  };
});

vi.mock('../../queues/payment.queue.js', () => ({
  addPaymentJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('ethers', () => ({
  ethers: {
    id: vi.fn((val: string) => `0x${val.replace(/[^a-f0-9]/gi, '0').padEnd(64, '0')}`),
  },
}));

// =============================================================================
// Import service under test (after mocks are declared)
// =============================================================================
import {
  getPaymentById,
  getPaymentsByProtocol,
  createPaymentFromValidation,
  processPayment,
  getPaymentStats,
  getResearcherEarnings,
  getEarningsLeaderboard,
  getPaymentList,
  proposeManualPayment,
  PaymentNotFoundError,
  ValidationNotFoundError,
  InsufficientFundsError,
} from '../payment.service.js';

import { ValidationError } from '../../errors/CustomError.js';

// =============================================================================
// Test data factories
// =============================================================================

function makeVulnerability(overrides: Record<string, any> = {}) {
  return {
    id: 'vuln-001',
    protocolId: 'proto-001',
    vulnerabilityHash: '0xhash123',
    severity: 'HIGH' as const,
    status: 'ACKNOWLEDGED',
    discoveredAt: new Date('2024-01-15T10:00:00Z'),
    bounty: 5,
    proof: 'proof data',
    ...overrides,
  };
}

function makePayment(overrides: Record<string, any> = {}) {
  return {
    id: 'pay-001',
    vulnerabilityId: 'vuln-001',
    amount: 5,
    currency: 'USDC',
    status: 'PENDING' as const,
    txHash: null,
    onChainBountyId: null,
    researcherAddress: '0xresearcher',
    paidAt: null,
    reconciled: false,
    reconciledAt: null,
    failureReason: null,
    retryCount: 0,
    queuedAt: new Date('2024-01-15T10:00:00Z'),
    vulnerability: makeVulnerability(),
    ...overrides,
  };
}

function makeProtocol(overrides: Record<string, any> = {}) {
  return {
    id: 'proto-001',
    githubUrl: 'https://github.com/org/repo',
    contractName: 'TestProtocol',
    onChainProtocolId: '0xprotocol123',
    totalBountyPool: 1000,
    availableBounty: 800,
    paidBounty: 200,
    ...overrides,
  };
}

function makeProof(overrides: Record<string, any> = {}) {
  return {
    id: 'proof-001',
    onChainValidationId: 'val-001',
    status: 'VALIDATED',
    encryptedPayload: 'encrypted-data',
    validatedAt: new Date('2024-01-15T10:00:00Z'),
    finding: {
      id: 'finding-001',
      severity: 'HIGH' as const,
      scan: {
        protocolId: 'proto-001',
      },
    },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Restore default mock return values that clearAllMocks wipes
    mockBountyPool.calculateBountyAmount.mockResolvedValue(5.0);
    mockBountyPool.releaseBounty.mockResolvedValue({
      txHash: '0xtx123',
      bountyId: '0xbounty123',
      blockNumber: 12345,
      amount: 5000000n,
      timestamp: 1700000000,
    });
    mockBountyPool.getProtocolBalance.mockResolvedValue(100);

    mockValidationClient.getValidation.mockResolvedValue({
      validationId: 'val-001',
      proofHash: '0xhash123',
      validatorAgent: '0xresearcher',
      outcome: 0,
      severity: 1,
      vulnerabilityType: 'reentrancy',
      timestamp: BigInt(1700000000),
      exists: true,
    });
  });

  // ===========================================================================
  // getPaymentById
  // ===========================================================================
  describe('getPaymentById', () => {
    it('returns payment with vulnerability details', async () => {
      const payment = makePayment();
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());

      const result = await getPaymentById('pay-001');

      expect(result.id).toBe('pay-001');
      expect(result.vulnerabilityId).toBe('vuln-001');
      expect(result.amount).toBe(5);
      expect(result.currency).toBe('USDC');
      expect(result.vulnerability).toBeDefined();
      expect(result.vulnerability.id).toBe('vuln-001');
      expect(result.vulnerability.severity).toBe('HIGH');
      expect(result.vulnerability.protocolId).toBe('proto-001');
    });

    it('throws PaymentNotFoundError for non-existent ID', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(getPaymentById('nonexistent-id')).rejects.toThrow(
        PaymentNotFoundError
      );
    });

    it('includes validation data when proof exists with onChainValidationId', async () => {
      const payment = makePayment();
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(
        makeProof({ onChainValidationId: 'val-001' })
      );

      const result = await getPaymentById('pay-001');

      expect(result.validation).toBeDefined();
      expect(result.validation!.validationId).toBe('val-001');
      expect(result.validation!.outcome).toBe(0);
      expect(result.validation!.severity).toBe(1);
      expect(result.validation!.vulnerabilityType).toBe('reentrancy');
    });

    it('returns undefined validation when no proof exists', async () => {
      const payment = makePayment();
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentById('pay-001');

      expect(result.validation).toBeUndefined();
    });

    it('handles null optional fields correctly', async () => {
      const payment = makePayment({
        txHash: null,
        onChainBountyId: null,
        paidAt: null,
        reconciledAt: null,
        failureReason: null,
        queuedAt: null,
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentById('pay-001');

      expect(result.txHash).toBeNull();
      expect(result.onChainBountyId).toBeNull();
      expect(result.paidAt).toBeNull();
      expect(result.reconciledAt).toBeNull();
      expect(result.failureReason).toBeNull();
      expect(result.queuedAt).toBeNull();
    });

    it('formats date fields as ISO strings', async () => {
      const now = new Date('2024-06-15T12:00:00Z');
      const payment = makePayment({
        paidAt: now,
        reconciledAt: now,
        queuedAt: now,
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentById('pay-001');

      expect(result.paidAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.reconciledAt).toBe('2024-06-15T12:00:00.000Z');
      expect(result.queuedAt).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  // ===========================================================================
  // getPaymentsByProtocol
  // ===========================================================================
  describe('getPaymentsByProtocol', () => {
    it('returns paginated results with correct metadata', async () => {
      const payments = [makePayment(), makePayment({ id: 'pay-002' })];
      mockPrisma.payment.findMany.mockResolvedValue(payments);
      mockPrisma.payment.count.mockResolvedValue(2);
      mockPrisma.proof.findFirst.mockResolvedValue(null);

      const result = await getPaymentsByProtocol('proto-001');

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(false);
    });

    it('applies status filter', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentsByProtocol('proto-001', { status: 'COMPLETED' });

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('COMPLETED');
    });

    it('applies date range filter', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentsByProtocol('proto-001', { startDate, endDate });

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where;
      expect(whereArg.paidAt).toBeDefined();
      expect(whereArg.paidAt.gte).toEqual(startDate);
      expect(whereArg.paidAt.lte).toEqual(endDate);
    });

    it('returns empty results with correct pagination', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      const result = await getPaymentsByProtocol('proto-001');

      expect(result.data).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrevious).toBe(false);
    });

    it('applies page and limit correctly', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(50);

      const result = await getPaymentsByProtocol('proto-001', {
        page: 2,
        limit: 10,
      });

      const findManyArg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(findManyArg.take).toBe(10);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrevious).toBe(true);
    });

    it('sorts by paidAt descending', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentsByProtocol('proto-001');

      const findManyArg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ paidAt: 'desc' });
    });
  });

  // ===========================================================================
  // createPaymentFromValidation
  // ===========================================================================
  describe('createPaymentFromValidation', () => {
    it('creates payment from valid validation', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.vulnerability.findFirst.mockResolvedValue(makeVulnerability());
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(makePayment());
      mockPrisma.vulnerability.update.mockResolvedValue(makeVulnerability());

      const result = await createPaymentFromValidation('val-001');

      expect(result.id).toBe('pay-001');
      expect(result.amount).toBe(5);
      expect(result.status).toBe('PENDING');
      expect(result.researcherAddress).toBe('0xresearcher');
    });

    it('throws ValidationNotFoundError for non-existent validation', async () => {
      mockValidationClient.getValidation.mockResolvedValueOnce({
        exists: false,
      });

      await expect(createPaymentFromValidation('nonexistent')).rejects.toThrow(
        ValidationNotFoundError
      );
    });

    it('throws ValidationError for non-CONFIRMED validation', async () => {
      mockValidationClient.getValidation.mockResolvedValueOnce({
        exists: true,
        outcome: 1, // REJECTED
        proofHash: '0xhash',
        validatorAgent: '0xresearcher',
        severity: 1,
      });

      await expect(createPaymentFromValidation('val-rejected')).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError when no proof/finding exists', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(null);

      await expect(createPaymentFromValidation('val-001')).rejects.toThrow(
        ValidationError
      );
    });

    it('returns existing payment if duplicate', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.vulnerability.findFirst.mockResolvedValue(makeVulnerability());

      const existingPayment = makePayment({ id: 'existing-pay' });
      mockPrisma.payment.findFirst.mockResolvedValue(existingPayment);

      // getPaymentById is called internally for the existing payment
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await createPaymentFromValidation('val-001');

      expect(result.id).toBe('existing-pay');
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('creates vulnerability record if not exists', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.vulnerability.findFirst.mockResolvedValue(null);
      mockPrisma.vulnerability.create.mockResolvedValue(
        makeVulnerability({ id: 'new-vuln' })
      );
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(
        makePayment({ vulnerabilityId: 'new-vuln' })
      );
      mockPrisma.vulnerability.update.mockResolvedValue(
        makeVulnerability({ id: 'new-vuln' })
      );

      await createPaymentFromValidation('val-001');

      expect(mockPrisma.vulnerability.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.vulnerability.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            protocolId: 'proto-001',
            vulnerabilityHash: '0xhash123',
            severity: 'HIGH',
            status: 'ACKNOWLEDGED',
          }),
        })
      );
    });

    it('calculates bounty amount from severity via BountyPoolClient', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.vulnerability.findFirst.mockResolvedValue(makeVulnerability());
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(makePayment());
      mockPrisma.vulnerability.update.mockResolvedValue(makeVulnerability());
      mockBountyPool.calculateBountyAmount.mockResolvedValueOnce(10.0);

      await createPaymentFromValidation('val-001');

      expect(mockBountyPool.calculateBountyAmount).toHaveBeenCalledWith(1); // BountySeverity.HIGH = 1
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 10.0,
          }),
        })
      );
    });

    it('sets payment status to PENDING on creation', async () => {
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.vulnerability.findFirst.mockResolvedValue(makeVulnerability());
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue(makePayment());
      mockPrisma.vulnerability.update.mockResolvedValue(makeVulnerability());

      await createPaymentFromValidation('val-001');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            currency: 'USDC',
          }),
        })
      );
    });
  });

  // ===========================================================================
  // processPayment
  // ===========================================================================
  describe('processPayment', () => {
    it('releases bounty and updates status to COMPLETED', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockPrisma.payment.update.mockResolvedValue({
        ...payment,
        status: 'COMPLETED',
        txHash: '0xtx123',
        onChainBountyId: '0xbounty123',
        paidAt: new Date(1700000000 * 1000),
        reconciled: true,
        reconciledAt: new Date(),
      });
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await processPayment('pay-001');

      expect(result.status).toBe('COMPLETED');
      expect(result.txHash).toBe('0xtx123');
      expect(mockBountyPool.releaseBounty).toHaveBeenCalled();
    });

    it('throws PaymentNotFoundError for non-existent payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(processPayment('nonexistent')).rejects.toThrow(
        PaymentNotFoundError
      );
    });

    it('throws ValidationError for already-completed payment', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        status: 'COMPLETED',
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);

      await expect(processPayment('pay-001')).rejects.toThrow(ValidationError);
    });

    it('updates txHash and paidAt on success', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());

      const updatedPayment = {
        ...payment,
        status: 'COMPLETED',
        txHash: '0xtx123',
        onChainBountyId: '0xbounty123',
        paidAt: new Date(1700000000 * 1000),
        reconciled: true,
        reconciledAt: new Date(),
      };
      mockPrisma.payment.update.mockResolvedValue(updatedPayment);
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await processPayment('pay-001');

      const updateCall = mockPrisma.payment.update.mock.calls[0];
      expect(updateCall[0].data.txHash).toBe('0xtx123');
      expect(updateCall[0].data.onChainBountyId).toBe('0xbounty123');
      expect(updateCall[0].data.status).toBe('COMPLETED');
      expect(updateCall[0].data.paidAt).toBeDefined();
    });

    it('throws ValidationError when protocol has no onChainProtocolId', async () => {
      const protocol = makeProtocol({ onChainProtocolId: null });
      const payment = makePayment({
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());

      await expect(processPayment('pay-001')).rejects.toThrow(ValidationError);
    });

    it('throws InsufficientFundsError when pool balance is too low', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        amount: 200,
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockBountyPool.getProtocolBalance.mockResolvedValueOnce(50);

      await expect(processPayment('pay-001')).rejects.toThrow(
        InsufficientFundsError
      );
    });

    it('increments retryCount on failure', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockBountyPool.releaseBounty.mockRejectedValueOnce(
        new Error('Transaction reverted')
      );
      mockPrisma.payment.update.mockResolvedValue(payment);

      await expect(processPayment('pay-001')).rejects.toThrow(
        'Transaction reverted'
      );

      const failureUpdateCall = mockPrisma.payment.update.mock.calls[0];
      expect(failureUpdateCall[0].data.retryCount).toEqual({ increment: 1 });
      expect(failureUpdateCall[0].data.status).toBe('FAILED');
    });

    it('sets failureReason on blockchain error', async () => {
      const protocol = makeProtocol();
      const payment = makePayment({
        vulnerability: { ...makeVulnerability(), protocol },
      });
      mockPrisma.payment.findUnique.mockResolvedValue(payment);
      mockPrisma.proof.findFirst.mockResolvedValue(makeProof());
      mockBountyPool.releaseBounty.mockRejectedValueOnce(
        new Error('Gas estimation failed')
      );
      mockPrisma.payment.update.mockResolvedValue(payment);

      await expect(processPayment('pay-001')).rejects.toThrow(
        'Gas estimation failed'
      );

      const failureUpdateCall = mockPrisma.payment.update.mock.calls[0];
      expect(failureUpdateCall[0].data.failureReason).toBe(
        'Gas estimation failed'
      );
    });
  });

  // ===========================================================================
  // getPaymentStats
  // ===========================================================================
  describe('getPaymentStats', () => {
    it('returns correct totals and averages', async () => {
      const payments = [
        { amount: 10, status: 'COMPLETED', paidAt: new Date() },
        { amount: 20, status: 'COMPLETED', paidAt: new Date() },
        { amount: 5, status: 'PENDING', paidAt: null },
        { amount: 3, status: 'FAILED', paidAt: null },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(payments);

      const result = await getPaymentStats();

      expect(result.totalPayments).toBe(4);
      expect(result.totalAmountPaid).toBe(30); // 10 + 20
      expect(result.averagePaymentAmount).toBe(15); // 30 / 2
      expect(result.paymentsByStatus.PENDING).toBe(1);
      expect(result.paymentsByStatus.COMPLETED).toBe(2);
      expect(result.paymentsByStatus.FAILED).toBe(1);
    });

    it('filters by protocolId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      await getPaymentStats({ protocolId: 'proto-001' });

      const findManyArg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(findManyArg.where.vulnerability).toEqual({
        protocolId: 'proto-001',
      });
    });

    it('returns zero stats when no payments exist', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await getPaymentStats();

      expect(result.totalPayments).toBe(0);
      expect(result.totalAmountPaid).toBe(0);
      expect(result.averagePaymentAmount).toBe(0);
      expect(result.paymentsByStatus.PENDING).toBe(0);
      expect(result.paymentsByStatus.COMPLETED).toBe(0);
      expect(result.paymentsByStatus.FAILED).toBe(0);
    });

    it('generates time series when groupBy is day', async () => {
      const payments = [
        {
          amount: 10,
          status: 'COMPLETED',
          paidAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(payments);

      const result = await getPaymentStats({ groupBy: 'day', days: 5 });

      expect(result.timeSeries).toBeDefined();
      expect(Array.isArray(result.timeSeries)).toBe(true);
      expect(result.timeSeries!.length).toBeGreaterThanOrEqual(1);
    });

    it('avoids floating-point drift when summing completed amounts', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { amount: 0.1, status: 'COMPLETED', paidAt: new Date('2024-01-01T00:00:00Z') },
        { amount: 0.2, status: 'COMPLETED', paidAt: new Date('2024-01-01T00:00:00Z') },
      ]);

      const result = await getPaymentStats();

      expect(result.totalAmountPaid).toBe(0.3);
      expect(result.averagePaymentAmount).toBe(0.15);
    });
  });

  // ===========================================================================
  // getPaymentList
  // ===========================================================================
  describe('getPaymentList', () => {
    it('returns paginated payment list with success', async () => {
      const vuln = makeVulnerability();
      const protocol = makeProtocol();
      const payments = [
        {
          id: 'pay-001',
          vulnerabilityId: 'vuln-001',
          amount: 5,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx',
          researcherAddress: '0xresearcher',
          paidAt: new Date('2024-01-15T10:00:00Z'),
          queuedAt: new Date('2024-01-15T09:00:00Z'),
          reconciled: true,
          failureReason: null,
          retryCount: 0,
          vulnerability: { ...vuln, protocol },
        },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(payments);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await getPaymentList({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(1);
      expect(result.pagination!.totalCount).toBe(1);
      expect(result.pagination!.currentPage).toBe(1);
    });

    it('applies protocolId filter', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentList({ protocolId: 'proto-001' });

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where;
      expect(whereArg.vulnerability).toBeDefined();
      expect(whereArg.vulnerability.protocolId).toBe('proto-001');
    });

    it('applies status filter', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentList({ status: 'FAILED' });

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('FAILED');
    });

    it('applies date range filters', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentList({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      });

      const whereArg = mockPrisma.payment.findMany.mock.calls[0][0].where;
      expect(whereArg.paidAt).toBeDefined();
      expect(whereArg.paidAt.gte).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(whereArg.paidAt.lte).toEqual(
        new Date('2024-12-31T23:59:59.999Z')
      );
    });

    it('returns success false on error', async () => {
      mockPrisma.payment.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const result = await getPaymentList({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('PAYMENT_LIST_ERROR');
    });

    it('defaults page to 1 and limit to 20', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await getPaymentList({});

      const findManyArg = mockPrisma.payment.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(0);
      expect(findManyArg.take).toBe(20);
    });
  });

  // ===========================================================================
  // proposeManualPayment
  // ===========================================================================
  describe('proposeManualPayment', () => {
    it('creates payment with proposed data', async () => {
      const protocol = makeProtocol({ availableBounty: 100 });
      mockPrisma.protocol.findUnique.mockResolvedValue(protocol);
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const txClient = {
          vulnerability: {
            create: vi.fn().mockResolvedValue(makeVulnerability({ id: 'manual-vuln' })),
          },
          payment: {
            create: vi.fn().mockResolvedValue(
              makePayment({
                id: 'manual-pay',
                status: 'PENDING',
                queuedAt: new Date(),
              })
            ),
          },
          protocol: {
            update: vi.fn().mockResolvedValue(protocol),
          },
        };
        return fn(txClient);
      });

      const result = await proposeManualPayment({
        protocolId: 'proto-001',
        recipientAddress: '0xrecipient',
        severity: 'HIGH',
        justification: 'Found critical vulnerability in contract',
        proposedBy: '0xadmin',
      });

      expect(result.success).toBe(true);
      expect(result.proposal).toBeDefined();
      expect(result.proposal.protocolId).toBe('proto-001');
      expect(result.proposal.recipientAddress).toBe('0xrecipient');
      expect(result.proposal.severity).toBe('HIGH');
      expect(result.proposal.amount).toBe(5); // HIGH = 5 USDC
    });

    it('returns error when protocol not found', async () => {
      mockPrisma.protocol.findUnique.mockResolvedValue(null);

      const result = await proposeManualPayment({
        protocolId: 'nonexistent',
        recipientAddress: '0xrecipient',
        severity: 'HIGH',
        justification: 'Found critical vulnerability in contract',
        proposedBy: '0xadmin',
      });

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('PROTOCOL_NOT_FOUND');
    });

    it('returns error when insufficient balance', async () => {
      const protocol = makeProtocol({ availableBounty: 1, totalBountyPool: 1 });
      mockPrisma.protocol.findUnique.mockResolvedValue(protocol);

      const result = await proposeManualPayment({
        protocolId: 'proto-001',
        recipientAddress: '0xrecipient',
        severity: 'HIGH', // requires 5 USDC
        justification: 'Found critical vulnerability in contract',
        proposedBy: '0xadmin',
      });

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('maps severity to correct amount', async () => {
      const protocol = makeProtocol({ availableBounty: 100 });
      mockPrisma.protocol.findUnique.mockResolvedValue(protocol);

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const txClient = {
          vulnerability: {
            create: vi.fn().mockResolvedValue(makeVulnerability()),
          },
          payment: {
            create: vi.fn().mockResolvedValue(
              makePayment({ id: 'med-pay', amount: 3, queuedAt: new Date() })
            ),
          },
          protocol: {
            update: vi.fn().mockResolvedValue(protocol),
          },
        };
        return fn(txClient);
      });

      const result = await proposeManualPayment({
        protocolId: 'proto-001',
        recipientAddress: '0xrecipient',
        severity: 'MEDIUM',
        justification: 'Found medium vulnerability in contract',
        proposedBy: '0xadmin',
      });

      expect(result.success).toBe(true);
      expect(result.proposal.amount).toBe(3);
    });

    it('sets initial status to PENDING', async () => {
      const protocol = makeProtocol({ availableBounty: 100 });
      mockPrisma.protocol.findUnique.mockResolvedValue(protocol);
      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const txClient = {
          vulnerability: {
            create: vi.fn().mockResolvedValue(makeVulnerability()),
          },
          payment: {
            create: vi.fn().mockResolvedValue(
              makePayment({ status: 'PENDING', queuedAt: new Date() })
            ),
          },
          protocol: {
            update: vi.fn().mockResolvedValue(protocol),
          },
        };
        return fn(txClient);
      });

      const result = await proposeManualPayment({
        protocolId: 'proto-001',
        recipientAddress: '0xrecipient',
        severity: 'LOW',
        justification: 'Found a minor informational issue in code',
        proposedBy: '0xadmin',
      });

      expect(result.success).toBe(true);
      expect(result.proposal.status).toBe('PENDING');
    });
  });

  // ===========================================================================
  // getResearcherEarnings
  // ===========================================================================
  describe('getResearcherEarnings', () => {
    it('returns total earnings and payment list', async () => {
      const payments = [
        {
          id: 'pay-001',
          amount: 10,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx1',
          paidAt: new Date('2024-06-01T10:00:00Z'),
          vulnerability: {
            id: 'vuln-001',
            severity: 'HIGH',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash1',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
        {
          id: 'pay-002',
          amount: 5,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx2',
          paidAt: new Date('2024-06-15T10:00:00Z'),
          vulnerability: {
            id: 'vuln-002',
            severity: 'MEDIUM',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash2',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(payments);

      const result = await getResearcherEarnings('0xresearcher', {});

      expect(result.success).toBe(true);
      expect(result.data!.totalEarnings).toBe(15);
      expect(result.data!.paymentCount).toBe(2);
      expect(result.data!.payments).toHaveLength(2);
      expect(result.data!.researcherAddress).toBe('0xresearcher');
    });

    it('returns empty for unknown researcher', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await getResearcherEarnings('0xunknown', {});

      expect(result.success).toBe(true);
      expect(result.data!.totalEarnings).toBe(0);
      expect(result.data!.paymentCount).toBe(0);
      expect(result.data!.payments).toHaveLength(0);
    });

    it('includes severity breakdown', async () => {
      const payments = [
        {
          id: 'pay-001',
          amount: 10,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx1',
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-001',
            severity: 'CRITICAL',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash1',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
        {
          id: 'pay-002',
          amount: 5,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx2',
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-002',
            severity: 'HIGH',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash2',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
        {
          id: 'pay-003',
          amount: 3,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx3',
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-003',
            severity: 'HIGH',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash3',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(payments);

      const result = await getResearcherEarnings('0xresearcher', {});

      expect(result.success).toBe(true);
      expect(result.data!.paymentsBySeverity.CRITICAL).toBe(1);
      expect(result.data!.paymentsBySeverity.HIGH).toBe(2);
      expect(result.data!.paymentsBySeverity.MEDIUM).toBe(0);
      expect(result.data!.paymentsBySeverity.LOW).toBe(0);
      expect(result.data!.paymentsBySeverity.INFO).toBe(0);
    });

    it('preserves 6-decimal precision in cumulative earnings', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-001',
          amount: 0.1,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx1',
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-001',
            severity: 'LOW',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash1',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
        {
          id: 'pay-002',
          amount: 0.2,
          currency: 'USDC',
          status: 'COMPLETED',
          txHash: '0xtx2',
          paidAt: new Date(),
          vulnerability: {
            id: 'vuln-002',
            severity: 'LOW',
            status: 'ACKNOWLEDGED',
            vulnerabilityHash: '0xhash2',
            protocolId: 'proto-001',
            discoveredAt: new Date(),
          },
        },
      ]);

      const result = await getResearcherEarnings('0xresearcher', {});
      expect(result.data!.totalEarnings).toBe(0.3);
    });
  });

  // ===========================================================================
  // getEarningsLeaderboard
  // ===========================================================================
  describe('getEarningsLeaderboard', () => {
    it('returns leaderboard sorted by total earnings', async () => {
      mockPrisma.payment.groupBy.mockResolvedValue([
        {
          researcherAddress: '0xresearcher1',
          _sum: { amount: 100 },
          _count: { id: 5 },
        },
        {
          researcherAddress: '0xresearcher2',
          _sum: { amount: 50 },
          _count: { id: 3 },
        },
      ]);

      const result = await getEarningsLeaderboard({});

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(2);
      expect(result.leaderboard![0].researcherAddress).toBe('0xresearcher1');
      expect(result.leaderboard![0].totalEarnings).toBe(100);
      expect(result.leaderboard![0].paymentCount).toBe(5);
      expect(result.leaderboard![0].averagePaymentAmount).toBe(20);
    });

    it('applies limit parameter', async () => {
      mockPrisma.payment.groupBy.mockResolvedValue([]);

      await getEarningsLeaderboard({ limit: 5 });

      const groupByArg = mockPrisma.payment.groupBy.mock.calls[0][0];
      expect(groupByArg.take).toBe(5);
    });

    it('returns empty leaderboard when no completed payments', async () => {
      mockPrisma.payment.groupBy.mockResolvedValue([]);

      const result = await getEarningsLeaderboard({});

      expect(result.success).toBe(true);
      expect(result.leaderboard).toHaveLength(0);
    });

    it('calculates correct average payment amount', async () => {
      mockPrisma.payment.groupBy.mockResolvedValue([
        {
          researcherAddress: '0xresearcher',
          _sum: { amount: 30 },
          _count: { id: 3 },
        },
      ]);

      const result = await getEarningsLeaderboard({});

      expect(result.leaderboard![0].averagePaymentAmount).toBe(10);
    });

    it('handles null sum gracefully', async () => {
      mockPrisma.payment.groupBy.mockResolvedValue([
        {
          researcherAddress: '0xresearcher',
          _sum: { amount: null },
          _count: { id: 0 },
        },
      ]);

      const result = await getEarningsLeaderboard({});

      expect(result.leaderboard![0].totalEarnings).toBe(0);
      expect(result.leaderboard![0].averagePaymentAmount).toBe(0);
    });

    it('returns success false on error', async () => {
      mockPrisma.payment.groupBy.mockRejectedValue(
        new Error('Database error')
      );

      const result = await getEarningsLeaderboard({});

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('LEADERBOARD_ERROR');
    });
  });

  // ===========================================================================
  // Custom Error Classes
  // ===========================================================================
  describe('Custom Error Classes', () => {
    it('PaymentNotFoundError extends NotFoundError with correct properties', () => {
      const error = new PaymentNotFoundError('pay-123');
      expect(error).toBeInstanceOf(PaymentNotFoundError);
      expect(error.message).toContain('Payment');
      expect(error.resource).toBe('Payment');
      expect(error.resourceId).toBe('pay-123');
    });

    it('ValidationNotFoundError extends NotFoundError with correct properties', () => {
      const error = new ValidationNotFoundError('val-123');
      expect(error).toBeInstanceOf(ValidationNotFoundError);
      expect(error.message).toContain('Validation');
      expect(error.resource).toBe('Validation');
    });

    it('InsufficientFundsError extends ValidationError with amounts in message', () => {
      const error = new InsufficientFundsError(100, 50);
      expect(error).toBeInstanceOf(InsufficientFundsError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('100');
      expect(error.message).toContain('50');
    });
  });
});
