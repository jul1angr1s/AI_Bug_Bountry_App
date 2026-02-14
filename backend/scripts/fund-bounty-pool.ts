/**
 * Fund Bounty Pool Script
 * 
 * This script funds a protocol's bounty pool with USDC for testing payments.
 * 
 * Steps:
 * 1. Get the protocol's on-chain ID from database
 * 2. Check current USDC balance
 * 3. Approve USDC spending by BountyPool contract
 * 4. Deposit USDC to the protocol's bounty pool
 * 
 * Usage: npx tsx scripts/fund-bounty-pool.ts [amount_usdc]
 */

import { ethers, Contract } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { provider, payerWallet, contractAddresses, usdcConfig } from '../src/blockchain/config.js';
import { BountyPoolClient } from '../src/blockchain/contracts/BountyPoolClient.js';

const prisma = new PrismaClient();

// Standard ERC20 ABI for approve and balanceOf
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
];

async function main() {
  console.log('=== Fund Bounty Pool Script ===\n');

  // Parse amount from command line args (default: 500 USDC for testing)
  const amountUsdc = parseFloat(process.argv[2] || '500');

  console.log(`Funding amount: ${amountUsdc} USDC\n`);

  // Step 1: Get the latest protocol with scans
  console.log('Step 1: Finding protocol to fund...');
  const protocol = await prisma.protocol.findFirst({
    where: {
      scans: {
        some: {},
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      githubUrl: true,
      onChainProtocolId: true,
      totalBountyPool: true,
      availableBounty: true,
    },
  });

  if (!protocol) {
    console.error('❌ No protocol found with scans');
    process.exit(1);
  }

  console.log(`  Protocol ID (DB): ${protocol.id}`);
  console.log(`  GitHub URL: ${protocol.githubUrl}`);
  console.log(`  Current pool: $${protocol.totalBountyPool} (Available: $${protocol.availableBounty})`);

  // Get or derive on-chain protocol ID
  const onChainProtocolId = protocol.onChainProtocolId || ethers.id(protocol.id);
  console.log(`  On-chain Protocol ID: ${onChainProtocolId}\n`);

  // Step 2: Check wallet and contract setup
  console.log('Step 2: Checking wallet and contracts...');
  console.log(`  Payer wallet: ${payerWallet.address}`);
  console.log(`  USDC address: ${usdcConfig.address}`);
  console.log(`  BountyPool address: ${contractAddresses.bountyPool}\n`);

  // Create USDC contract instance
  const usdcContract = new Contract(usdcConfig.address, ERC20_ABI, payerWallet);

  // Check USDC balance
  const balance = await usdcContract.balanceOf(payerWallet.address);
  const balanceFormatted = ethers.formatUnits(balance, usdcConfig.decimals);
  console.log(`  USDC balance: ${balanceFormatted} USDC`);

  if (parseFloat(balanceFormatted) < amountUsdc) {
    console.error(`\n❌ Insufficient USDC balance!`);
    console.error(`   Need: ${amountUsdc} USDC`);
    console.error(`   Have: ${balanceFormatted} USDC`);
    console.error(`\n💡 Get test USDC from Base Sepolia faucet or transfer from another wallet.`);
    process.exit(1);
  }

  // Step 3: Approve USDC spending
  console.log('\nStep 3: Approving USDC spending...');
  const amountWei = BigInt(Math.floor(amountUsdc * 10 ** usdcConfig.decimals));
  
  // Use max uint256 for approval to avoid edge cases
  const maxApproval = ethers.MaxUint256;

  // Check current allowance
  const currentAllowance = await usdcContract.allowance(payerWallet.address, contractAddresses.bountyPool);
  console.log(`  Current allowance: ${ethers.formatUnits(currentAllowance, usdcConfig.decimals)} USDC`);

  if (currentAllowance < amountWei) {
    console.log(`  Approving unlimited USDC for BountyPool...`);
    const approveTx = await usdcContract.approve(contractAddresses.bountyPool, maxApproval);
    console.log(`  Approval TX: ${approveTx.hash}`);
    const receipt = await approveTx.wait();
    console.log(`  ✅ Approval confirmed in block ${receipt?.blockNumber}`);
    
    // Wait for RPC to sync
    console.log('  Waiting for RPC sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Re-verify allowance
    const newAllowance = await usdcContract.allowance(payerWallet.address, contractAddresses.bountyPool);
    console.log(`  New allowance: ${newAllowance > amountWei ? 'unlimited' : ethers.formatUnits(newAllowance, usdcConfig.decimals)} USDC`);
  } else {
    console.log('  ✅ Sufficient allowance already exists');
  }

  // Step 4: Deposit to BountyPool
  console.log('\nStep 4: Depositing to BountyPool...');
  const bountyClient = new BountyPoolClient();

  try {
    const depositTxHash = await bountyClient.depositBounty(onChainProtocolId, amountUsdc);
    console.log(`  ✅ Deposit confirmed: ${depositTxHash}`);

    // Check new balance
    const newBalance = await bountyClient.getProtocolBalance(onChainProtocolId);
    console.log(`  New protocol balance: ${newBalance} USDC`);

    // Update database
    await prisma.protocol.update({
      where: { id: protocol.id },
      data: {
        totalBountyPool: newBalance,
        availableBounty: newBalance,
        fundedAt: new Date(),
      },
    });
    console.log('  ✅ Database updated');

    console.log('\n🎉 Bounty pool funded successfully!');
    console.log(`   Protocol: ${protocol.githubUrl}`);
    console.log(`   Amount: ${amountUsdc} USDC`);
    console.log(`   New balance: ${newBalance} USDC`);
    console.log('\nYou can now run the payment workflow again.');
  } catch (error: any) {
    console.error('\n❌ Deposit failed:', error.message);
    
    // Check if it's a contract-level issue
    if (error.message.includes('execution reverted')) {
      console.error('\n💡 Possible issues:');
      console.error('   - Protocol may not be registered in BountyPool contract');
      console.error('   - Contract may require specific role to deposit');
      console.error('   - Contract may be paused');
    }
    
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
