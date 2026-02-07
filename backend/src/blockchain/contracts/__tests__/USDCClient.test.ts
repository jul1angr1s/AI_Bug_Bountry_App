import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (available in vi.mock factories) ────────────────────────────

const { mockProvider, mockContract } = vi.hoisted(() => {
  const mockProvider = {};

  const mockContract: Record<string, any> = {
    allowance: Object.assign(vi.fn(), { populateTransaction: vi.fn(), estimateGas: vi.fn() }),
    balanceOf: Object.assign(vi.fn(), { populateTransaction: vi.fn(), estimateGas: vi.fn() }),
    decimals: Object.assign(vi.fn(), { populateTransaction: vi.fn(), estimateGas: vi.fn() }),
    symbol: Object.assign(vi.fn(), { populateTransaction: vi.fn(), estimateGas: vi.fn() }),
    approve: Object.assign(vi.fn(), { populateTransaction: vi.fn(), estimateGas: vi.fn() }),
  };

  return { mockProvider, mockContract };
});

// ── Module-level mocks ────────────────────────────────────────────────────────

vi.mock('../../config.js', () => ({
  provider: mockProvider,
  contractAddresses: { bountyPool: '0x4444444444444444444444444444444444444444' },
  usdcConfig: { decimals: 6, address: '0xUSDCAddress', symbol: 'USDC' },
  chainConfig: { chainId: 84532 },
}));

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    Contract: vi.fn(() => mockContract),
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { USDCClient } from '../USDCClient.js';
import { Contract, ethers } from 'ethers';

// ── Test suite ────────────────────────────────────────────────────────────────

describe('USDCClient', () => {
  let client: USDCClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new USDCClient();
  });

  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create a Contract with the USDC address, ABI and provider', () => {
      expect(Contract).toHaveBeenCalledWith(
        '0xUSDCAddress',
        expect.anything(),
        mockProvider,
      );
    });
  });

  // ─── getAllowance ─────────────────────────────────────────────────────────

  describe('getAllowance', () => {
    it('should return the allowance as a bigint', async () => {
      mockContract.allowance.mockResolvedValue(BigInt(5_000_000));

      const owner = ethers.getAddress('0x1111111111111111111111111111111111111111');
      const spender = ethers.getAddress('0x2222222222222222222222222222222222222222');

      const result = await client.getAllowance(owner, spender);

      expect(result).toBe(BigInt(5_000_000));
      expect(mockContract.allowance).toHaveBeenCalledWith(owner, spender);
    });

    it('should return zero allowance', async () => {
      mockContract.allowance.mockResolvedValue(BigInt(0));

      const owner = ethers.getAddress('0x1111111111111111111111111111111111111111');
      const spender = ethers.getAddress('0x2222222222222222222222222222222222222222');

      const result = await client.getAllowance(owner, spender);

      expect(result).toBe(BigInt(0));
    });

    it('should throw when owner address is invalid', async () => {
      await expect(
        client.getAllowance('not-an-address', '0x2222222222222222222222222222222222222222'),
      ).rejects.toThrow('Failed to get USDC allowance: Invalid owner address');
    });

    it('should throw when spender address is invalid', async () => {
      const owner = ethers.getAddress('0x1111111111111111111111111111111111111111');

      await expect(
        client.getAllowance(owner, 'not-an-address'),
      ).rejects.toThrow('Failed to get USDC allowance: Invalid spender address');
    });

    it('should throw a descriptive error when the contract call fails', async () => {
      mockContract.allowance.mockRejectedValue(new Error('network error'));

      const owner = ethers.getAddress('0x1111111111111111111111111111111111111111');
      const spender = ethers.getAddress('0x2222222222222222222222222222222222222222');

      await expect(
        client.getAllowance(owner, spender),
      ).rejects.toThrow('Failed to get USDC allowance: network error');
    });
  });

  // ─── getBalance ───────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('should return the balance as a bigint', async () => {
      mockContract.balanceOf.mockResolvedValue(BigInt(100_000_000));

      const addr = ethers.getAddress('0x1111111111111111111111111111111111111111');
      const result = await client.getBalance(addr);

      expect(result).toBe(BigInt(100_000_000));
      expect(mockContract.balanceOf).toHaveBeenCalledWith(addr);
    });

    it('should return zero balance', async () => {
      mockContract.balanceOf.mockResolvedValue(BigInt(0));

      const addr = ethers.getAddress('0x1111111111111111111111111111111111111111');
      const result = await client.getBalance(addr);

      expect(result).toBe(BigInt(0));
    });

    it('should throw when address is invalid', async () => {
      await expect(
        client.getBalance('not-an-address'),
      ).rejects.toThrow('Failed to get USDC balance: Invalid address');
    });

    it('should throw a descriptive error when the contract call fails', async () => {
      mockContract.balanceOf.mockRejectedValue(new Error('timeout'));

      const addr = ethers.getAddress('0x1111111111111111111111111111111111111111');

      await expect(client.getBalance(addr)).rejects.toThrow(
        'Failed to get USDC balance: timeout',
      );
    });
  });

  // ─── generateApprovalTxData ───────────────────────────────────────────────

  describe('generateApprovalTxData', () => {
    it('should generate unsigned transaction data with correct fields', async () => {
      mockContract.approve.populateTransaction.mockResolvedValue({
        data: '0xApproveData',
      });
      mockContract.approve.estimateGas.mockResolvedValue(BigInt(50000));

      const spender = '0x4444444444444444444444444444444444444444';
      const amount = BigInt(10_000_000);

      const result = await client.generateApprovalTxData(spender, amount);

      expect(result).toEqual({
        to: '0xUSDCAddress',
        data: '0xApproveData',
        value: '0',
        chainId: 84532,
        gasLimit: BigInt(60000), // 50000 * 120 / 100 = 60000
      });
    });

    it('should add 20% buffer to gas estimate', async () => {
      mockContract.approve.populateTransaction.mockResolvedValue({
        data: '0xApproveData',
      });
      mockContract.approve.estimateGas.mockResolvedValue(BigInt(100000));

      const result = await client.generateApprovalTxData(
        '0x4444444444444444444444444444444444444444',
        BigInt(5_000_000),
      );

      // 100000 * 120 / 100 = 120000
      expect(result.gasLimit).toBe(BigInt(120000));
    });

    it('should use default gas limit when estimation fails', async () => {
      mockContract.approve.populateTransaction.mockResolvedValue({
        data: '0xApproveData',
      });
      mockContract.approve.estimateGas.mockRejectedValue(new Error('estimation failed'));

      const result = await client.generateApprovalTxData(
        '0x4444444444444444444444444444444444444444',
        BigInt(5_000_000),
      );

      expect(result.gasLimit).toBe(BigInt(100000));
    });

    it('should throw when spender address is invalid', async () => {
      await expect(
        client.generateApprovalTxData('not-an-address', BigInt(1_000_000)),
      ).rejects.toThrow('Failed to generate approval transaction: Invalid spender address');
    });

    it('should throw when amount is zero', async () => {
      await expect(
        client.generateApprovalTxData('0x4444444444444444444444444444444444444444', BigInt(0)),
      ).rejects.toThrow('Failed to generate approval transaction: Amount must be greater than zero');
    });

    it('should throw when amount is negative', async () => {
      await expect(
        client.generateApprovalTxData('0x4444444444444444444444444444444444444444', BigInt(-1)),
      ).rejects.toThrow('Failed to generate approval transaction: Amount must be greater than zero');
    });

    it('should throw when spender is not the BountyPool address', async () => {
      const wrongSpender = ethers.getAddress('0x3333333333333333333333333333333333333333');

      await expect(
        client.generateApprovalTxData(wrongSpender, BigInt(1_000_000)),
      ).rejects.toThrow('Failed to generate approval transaction: Invalid BountyPool address');
    });
  });

  // ─── formatUSDC ───────────────────────────────────────────────────────────

  describe('formatUSDC', () => {
    it('should format a whole USDC amount', () => {
      const result = client.formatUSDC(BigInt(5_000_000));

      expect(result).toBe('5.0');
    });

    it('should format a fractional USDC amount', () => {
      const result = client.formatUSDC(BigInt(1_500_000));

      expect(result).toBe('1.5');
    });

    it('should format zero', () => {
      const result = client.formatUSDC(BigInt(0));

      expect(result).toBe('0.0');
    });

    it('should format a large USDC amount', () => {
      const result = client.formatUSDC(BigInt(1_000_000_000_000));

      expect(result).toBe('1000000.0');
    });
  });

  // ─── parseUSDC ────────────────────────────────────────────────────────────

  describe('parseUSDC', () => {
    it('should parse a whole USDC string to base units', () => {
      const result = client.parseUSDC('10');

      expect(result).toBe(BigInt(10_000_000));
    });

    it('should parse a fractional USDC string to base units', () => {
      const result = client.parseUSDC('1.5');

      expect(result).toBe(BigInt(1_500_000));
    });

    it('should parse zero', () => {
      const result = client.parseUSDC('0');

      expect(result).toBe(BigInt(0));
    });

    it('should throw a descriptive error for invalid input', () => {
      expect(() => client.parseUSDC('not-a-number')).toThrow(
        'Failed to parse USDC amount:',
      );
    });
  });

  // ─── getAddress ───────────────────────────────────────────────────────────

  describe('getAddress', () => {
    it('should return the USDC contract address from config', () => {
      const address = client.getAddress();

      expect(address).toBe('0xUSDCAddress');
    });
  });

  // ─── getDecimals ──────────────────────────────────────────────────────────

  describe('getDecimals', () => {
    it('should return 6 for USDC', () => {
      const decimals = client.getDecimals();

      expect(decimals).toBe(6);
    });
  });

  // ─── getSymbol ────────────────────────────────────────────────────────────

  describe('getSymbol', () => {
    it('should return USDC', () => {
      const symbol = client.getSymbol();

      expect(symbol).toBe('USDC');
    });
  });

  // ─── getContract ──────────────────────────────────────────────────────────

  describe('getContract', () => {
    it('should return the underlying ethers Contract instance', () => {
      const contract = client.getContract();

      expect(contract).toBe(mockContract);
    });
  });
});
