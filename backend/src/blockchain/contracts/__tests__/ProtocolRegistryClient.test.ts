import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module-level mocks ────────────────────────────────────────────────────────

const mockSigner = {
  provider: {
    getBlock: vi.fn(),
  },
};

vi.mock('../../config.js', () => ({
  getSigner: vi.fn(() => mockSigner),
  contractAddresses: { protocolRegistry: '0xProtocolRegistryAddress' },
  usdcConfig: { decimals: 6, address: '0xUSDC', symbol: 'USDC' },
}));

vi.mock('../../abis/ProtocolRegistry.json', () => ({
  default: { abi: [] },
}));

const mockContract: Record<string, ReturnType<typeof vi.fn>> & {
  interface: { parseLog: ReturnType<typeof vi.fn>; parseError: ReturnType<typeof vi.fn> };
} = {
  registerProtocol: vi.fn(),
  getProtocol: vi.fn(),
  isGithubUrlRegistered: vi.fn(),
  getProtocolIdByGithubUrl: vi.fn(),
  updateProtocolStatus: vi.fn(),
  getProtocolCount: vi.fn(),
  getProtocolsByOwner: vi.fn(),
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
  ProtocolRegistryClient,
  ProtocolStatus,
} from '../ProtocolRegistryClient.js';
import { contractAddresses } from '../../config.js';
import { Contract, ethers } from 'ethers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTxResponse(hash: string) {
  return {
    hash,
    wait: vi.fn(),
  };
}

function makeRawProtocol(overrides: Partial<{
  protocolId: string;
  owner: string;
  githubUrl: string;
  contractPath: string;
  contractName: string;
  bountyTermsHash: string;
  status: bigint;
  registeredAt: bigint;
  totalBountyPool: bigint;
}> = {}) {
  return {
    protocolId: overrides.protocolId ?? 'proto-1',
    owner: overrides.owner ?? '0xOwner',
    githubUrl: overrides.githubUrl ?? 'https://github.com/test/repo',
    contractPath: overrides.contractPath ?? 'contracts/',
    contractName: overrides.contractName ?? 'TestContract',
    bountyTermsHash: overrides.bountyTermsHash ?? '0xTermsHash',
    status: overrides.status ?? BigInt(1),
    registeredAt: overrides.registeredAt ?? BigInt(1700000000),
    totalBountyPool: overrides.totalBountyPool ?? BigInt(100_000_000),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ProtocolRegistryClient', () => {
  let client: ProtocolRegistryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ProtocolRegistryClient();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a Contract with the correct address, ABI and signer', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xProtocolRegistryAddress',
        expect.anything(),
        mockSigner,
      );
    });

    it('should throw when PROTOCOL_REGISTRY_ADDRESS is not set', () => {
      const original = contractAddresses.protocolRegistry;
      try {
        (contractAddresses as Record<string, string>).protocolRegistry = '';
        expect(() => new ProtocolRegistryClient()).toThrow('PROTOCOL_REGISTRY_ADDRESS not set');
      } finally {
        (contractAddresses as Record<string, string>).protocolRegistry = original;
      }
    });
  });

  // ─── registerProtocol ─────────────────────────────────────────────────────

  describe('registerProtocol', () => {
    const registerArgs = [
      'https://github.com/test/repo',
      'contracts/',
      'TestContract',
      'Standard bounty terms',
    ] as const;

    function setupRegisterMocks(overrides?: {
      receiptOverrides?: Record<string, unknown>;
      parsedEvent?: Record<string, unknown> | null;
      blockTimestamp?: number | null;
    }) {
      const {
        receiptOverrides = {},
        parsedEvent = { name: 'ProtocolRegistered', args: { protocolId: 'proto-1' } },
        blockTimestamp = 1700000000,
      } = overrides ?? {};

      const logs = [
        { topics: ['0xEventTopic'], data: '0xEventData' },
      ];

      const receipt = {
        hash: '0xRegisterTxHash',
        blockNumber: 100,
        logs,
        ...receiptOverrides,
      };

      const tx = makeTxResponse('0xRegisterSent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.registerProtocol.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockReturnValue(parsedEvent);

      mockSigner.provider.getBlock.mockResolvedValue(
        blockTimestamp !== null ? { timestamp: blockTimestamp } : null,
      );

      return { tx, receipt };
    }

    it('should call the contract with the correct parameters', async () => {
      setupRegisterMocks();

      await client.registerProtocol(...registerArgs);

      expect(mockContract.registerProtocol).toHaveBeenCalledWith(
        'https://github.com/test/repo',
        'contracts/',
        'TestContract',
        'Standard bounty terms',
      );
    });

    it('should return a ProtocolRegistrationResult with protocolId, txHash, blockNumber, and timestamp', async () => {
      setupRegisterMocks();

      const result = await client.registerProtocol(...registerArgs);

      expect(result).toEqual({
        protocolId: 'proto-1',
        txHash: '0xRegisterTxHash',
        blockNumber: 100,
        timestamp: 1700000000,
      });
    });

    it('should parse the ProtocolRegistered event from receipt logs', async () => {
      setupRegisterMocks();

      await client.registerProtocol(...registerArgs);

      expect(mockContract.interface.parseLog).toHaveBeenCalledWith({
        topics: ['0xEventTopic'],
        data: '0xEventData',
      });
    });

    it('should throw when the transaction receipt is null', async () => {
      const tx = makeTxResponse('0xNullReceipt');
      tx.wait.mockResolvedValue(null);
      mockContract.registerProtocol.mockResolvedValue(tx);

      await expect(client.registerProtocol(...registerArgs)).rejects.toThrow(
        'Failed to register protocol: Transaction receipt is null',
      );
    });

    it('should throw when ProtocolRegistered event is not found in receipt logs', async () => {
      const receipt = {
        hash: '0xNoEventHash',
        blockNumber: 101,
        logs: [{ topics: ['0xOtherTopic'], data: '0xOtherData' }],
      };

      const tx = makeTxResponse('0xNoEvent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.registerProtocol.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockReturnValue({ name: 'Transfer', args: {} });

      await expect(client.registerProtocol(...registerArgs)).rejects.toThrow(
        'ProtocolRegistered event not found',
      );
    });

    it('should throw a descriptive error when the contract call fails', async () => {
      mockContract.registerProtocol.mockRejectedValue(new Error('execution reverted'));

      await expect(client.registerProtocol(...registerArgs)).rejects.toThrow(
        'Failed to register protocol: execution reverted',
      );
    });

    it('should fall back to current time when block is null', async () => {
      setupRegisterMocks({ blockTimestamp: null });

      const result = await client.registerProtocol(...registerArgs);

      expect(result.timestamp).toBeGreaterThan(0);
      expect(typeof result.timestamp).toBe('number');
    });
  });

  // ─── getProtocol ──────────────────────────────────────────────────────────

  describe('getProtocol', () => {
    it('should return a typed OnChainProtocol', async () => {
      const raw = makeRawProtocol();
      mockContract.getProtocol.mockResolvedValue(raw);

      const result = await client.getProtocol('proto-1');

      expect(result).toEqual({
        protocolId: 'proto-1',
        owner: '0xOwner',
        githubUrl: 'https://github.com/test/repo',
        contractPath: 'contracts/',
        contractName: 'TestContract',
        bountyTermsHash: '0xTermsHash',
        status: 1,
        registeredAt: BigInt(1700000000),
        totalBountyPool: BigInt(100_000_000),
      });
    });

    it('should convert status from bigint to number', async () => {
      const raw = makeRawProtocol({ status: BigInt(2) });
      mockContract.getProtocol.mockResolvedValue(raw);

      const result = await client.getProtocol('proto-2');

      expect(result.status).toBe(2);
      expect(typeof result.status).toBe('number');
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocol.mockRejectedValue(new Error('not found'));

      await expect(client.getProtocol('bad-id')).rejects.toThrow(
        'Failed to get protocol: not found',
      );
    });
  });

  // ─── isGithubUrlRegistered ────────────────────────────────────────────────

  describe('isGithubUrlRegistered', () => {
    it('should return true when the GitHub URL is registered', async () => {
      mockContract.isGithubUrlRegistered.mockResolvedValue(true);

      const result = await client.isGithubUrlRegistered('https://github.com/test/repo');

      expect(result).toBe(true);
      expect(mockContract.isGithubUrlRegistered).toHaveBeenCalledWith('https://github.com/test/repo');
    });

    it('should return false when the GitHub URL is not registered', async () => {
      mockContract.isGithubUrlRegistered.mockResolvedValue(false);

      const result = await client.isGithubUrlRegistered('https://github.com/unknown/repo');

      expect(result).toBe(false);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.isGithubUrlRegistered.mockRejectedValue(new Error('network error'));

      await expect(
        client.isGithubUrlRegistered('https://github.com/test/repo'),
      ).rejects.toThrow('Failed to check GitHub URL: network error');
    });
  });

  // ─── getProtocolIdByGithubUrl ─────────────────────────────────────────────

  describe('getProtocolIdByGithubUrl', () => {
    it('should return the protocol ID when found', async () => {
      mockContract.getProtocolIdByGithubUrl.mockResolvedValue('0xProtoId123');

      const result = await client.getProtocolIdByGithubUrl('https://github.com/test/repo');

      expect(result).toBe('0xProtoId123');
    });

    it('should return null when protocol ID is ZeroHash (bytes32(0))', async () => {
      mockContract.getProtocolIdByGithubUrl.mockResolvedValue(ethers.ZeroHash);

      const result = await client.getProtocolIdByGithubUrl('https://github.com/unknown/repo');

      expect(result).toBeNull();
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocolIdByGithubUrl.mockRejectedValue(new Error('network error'));

      await expect(
        client.getProtocolIdByGithubUrl('https://github.com/test/repo'),
      ).rejects.toThrow('Failed to get protocol ID: network error');
    });
  });

  // ─── updateProtocolStatus ─────────────────────────────────────────────────

  describe('updateProtocolStatus', () => {
    it('should call the contract and return the receipt hash', async () => {
      const tx = makeTxResponse('0xUpdateStatusTx');
      tx.wait.mockResolvedValue({ hash: '0xUpdateStatusReceipt', blockNumber: 200 });
      mockContract.updateProtocolStatus.mockResolvedValue(tx);

      const result = await client.updateProtocolStatus('proto-1', ProtocolStatus.ACTIVE);

      expect(mockContract.updateProtocolStatus).toHaveBeenCalledWith(
        'proto-1',
        ProtocolStatus.ACTIVE,
      );
      expect(result).toBe('0xUpdateStatusReceipt');
    });

    it('should throw when the transaction receipt is null', async () => {
      const tx = makeTxResponse('0xNullReceipt');
      tx.wait.mockResolvedValue(null);
      mockContract.updateProtocolStatus.mockResolvedValue(tx);

      await expect(
        client.updateProtocolStatus('proto-1', ProtocolStatus.PAUSED),
      ).rejects.toThrow('Failed to update protocol status: Transaction receipt is null');
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.updateProtocolStatus.mockRejectedValue(new Error('access denied'));

      await expect(
        client.updateProtocolStatus('proto-1', ProtocolStatus.DEACTIVATED),
      ).rejects.toThrow('Failed to update protocol status: access denied');
    });
  });

  // ─── getProtocolCount ─────────────────────────────────────────────────────

  describe('getProtocolCount', () => {
    it('should return the count as a number', async () => {
      mockContract.getProtocolCount.mockResolvedValue(BigInt(15));

      const result = await client.getProtocolCount();

      expect(result).toBe(15);
      expect(typeof result).toBe('number');
    });

    it('should return 0 when there are no protocols', async () => {
      mockContract.getProtocolCount.mockResolvedValue(BigInt(0));

      const result = await client.getProtocolCount();

      expect(result).toBe(0);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocolCount.mockRejectedValue(new Error('network error'));

      await expect(client.getProtocolCount()).rejects.toThrow(
        'Failed to get protocol count: network error',
      );
    });
  });

  // ─── getProtocolsByOwner ──────────────────────────────────────────────────

  describe('getProtocolsByOwner', () => {
    it('should return an array of protocol IDs', async () => {
      mockContract.getProtocolsByOwner.mockResolvedValue(['proto-1', 'proto-2']);

      const result = await client.getProtocolsByOwner('0xOwner');

      expect(result).toEqual(['proto-1', 'proto-2']);
      expect(mockContract.getProtocolsByOwner).toHaveBeenCalledWith('0xOwner');
    });

    it('should return an empty array when the owner has no protocols', async () => {
      mockContract.getProtocolsByOwner.mockResolvedValue([]);

      const result = await client.getProtocolsByOwner('0xNobody');

      expect(result).toEqual([]);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocolsByOwner.mockRejectedValue(new Error('network error'));

      await expect(
        client.getProtocolsByOwner('0xOwner'),
      ).rejects.toThrow('Failed to get protocols by owner: network error');
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
    it('should return the protocol registry contract address from config', () => {
      const address = client.getAddress();

      expect(address).toBe('0xProtocolRegistryAddress');
    });
  });
});
