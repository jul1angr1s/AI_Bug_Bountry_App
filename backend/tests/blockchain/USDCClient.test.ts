import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ethers } from 'ethers';

// Mock contract
const mockContract = {
  allowance: jest.fn(),
  balanceOf: jest.fn(),
  approve: {
    populateTransaction: jest.fn(),
    estimateGas: jest.fn(),
  },
};

// Mock provider
const mockProvider = {};

// Mock config
const mockContractAddresses = {
  bountyPool: '0x' + '1'.repeat(40),
};

const mockUsdcConfig = {
  address: '0x' + '2'.repeat(40),
  decimals: 6,
  symbol: 'USDC',
};

const mockChainConfig = {
  chainId: 84532,
};

// Mock modules
jest.unstable_mockModule('ethers', () => ({
  ethers: {
    Contract: jest.fn(() => mockContract),
    isAddress: ethers.isAddress,
    formatUnits: ethers.formatUnits,
    parseUnits: ethers.parseUnits,
  },
}));

jest.unstable_mockModule('../../src/blockchain/config.js', () => ({
  provider: mockProvider,
  contractAddresses: mockContractAddresses,
  usdcConfig: mockUsdcConfig,
  chainConfig: mockChainConfig,
}));

// Import after mocks
const { USDCClient } = await import('../../src/blockchain/contracts/USDCClient.js');

describe('USDCClient', () => {
  let client: InstanceType<typeof USDCClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new USDCClient();
  });

  describe('getAllowance', () => {
    it('should return allowance for valid addresses', async () => {
      const owner = '0x' + '3'.repeat(40);
      const spender = '0x' + '4'.repeat(40);
      const allowance = BigInt(1000000000); // 1000 USDC

      mockContract.allowance.mockResolvedValue(allowance);

      const result = await client.getAllowance(owner, spender);

      expect(result).toBe(allowance);
      expect(mockContract.allowance).toHaveBeenCalledWith(owner, spender);
    });

    it('should throw error for invalid owner address', async () => {
      const invalidOwner = 'invalid-address';
      const spender = '0x' + '4'.repeat(40);

      await expect(client.getAllowance(invalidOwner, spender)).rejects.toThrow('Invalid owner address');
    });

    it('should throw error for invalid spender address', async () => {
      const owner = '0x' + '3'.repeat(40);
      const invalidSpender = 'invalid-address';

      await expect(client.getAllowance(owner, invalidSpender)).rejects.toThrow('Invalid spender address');
    });

    it('should handle contract errors', async () => {
      const owner = '0x' + '3'.repeat(40);
      const spender = '0x' + '4'.repeat(40);

      mockContract.allowance.mockRejectedValue(new Error('Contract call failed'));

      await expect(client.getAllowance(owner, spender)).rejects.toThrow('Failed to get USDC allowance');
    });
  });

  describe('getBalance', () => {
    it('should return balance for valid address', async () => {
      const address = '0x' + '3'.repeat(40);
      const balance = BigInt(5000000000); // 5000 USDC

      mockContract.balanceOf.mockResolvedValue(balance);

      const result = await client.getBalance(address);

      expect(result).toBe(balance);
      expect(mockContract.balanceOf).toHaveBeenCalledWith(address);
    });

    it('should return zero balance', async () => {
      const address = '0x' + '3'.repeat(40);
      const balance = BigInt(0);

      mockContract.balanceOf.mockResolvedValue(balance);

      const result = await client.getBalance(address);

      expect(result).toBe(BigInt(0));
    });

    it('should throw error for invalid address', async () => {
      const invalidAddress = 'not-an-address';

      await expect(client.getBalance(invalidAddress)).rejects.toThrow('Invalid address');
    });

    it('should handle contract errors', async () => {
      const address = '0x' + '3'.repeat(40);

      mockContract.balanceOf.mockRejectedValue(new Error('RPC error'));

      await expect(client.getBalance(address)).rejects.toThrow('Failed to get USDC balance');
    });
  });

  describe('generateApprovalTxData', () => {
    it('should generate approval transaction data', async () => {
      const spender = mockContractAddresses.bountyPool;
      const amount = BigInt(1000000000); // 1000 USDC
      const gasLimit = BigInt(100000);

      mockContract.approve.populateTransaction.mockResolvedValue({
        to: mockUsdcConfig.address,
        data: '0xabcdef',
      });

      mockContract.approve.estimateGas.mockResolvedValue(gasLimit);

      const result = await client.generateApprovalTxData(spender, amount);

      expect(result).toEqual({
        to: mockUsdcConfig.address,
        data: '0xabcdef',
        value: '0',
        chainId: mockChainConfig.chainId,
        gasLimit: BigInt(120000), // 20% buffer
      });

      expect(mockContract.approve.populateTransaction).toHaveBeenCalledWith(spender, amount);
    });

    it('should throw error for invalid spender address', async () => {
      const invalidSpender = 'invalid-address';
      const amount = BigInt(1000000000);

      await expect(client.generateApprovalTxData(invalidSpender, amount)).rejects.toThrow('Invalid spender address');
    });

    it('should throw error for zero amount', async () => {
      const spender = mockContractAddresses.bountyPool;
      const amount = BigInt(0);

      await expect(client.generateApprovalTxData(spender, amount)).rejects.toThrow('Amount must be greater than zero');
    });

    it('should throw error for negative amount', async () => {
      const spender = mockContractAddresses.bountyPool;
      const amount = BigInt(-1000);

      await expect(client.generateApprovalTxData(spender, amount)).rejects.toThrow('Amount must be greater than zero');
    });

    it('should throw error if spender is not BountyPool', async () => {
      const invalidSpender = '0x' + '5'.repeat(40);
      const amount = BigInt(1000000000);

      await expect(client.generateApprovalTxData(invalidSpender, amount)).rejects.toThrow('Invalid BountyPool address');
    });

    it('should use default gas limit if estimation fails', async () => {
      const spender = mockContractAddresses.bountyPool;
      const amount = BigInt(1000000000);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      mockContract.approve.populateTransaction.mockResolvedValue({
        to: mockUsdcConfig.address,
        data: '0xabcdef',
      });

      mockContract.approve.estimateGas.mockRejectedValue(new Error('Gas estimation failed'));

      const result = await client.generateApprovalTxData(spender, amount);

      expect(result.gasLimit).toBe(BigInt(100000)); // Default gas limit
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('formatUSDC', () => {
    it('should format USDC amount correctly', () => {
      const amount = BigInt(1000000000); // 1000 USDC
      const formatted = client.formatUSDC(amount);

      expect(formatted).toBe('1000.0');
    });

    it('should format zero amount', () => {
      const amount = BigInt(0);
      const formatted = client.formatUSDC(amount);

      expect(formatted).toBe('0.0');
    });

    it('should format decimal amounts', () => {
      const amount = BigInt(1500000); // 1.5 USDC
      const formatted = client.formatUSDC(amount);

      expect(formatted).toBe('1.5');
    });

    it('should format small amounts', () => {
      const amount = BigInt(1); // 0.000001 USDC
      const formatted = client.formatUSDC(amount);

      expect(formatted).toBe('0.000001');
    });
  });

  describe('parseUSDC', () => {
    it('should parse USDC amount correctly', () => {
      const amount = '1000.0';
      const parsed = client.parseUSDC(amount);

      expect(parsed).toBe(BigInt(1000000000));
    });

    it('should parse zero amount', () => {
      const amount = '0';
      const parsed = client.parseUSDC(amount);

      expect(parsed).toBe(BigInt(0));
    });

    it('should parse decimal amounts', () => {
      const amount = '1.5';
      const parsed = client.parseUSDC(amount);

      expect(parsed).toBe(BigInt(1500000));
    });

    it('should parse small amounts', () => {
      const amount = '0.000001';
      const parsed = client.parseUSDC(amount);

      expect(parsed).toBe(BigInt(1));
    });

    it('should throw error for invalid amount string', () => {
      const invalidAmount = 'not-a-number';

      expect(() => client.parseUSDC(invalidAmount)).toThrow('Failed to parse USDC amount');
    });
  });

  describe('helper methods', () => {
    it('should return USDC address', () => {
      expect(client.getAddress()).toBe(mockUsdcConfig.address);
    });

    it('should return USDC decimals', () => {
      expect(client.getDecimals()).toBe(6);
    });

    it('should return USDC symbol', () => {
      expect(client.getSymbol()).toBe('USDC');
    });

    it('should return contract instance', () => {
      expect(client.getContract()).toBe(mockContract);
    });
  });
});
