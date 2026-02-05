/**
 * Verify Demo Setup Script
 * 
 * Checks that all components are correctly configured for the demo:
 * - Contract parameters (base amount, multipliers)
 * - Pool balance (50 USDC)
 * - Wallet balances (ETH for gas)
 * - Environment configuration (demo mode disabled)
 */

import { ethers } from 'ethers';
import { contractAddresses, payerWallet, researcherWallet, provider } from '../src/blockchain/config.js';
import BountyPoolABI from '../src/blockchain/abis/BountyPool.json' with { type: 'json' };
import USDCAbi from '../src/blockchain/abis/IERC20.json' with { type: 'json' };

const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia

async function verify() {
  console.log('🔍 Verifying demo setup...\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Initialize contracts
  const bountyPool = new ethers.Contract(
    contractAddresses.bountyPool,
    BountyPoolABI.abi,
    provider
  );
  
  const usdc = new ethers.Contract(USDC_ADDRESS, USDCAbi, provider);
  
  let allChecksPass = true;
  
  // =====================================================================
  // Check 1: Contract Parameters
  // =====================================================================
  console.log('📊 Check 1: Contract Parameters\n');
  
  try {
    const baseAmount = await bountyPool.baseBountyAmount();
    const highAmount = await bountyPool.calculateBountyAmount(1); // HIGH
    const mediumAmount = await bountyPool.calculateBountyAmount(2); // MEDIUM
    const lowAmount = await bountyPool.calculateBountyAmount(3); // LOW
    
    const baseUSDC = ethers.formatUnits(baseAmount, 6);
    const highUSDC = ethers.formatUnits(highAmount, 6);
    const mediumUSDC = ethers.formatUnits(mediumAmount, 6);
    const lowUSDC = ethers.formatUnits(lowAmount, 6);
    
    console.log('   Base amount:', baseUSDC, 'USDC');
    console.log('   HIGH severity:', highUSDC, 'USDC');
    console.log('   MEDIUM severity:', mediumUSDC, 'USDC');
    console.log('   LOW severity:', lowUSDC, 'USDC\n');
    
    // Verify expected values
    const baseOK = baseAmount === 1_000_000n;
    const highOK = highAmount === 5_000_000n;
    const mediumOK = mediumAmount === 3_000_000n;
    const lowOK = lowAmount === 1_000_000n;
    
    if (baseOK && highOK && mediumOK && lowOK) {
      console.log('   ✅ Contract parameters are correctly configured for demo\n');
    } else {
      console.log('   ❌ Contract parameters are NOT configured correctly:');
      if (!baseOK) console.log('      - Base should be 1 USDC, got', baseUSDC);
      if (!highOK) console.log('      - HIGH should be 5 USDC, got', highUSDC);
      if (!mediumOK) console.log('      - MEDIUM should be 3 USDC, got', mediumUSDC);
      if (!lowOK) console.log('      - LOW should be 1 USDC, got', lowUSDC);
      console.log('      💡 Run: npm run script scripts/update-bounty-parameters.ts\n');
      allChecksPass = false;
    }
  } catch (error: any) {
    console.log('   ❌ Failed to read contract parameters:', error.message, '\n');
    allChecksPass = false;
  }
  
  // =====================================================================
  // Check 2: Pool Balance
  // =====================================================================
  console.log('💰 Check 2: Pool Balance\n');
  
  try {
    const poolBalance = await usdc.balanceOf(contractAddresses.bountyPool);
    const balanceUSDC = ethers.formatUnits(poolBalance, 6);
    
    console.log('   BountyPool USDC balance:', balanceUSDC, 'USDC\n');
    
    if (poolBalance >= 50_000_000n) {
      console.log('   ✅ Pool has sufficient funds (≥50 USDC)\n');
    } else if (poolBalance >= 9_000_000n) {
      console.log('   ⚠️  Pool has minimum funds for 3 test payments\n');
    } else {
      console.log('   ❌ Pool has insufficient funds (<9 USDC)');
      console.log('      💡 Need at least 9 USDC for demo (3 payments)\n');
      allChecksPass = false;
    }
  } catch (error: any) {
    console.log('   ❌ Failed to check pool balance:', error.message, '\n');
    allChecksPass = false;
  }
  
  // =====================================================================
  // Check 3: Maximum Payments Calculation
  // =====================================================================
  console.log('📈 Check 3: Budget Analysis\n');
  
  try {
    const poolBalance = await usdc.balanceOf(contractAddresses.bountyPool);
    const highAmount = 5_000_000n;
    const mediumAmount = 3_000_000n;
    const lowAmount = 1_000_000n;
    
    const maxHigh = Number(poolBalance) / Number(highAmount);
    const maxMedium = Number(poolBalance) / Number(mediumAmount);
    const maxLow = Number(poolBalance) / Number(lowAmount);
    
    console.log('   Maximum payments possible:');
    console.log('   • HIGH (5 USDC):', Math.floor(maxHigh), 'payments');
    console.log('   • MEDIUM (3 USDC):', Math.floor(maxMedium), 'payments');
    console.log('   • LOW (1 USDC):', Math.floor(maxLow), 'payments\n');
    
    const demoUsage = highAmount + mediumAmount + lowAmount; // 9 USDC
    console.log('   Demo plan (3 payments): 9 USDC total');
    console.log('   Remaining after demo:', ethers.formatUnits(poolBalance - demoUsage, 6), 'USDC\n');
    
    if (poolBalance >= demoUsage) {
      console.log('   ✅ Sufficient budget for demo\n');
    } else {
      console.log('   ❌ Insufficient budget for demo\n');
      allChecksPass = false;
    }
  } catch (error: any) {
    console.log('   ❌ Failed to calculate budget:', error.message, '\n');
    allChecksPass = false;
  }
  
  // =====================================================================
  // Check 4: Wallet Balances
  // =====================================================================
  console.log('👛 Check 4: Wallet ETH Balances (for gas)\n');
  
  try {
    const payerBalance = await provider.getBalance(payerWallet.address);
    const researcherBalance = await provider.getBalance(researcherWallet.address);
    
    console.log('   Payer wallet:', payerWallet.address);
    console.log('   Balance:', ethers.formatEther(payerBalance), 'ETH\n');
    
    console.log('   Researcher wallet:', researcherWallet.address);
    console.log('   Balance:', ethers.formatEther(researcherBalance), 'ETH\n');
    
    const minGas = ethers.parseEther('0.001'); // 0.001 ETH minimum
    
    if (payerBalance < minGas) {
      console.log('   ❌ Payer wallet needs more ETH for gas fees');
      console.log('      💡 Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia\n');
      allChecksPass = false;
    } else {
      console.log('   ✅ Payer wallet has sufficient ETH for gas\n');
    }
  } catch (error: any) {
    console.log('   ❌ Failed to check wallet balances:', error.message, '\n');
    allChecksPass = false;
  }
  
  // =====================================================================
  // Check 5: Environment Configuration
  // =====================================================================
  console.log('⚙️  Check 5: Environment Configuration\n');
  
  const skipOnchain = process.env.SKIP_ONCHAIN_PAYMENT === 'true';
  const offchainValidation = process.env.PAYMENT_OFFCHAIN_VALIDATION === 'true';
  
  console.log('   SKIP_ONCHAIN_PAYMENT:', skipOnchain ? '❌ ENABLED' : '✅ DISABLED');
  console.log('   PAYMENT_OFFCHAIN_VALIDATION:', offchainValidation ? '❌ ENABLED' : '✅ DISABLED\n');
  
  if (skipOnchain || offchainValidation) {
    console.log('   ❌ Demo mode flags are enabled!');
    console.log('      These must be disabled for real on-chain payments.');
    console.log('      💡 Remove these from your .env file:\n');
    if (skipOnchain) console.log('         SKIP_ONCHAIN_PAYMENT=true');
    if (offchainValidation) console.log('         PAYMENT_OFFCHAIN_VALIDATION=true');
    console.log('');
    allChecksPass = false;
  } else {
    console.log('   ✅ Demo mode flags are disabled (real on-chain payments)\n');
  }
  
  // =====================================================================
  // Check 6: Contract Addresses
  // =====================================================================
  console.log('📍 Check 6: Contract Addresses\n');
  
  console.log('   BountyPool:', contractAddresses.bountyPool);
  console.log('   ValidationRegistry:', contractAddresses.validationRegistry);
  console.log('   ProtocolRegistry:', contractAddresses.protocolRegistry);
  console.log('   USDC:', USDC_ADDRESS, '\n');
  
  if (contractAddresses.bountyPool === '0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0') {
    console.log('   ✅ BountyPool address matches deployed contract\n');
  } else {
    console.log('   ❌ BountyPool address mismatch!\n');
    allChecksPass = false;
  }
  
  // =====================================================================
  // Summary
  // =====================================================================
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (allChecksPass) {
    console.log('🎉 Demo setup verification PASSED!\n');
    console.log('Ready to run end-to-end demo:\n');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Register protocol');
    console.log('   3. Trigger scan and validation');
    console.log('   4. Verify payments on Basescan\n');
    console.log('🔗 Monitor transactions:');
    console.log('   https://sepolia.basescan.org/address/' + contractAddresses.bountyPool);
    console.log('');
  } else {
    console.log('❌ Demo setup verification FAILED!\n');
    console.log('Please fix the issues above before running the demo.\n');
    process.exit(1);
  }
}

verify().catch((error) => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
