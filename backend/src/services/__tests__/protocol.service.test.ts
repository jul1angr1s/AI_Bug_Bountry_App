import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Hoisted mocks - vi.hoisted ensures these are available when vi.mock factories
// execute (vi.mock calls are hoisted above all other code by vitest).
// =============================================================================

const { mockPrisma, mockInvalidateCache } = vi.hoisted(() => {
  const mockPrisma: any = {
    protocol: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    fundingEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const mockInvalidateCache = vi.fn().mockResolvedValue(undefined);

  return { mockPrisma, mockInvalidateCache };
});

// =============================================================================
// vi.mock calls (hoisted to top by vitest; factory closures reference hoisted vars)
// =============================================================================

vi.mock('../../lib/prisma.js', () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock('../../lib/cache.js', () => ({
  invalidateCache: mockInvalidateCache,
  CACHE_KEYS: {
    DASHBOARD_STATS: (protocolId?: string) =>
      protocolId ? `dashboard:stats:protocol:${protocolId}` : 'dashboard:stats:global',
  },
}));

// =============================================================================
// Import service under test (after mocks are declared)
// =============================================================================
import {
  registerProtocol,
  getProtocolById,
  listProtocols,
  fundProtocol,
  updateProtocolRegistrationState,
} from '../protocol.service.js';

// =============================================================================
// Test data factories
// =============================================================================

function makeRegistrationInput(overrides: Record<string, any> = {}) {
  return {
    githubUrl: 'https://github.com/org/repo',
    branch: 'main',
    contractPath: 'contracts/Token.sol',
    contractName: 'TestToken',
    bountyTerms: 'Standard bounty terms apply',
    ownerAddress: '0xowner123',
    bountyPoolAmount: 100,
    ...overrides,
  };
}

function makeFundingInput(overrides: Record<string, any> = {}) {
  return {
    amount: 50,
    currency: 'ETH',
    txHash: '0xfundingtx123',
    ...overrides,
  };
}

function makeProtocol(overrides: Record<string, any> = {}) {
  return {
    id: 'proto-001',
    authUserId: 'user-001',
    ownerAddress: '0xowner123',
    githubUrl: 'https://github.com/org/repo',
    branch: 'main',
    contractPath: 'contracts/Token.sol',
    contractName: 'TestToken',
    bountyTerms: 'Standard bounty terms apply',
    status: 'ACTIVE',
    registrationState: 'ACTIVE',
    registrationTxHash: '0xregtx',
    failureReason: null,
    totalBountyPool: 100,
    availableBounty: 80,
    paidBounty: 20,
    riskScore: 7.5,
    onChainProtocolId: '0xprotocol123',
    bountyPoolAmount: 100,
    fundingState: 'FUNDED',
    fundingTxHash: '0xfundingtx',
    fundingVerifiedAt: new Date('2024-03-01T10:00:00Z'),
    minimumBountyRequired: 25,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-20T10:00:00Z'),
    vulnerabilities: [{ id: 'vuln-001' }, { id: 'vuln-002' }],
    scans: [
      {
        id: 'scan-001',
        startedAt: new Date('2024-01-18T10:00:00Z'),
        findings: [{ id: 'finding-001' }, { id: 'finding-002' }],
      },
      {
        id: 'scan-002',
        startedAt: new Date('2024-01-16T10:00:00Z'),
        findings: [{ id: 'finding-003' }],
      },
    ],
    ...overrides,
  };
}

function makeFundingEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'funding-001',
    protocolId: 'proto-001',
    amount: 50,
    txHash: '0xfundingtx123',
    status: 'PENDING',
    changeType: 'DEPOSIT',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ProtocolService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Restore default mock return values that clearAllMocks wipes
    mockInvalidateCache.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // registerProtocol
  // ===========================================================================
  describe('registerProtocol', () => {
    it('registers a new protocol successfully', async () => {
      const input = makeRegistrationInput();
      const createdProtocol = {
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      };

      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue(createdProtocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await registerProtocol('user-001', input);

      expect(result.success).toBe(true);
      expect(result.protocol).toBeDefined();
      expect(result.protocol!.id).toBe('proto-new');
      expect(result.protocol!.githubUrl).toBe(input.githubUrl);
      expect(result.protocol!.status).toBe('PENDING');
      expect(result.protocol!.registrationState).toBe('PENDING');
    });

    it('returns error for duplicate GitHub URL', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(makeProtocol());

      const result = await registerProtocol('user-001', input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('DUPLICATE_GITHUB_URL');
      expect(result.error!.message).toContain('already exists');
    });

    it('creates protocol with PENDING status and registrationState', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await registerProtocol('user-001', input);

      const createCall = mockPrisma.protocol.create.mock.calls[0][0];
      expect(createCall.data.status).toBe('PENDING');
      expect(createCall.data.registrationState).toBe('PENDING');
    });

    it('initializes bounty pool values to 0', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await registerProtocol('user-001', input);

      const createCall = mockPrisma.protocol.create.mock.calls[0][0];
      expect(createCall.data.totalBountyPool).toBe(0);
      expect(createCall.data.availableBounty).toBe(0);
      expect(createCall.data.paidBounty).toBe(0);
    });

    it('stores all input fields in created protocol', async () => {
      const input = makeRegistrationInput({
        branch: 'develop',
        contractPath: 'src/contracts/Vault.sol',
        contractName: 'SecureVault',
        bountyPoolAmount: 250,
      });
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await registerProtocol('user-001', input);

      const createCall = mockPrisma.protocol.create.mock.calls[0][0];
      expect(createCall.data.branch).toBe('develop');
      expect(createCall.data.contractPath).toBe('src/contracts/Vault.sol');
      expect(createCall.data.contractName).toBe('SecureVault');
      expect(createCall.data.bountyPoolAmount).toBe(250);
      expect(createCall.data.ownerAddress).toBe('0xowner123');
    });

    it('associates protocol with the provided userId', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await registerProtocol('user-specific', input);

      const createCall = mockPrisma.protocol.create.mock.calls[0][0];
      expect(createCall.data.authUserId).toBe('user-specific');
    });

    it('creates an audit log entry on successful registration', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await registerProtocol('user-001', input);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      expect(auditCall.data.protocolId).toBe('proto-new');
      expect(auditCall.data.action).toBe('REGISTRATION_ATTEMPT');
      expect(auditCall.data.metadata.githubUrl).toBe(input.githubUrl);
    });

    it('does not create audit log when duplicate is detected', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(makeProtocol());

      await registerProtocol('user-001', input);

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('returns REGISTRATION_FAILED on database error', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockRejectedValue(new Error('DB connection lost'));

      const result = await registerProtocol('user-001', input);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('REGISTRATION_FAILED');
      expect(result.error!.message).toContain('Failed to register');
    });

    it('does not create protocol when findUnique throws', async () => {
      const input = makeRegistrationInput();
      mockPrisma.protocol.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await registerProtocol('user-001', input);

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('REGISTRATION_FAILED');
      expect(mockPrisma.protocol.create).not.toHaveBeenCalled();
    });

    it('handles optional bountyPoolAmount correctly', async () => {
      const input = makeRegistrationInput({ bountyPoolAmount: undefined });
      mockPrisma.protocol.findUnique.mockResolvedValue(null);
      mockPrisma.protocol.create.mockResolvedValue({
        id: 'proto-new',
        githubUrl: input.githubUrl,
        status: 'PENDING',
        registrationState: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await registerProtocol('user-001', input);

      expect(result.success).toBe(true);
      const createCall = mockPrisma.protocol.create.mock.calls[0][0];
      expect(createCall.data.bountyPoolAmount).toBeUndefined();
    });
  });

  // ===========================================================================
  // getProtocolById
  // ===========================================================================
  describe('getProtocolById', () => {
    it('returns protocol overview with stats', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('proto-001');
      expect(result!.githubUrl).toBe('https://github.com/org/repo');
      expect(result!.contractName).toBe('TestToken');
      expect(result!.status).toBe('ACTIVE');
      expect(result!.totalBountyPool).toBe(100);
      expect(result!.availableBounty).toBe(80);
      expect(result!.paidBounty).toBe(20);
    });

    it('returns null for non-existent protocol', async () => {
      mockPrisma.protocol.findFirst.mockResolvedValue(null);

      const result = await getProtocolById('nonexistent');

      expect(result).toBeNull();
    });

    it('filters by userId when provided', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      await getProtocolById('proto-001', 'user-001');

      const whereArg = mockPrisma.protocol.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBe('proto-001');
      expect(whereArg.authUserId).toBe('user-001');
    });

    it('does not include authUserId when userId is not provided', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      await getProtocolById('proto-001');

      const whereArg = mockPrisma.protocol.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBe('proto-001');
      expect(whereArg.authUserId).toBeUndefined();
    });

    it('calculates vulnerability count from scan findings', async () => {
      const protocol = makeProtocol({
        scans: [
          { id: 's1', startedAt: new Date(), findings: [{ id: 'f1' }, { id: 'f2' }] },
          { id: 's2', startedAt: new Date(), findings: [{ id: 'f3' }] },
        ],
      });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.stats.vulnerabilityCount).toBe(3); // 2 + 1 findings
    });

    it('counts scans correctly', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.stats.scanCount).toBe(2);
    });

    it('returns lastScanAt from most recent scan', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.stats.lastScanAt).toBe('2024-01-18T10:00:00.000Z');
    });

    it('returns null lastScanAt when no scans exist', async () => {
      const protocol = makeProtocol({ scans: [] });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.stats.lastScanAt).toBeNull();
    });

    it('formats date fields as ISO strings', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.createdAt).toBe('2024-01-15T10:00:00.000Z');
      expect(result!.updatedAt).toBe('2024-01-20T10:00:00.000Z');
    });

    it('determines canRequestScan as true when conditions met', async () => {
      const protocol = makeProtocol({
        status: 'ACTIVE',
        fundingState: 'FUNDED',
        totalBountyPool: 100,
        minimumBountyRequired: 25,
      });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.canRequestScan).toBe(true);
    });

    it('determines canRequestScan as false when status is not ACTIVE', async () => {
      const protocol = makeProtocol({ status: 'PENDING' });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.canRequestScan).toBe(false);
    });

    it('determines canRequestScan as false when funding is insufficient', async () => {
      const protocol = makeProtocol({
        totalBountyPool: 10,
        minimumBountyRequired: 25,
      });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.canRequestScan).toBe(false);
    });

    it('determines canRequestScan as false when fundingState is not FUNDED', async () => {
      const protocol = makeProtocol({ fundingState: 'PENDING' });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.canRequestScan).toBe(false);
    });

    it('includes Funding Gate fields in overview', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.onChainProtocolId).toBe('0xprotocol123');
      expect(result!.bountyPoolAmount).toBe(100);
      expect(result!.fundingState).toBe('FUNDED');
      expect(result!.fundingTxHash).toBe('0xfundingtx');
      expect(result!.fundingVerifiedAt).toBe('2024-03-01T10:00:00.000Z');
      expect(result!.minimumBountyRequired).toBe(25);
    });

    it('returns null on database error', async () => {
      mockPrisma.protocol.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await getProtocolById('proto-001');

      expect(result).toBeNull();
    });

    it('handles null fundingVerifiedAt', async () => {
      const protocol = makeProtocol({ fundingVerifiedAt: null });
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);

      const result = await getProtocolById('proto-001');

      expect(result!.fundingVerifiedAt).toBeNull();
    });
  });

  // ===========================================================================
  // listProtocols
  // ===========================================================================
  describe('listProtocols', () => {
    it('returns paginated list of protocols', async () => {
      const protocols = [
        {
          id: 'proto-001',
          githubUrl: 'https://github.com/org/repo1',
          contractName: 'Token1',
          status: 'ACTIVE',
          riskScore: 5.0,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          scans: [{ id: 's1', findings: [{ id: 'f1' }] }],
          vulnerabilities: [{ id: 'v1' }],
        },
      ];
      mockPrisma.protocol.count.mockResolvedValue(1);
      mockPrisma.protocol.findMany.mockResolvedValue(protocols);

      const result = await listProtocols({ page: 1, limit: 20 });

      expect(result.protocols).toHaveLength(1);
      expect(result.protocols[0].id).toBe('proto-001');
      expect(result.protocols[0].name).toBe('Token1');
      expect(result.protocols[0].status).toBe('ACTIVE');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('applies status filter', async () => {
      mockPrisma.protocol.count.mockResolvedValue(0);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      await listProtocols({ status: 'ACTIVE' });

      const whereArg = mockPrisma.protocol.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('ACTIVE');
    });

    it('applies userId filter', async () => {
      mockPrisma.protocol.count.mockResolvedValue(0);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      await listProtocols({ userId: 'user-001' });

      const whereArg = mockPrisma.protocol.findMany.mock.calls[0][0].where;
      expect(whereArg.authUserId).toBe('user-001');
    });

    it('defaults to page 1 and limit 20', async () => {
      mockPrisma.protocol.count.mockResolvedValue(0);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      const result = await listProtocols({});

      const findManyArg = mockPrisma.protocol.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(0);
      expect(findManyArg.take).toBe(20);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('caps limit at 100', async () => {
      mockPrisma.protocol.count.mockResolvedValue(0);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      const result = await listProtocols({ limit: 500 });

      const findManyArg = mockPrisma.protocol.findMany.mock.calls[0][0];
      expect(findManyArg.take).toBe(100);
      expect(result.pagination.limit).toBe(100);
    });

    it('calculates correct skip for page 2', async () => {
      mockPrisma.protocol.count.mockResolvedValue(50);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      const result = await listProtocols({ page: 2, limit: 10 });

      const findManyArg = mockPrisma.protocol.findMany.mock.calls[0][0];
      expect(findManyArg.skip).toBe(10); // (page 2 - 1) * limit 10
      expect(result.pagination.totalPages).toBe(5);
    });

    it('calculates totalPages correctly', async () => {
      mockPrisma.protocol.count.mockResolvedValue(25);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      const result = await listProtocols({ limit: 10 });

      expect(result.pagination.totalPages).toBe(3); // ceil(25/10)
    });

    it('returns empty protocols on database error', async () => {
      mockPrisma.protocol.count.mockRejectedValue(new Error('DB error'));

      const result = await listProtocols({});

      expect(result.protocols).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('orders protocols by createdAt descending', async () => {
      mockPrisma.protocol.count.mockResolvedValue(0);
      mockPrisma.protocol.findMany.mockResolvedValue([]);

      await listProtocols({});

      const findManyArg = mockPrisma.protocol.findMany.mock.calls[0][0];
      expect(findManyArg.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('counts findings across scans for vulnerabilitiesCount', async () => {
      const protocols = [
        {
          id: 'proto-001',
          githubUrl: 'https://github.com/org/repo1',
          contractName: 'Token1',
          status: 'ACTIVE',
          riskScore: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          scans: [
            { id: 's1', findings: [{ id: 'f1' }, { id: 'f2' }] },
            { id: 's2', findings: [{ id: 'f3' }] },
          ],
          vulnerabilities: [{ id: 'v1' }],
        },
      ];
      mockPrisma.protocol.count.mockResolvedValue(1);
      mockPrisma.protocol.findMany.mockResolvedValue(protocols);

      const result = await listProtocols({});

      expect(result.protocols[0].vulnerabilitiesCount).toBe(3); // 2 + 1 findings
      expect(result.protocols[0].scansCount).toBe(2);
    });

    it('formats createdAt as ISO string', async () => {
      const protocols = [
        {
          id: 'proto-001',
          githubUrl: 'https://github.com/org/repo1',
          contractName: 'Token1',
          status: 'ACTIVE',
          riskScore: null,
          createdAt: new Date('2024-06-15T12:00:00Z'),
          scans: [],
          vulnerabilities: [],
        },
      ];
      mockPrisma.protocol.count.mockResolvedValue(1);
      mockPrisma.protocol.findMany.mockResolvedValue(protocols);

      const result = await listProtocols({});

      expect(result.protocols[0].createdAt).toBe('2024-06-15T12:00:00.000Z');
    });

    it('uses contractName as protocol name', async () => {
      const protocols = [
        {
          id: 'proto-001',
          githubUrl: 'https://github.com/org/repo1',
          contractName: 'MyContract',
          status: 'ACTIVE',
          riskScore: null,
          createdAt: new Date(),
          scans: [],
          vulnerabilities: [],
        },
      ];
      mockPrisma.protocol.count.mockResolvedValue(1);
      mockPrisma.protocol.findMany.mockResolvedValue(protocols);

      const result = await listProtocols({});

      expect(result.protocols[0].name).toBe('MyContract');
    });
  });

  // ===========================================================================
  // fundProtocol
  // ===========================================================================
  describe('fundProtocol', () => {
    it('creates funding event and updates pool on success', async () => {
      const protocol = makeProtocol();
      const funding = makeFundingEvent();
      const input = makeFundingInput();

      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(funding);
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await fundProtocol('proto-001', 'user-001', input);

      expect(result.success).toBe(true);
      expect(result.funding).toBeDefined();
      expect(result.funding!.id).toBe('funding-001');
      expect(result.funding!.amount).toBe(50);
      expect(result.funding!.txHash).toBe('0xfundingtx123');
      expect(result.funding!.status).toBe('PENDING');
    });

    it('returns error when protocol not found', async () => {
      mockPrisma.protocol.findFirst.mockResolvedValue(null);

      const result = await fundProtocol(
        'nonexistent',
        'user-001',
        makeFundingInput()
      );

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('PROTOCOL_NOT_FOUND');
    });

    it('returns error when user does not own protocol', async () => {
      mockPrisma.protocol.findFirst.mockResolvedValue(null); // findFirst with wrong userId returns null

      const result = await fundProtocol(
        'proto-001',
        'wrong-user',
        makeFundingInput()
      );

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('PROTOCOL_NOT_FOUND');
      expect(result.error!.message).toContain('access denied');
    });

    it('verifies ownership by querying with both protocolId and userId', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(makeFundingEvent());
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await fundProtocol('proto-001', 'user-001', makeFundingInput());

      const whereArg = mockPrisma.protocol.findFirst.mock.calls[0][0].where;
      expect(whereArg.id).toBe('proto-001');
      expect(whereArg.authUserId).toBe('user-001');
    });

    it('increments totalBountyPool and availableBounty', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(makeFundingEvent());
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await fundProtocol('proto-001', 'user-001', makeFundingInput({ amount: 75 }));

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.totalBountyPool).toEqual({ increment: 75 });
      expect(updateCall.data.availableBounty).toEqual({ increment: 75 });
    });

    it('creates audit log with funding details', async () => {
      const protocol = makeProtocol();
      const funding = makeFundingEvent();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(funding);
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await fundProtocol('proto-001', 'user-001', makeFundingInput());

      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      expect(auditCall.data.protocolId).toBe('proto-001');
      expect(auditCall.data.action).toBe('FUNDING_SUBMISSION');
      expect(auditCall.data.txHash).toBe('0xfundingtx123');
      expect(auditCall.data.metadata.amount).toBe(50);
    });

    it('invalidates cache on successful funding', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(makeFundingEvent());
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await fundProtocol('proto-001', 'user-001', makeFundingInput());

      expect(mockInvalidateCache).toHaveBeenCalledWith(
        'dashboard:stats:protocol:proto-001'
      );
    });

    it('returns FUNDING_FAILED on database error', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockRejectedValue(
        new Error('DB write failed')
      );

      const result = await fundProtocol(
        'proto-001',
        'user-001',
        makeFundingInput()
      );

      expect(result.success).toBe(false);
      expect(result.error!.code).toBe('FUNDING_FAILED');
      expect(result.error!.message).toContain('Failed to process funding');
    });

    it('creates funding event with PENDING status and DEPOSIT type', async () => {
      const protocol = makeProtocol();
      mockPrisma.protocol.findFirst.mockResolvedValue(protocol);
      mockPrisma.fundingEvent.create.mockResolvedValue(makeFundingEvent());
      mockPrisma.protocol.update.mockResolvedValue(protocol);
      mockPrisma.auditLog.create.mockResolvedValue({});

      await fundProtocol('proto-001', 'user-001', makeFundingInput());

      const createCall = mockPrisma.fundingEvent.create.mock.calls[0][0];
      expect(createCall.data.status).toBe('PENDING');
      expect(createCall.data.changeType).toBe('DEPOSIT');
    });
  });

  // ===========================================================================
  // updateProtocolRegistrationState
  // ===========================================================================
  describe('updateProtocolRegistrationState', () => {
    it('updates registration state to ACTIVE with txHash', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState(
        'proto-001',
        'ACTIVE',
        '0xregtx123'
      );

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe('proto-001');
      expect(updateCall.data.registrationState).toBe('ACTIVE');
      expect(updateCall.data.registrationTxHash).toBe('0xregtx123');
      expect(updateCall.data.status).toBe('ACTIVE');
    });

    it('sets status to ACTIVE when state is ACTIVE', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState('proto-001', 'ACTIVE');

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('ACTIVE');
    });

    it('sets status to PENDING for non-ACTIVE states', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState('proto-001', 'FAILED');

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe('PENDING');
    });

    it('stores failureReason when provided', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState(
        'proto-001',
        'FAILED',
        undefined,
        'Contract verification failed'
      );

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.failureReason).toBe('Contract verification failed');
    });

    it('creates audit log with REGISTRATION_SUCCESS for ACTIVE state', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState(
        'proto-001',
        'ACTIVE',
        '0xregtx123'
      );

      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      expect(auditCall.data.action).toBe('REGISTRATION_SUCCESS');
      expect(auditCall.data.txHash).toBe('0xregtx123');
    });

    it('creates audit log with REGISTRATION_FAILED for non-ACTIVE state', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState(
        'proto-001',
        'FAILED',
        undefined,
        'Timeout'
      );

      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      expect(auditCall.data.action).toBe('REGISTRATION_FAILED');
      expect(auditCall.data.metadata.failureReason).toBe('Timeout');
    });

    it('invalidates cache after state update', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState('proto-001', 'ACTIVE');

      expect(mockInvalidateCache).toHaveBeenCalledWith(
        'dashboard:stats:protocol:proto-001'
      );
    });

    it('does not throw on database error', async () => {
      mockPrisma.protocol.update.mockRejectedValue(new Error('DB error'));

      // Should not throw - the function catches errors internally
      await expect(
        updateProtocolRegistrationState('proto-001', 'ACTIVE')
      ).resolves.toBeUndefined();
    });

    it('handles undefined txHash gracefully', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState('proto-001', 'ACTIVE');

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.registrationTxHash).toBeUndefined();
    });

    it('handles undefined failureReason gracefully', async () => {
      mockPrisma.protocol.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await updateProtocolRegistrationState('proto-001', 'FAILED');

      const updateCall = mockPrisma.protocol.update.mock.calls[0][0];
      expect(updateCall.data.failureReason).toBeUndefined();
    });
  });
});
