/**
 * Integration Test Setup
 *
 * This file sets up the test environment for integration tests:
 * - Starts Anvil fork of Base Sepolia
 * - Deploys or connects to test contracts
 * - Initializes test database
 * - Starts Redis for queues
 * - Creates test wallets with funded ETH and USDC
 */

import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import { getPrismaClient } from '../../src/lib/prisma.js';
import { getRedisClient } from '../../src/lib/redis.js';
import { Queue } from 'bullmq';
import findFreePort from 'find-free-port';

// Test environment state
export let anvilProcess: ChildProcess | null = null;
export let testProvider: ethers.JsonRpcProvider;
export let testPayerWallet: ethers.Wallet;
export let testResearcherWallet: ethers.Wallet;
export let testProtocolOwnerWallet: ethers.Wallet;
export let testValidatorWallet: ethers.Wallet;

export const TEST_CONTRACTS = {
  protocolRegistry: '',
  validationRegistry: '',
  bountyPool: '',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
};

const prisma = getPrismaClient();
const redis = getRedisClient();

/**
 * Start Anvil fork of Base Sepolia
 */
export async function startAnvil(): Promise<number> {
  const freePort = await findFreePort(8545);
  const port = freePort[0];

  return new Promise((resolve, reject) => {
    console.log('[Test Setup] Starting Anvil fork of Base Sepolia...');

    anvilProcess = spawn('anvil', [
      '--fork-url',
      process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      '--port',
      port.toString(),
      '--chain-id',
      '84532',
      '--gas-limit',
      '30000000',
      '--block-time',
      '1', // 1 second block time for faster tests
    ]);

    anvilProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[Anvil] ${output}`);

      // Wait for Anvil to be ready
      if (output.includes('Listening on')) {
        console.log(`[Test Setup] Anvil started on port ${port}`);
        resolve(port);
      }
    });

    anvilProcess.stderr?.on('data', (data) => {
      console.error(`[Anvil Error] ${data.toString()}`);
    });

    anvilProcess.on('error', (error) => {
      console.error('[Test Setup] Failed to start Anvil:', error);
      reject(error);
    });

    anvilProcess.on('exit', (code) => {
      console.log(`[Test Setup] Anvil exited with code ${code}`);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (anvilProcess && !anvilProcess.killed) {
        reject(new Error('Anvil startup timeout'));
      }
    }, 30000);
  });
}

/**
 * Stop Anvil process
 */
export async function stopAnvil(): Promise<void> {
  if (anvilProcess) {
    console.log('[Test Setup] Stopping Anvil...');
    anvilProcess.kill('SIGTERM');
    anvilProcess = null;

    // Wait for process to exit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Initialize test provider and wallets
 */
export function initializeWallets(anvilPort: number): void {
  console.log('[Test Setup] Initializing test wallets...');

  // Connect to Anvil
  testProvider = new ethers.JsonRpcProvider(`http://127.0.0.1:${anvilPort}`);

  // Use Anvil's default test accounts (pre-funded with 10000 ETH)
  const testPrivateKeys = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Payer wallet
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Researcher wallet
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Protocol owner wallet
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Validator wallet
  ];

  testPayerWallet = new ethers.Wallet(testPrivateKeys[0], testProvider);
  testResearcherWallet = new ethers.Wallet(testPrivateKeys[1], testProvider);
  testProtocolOwnerWallet = new ethers.Wallet(testPrivateKeys[2], testProvider);
  testValidatorWallet = new ethers.Wallet(testPrivateKeys[3], testProvider);

  console.log('[Test Setup] Test wallets initialized:');
  console.log(`  Payer: ${testPayerWallet.address}`);
  console.log(`  Researcher: ${testResearcherWallet.address}`);
  console.log(`  Protocol Owner: ${testProtocolOwnerWallet.address}`);
  console.log(`  Validator: ${testValidatorWallet.address}`);
}

/**
 * Fund wallets with USDC on Anvil fork
 */
export async function fundWalletsWithUSDC(): Promise<void> {
  console.log('[Test Setup] Funding wallets with USDC...');

  // On Anvil fork, we can impersonate accounts
  // Find a USDC whale address on Base Sepolia and transfer from there
  const USDC_WHALE = '0x4c80E24119CFB836cdF0a6b53dc23F04F7e652CA'; // Example whale address

  const usdcAbi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
  ];

  // Impersonate whale account
  await testProvider.send('anvil_impersonateAccount', [USDC_WHALE]);

  const whaleSigner = await testProvider.getSigner(USDC_WHALE);
  const usdc = new ethers.Contract(TEST_CONTRACTS.usdc, usdcAbi, whaleSigner);

  // Transfer USDC to test wallets
  const amount = ethers.parseUnits('100000', 6); // 100,000 USDC

  await usdc.transfer(testPayerWallet.address, amount);
  await usdc.transfer(testResearcherWallet.address, amount);
  await usdc.transfer(testProtocolOwnerWallet.address, amount);
  await usdc.transfer(testValidatorWallet.address, amount);

  // Stop impersonating
  await testProvider.send('anvil_stopImpersonatingAccount', [USDC_WHALE]);

  console.log('[Test Setup] USDC funding completed');
}

/**
 * Deploy or connect to test contracts
 */
export async function setupContracts(): Promise<void> {
  console.log('[Test Setup] Setting up test contracts...');

  // For integration tests, we'll use existing deployed contracts on the fork
  // These addresses should match your deployed contracts on Base Sepolia
  TEST_CONTRACTS.protocolRegistry = process.env.PROTOCOL_REGISTRY_ADDRESS || '';
  TEST_CONTRACTS.validationRegistry = process.env.VALIDATION_REGISTRY_ADDRESS || '';
  TEST_CONTRACTS.bountyPool = process.env.BOUNTY_POOL_ADDRESS || '';

  if (!TEST_CONTRACTS.protocolRegistry ||
      !TEST_CONTRACTS.validationRegistry ||
      !TEST_CONTRACTS.bountyPool) {
    throw new Error('Contract addresses not found in environment variables');
  }

  console.log('[Test Setup] Test contracts configured:');
  console.log(`  ProtocolRegistry: ${TEST_CONTRACTS.protocolRegistry}`);
  console.log(`  ValidationRegistry: ${TEST_CONTRACTS.validationRegistry}`);
  console.log(`  BountyPool: ${TEST_CONTRACTS.bountyPool}`);
  console.log(`  USDC: ${TEST_CONTRACTS.usdc}`);
}

/**
 * Initialize test database
 */
export async function setupDatabase(): Promise<void> {
  console.log('[Test Setup] Setting up test database...');

  // Clear all test data
  await prisma.paymentReconciliation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.vulnerability.deleteMany();
  await prisma.proof.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.scanStepRecord.deleteMany();
  await prisma.scan.deleteMany();
  await prisma.fundingEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.protocol.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.eventListenerState.deleteMany();

  console.log('[Test Setup] Test database cleared');
}

/**
 * Setup Redis and clear queues
 */
export async function setupRedis(): Promise<void> {
  console.log('[Test Setup] Setting up Redis...');

  // Clear all test queues
  const paymentQueue = new Queue('payment-processing', { connection: redis });
  await paymentQueue.obliterate({ force: true });
  await paymentQueue.close();

  console.log('[Test Setup] Redis queues cleared');
}

/**
 * Global setup - runs once before all tests
 */
export async function globalSetup(): Promise<void> {
  console.log('[Test Setup] Running global setup...');

  try {
    // Start Anvil fork
    const anvilPort = await startAnvil();

    // Wait for Anvil to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Initialize wallets and provider
    initializeWallets(anvilPort);

    // Setup contracts
    await setupContracts();

    // Fund wallets with USDC
    await fundWalletsWithUSDC();

    // Setup database
    await setupDatabase();

    // Setup Redis
    await setupRedis();

    console.log('[Test Setup] Global setup completed successfully');
  } catch (error) {
    console.error('[Test Setup] Global setup failed:', error);
    await globalTeardown();
    throw error;
  }
}

/**
 * Global teardown - runs once after all tests
 */
export async function globalTeardown(): Promise<void> {
  console.log('[Test Setup] Running global teardown...');

  try {
    // Stop Anvil
    await stopAnvil();

    // Disconnect from database
    await prisma.$disconnect();

    // Disconnect from Redis
    await redis.disconnect();

    console.log('[Test Setup] Global teardown completed');
  } catch (error) {
    console.error('[Test Setup] Global teardown failed:', error);
  }
}

/**
 * Test-level setup - runs before each test
 */
export async function beforeEachTest(): Promise<void> {
  // Clear database for each test
  await setupDatabase();

  // Clear Redis queues
  await setupRedis();
}

/**
 * Test-level teardown - runs after each test
 */
export async function afterEachTest(): Promise<void> {
  // Optional: Add any test-level cleanup here
}

/**
 * Create test protocol in database
 */
export async function createTestProtocol(options: {
  ownerAddress?: string;
  onChainProtocolId?: string;
  totalBountyPool?: number;
  availableBounty?: number;
} = {}) {
  return await prisma.protocol.create({
    data: {
      authUserId: 'test-user',
      ownerAddress: options.ownerAddress || testProtocolOwnerWallet.address,
      githubUrl: 'https://github.com/test/protocol',
      branch: 'main',
      contractPath: 'contracts/TestContract.sol',
      contractName: 'TestContract',
      bountyTerms: 'Test bounty terms',
      status: 'ACTIVE',
      registrationState: 'ACTIVE',
      onChainProtocolId: options.onChainProtocolId || ethers.id('test-protocol'),
      totalBountyPool: options.totalBountyPool || 10000,
      availableBounty: options.availableBounty || 10000,
      paidBounty: 0,
    },
  });
}

/**
 * Create test vulnerability
 */
export async function createTestVulnerability(
  protocolId: string,
  options: {
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    bounty?: number;
  } = {}
) {
  return await prisma.vulnerability.create({
    data: {
      protocolId,
      vulnerabilityHash: ethers.id(`vuln-${Date.now()}`),
      severity: options.severity || 'HIGH',
      status: 'ACKNOWLEDGED',
      bounty: options.bounty || 1000,
      proof: 'encrypted-proof-data',
    },
  });
}

/**
 * Create test payment
 */
export async function createTestPayment(
  vulnerabilityId: string,
  options: {
    amount?: number;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED';
    researcherAddress?: string;
    txHash?: string | null;
    onChainBountyId?: string | null;
    reconciled?: boolean;
  } = {}
) {
  return await prisma.payment.create({
    data: {
      vulnerabilityId,
      amount: options.amount || 1000,
      currency: 'USDC',
      status: options.status || 'PENDING',
      researcherAddress: options.researcherAddress || testResearcherWallet.address,
      txHash: options.txHash === null ? null : (options.txHash || undefined),
      onChainBountyId: options.onChainBountyId === null ? null : (options.onChainBountyId || undefined),
      reconciled: options.reconciled || false,
      queuedAt: new Date(),
    },
  });
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
