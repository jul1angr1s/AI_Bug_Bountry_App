import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module-level mocks ────────────────────────────────────────────────────────

const mockSigner = {
  provider: {
    getBlock: vi.fn(),
  },
};

vi.mock('../../config.js', () => ({
  getSigner: vi.fn(() => mockSigner),
  contractAddresses: { bountyPool: '0xBountyPoolAddress' },
  usdcConfig: { decimals: 6, address: '0xUSDC', symbol: 'USDC' },
}));

vi.mock('../../abis/BountyPool.json', () => ({
  default: { abi: [] },
}));

const mockContract: Record<string, ReturnType<typeof vi.fn>> & {
  interface: { parseLog: ReturnType<typeof vi.fn>; parseError: ReturnType<typeof vi.fn> };
} = {
  depositBounty: vi.fn(),
  releaseBounty: vi.fn(),
  calculateBountyAmount: vi.fn(),
  getProtocolBalance: vi.fn(),
  getBounty: vi.fn(),
  getProtocolBounties: vi.fn(),
  getResearcherBounties: vi.fn(),
  getTotalBountiesPaid: vi.fn(),
  getResearcherEarnings: vi.fn(),
  baseBountyAmount: vi.fn(),
  updateBaseBountyAmount: vi.fn(),
  updateSeverityMultiplier: vi.fn(),
  isPayer: vi.fn(),
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

import { BountyPoolClient, BountySeverity } from '../BountyPoolClient.js';
import { contractAddresses } from '../../config.js';
import { Contract } from 'ethers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTxResponse(hash: string) {
  return {
    hash,
    wait: vi.fn(),
  };
}

function makeRawBounty(overrides: Partial<{
  bountyId: string;
  protocolId: string;
  validationId: string;
  researcher: string;
  severity: bigint;
  amount: bigint;
  timestamp: bigint;
  paid: boolean;
}> = {}) {
  return {
    bountyId: overrides.bountyId ?? 'bounty-1',
    protocolId: overrides.protocolId ?? 'proto-1',
    validationId: overrides.validationId ?? 'val-1',
    researcher: overrides.researcher ?? '0xResearcher',
    severity: overrides.severity ?? BigInt(0),
    amount: overrides.amount ?? BigInt(5_000_000),
    timestamp: overrides.timestamp ?? BigInt(1700000000),
    paid: overrides.paid ?? true,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('BountyPoolClient', () => {
  let client: BountyPoolClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BountyPoolClient();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a Contract with the correct address, ABI and signer', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xBountyPoolAddress',
        expect.anything(), // ABI
        mockSigner,        // signer returned by getSigner()
      );
    });

    it('should throw when BOUNTY_POOL_ADDRESS is not set', () => {
      const original = contractAddresses.bountyPool;
      try {
        (contractAddresses as Record<string, string>).bountyPool = '';
        expect(() => new BountyPoolClient()).toThrow('BOUNTY_POOL_ADDRESS not set');
      } finally {
        (contractAddresses as Record<string, string>).bountyPool = original;
      }
    });
  });

  // ─── depositBounty ───────────────────────────────────────────────────────

  describe('depositBounty', () => {
    it('should convert USDC amount to 6-decimal bigint and call contract', async () => {
      const tx = makeTxResponse('0xTxHash_deposit');
      tx.wait.mockResolvedValue({ hash: '0xReceiptHash_deposit', blockNumber: 42 });
      mockContract.depositBounty.mockResolvedValue(tx);

      await client.depositBounty('proto-1', 10);

      // 10 USDC = 10_000_000 (6 decimals)
      expect(mockContract.depositBounty).toHaveBeenCalledWith('proto-1', BigInt(10_000_000));
    });

    it('should handle fractional USDC amounts correctly', async () => {
      const tx = makeTxResponse('0xTxHash_frac');
      tx.wait.mockResolvedValue({ hash: '0xReceiptHash_frac', blockNumber: 43 });
      mockContract.depositBounty.mockResolvedValue(tx);

      await client.depositBounty('proto-1', 1.5);

      // 1.5 USDC = 1_500_000
      expect(mockContract.depositBounty).toHaveBeenCalledWith('proto-1', BigInt(1_500_000));
    });

    it('should return the receipt hash on success', async () => {
      const tx = makeTxResponse('0xTxHash_dep');
      tx.wait.mockResolvedValue({ hash: '0xReceiptHash_dep', blockNumber: 44 });
      mockContract.depositBounty.mockResolvedValue(tx);

      const result = await client.depositBounty('proto-1', 100);

      expect(result).toBe('0xReceiptHash_dep');
    });

    it('should throw a descriptive error when the contract call fails', async () => {
      mockContract.depositBounty.mockRejectedValue(new Error('insufficient funds'));

      await expect(client.depositBounty('proto-1', 100)).rejects.toThrow(
        'Failed to deposit bounty: insufficient funds',
      );
    });
  });

  // ─── releaseBounty ──────────────────────────────────────────────────────

  describe('releaseBounty', () => {
    const releaseArgs = [
      'proto-1',
      'val-1',
      '0xResearcher',
      BountySeverity.CRITICAL,
    ] as const;

    function setupReleaseMocks(overrides?: {
      receiptOverrides?: Record<string, unknown>;
      parsedEvent?: Record<string, unknown> | null;
      blockTimestamp?: number | null;
    }) {
      const {
        receiptOverrides = {},
        parsedEvent = { name: 'BountyReleased', args: { bountyId: 'b-1', amount: BigInt(5_000_000) } },
        blockTimestamp = 1700000000,
      } = overrides ?? {};

      const logs = [
        { topics: ['0xEventTopic'], data: '0xEventData' },
      ];

      const receipt = {
        hash: '0xReleaseTxHash',
        blockNumber: 100,
        logs,
        ...receiptOverrides,
      };

      const tx = makeTxResponse('0xReleaseSent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.releaseBounty.mockResolvedValue(tx);

      mockContract.interface.parseLog.mockReturnValue(parsedEvent);

      mockSigner.provider.getBlock.mockResolvedValue(
        blockTimestamp !== null ? { timestamp: blockTimestamp } : null,
      );

      return { tx, receipt };
    }

    it('should call the contract with the correct parameters', async () => {
      setupReleaseMocks();

      await client.releaseBounty(...releaseArgs);

      expect(mockContract.releaseBounty).toHaveBeenCalledWith(
        'proto-1',
        'val-1',
        '0xResearcher',
        BountySeverity.CRITICAL,
      );
    });

    it('should return a BountyReleaseResult with txHash, bountyId, amount, blockNumber, and timestamp', async () => {
      setupReleaseMocks();

      const result = await client.releaseBounty(...releaseArgs);

      expect(result).toEqual({
        bountyId: 'b-1',
        txHash: '0xReleaseTxHash',
        blockNumber: 100,
        amount: BigInt(5_000_000),
        timestamp: 1700000000,
      });
    });

    it('should parse the BountyReleased event from receipt logs', async () => {
      setupReleaseMocks();

      await client.releaseBounty(...releaseArgs);

      // parseLog is called at least once for the log-finding iteration
      // and once more for the final parsing
      expect(mockContract.interface.parseLog).toHaveBeenCalledWith({
        topics: ['0xEventTopic'],
        data: '0xEventData',
      });
    });

    it('should throw when the transaction receipt is null', async () => {
      const tx = makeTxResponse('0xNullReceipt');
      tx.wait.mockResolvedValue(null);
      mockContract.releaseBounty.mockResolvedValue(tx);

      await expect(client.releaseBounty(...releaseArgs)).rejects.toThrow(
        'Failed to release bounty: Transaction receipt is null',
      );
    });

    it('should throw when BountyReleased event is not found in receipt logs', async () => {
      const receipt = {
        hash: '0xNoEventHash',
        blockNumber: 101,
        logs: [{ topics: ['0xOtherTopic'], data: '0xOtherData' }],
      };

      const tx = makeTxResponse('0xNoEvent');
      tx.wait.mockResolvedValue(receipt);
      mockContract.releaseBounty.mockResolvedValue(tx);

      // parseLog returns something with a different name, or null
      mockContract.interface.parseLog.mockReturnValue({ name: 'Transfer', args: {} });

      await expect(client.releaseBounty(...releaseArgs)).rejects.toThrow(
        'BountyReleased event not found',
      );
    });
  });

  // ─── calculateBountyAmount ──────────────────────────────────────────────

  describe('calculateBountyAmount', () => {
    it('should return a formatted USDC number', async () => {
      // 5 USDC = 5_000_000 raw
      mockContract.calculateBountyAmount.mockResolvedValue(BigInt(5_000_000));

      const result = await client.calculateBountyAmount(BountySeverity.CRITICAL);

      expect(result).toBe(5);
    });

    it('should call the contract with the severity enum value', async () => {
      mockContract.calculateBountyAmount.mockResolvedValue(BigInt(1_000_000));

      await client.calculateBountyAmount(BountySeverity.HIGH);

      expect(mockContract.calculateBountyAmount).toHaveBeenCalledWith(BountySeverity.HIGH);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.calculateBountyAmount.mockRejectedValue(new Error('revert'));

      await expect(
        client.calculateBountyAmount(BountySeverity.LOW),
      ).rejects.toThrow('Failed to calculate bounty amount: revert');
    });
  });

  // ─── getProtocolBalance ─────────────────────────────────────────────────

  describe('getProtocolBalance', () => {
    it('should return a formatted USDC balance', async () => {
      mockContract.getProtocolBalance.mockResolvedValue(BigInt(250_000_000));

      const result = await client.getProtocolBalance('proto-1');

      expect(result).toBe(250);
    });

    it('should return 0 for a zero balance', async () => {
      mockContract.getProtocolBalance.mockResolvedValue(BigInt(0));

      const result = await client.getProtocolBalance('proto-empty');

      expect(result).toBe(0);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getProtocolBalance.mockRejectedValue(new Error('network error'));

      await expect(
        client.getProtocolBalance('proto-bad'),
      ).rejects.toThrow('Failed to get protocol balance: network error');
    });
  });

  // ─── getBounty ──────────────────────────────────────────────────────────

  describe('getBounty', () => {
    it('should return a typed OnChainBounty', async () => {
      const raw = makeRawBounty();
      mockContract.getBounty.mockResolvedValue(raw);

      const result = await client.getBounty('bounty-1');

      expect(result).toEqual({
        bountyId: 'bounty-1',
        protocolId: 'proto-1',
        validationId: 'val-1',
        researcher: '0xResearcher',
        severity: 0,
        amount: BigInt(5_000_000),
        timestamp: BigInt(1700000000),
        paid: true,
      });
    });

    it('should convert severity from bigint to number', async () => {
      const raw = makeRawBounty({ severity: BigInt(3) });
      mockContract.getBounty.mockResolvedValue(raw);

      const result = await client.getBounty('bounty-2');

      expect(result.severity).toBe(3);
      expect(typeof result.severity).toBe('number');
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.getBounty.mockRejectedValue(new Error('not found'));

      await expect(client.getBounty('bad-id')).rejects.toThrow(
        'Failed to get bounty: not found',
      );
    });
  });

  // ─── getProtocolBounties ────────────────────────────────────────────────

  describe('getProtocolBounties', () => {
    it('should map an array of RawBounty to OnChainBounty array', async () => {
      const rawBounties = [
        makeRawBounty({ bountyId: 'b-1', severity: BigInt(0) }),
        makeRawBounty({ bountyId: 'b-2', severity: BigInt(2), paid: false }),
      ];
      mockContract.getProtocolBounties.mockResolvedValue(rawBounties);

      const result = await client.getProtocolBounties('proto-1');

      expect(result).toHaveLength(2);
      expect(result[0].bountyId).toBe('b-1');
      expect(result[0].severity).toBe(0);
      expect(result[1].bountyId).toBe('b-2');
      expect(result[1].severity).toBe(2);
      expect(result[1].paid).toBe(false);
    });

    it('should return an empty array when the protocol has no bounties', async () => {
      mockContract.getProtocolBounties.mockResolvedValue([]);

      const result = await client.getProtocolBounties('proto-empty');

      expect(result).toEqual([]);
    });
  });

  // ─── getResearcherBounties ──────────────────────────────────────────────

  describe('getResearcherBounties', () => {
    it('should map an array of RawBounty to OnChainBounty array', async () => {
      const rawBounties = [
        makeRawBounty({ bountyId: 'rb-1', researcher: '0xAlice' }),
        makeRawBounty({ bountyId: 'rb-2', researcher: '0xAlice', amount: BigInt(10_000_000) }),
      ];
      mockContract.getResearcherBounties.mockResolvedValue(rawBounties);

      const result = await client.getResearcherBounties('0xAlice');

      expect(result).toHaveLength(2);
      expect(result[0].bountyId).toBe('rb-1');
      expect(result[1].amount).toBe(BigInt(10_000_000));
    });

    it('should return an empty array when the researcher has no bounties', async () => {
      mockContract.getResearcherBounties.mockResolvedValue([]);

      const result = await client.getResearcherBounties('0xNobody');

      expect(result).toEqual([]);
    });
  });

  // ─── getTotalBountiesPaid ───────────────────────────────────────────────

  describe('getTotalBountiesPaid', () => {
    it('should return the formatted total in USDC', async () => {
      mockContract.getTotalBountiesPaid.mockResolvedValue(BigInt(100_000_000));

      const result = await client.getTotalBountiesPaid('proto-1');

      expect(result).toBe(100);
    });
  });

  // ─── getResearcherEarnings ──────────────────────────────────────────────

  describe('getResearcherEarnings', () => {
    it('should return formatted earnings in USDC', async () => {
      mockContract.getResearcherEarnings.mockResolvedValue(BigInt(42_500_000));

      const result = await client.getResearcherEarnings('0xAlice');

      expect(result).toBe(42.5);
    });
  });

  // ─── getBaseBountyAmount ────────────────────────────────────────────────

  describe('getBaseBountyAmount', () => {
    it('should return the base amount formatted as USDC', async () => {
      mockContract.baseBountyAmount.mockResolvedValue(BigInt(1_000_000));

      const result = await client.getBaseBountyAmount();

      expect(result).toBe(1);
    });
  });

  // ─── getBaseBountyAmountRaw ─────────────────────────────────────────────

  describe('getBaseBountyAmountRaw', () => {
    it('should return the raw bigint from the contract', async () => {
      mockContract.baseBountyAmount.mockResolvedValue(BigInt(1_000_000));

      const result = await client.getBaseBountyAmountRaw();

      expect(result).toBe(BigInt(1_000_000));
    });
  });

  // ─── calculateBountyAmountRaw ───────────────────────────────────────────

  describe('calculateBountyAmountRaw', () => {
    it('should return the raw bigint from the contract', async () => {
      mockContract.calculateBountyAmount.mockResolvedValue(BigInt(5_000_000));

      const result = await client.calculateBountyAmountRaw(BountySeverity.CRITICAL);

      expect(result).toBe(BigInt(5_000_000));
    });
  });

  // ─── updateBaseBountyAmount ─────────────────────────────────────────────

  describe('updateBaseBountyAmount', () => {
    it('should convert USDC amount and return the transaction response', async () => {
      const tx = makeTxResponse('0xUpdateBaseTx');
      mockContract.updateBaseBountyAmount.mockResolvedValue(tx);

      const result = await client.updateBaseBountyAmount(2);

      // 2 USDC = 2_000_000
      expect(mockContract.updateBaseBountyAmount).toHaveBeenCalledWith(BigInt(2_000_000));
      expect(result).toBe(tx);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.updateBaseBountyAmount.mockRejectedValue(new Error('access denied'));

      await expect(client.updateBaseBountyAmount(5)).rejects.toThrow(
        'Failed to update base bounty amount: access denied',
      );
    });
  });

  // ─── updateSeverityMultiplier ───────────────────────────────────────────

  describe('updateSeverityMultiplier', () => {
    it('should call the contract with severity and multiplier in basis points', async () => {
      const tx = makeTxResponse('0xUpdateMultTx');
      mockContract.updateSeverityMultiplier.mockResolvedValue(tx);

      const result = await client.updateSeverityMultiplier(BountySeverity.CRITICAL, 50000);

      expect(mockContract.updateSeverityMultiplier).toHaveBeenCalledWith(
        BountySeverity.CRITICAL,
        50000,
      );
      expect(result).toBe(tx);
    });

    it('should throw a descriptive error on failure', async () => {
      mockContract.updateSeverityMultiplier.mockRejectedValue(new Error('only admin'));

      await expect(
        client.updateSeverityMultiplier(BountySeverity.HIGH, 30000),
      ).rejects.toThrow('Failed to update severity multiplier: only admin');
    });
  });

  // ─── isPayer ────────────────────────────────────────────────────────────

  describe('isPayer', () => {
    it('should return true when the address has the payout role', async () => {
      mockContract.isPayer.mockResolvedValue(true);

      const result = await client.isPayer('0xPayerAddress');

      expect(result).toBe(true);
      expect(mockContract.isPayer).toHaveBeenCalledWith('0xPayerAddress');
    });

    it('should return false when the address lacks the payout role', async () => {
      mockContract.isPayer.mockResolvedValue(false);

      const result = await client.isPayer('0xRandomAddress');

      expect(result).toBe(false);
    });
  });

  // ─── getContract ────────────────────────────────────────────────────────

  describe('getContract', () => {
    it('should return the underlying ethers Contract instance', () => {
      const contract = client.getContract();

      expect(contract).toBe(mockContract);
    });
  });

  // ─── getAddress ─────────────────────────────────────────────────────────

  describe('getAddress', () => {
    it('should return the bounty pool contract address from config', () => {
      const address = client.getAddress();

      expect(address).toBe('0xBountyPoolAddress');
    });
  });
});
