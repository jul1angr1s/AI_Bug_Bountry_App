import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from '../../di/tokens.js';
import type { ILogger } from '../../di/interfaces/ILogger.js';
import type { IBountyPoolClient, IUSDCClient } from '../../di/interfaces/IBlockchainClient.js';

/**
 * Create a mock logger for testing.
 */
export function createMockLogger(): ILogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => createMockLogger(),
  };
}

/**
 * Create a mock BountyPoolClient for testing.
 */
export function createMockBountyPool(): IBountyPoolClient {
  return {
    depositBounty: async () => '0xmocktx',
    releaseBounty: async () => ({
      txHash: '0xmocktx',
      bountyId: 'mock-bounty-id',
      blockNumber: 1,
      timestamp: Date.now(),
    }),
    calculateBountyAmount: async () => 100,
    getProtocolBalance: async () => 1000,
    getBounty: async () => ({
      bountyId: 'mock',
      protocolId: 'mock',
      researcher: '0x0',
      severity: 0,
      amount: 100,
      timestamp: Date.now(),
      paid: false,
    }),
    getProtocolBounties: async () => [],
    getResearcherBounties: async () => [],
    getTotalBountiesPaid: async () => 0,
    getResearcherEarnings: async () => 0,
    getAddress: () => '0xmockaddress',
  };
}

/**
 * Create a mock USDCClient for testing.
 */
export function createMockUSDC(): IUSDCClient {
  return {
    getAllowance: async () => BigInt(0),
    getBalance: async () => BigInt(0),
    generateApprovalTxData: async () => ({ to: '0x0', data: '0x0' }),
    formatUSDC: () => '0.00',
    parseUSDC: () => BigInt(0),
    getAddress: () => '0xmockusdc',
    getDecimals: () => 6,
  };
}

/**
 * Create a child container with mock registrations for testing.
 * Each test gets its own isolated container.
 */
export function createTestContainer() {
  const testContainer = container.createChildContainer();

  testContainer.registerInstance(TOKENS.Logger, createMockLogger());
  testContainer.registerInstance(TOKENS.BountyPoolClient, createMockBountyPool());
  testContainer.registerInstance(TOKENS.USDCClient, createMockUSDC());

  return testContainer;
}
