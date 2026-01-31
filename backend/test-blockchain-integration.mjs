#!/usr/bin/env node

/**
 * Quick test script to verify blockchain integration
 * Run with: node test-blockchain-integration.mjs
 */

import { ethers } from 'ethers';

console.log('🧪 Testing Blockchain Integration...\n');

// Test 1: Environment variables
console.log('✅ Test 1: Environment Variables');
const requiredVars = [
  'BASE_SEPOLIA_RPC_URL',
  'PROTOCOL_REGISTRY_ADDRESS',
  'VALIDATION_REGISTRY_ADDRESS',
  'BOUNTY_POOL_ADDRESS'
];

let hasAllVars = true;
for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ Missing: ${varName}`);
    hasAllVars = false;
  } else {
    console.log(`  ✓ ${varName}: ${value.slice(0, 20)}...`);
  }
}

if (!hasAllVars) {
  console.log('\n❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

console.log('\n✅ Test 2: RPC Connection');
try {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const blockNumber = await provider.getBlockNumber();
  console.log(`  ✓ Connected to Base Sepolia`);
  console.log(`  ✓ Current block: ${blockNumber}`);
} catch (error) {
  console.log(`  ❌ Failed to connect: ${error.message}`);
  process.exit(1);
}

console.log('\n✅ Test 3: Contract Verification');
try {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);

  // Check ProtocolRegistry
  const registryCode = await provider.getCode(process.env.PROTOCOL_REGISTRY_ADDRESS);
  if (registryCode === '0x') {
    console.log('  ❌ ProtocolRegistry not found at address');
    process.exit(1);
  }
  console.log(`  ✓ ProtocolRegistry deployed (${registryCode.length} bytes)`);

  // Check ValidationRegistry
  const validationCode = await provider.getCode(process.env.VALIDATION_REGISTRY_ADDRESS);
  if (validationCode === '0x') {
    console.log('  ❌ ValidationRegistry not found at address');
    process.exit(1);
  }
  console.log(`  ✓ ValidationRegistry deployed (${validationCode.length} bytes)`);

  // Check BountyPool
  const bountyCode = await provider.getCode(process.env.BOUNTY_POOL_ADDRESS);
  if (bountyCode === '0x') {
    console.log('  ❌ BountyPool not found at address');
    process.exit(1);
  }
  console.log(`  ✓ BountyPool deployed (${bountyCode.length} bytes)`);
} catch (error) {
  console.log(`  ❌ Failed to verify contracts: ${error.message}`);
  process.exit(1);
}

console.log('\n✅ Test 4: Read Contract Data');
try {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);

  // Simple ABI for getProtocolCount()
  const registryAbi = ['function getProtocolCount() external view returns (uint256)'];
  const registry = new ethers.Contract(
    process.env.PROTOCOL_REGISTRY_ADDRESS,
    registryAbi,
    provider
  );

  const count = await registry.getProtocolCount();
  console.log(`  ✓ Protocol count: ${count.toString()}`);

  // Check ValidationRegistry total count
  const validationAbi = ['function getTotalValidationCount() external view returns (uint256)'];
  const validation = new ethers.Contract(
    process.env.VALIDATION_REGISTRY_ADDRESS,
    validationAbi,
    provider
  );

  const valCount = await validation.getTotalValidationCount();
  console.log(`  ✓ Validation count: ${valCount.toString()}`);

  // Check BountyPool base amount
  const bountyAbi = ['function baseBountyAmount() external view returns (uint256)'];
  const bounty = new ethers.Contract(
    process.env.BOUNTY_POOL_ADDRESS,
    bountyAbi,
    provider
  );

  const baseAmount = await bounty.baseBountyAmount();
  console.log(`  ✓ Base bounty amount: ${ethers.formatUnits(baseAmount, 6)} USDC`);
} catch (error) {
  console.log(`  ❌ Failed to read contract data: ${error.message}`);
  process.exit(1);
}

console.log('\n🎉 All tests passed! Blockchain integration is working correctly.\n');
console.log('Next steps:');
console.log('1. Ensure database migration has run: npx prisma migrate dev');
console.log('2. Start the dev environment: bash scripts/dev.sh');
console.log('3. Register a test protocol and verify on-chain integration\n');
