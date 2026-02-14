/**
 * Update BountyPool Parameters for Demo Mode
 * 
 * Updates the deployed BountyPool contract on Base Sepolia with demo-friendly amounts:
 * - Base: 1 USDC (from 100 USDC)
 * - CRITICAL: 10x multiplier = 10 USDC
 * - HIGH: 5x multiplier = 5 USDC
 * - MEDIUM: 3x multiplier = 3 USDC
 * - LOW: 1x multiplier = 1 USDC
 *
 * This allows efficient use of the 50 USDC pool for demonstrations.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { contractAddresses, payerWallet, provider } from '../src/blockchain/config.js';
import BountyPoolABI from '../src/blockchain/abis/BountyPool.json' with { type: 'json' };

async function main() {
  console.log('🔧 Updating BountyPool parameters for demo...\n');
  console.log('Contract:', contractAddresses.bountyPool);
  console.log('Admin wallet:', payerWallet.address);
  console.log('Network: Base Sepolia (Chain ID: 84532)\n');
  
  // Initialize contract
  const bountyPool = new ethers.Contract(
    contractAddresses.bountyPool,
    BountyPoolABI.abi,
    payerWallet
  );
  
  // Check admin role
  console.log('Checking admin permissions...');
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const hasAdminRole = await bountyPool.hasRole(DEFAULT_ADMIN_ROLE, payerWallet.address);
  
  if (!hasAdminRole) {
    throw new Error('Wallet does not have admin role on BountyPool contract');
  }
  console.log('✅ Admin role confirmed\n');
  
  // Read current values
  console.log('📊 Current values:');
  const currentBase = await bountyPool.baseBountyAmount();
  const currentCriticalMultiplier = await bountyPool.severityMultipliers(0); // CRITICAL
  const currentHighMultiplier = await bountyPool.severityMultipliers(1); // HIGH
  const currentMediumMultiplier = await bountyPool.severityMultipliers(2); // MEDIUM
  const currentLowMultiplier = await bountyPool.severityMultipliers(3); // LOW

  console.log('   Base:', ethers.formatUnits(currentBase, 6), 'USDC');
  console.log('   CRITICAL multiplier:', currentCriticalMultiplier.toString(), 'basis points');
  console.log('   HIGH multiplier:', currentHighMultiplier.toString(), 'basis points');
  console.log('   MEDIUM multiplier:', currentMediumMultiplier.toString(), 'basis points');
  console.log('   LOW multiplier:', currentLowMultiplier.toString(), 'basis points\n');
  
  // Step 1: Update base amount to 1 USDC
  console.log('1️⃣  Updating base bounty amount to 1 USDC...');
  const newBase = 1_000_000; // 1 USDC with 6 decimals
  
  try {
    const baseTx = await bountyPool.updateBaseBountyAmount(newBase);
    console.log('   📝 Transaction hash:', baseTx.hash);
    console.log('   ⏳ Waiting for confirmation...');
    const baseReceipt = await baseTx.wait();
    console.log('   ✅ Confirmed in block:', baseReceipt.blockNumber);
    console.log('   🔗 Basescan:', `https://sepolia.basescan.org/tx/${baseTx.hash}\n`);
  } catch (error: any) {
    console.error('   ❌ Failed to update base amount:', error.message);
    throw error;
  }
  
  // Step 2: Update severity multipliers
  console.log('2️⃣  Updating severity multipliers...\n');
  
  const updates = [
    {
      severity: 0,
      multiplier: 100000,
      name: 'CRITICAL',
      result: '10 USDC',
      enumValue: 'Severity.CRITICAL'
    },
    {
      severity: 1,
      multiplier: 50000,
      name: 'HIGH',
      result: '5 USDC',
      enumValue: 'Severity.HIGH'
    },
    { 
      severity: 2, 
      multiplier: 30000, 
      name: 'MEDIUM', 
      result: '3 USDC',
      enumValue: 'Severity.MEDIUM'
    },
    { 
      severity: 3, 
      multiplier: 10000, 
      name: 'LOW', 
      result: '1 USDC',
      enumValue: 'Severity.LOW'
    },
  ];
  
  for (const update of updates) {
    console.log(`   Updating ${update.name} (${update.enumValue})...`);
    console.log(`   New multiplier: ${update.multiplier} basis points → ${update.result}`);
    
    try {
      const tx = await bountyPool.updateSeverityMultiplier(update.severity, update.multiplier);
      console.log('   📝 Transaction hash:', tx.hash);
      console.log('   ⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('   ✅ Confirmed in block:', receipt.blockNumber);
      console.log('   🔗 Basescan:', `https://sepolia.basescan.org/tx/${tx.hash}\n`);
    } catch (error: any) {
      console.error(`   ❌ Failed to update ${update.name}:`, error.message);
      throw error;
    }
  }
  
  // Step 3: Verify updates
  console.log('3️⃣  Verifying updates...\n');
  
  const updatedBase = await bountyPool.baseBountyAmount();
  const criticalAmount = await bountyPool.calculateBountyAmount(0); // CRITICAL
  const highAmount = await bountyPool.calculateBountyAmount(1); // HIGH
  const mediumAmount = await bountyPool.calculateBountyAmount(2); // MEDIUM
  const lowAmount = await bountyPool.calculateBountyAmount(3); // LOW

  console.log('   ✅ Base amount:', ethers.formatUnits(updatedBase, 6), 'USDC');
  console.log('   ✅ CRITICAL severity:', ethers.formatUnits(criticalAmount, 6), 'USDC');
  console.log('   ✅ HIGH severity:', ethers.formatUnits(highAmount, 6), 'USDC');
  console.log('   ✅ MEDIUM severity:', ethers.formatUnits(mediumAmount, 6), 'USDC');
  console.log('   ✅ LOW severity:', ethers.formatUnits(lowAmount, 6), 'USDC\n');
  
  // Step 4: Budget calculation
  console.log('4️⃣  Budget calculation with 50 USDC pool:\n');
  
  const poolBudget = 50_000_000n; // 50 USDC
  const maxCritical = Number(poolBudget) / Number(criticalAmount);
  const maxHigh = Number(poolBudget) / Number(highAmount);
  const maxMedium = Number(poolBudget) / Number(mediumAmount);
  const maxLow = Number(poolBudget) / Number(lowAmount);

  console.log('   Maximum payments possible:');
  console.log('   • CRITICAL (10 USDC):', Math.floor(maxCritical), 'payments');
  console.log('   • HIGH (5 USDC):', Math.floor(maxHigh), 'payments');
  console.log('   • MEDIUM (3 USDC):', Math.floor(maxMedium), 'payments');
  console.log('   • LOW (1 USDC):', Math.floor(maxLow), 'payments\n');

  console.log('   Demo plan (4 payments):');
  console.log('   • 1x CRITICAL = 10 USDC');
  console.log('   • 1x HIGH = 5 USDC');
  console.log('   • 1x MEDIUM = 3 USDC');
  console.log('   • 1x LOW = 1 USDC');
  console.log('   • Total = 19 USDC (38% of budget)\n');
  
  console.log('✅ All updates completed successfully!');
  console.log('\n🎯 Next steps:');
  console.log('   1. Run verification script: npm run script scripts/verify-demo-setup.ts');
  console.log('   2. Start backend server: npm run dev');
  console.log('   3. Begin end-to-end demo testing');
}

main().catch((error) => {
  console.error('\n❌ Update failed:', error);
  process.exit(1);
});
