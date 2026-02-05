import { describe, it, expect, vi, beforeEach } from 'vitest';

// Store mocks in an object
const mocks = {
  getProofById: vi.fn(),
  getFindingById: vi.fn(),
};

// Mock repositories
vi.mock('../../../../db/repositories.js', () => ({
  proofRepository: {
    getProofById: (...args: any[]) => mocks.getProofById(...args),
  },
  findingRepository: {
    getFindingById: (...args: any[]) => mocks.getFindingById(...args),
  },
}));

import { decryptProof, ProofSubmissionMessage } from '../decrypt.js';

describe('decryptProof', () => {
  const baseSubmission: ProofSubmissionMessage = {
    scanId: 'scan-123',
    protocolId: 'protocol-456',
    proofId: 'proof-789',
    findingId: 'finding-abc',
    commitHash: 'abc123def456',
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProofById.mockReset();
    mocks.getFindingById.mockReset();
  });

  it('should return error when proof not found', async () => {
    mocks.getProofById.mockResolvedValue(null);

    const result = await decryptProof(baseSubmission);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found in database');
    expect(mocks.getProofById).toHaveBeenCalledWith('proof-789');
  });

  it('should parse base64-encoded encrypted payload', async () => {
    const proofData = {
      vulnerabilityType: 'REENTRANCY',
      severity: 'HIGH',
      description: 'Reentrancy vulnerability in withdraw function',
      location: {
        filePath: 'contracts/Vault.sol',
        lineNumber: 42,
        functionSelector: 'withdraw(uint256)',
      },
      exploitDetails: {
        reproductionSteps: ['Deploy', 'Attack'],
        expectedOutcome: 'Funds secure',
        actualOutcome: 'Funds drained',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(proofData)).toString('base64');

    mocks.getProofById.mockResolvedValue({
      id: 'proof-789',
      encryptedPayload: base64Payload,
    });

    const result = await decryptProof(baseSubmission);

    expect(result.success).toBe(true);
    expect(result.proof?.vulnerabilityType).toBe('REENTRANCY');
    expect(result.proof?.severity).toBe('HIGH');
    expect(result.proof?.location.filePath).toBe('contracts/Vault.sol');
  });

  it('should fallback to finding data when no encrypted payload', async () => {
    mocks.getProofById.mockResolvedValue({
      id: 'proof-789',
      encryptedPayload: null,
    });

    mocks.getFindingById.mockResolvedValue({
      id: 'finding-abc',
      vulnerabilityType: 'INTEGER_OVERFLOW',
      severity: 'MEDIUM',
      description: 'Integer overflow in token transfer',
      filePath: 'contracts/Token.sol',
      lineNumber: 100,
      functionSelector: 'transfer(address,uint256)',
    });

    const result = await decryptProof(baseSubmission);

    expect(result.success).toBe(true);
    expect(result.proof?.vulnerabilityType).toBe('INTEGER_OVERFLOW');
    expect(result.proof?.severity).toBe('MEDIUM');
    expect(result.proof?.location.filePath).toBe('contracts/Token.sol');
    expect(result.proof?.location.lineNumber).toBe(100);
    expect(mocks.getFindingById).toHaveBeenCalledWith('finding-abc');
  });

  it('should return error when finding not found and no encrypted payload', async () => {
    mocks.getProofById.mockResolvedValue({
      id: 'proof-789',
      encryptedPayload: null,
    });

    mocks.getFindingById.mockResolvedValue(null);

    const result = await decryptProof(baseSubmission);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Finding');
    expect(result.error).toContain('not found');
  });

  it('should include all required fields in decrypted proof', async () => {
    const proofData = {
      vulnerabilityType: 'ACCESS_CONTROL',
      severity: 'CRITICAL',
      description: 'Missing access control',
      location: { filePath: 'contracts/Admin.sol' },
      exploitDetails: {
        reproductionSteps: ['Call admin function'],
        expectedOutcome: 'Reject unauthorized',
      },
    };

    mocks.getProofById.mockResolvedValue({
      id: 'proof-789',
      encryptedPayload: JSON.stringify(proofData),
    });

    const result = await decryptProof(baseSubmission);

    expect(result.success).toBe(true);
    expect(result.proof).toMatchObject({
      proofId: 'proof-789',
      findingId: 'finding-abc',
      scanId: 'scan-123',
      protocolId: 'protocol-456',
      commitHash: 'abc123def456',
      vulnerabilityType: 'ACCESS_CONTROL',
      severity: 'CRITICAL',
    });
  });
});
