import { vi } from 'vitest';

/**
 * Create a mock ethers.js JsonRpcProvider.
 */
export function createMockProvider() {
  return {
    getNetwork: vi.fn().mockResolvedValue({ chainId: 84532n, name: 'base-sepolia' }),
    getBlockNumber: vi.fn().mockResolvedValue(12345),
    getBlock: vi.fn().mockResolvedValue({ timestamp: Math.floor(Date.now() / 1000), number: 12345 }),
    getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1, hash: '0xabc123', blockNumber: 12345, logs: [] }),
    getBalance: vi.fn().mockResolvedValue(0n),
    getSigner: vi.fn().mockResolvedValue({
      getAddress: vi.fn().mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'),
      sendTransaction: vi.fn(),
    }),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    destroy: vi.fn(),
  };
}

/**
 * Create a mock ethers.js Contract for BountyPool.
 */
export function createMockBountyPoolContract() {
  const mockTxResponse = {
    hash: '0xabc123def456',
    wait: vi.fn().mockResolvedValue({
      status: 1,
      hash: '0xabc123def456',
      blockNumber: 12345,
      logs: [
        {
          topics: ['0xBountyReleasedTopic'],
          data: '0x',
          address: '0xBountyPoolAddress',
        },
      ],
    }),
  };

  return {
    depositBounty: vi.fn().mockResolvedValue(mockTxResponse),
    releaseBounty: vi.fn().mockResolvedValue(mockTxResponse),
    calculateBountyAmount: vi.fn().mockResolvedValue(5000000n), // 5 USDC
    getProtocolBalance: vi.fn().mockResolvedValue(100000000n), // 100 USDC
    getBounty: vi.fn().mockResolvedValue({
      bountyId: '0xbounty123',
      protocolId: '0xprotocol123',
      validationId: '0xvalidation123',
      researcher: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      severity: 1n,
      amount: 5000000n,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      paid: false,
    }),
    getProtocolBounties: vi.fn().mockResolvedValue([]),
    getResearcherBounties: vi.fn().mockResolvedValue([]),
    getTotalBountiesPaid: vi.fn().mockResolvedValue(50000000n), // 50 USDC
    getResearcherEarnings: vi.fn().mockResolvedValue(25000000n), // 25 USDC
    baseBountyAmount: vi.fn().mockResolvedValue(1000000n), // 1 USDC
    updateBaseBountyAmount: vi.fn().mockResolvedValue(mockTxResponse),
    updateSeverityMultiplier: vi.fn().mockResolvedValue(mockTxResponse),
    isPayer: vi.fn().mockResolvedValue(true),
    interface: {
      parseLog: vi.fn().mockReturnValue({
        name: 'BountyReleased',
        args: {
          bountyId: '0xbounty123',
          amount: 5000000n,
        },
      }),
      parseError: vi.fn().mockReturnValue(null),
    },
    getAddress: vi.fn().mockResolvedValue('0xBountyPoolAddress'),
  };
}

/**
 * Create a mock ethers.js Contract for ValidationRegistry.
 */
export function createMockValidationRegistryContract() {
  return {
    getValidation: vi.fn().mockResolvedValue({
      proofHash: '0xhash123',
      researcher: '0xresearcher',
      validator: '0xvalidator',
      outcome: 0n, // CONFIRMED
      severity: 1n, // HIGH
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      exists: true,
    }),
    recordValidation: vi.fn().mockResolvedValue({
      hash: '0xtx123',
      wait: vi.fn().mockResolvedValue({ status: 1, logs: [] }),
    }),
    getProtocolValidations: vi.fn().mockResolvedValue([]),
    getConfirmedValidations: vi.fn().mockResolvedValue([]),
    getAddress: vi.fn().mockResolvedValue('0xValidationRegistryAddress'),
  };
}

/**
 * Create a mock ethers.js Contract for USDC.
 */
export function createMockUSDCContract() {
  return {
    allowance: vi.fn().mockResolvedValue(0n),
    balanceOf: vi.fn().mockResolvedValue(100000000n), // 100 USDC
    approve: vi.fn().mockResolvedValue({
      hash: '0xapprove123',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),
    decimals: vi.fn().mockResolvedValue(6),
    getAddress: vi.fn().mockResolvedValue('0xUSDCAddress'),
  };
}

export type MockProvider = ReturnType<typeof createMockProvider>;
export type MockBountyPoolContract = ReturnType<typeof createMockBountyPoolContract>;
