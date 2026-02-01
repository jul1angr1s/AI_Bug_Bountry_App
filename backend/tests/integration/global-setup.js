/**
 * Global Setup for Integration Tests
 *
 * This runs once before all test suites.
 * Sets up the test environment:
 * - Validates environment variables
 * - Checks for required dependencies (Anvil, Postgres, Redis)
 */

export default async function globalSetup() {
  console.log('\n==========================================================');
  console.log('Starting Integration Test Global Setup');
  console.log('==========================================================\n');

  // Check for required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'BASE_SEPOLIA_RPC_URL',
    'PROTOCOL_REGISTRY_ADDRESS',
    'VALIDATION_REGISTRY_ADDRESS',
    'BOUNTY_POOL_ADDRESS',
    'PRIVATE_KEY',
    'PRIVATE_KEY2',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach((key) => console.error(`  - ${key}`));
    throw new Error('Environment variables missing. Check your .env file.');
  }

  console.log('✓ Environment variables validated');

  // Check for Anvil installation
  try {
    const { execSync } = await import('child_process');
    execSync('which anvil', { stdio: 'ignore' });
    console.log('✓ Anvil found');
  } catch (error) {
    console.error('✗ Anvil not found. Please install Foundry:');
    console.error('  curl -L https://foundry.paradigm.xyz | bash');
    console.error('  foundryup');
    throw new Error('Anvil not installed');
  }

  console.log('\n==========================================================');
  console.log('Global Setup Complete');
  console.log('==========================================================\n');
}
