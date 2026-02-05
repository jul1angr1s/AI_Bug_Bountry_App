/**
 * Setup Real On-Chain Protocol ID
 *
 * This script:
 * 1. Derives an on-chain protocol ID for the existing protocol
 * 2. Checks BountyPool balance for that protocol
 * 3. Updates the database with the on-chain ID
 * 4. This enables real on-chain payments instead of demo mode
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { BountyPoolClient } from '../src/blockchain/contracts/BountyPoolClient.js';
import { payerWallet, researcherWallet, contractAddresses } from '../src/blockchain/config.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Setup Real On-Chain Protocol ID ===\n');

  // Get the protocol
  const protocol = await prisma.protocol.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!protocol) {
    console.log('❌ No active protocol found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('Protocol ID (DB):', protocol.id);
  console.log('GitHub URL:', protocol.githubUrl);
  console.log('Current onChainProtocolId:', protocol.onChainProtocolId || 'NULL');
  console.log('');

  // Derive the on-chain protocol ID (same as used by fund-bounty-pool.ts)
  const onChainProtocolId = ethers.id(protocol.id);
  console.log('Derived onChainProtocolId:', onChainProtocolId);
  console.log('');

  // Show wallet info
  console.log('Wallet Configuration:');
  console.log('  Payer:', payerWallet.address);
  console.log('  Researcher:', researcherWallet.address);
  console.log('  BountyPool:', contractAddresses.bountyPool);
  console.log('');

  // Check if BountyPool has funds for this protocol ID
  const bountyClient = new BountyPoolClient();

  try {
    const balance = await bountyClient.getProtocolBalance(onChainProtocolId);
    console.log('BountyPool balance for this protocol:', balance, 'USDC');

    if (balance < 5) {
      console.log('');
      console.log('⚠️  Protocol pool has insufficient funds for payments');
      console.log('   Need to deposit USDC to enable real payments');
      console.log('');
    } else {
      console.log('');
      console.log('✅ Protocol pool has sufficient funds for payments');
    }
  } catch (error: any) {
    console.log('⚠️  Could not check protocol balance:', error.message);
    console.log('   This is OK - balance may return 0 for unregistered protocols');
    console.log('');
  }

  // Update the protocol with the on-chain ID
  await prisma.protocol.update({
    where: { id: protocol.id },
    data: { onChainProtocolId }
  });

  console.log('✅ Updated protocol with onChainProtocolId in database');
  console.log('');

  // Verify the update
  const updated = await prisma.protocol.findUnique({
    where: { id: protocol.id },
    select: { onChainProtocolId: true }
  });
  console.log('Verified onChainProtocolId:', updated?.onChainProtocolId);
  console.log('');

  console.log('=== Next Steps ===');
  console.log('');
  console.log('1. Now payments will attempt REAL on-chain transactions');
  console.log('2. To trigger a new payment:');
  console.log('   npx tsx scripts/force-validate-finding.ts');
  console.log('');
  console.log('3. Watch backend logs for:');
  console.log('   [PaymentWorker] Calling BountyPool.releaseBounty()...');
  console.log('   [BountyPool] Transaction sent: 0x...');
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
