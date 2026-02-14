/**
 * Set Base Bounty Amount Script
 *
 * Sets the base bounty amount on the BountyPool contract.
 * Usage: npx tsx scripts/set-base-bounty.ts [amount_usdc]
 * Default: 1 USDC
 */

import 'dotenv/config';
import { BountyPoolClient, BountySeverity } from '../src/blockchain/contracts/BountyPoolClient.js';

async function main() {
  const amountUsdc = parseFloat(process.argv[2] || '1');
  const client = new BountyPoolClient();

  console.log('Current base bounty:', await client.getBaseBountyAmount(), 'USDC');

  console.log(`\nSetting base bounty to ${amountUsdc} USDC...`);
  const tx = await client.updateBaseBountyAmount(amountUsdc);
  console.log('TX sent:', tx.hash);
  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt?.blockNumber);

  console.log('\nNew base bounty:', await client.getBaseBountyAmount(), 'USDC');

  // Verify calculated amounts
  console.log('\nCalculated amounts per severity:');
  for (const name of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const) {
    const sev = BountySeverity[name];
    const amount = await client.calculateBountyAmount(sev);
    console.log(`  ${name}: ${amount} USDC`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
