import { describe, it, expect, vi, beforeEach } from 'vitest';

// Store mocks in an object that will be populated later
const mocks = {
  findingFindUnique: vi.fn(),
  proofFindUnique: vi.fn(),
};

// Mock Prisma client
vi.mock('../../lib/prisma.js', () => ({
  getPrismaClient: () => ({
    finding: {
      findUnique: (...args: any[]) => mocks.findingFindUnique(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    proof: {
      findUnique: (...args: any[]) => mocks.proofFindUnique(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }),
}));

// Import after mock is set up
import { FindingRepository, ProofRepository } from '../repositories.js';

describe('FindingRepository', () => {
  let findingRepository: FindingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findingFindUnique.mockReset();
    mocks.proofFindUnique.mockReset();
    findingRepository = new FindingRepository();
  });

  describe('getFindingById', () => {
    it('should return finding with proofs, scan, and protocol', async () => {
      const mockFinding = {
        id: 'finding-123',
        scanId: 'scan-456',
        vulnerabilityType: 'REENTRANCY',
        severity: 'HIGH',
        status: 'PENDING',
        filePath: 'contracts/Token.sol',
        lineNumber: 42,
        functionSelector: 'transfer(address,uint256)',
        description: 'Reentrancy vulnerability detected',
        confidenceScore: 0.85,
        proofs: [{ id: 'proof-789' }],
        scan: {
          id: 'scan-456',
          protocol: { id: 'protocol-abc', name: 'TestProtocol' },
        },
      };

      mocks.findingFindUnique.mockResolvedValue(mockFinding);

      const result = await findingRepository.getFindingById('finding-123');

      expect(mocks.findingFindUnique).toHaveBeenCalledWith({
        where: { id: 'finding-123' },
        include: {
          proofs: true,
          scan: {
            include: {
              protocol: true,
            },
          },
        },
      });
      expect(result).toEqual(mockFinding);
    });

    it('should return null when finding not found', async () => {
      mocks.findingFindUnique.mockResolvedValue(null);

      const result = await findingRepository.getFindingById('nonexistent');

      expect(result).toBeNull();
    });
  });
});

describe('ProofRepository', () => {
  let proofRepository: ProofRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findingFindUnique.mockReset();
    mocks.proofFindUnique.mockReset();
    proofRepository = new ProofRepository();
  });

  describe('getProofById', () => {
    it('should return proof with finding details', async () => {
      const mockProof = {
        id: 'proof-123',
        scanId: 'scan-456',
        findingId: 'finding-789',
        encryptedPayload: 'base64payload',
        researcherSignature: 'sig123',
        encryptionKeyId: 'key456',
        status: 'PENDING',
        finding: {
          id: 'finding-789',
          vulnerabilityType: 'REENTRANCY',
          severity: 'HIGH',
        },
      };

      mocks.proofFindUnique.mockResolvedValue(mockProof);

      const result = await proofRepository.getProofById('proof-123');

      expect(mocks.proofFindUnique).toHaveBeenCalledWith({
        where: { id: 'proof-123' },
        include: {
          finding: true,
        },
      });
      expect(result).toEqual(mockProof);
    });

    it('should return null when proof not found', async () => {
      mocks.proofFindUnique.mockResolvedValue(null);

      const result = await proofRepository.getProofById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
