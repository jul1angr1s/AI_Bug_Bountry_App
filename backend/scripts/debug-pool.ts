/**
 * Debug BountyPool state
 */
import 'dotenv/config';
import { ethers, Contract } from 'ethers';
import { provider, contractAddresses, usdcConfig } from '../src/blockchain/config.js';
import { BountyPoolClient } from '../src/blockchain/contracts/BountyPoolClient.js';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

async function main() {
  const protocolId = '0x1cd229399bb558a2f6abaa3083e9753a93aa247e3df3e2d6ed5f03523dfed17b';

  console.log('=== Debug BountyPool ===\n');
  console.log('Protocol ID:', protocolId);
  console.log('BountyPool address:', contractAddresses.bountyPool);
  console.log('');

  // Check BountyPool contract's total USDC balance
  const usdc = new Contract(usdcConfig.address, ERC20_ABI, provider);
  const contractBalance = await usdc.balanceOf(contractAddresses.bountyPool);
  console.log('BountyPool total USDC balance:', ethers.formatUnits(contractBalance, 6), 'USDC');

  // Check protocol-specific balance via contract
  const client = new BountyPoolClient();
  const protocolBalance = await client.getProtocolBalance(protocolId);
  console.log('Protocol-specific balance:', protocolBalance, 'USDC');

  // If there's a mismatch, the USDC is in the contract but not mapped to this protocol
  if (Number(ethers.formatUnits(contractBalance, 6)) > 0 && protocolBalance === 0) {
    console.log('\n⚠️  USDC is in contract but NOT mapped to this protocol ID');
    console.log('   The deposit function may not be updating protocolBalances correctly');
  }
}

main().catch(console.error);
