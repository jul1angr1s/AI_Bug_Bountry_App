import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module-level mocks ────────────────────────────────────────────────────────

const mockSigner = {
  provider: {
    getBlock: vi.fn(),
  },
};

vi.mock('../../config.js', () => ({
  getSigner: vi.fn(() => mockSigner),
  contractAddresses: { validationRegistry: '0xValidationRegistryAddress' },
  usdcConfig: { decimals: 6, address: '0xUSDC', symbol: 'USDC' },
}));

vi.mock('../../abis/ValidationRegistry.json', () => ({
  default: { abi: [] },
}));

const mockContract: Record<string, ReturnType<typeof vi.fn>> & {
  interface: { parseLog: ReturnType<typeof vi.fn>; parseError: ReturnType<typeof vi.fn> };
} = {
  recordValidation: vi.fn(),
  getValidation: vi.fn(),
  getProtocolValidations: vi.fn(),
  getValidationByFinding: vi.fn(),
  isFindingValidated: vi.fn(),
  getConfirmedValidations: vi.fn(),
  getTotalValidationCount: vi.fn(),
  isValidator: vi.fn(),
  interface: {
    parseLog: vi.fn(),
    parseError: vi.fn(),
  },
};

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    Contract: vi.fn(() => mockContract),
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import {
  ValidationRegistryClient,
  ValidationOutcome,
  Severity,
} from '../ValidationRegistryClient.js';
import { contractAddresses } from '../../config.js';
import { Contract } from 'ethers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTxResponse(hash: string) {
  return {
    hash,
    wait: vi.fn(),
  };
}

function makeRawValidation(overrides: Partial<{
  validationId: string;
  protocolId: string;
  findingId: string;
  validatorAgent: string;
  outcome: bigint;
  severity: bigint;
  vulnerabilityType: string;
  executionLog: string;
  proofHash: string;
  timestamp: bigint;
  exists: boolean;
}> = {}) {
  return {
    validationId: overrides.validationId ?? 'val-1',
    protocolId: overrides.protocolId ?? 'proto-1',
    findingId: overrides.findingId ?? 'finding-1',
    validatorAgent: overrides.validatorAgent ?? '0xValidator',
    outcome: overrides.outcome ?? BigInt(0),
    severity: overrides.severity ?? BigInt(0),
    vulnerabilityType: overrides.vulnerabilityType ?? 'reentrancy',
    executionLog: overrides.executionLog ?? 'log-data',
    proofHash: overrides.proofHash ?? '0xProofHash',
    timestamp: overrides.timestamp ?? BigInt(1700000000),
    exists: overrides.exists ?? true,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ValidationRegistryClient', () => {
  let client: ValidationRegistryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ValidationRegistryClient();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a Contract with the correct address, ABI and signer', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xValidationRegistryAddress',
        expect.anything(),
        mockSigner,
      );
    });

    it('should throw when VALIDATION_REGISTRY_ADDRESS is not set', () => {
      const original = contractAddresses.validationRegistry;
      try {
        (contractAddresses as Record<string, string>).validationRegistry = '';
        expect(() => new ValidationRegistryClient()).toThrow('VALIDATION_REGISTRY_ADDRESS not set');
      } finally {
        (contractAddresses as Record<string, string>).validationRegistry = original;
      }
    });
  });

  // ─── recordValidation ─────────────────────────────────────────────────────

  describe('recordValidation', () => {
    const recordArgs = [
      'proto-1',
      'finding-1',
      'reentrancy',
      Severity.CRITICAL,
      ValidationOutcome.CONFIRMED,
      'execution-log',
      '0xProofHash',
    ] as const;

    function setupRecordMocks(overrides?: {
      receiptOverrides?: Record<string, unknown>;
      parsedEvent?: Record<string, unknown> | null;
      blockTimestamp?: number | null;
    }) {
      const {
        receiptOverrides = {},
        parsedEvent = { name: 'ValidationRecorded', args: { validationId: 'val-1' } },
        blockTimestamp = 1700000000,
      } = overrides ?? {};

      const logs = [
        { topics: ['0xEventTopic'], data: '0xEventData' },
      ];

      const receipt = {
        hash: '0xRecordTxHash',
        blockNumber: 100,
        logs,
        ...receiptOverrides,
      };

      const tx = makeTxResponse('0xRecordSent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.recordValidation.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockReturnValue(parsedEvent);

      mockSigner.provider.getBlock.mockResolvedValue(
        blockTimestamp !== null ? { timestamp: blockTimestamp } : null,
      );

      return { tx, receipt };
    }

    it('should call the contract with the correct parameters', async () => {
      setupRecordMocks();

      await client.recordValidation(...recordArgs);

      expect(mockContract.recordValidation).toHaveBeenCalledWith(
        'proto-1',
        'finding-1',
        'reentrancy',
        Severity.CRITICAL,
        ValidationOutcome.CONFIRMED,
        'execution-log',
        '0xProofHash',
      );
    });

    it('should return a ValidationRecordResult with validationId, txHash, blockNumber, and timestamp', async () => {
      setupRecordMocks();

      const result = await client.recordValidation(...recordArgs);

      expect(result).toEqual({
        validationId: 'val-1',
        txHash: '0xRecordTxHash',
        blockNumber: 100,
        timestamp: 1700000000,
      });
    });

    it('should parse the ValidationRecorded event from receipt logs', async () => {
      setupRecordMocks();

      await client.recordValidation(...recordArgs);

      expect(mockContract.interface.parseLog).toHaveBeenCalledWith({
        topics: ['0xEventTopic'],
        data: '0xEventData',
      });
    });

    it('should throw when the transaction receipt is null', async () => {
      const tx = makeTxResponse('0xNullReceipt');
      tx.wait.mockResolvedValue(null);
      mockContract.recordValidation.mockResolvedValue(tx);

      await expect(client.recordValidation(...recordArgs)).rejects.toThrow(
        'Failed to record validation: Transaction receipt is null',
      );
    });

    it('should throw when ValidationRecorded event is not found in receipt logs', async () => {
      const receipt = {
        hash: '0xNoEventHash',
        blockNumber: 101,
        logs: [{ topics: ['0xOtherTopic'], data: '0xOtherData' }],
      };

      const tx = makeTxResponse('0xNoEvent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.recordValidation.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockReturnValue({ name: 'Transfer', args: {} });

      await expect(client.recordValidation(...recordArgs)).rejects.toThrow(
        'ValidationRecorded event not found',
      );
    });

    it('should throw a descriptive error when the contract call fails', async () => {
      mockContract.recordValidation.mockRejectedValue(new Error('execution reverted'));

      await expect(client.recordValidation(...recordArgs)).rejects.toThrow(
        'Failed to record validation: execution reverted',
      );
    });

    it('should fall back to current time when block is null', async () => {
      setupRecordMocks({ blockTimestamp: null });

      const result = await client.recordValidation(...recordArgs);

      // When block is null, the code uses Math.floor(Date.now() / 1000)
      expect(result.timestamp).toBeGreaterThan(0);
      expect(typeof result.timestamp).toBe('number');
    });
  });

  // ─── getValidation ────────────────────────────────────────────────────────

  describe('getValidation', () => {
    it('should return a typed OnChainValidation', async () => {
      const raw = makeRawValidation();
      mockContract.getValidation.mockResolvedValue(raw);

      const result = await client.getValidation('val-1');

      expect(result).toEqual({
        validationId: 'val-1',
        protocolId: 'proto-1',
        findingId: 'finding-1',
        validatorAgent: '0xValidator',
        outcome: 0,
        severity: 0,
        vulnerabilityType: 'reentrancy',
        executionLog: 'log-data',
        proofHash: '0xProofHash',
        timestamp: BigInt(1700000000),
        exists: true,
      });
    });

    it('should convert outcome and severity from bigint to number', async () => {
      const raw = makeRawValidation({ outcome: BigInt(2), severity: BigInt(3) });
      mockContract.getValidation.mockResolvedValue(raw);

      const result = await client.getValidation('val-2');

      expect(result.outcome).toBe(2);
      expect(typeof result.outcome).toBe('number');
      expect(result.severity).toBe(3);
      expect(typeof result.severity).toBe('number');
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getValidation.mockRejectedValue(new Error('not found'));

      await expect(client.getValidation('bad-id')).rejects.toThrow(
        'Failed to get validation: not found',
      );
    });
  });

  // ─── getProtocolValidations ───────────────────────────────────────────────

  describe('getProtocolValidations', () => {
    it('should map an array of raw validations to OnChainValidation array', async () => {
      const rawValidations = [
        makeRawValidation({ validationId: 'v-1', severity: BigInt(0) }),
        makeRawValidation({ validationId: 'v-2', severity: BigInt(2), outcome: BigInt(1) }),
      ];
      mockContract.getProtocolValidations.mockResolvedValue(rawValidations);

      const result = await client.getProtocolValidations('proto-1');

      expect(result).toHaveLength(2);
      expect(result[0].validationId).toBe('v-1');
      expect(result[0].severity).toBe(0);
      expect(result[1].validationId).toBe('v-2');
      expect(result[1].severity).toBe(2);
      expect(result[1].outcome).toBe(1);
    });

    it('should return an empty array when the protocol has no validations', async () => {
      mockContract.getProtocolValidations.mockResolvedValue([]);

      const result = await client.getProtocolValidations('proto-empty');

      expect(result).toEqual([]);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocolValidations.mockRejectedValue(new Error('network error'));

      await expect(
        client.getProtocolValidations('proto-bad'),
      ).rejects.toThrow('Failed to get protocol validations: network error');
    });
  });

  // ─── getValidationByFinding ───────────────────────────────────────────────

  describe('getValidationByFinding', () => {
    it('should return a typed OnChainValidation for a finding', async () => {
      const raw = makeRawValidation({ findingId: 'finding-42' });
      mockContract.getValidationByFinding.mockResolvedValue(raw);

      const result = await client.getValidationByFinding('finding-42');

      expect(result.findingId).toBe('finding-42');
      expect(result.exists).toBe(true);
    });

    it('should convert outcome and severity from bigint to number', async () => {
      const raw = makeRawValidation({ outcome: BigInt(1), severity: BigInt(4) });
      mockContract.getValidationByFinding.mockResolvedValue(raw);

      const result = await client.getValidationByFinding('finding-x');

      expect(result.outcome).toBe(1);
      expect(result.severity).toBe(4);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getValidationByFinding.mockRejectedValue(new Error('not found'));

      await expect(
        client.getValidationByFinding('bad-finding'),
      ).rejects.toThrow('Failed to get validation by finding: not found');
    });
  });

  // ─── isFindingValidated ───────────────────────────────────────────────────

  describe('isFindingValidated', () => {
    it('should return true when the finding has been validated', async () => {
      mockContract.isFindingValidated.mockResolvedValue(true);

      const result = await client.isFindingValidated('finding-1');

      expect(result).toBe(true);
      expect(mockContract.isFindingValidated).toHaveBeenCalledWith('finding-1');
    });

    it('should return false when the finding has not been validated', async () => {
      mockContract.isFindingValidated.mockResolvedValue(false);

      const result = await client.isFindingValidated('finding-unknown');

      expect(result).toBe(false);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.isFindingValidated.mockRejectedValue(new Error('network error'));

      await expect(
        client.isFindingValidated('finding-bad'),
      ).rejects.toThrow('Failed to check finding validation: network error');
    });
  });

  // ─── getConfirmedValidations ──────────────────────────────────────────────

  describe('getConfirmedValidations', () => {
    it('should map an array of raw validations to OnChainValidation array', async () => {
      const rawValidations = [
        makeRawValidation({ validationId: 'cv-1', outcome: BigInt(0) }),
        makeRawValidation({ validationId: 'cv-2', outcome: BigInt(0), severity: BigInt(1) }),
      ];
      mockContract.getConfirmedValidations.mockResolvedValue(rawValidations);

      const result = await client.getConfirmedValidations('proto-1');

      expect(result).toHaveLength(2);
      expect(result[0].validationId).toBe('cv-1');
      expect(result[0].outcome).toBe(0);
      expect(result[1].validationId).toBe('cv-2');
      expect(result[1].severity).toBe(1);
    });

    it('should return an empty array when there are no confirmed validations', async () => {
      mockContract.getConfirmedValidations.mockResolvedValue([]);

      const result = await client.getConfirmedValidations('proto-empty');

      expect(result).toEqual([]);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getConfirmedValidations.mockRejectedValue(new Error('timeout'));

      await expect(
        client.getConfirmedValidations('proto-bad'),
      ).rejects.toThrow('Failed to get confirmed validations: timeout');
    });
  });

  // ─── getTotalValidationCount ──────────────────────────────────────────────

  describe('getTotalValidationCount', () => {
    it('should return the count as a number', async () => {
      mockContract.getTotalValidationCount.mockResolvedValue(BigInt(42));

      const result = await client.getTotalValidationCount();

      expect(result).toBe(42);
      expect(typeof result).toBe('number');
    });

    it('should return 0 when there are no validations', async () => {
      mockContract.getTotalValidationCount.mockResolvedValue(BigInt(0));

      const result = await client.getTotalValidationCount();

      expect(result).toBe(0);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getTotalValidationCount.mockRejectedValue(new Error('network error'));

      await expect(client.getTotalValidationCount()).rejects.toThrow(
        'Failed to get validation count: network error',
      );
    });
  });

  // ─── isValidator ──────────────────────────────────────────────────────────

  describe('isValidator', () => {
    it('should return true when the address has the validator role', async () => {
      mockContract.isValidator.mockResolvedValue(true);

      const result = await client.isValidator('0xValidatorAddress');

      expect(result).toBe(true);
      expect(mockContract.isValidator).toHaveBeenCalledWith('0xValidatorAddress');
    });

    it('should return false when the address lacks the validator role', async () => {
      mockContract.isValidator.mockResolvedValue(false);

      const result = await client.isValidator('0xRandomAddress');

      expect(result).toBe(false);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.isValidator.mockRejectedValue(new Error('network error'));

      await expect(client.isValidator('0xBad')).rejects.toThrow(
        'Failed to check validator role: network error',
      );
    });
  });

  // ─── getContract ──────────────────────────────────────────────────────────

  describe('getContract', () => {
    it('should return the underlying ethers Contract instance', () => {
      const contract = client.getContract();

      expect(contract).toBe(mockContract);
    });
  });

  // ─── getAddress ───────────────────────────────────────────────────────────

  describe('getAddress', () => {
    it('should return the validation registry contract address from config', () => {
      const address = client.getAddress();

      expect(address).toBe('0xValidationRegistryAddress');
    });
  });
});
