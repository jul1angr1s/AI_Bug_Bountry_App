/**
 * Blockchain Mock for E2E Tests
 *
 * Mocks blockchain interactions including:
 * - Ethers.js provider responses
 * - BountyPool contract calls
 * - Transaction confirmations
 * - Block mining
 */

import { ethers } from 'ethers';
import { vi } from 'vitest';

// Mock transaction hash generator
export function generateMockTxHash(): string {
  return ethers.id(`tx-${Date.now()}-${Math.random()}`);
}

// Mock block number (increments on each call)
let mockBlockNumber = 1000000;

export function getMockBlockNumber(): number {
  return mockBlockNumber++;
}

/**
 * Mock transaction receipt
 */
export interface MockTransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  gasUsed: bigint;
  status: number;
  logs: any[];
}

export function createMockTransactionReceipt(
  txHash: string,
  from: string,
  to: string
): MockTransactionReceipt {
  return {
    hash: txHash,
    blockNumber: getMockBlockNumber(),
    blockHash: ethers.id(`block-${Date.now()}`),
    from,
    to,
    gasUsed: BigInt(21000),
    status: 1, // Success
    logs: [],
  };
}

/**
 * Mock transaction response
 */
export class MockTransactionResponse {
  hash: string;
  from: string;
  to: string;
  data: string;
  value: bigint;
  gasLimit: bigint;
  nonce: number;
  chainId: bigint;

  constructor(
    hash: string,
    from: string,
    to: string,
    data: string = '0x',
    value: bigint = BigInt(0)
  ) {
    this.hash = hash;
    this.from = from;
    this.to = to;
    this.data = data;
    this.value = value;
    this.gasLimit = BigInt(100000);
    this.nonce = 0;
    this.chainId = BigInt(84532); // Base Sepolia
  }

  async wait(confirmations: number = 1): Promise<MockTransactionReceipt> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return createMockTransactionReceipt(this.hash, this.from, this.to);
  }
}

/**
 * Mock Contract class
 */
export class MockContract {
  address: string;
  signer?: any;

  constructor(address: string, abi: any[], signer?: any) {
    this.address = address;
    this.signer = signer;
  }

  /**
   * Mock contract methods - these will be overridden in tests
   */

  // Protocol Registry methods
  async registerProtocol(
    protocolId: string,
    owner: string,
    metadataURI: string
  ): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async getProtocol(protocolId: string): Promise<{
    owner: string;
    metadataURI: string;
    isActive: boolean;
    bountyPool: bigint;
  }> {
    return {
      owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      metadataURI: 'ipfs://test-metadata',
      isActive: true,
      bountyPool: ethers.parseUnits('10000', 6),
    };
  }

  // BountyPool methods
  async depositBounty(
    protocolId: string,
    amount: bigint
  ): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async releaseBounty(
    protocolId: string,
    bountyId: string,
    recipient: string,
    amount: bigint
  ): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async getAvailableBounty(protocolId: string): Promise<bigint> {
    return ethers.parseUnits('10000', 6);
  }

  // ValidationRegistry methods
  async submitValidation(
    validationId: string,
    proofHash: string,
    outcome: number,
    severity: number,
    vulnerabilityType: string,
    researcherAddress: string
  ): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async getValidation(validationId: string): Promise<{
    proofHash: string;
    outcome: number;
    severity: number;
    vulnerabilityType: string;
    researcherAddress: string;
    timestamp: number;
  }> {
    return {
      proofHash: ethers.id('test-proof'),
      outcome: 0, // CONFIRMED
      severity: 1, // HIGH
      vulnerabilityType: 'Reentrancy',
      researcherAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  // USDC methods
  async approve(spender: string, amount: bigint): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async transfer(to: string, amount: bigint): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    const from = this.signer?.address || '0x0000000000000000000000000000000000000000';

    return new MockTransactionResponse(txHash, from, this.address);
  }

  async balanceOf(account: string): Promise<bigint> {
    return ethers.parseUnits('100000', 6);
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    return ethers.parseUnits('100000', 6);
  }
}

/**
 * Mock Provider class
 */
export class MockProvider {
  async getBlockNumber(): Promise<number> {
    return getMockBlockNumber();
  }

  async getBalance(address: string): Promise<bigint> {
    return ethers.parseEther('1000');
  }

  async getTransaction(txHash: string): Promise<MockTransactionResponse | null> {
    return new MockTransactionResponse(
      txHash,
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      '0x0000000000000000000000000000000000000000'
    );
  }

  async getTransactionReceipt(txHash: string): Promise<MockTransactionReceipt | null> {
    return createMockTransactionReceipt(
      txHash,
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      '0x0000000000000000000000000000000000000000'
    );
  }

  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<MockTransactionReceipt> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return createMockTransactionReceipt(
      txHash,
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      '0x0000000000000000000000000000000000000000'
    );
  }

  getSigner(address: string): MockSigner {
    return new MockSigner(address, this);
  }
}

/**
 * Mock Signer class
 */
export class MockSigner {
  address: string;
  provider: MockProvider;

  constructor(address: string, provider: MockProvider) {
    this.address = address;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    // Mock signature
    return ethers.id(`signature-${message}`);
  }

  async sendTransaction(tx: any): Promise<MockTransactionResponse> {
    const txHash = generateMockTxHash();
    return new MockTransactionResponse(
      txHash,
      this.address,
      tx.to || '0x0000000000000000000000000000000000000000',
      tx.data,
      tx.value
    );
  }
}

/**
 * Create mock blockchain client for testing
 */
export function createMockBlockchainClient() {
  const provider = new MockProvider();

  const mockAddresses = {
    protocolRegistry: '0x1234567890123456789012345678901234567890',
    validationRegistry: '0x2234567890123456789012345678901234567890',
    bountyPool: '0x3234567890123456789012345678901234567890',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  };

  const protocolOwner = new MockSigner('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1', provider);
  const researcher = new MockSigner('0x1234567890123456789012345678901234567891', provider);
  const validator = new MockSigner('0x1234567890123456789012345678901234567892', provider);

  return {
    provider,
    addresses: mockAddresses,
    signers: {
      protocolOwner,
      researcher,
      validator,
    },
    createContract: (address: string, abi: any[], signer?: any) => {
      return new MockContract(address, abi, signer);
    },
  };
}

/**
 * Setup blockchain mocks for E2E tests
 */
export function setupBlockchainMocks() {
  console.log('[E2E Mocks] Setting up blockchain mocks...');

  // Mock ethers.js Contract class
  vi.spyOn(ethers, 'Contract').mockImplementation((address: string, abi: any[], signer?: any) => {
    return new MockContract(address, abi, signer) as any;
  });

  console.log('[E2E Mocks] Blockchain mocks configured');
}

/**
 * Restore blockchain mocks
 */
export function restoreBlockchainMocks() {
  vi.restoreAllMocks();
}
