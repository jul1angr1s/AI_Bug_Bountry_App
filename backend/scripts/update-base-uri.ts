/**
 * Update Base URI for AgentIdentityRegistry NFT Metadata
 *
 * Updates the on-chain baseURI so NFT marketplaces (BaseScan, OpenSea)
 * can resolve token metadata to the correct public endpoint.
 *
 * Usage:
 *   npx tsx scripts/update-base-uri.ts <public-base-url>
 *
 * Example:
 *   npx tsx scripts/update-base-uri.ts https://api.thundersecurity.xyz/api/v1/agent-identities/metadata/
 *
 * Requirements:
 *   - Deployer wallet (DEFAULT_ADMIN_ROLE) via PRIVATE_KEY env var
 *   - BASE_SEPOLIA_RPC_URL set in .env
 */

import { ethers } from 'ethers';
import { provider, payerWallet } from '../src/blockchain/config.js';

const AGENT_IDENTITY_REGISTRY = process.env.AGENT_IDENTITY_REGISTRY_ADDRESS;

const ABI = [
  'function setBaseURI(string memory newBaseURI) external',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function baseURI() external view returns (string memory)',
];

async function main() {
  const newBaseUri = process.argv[2];

  if (!newBaseUri) {
    console.error('Usage: npx tsx scripts/update-base-uri.ts <public-base-url>');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/update-base-uri.ts https://api.thundersecurity.xyz/api/v1/agent-identities/metadata/');
    process.exit(1);
  }

  if (!AGENT_IDENTITY_REGISTRY) {
    console.error('Missing AGENT_IDENTITY_REGISTRY_ADDRESS in environment.');
    process.exit(1);
  }

  // Ensure trailing slash
  const uri = newBaseUri.endsWith('/') ? newBaseUri : `${newBaseUri}/`;

  console.log('=== Update AgentIdentityRegistry baseURI ===\n');
  console.log(`Contract: ${AGENT_IDENTITY_REGISTRY}`);
  console.log(`Wallet:   ${payerWallet.address}`);
  console.log(`New URI:  ${uri}`);
  console.log('');

  const contract = new ethers.Contract(AGENT_IDENTITY_REGISTRY, ABI, payerWallet);
  const readContract = new ethers.Contract(AGENT_IDENTITY_REGISTRY, ABI, provider);

  // Read current baseURI
  try {
    const currentUri = await readContract.baseURI();
    console.log(`Current baseURI: ${currentUri}`);
  } catch {
    console.log('Current baseURI: (unable to read - contract may not expose baseURI() getter)');
  }

  // Send setBaseURI transaction
  console.log('\nSending setBaseURI transaction...');
  const tx = await contract.setBaseURI(uri);
  console.log(`TX hash: ${tx.hash}`);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // Verify by reading tokenURI for token 1
  console.log('\nVerifying...');
  try {
    const tokenUri = await readContract.tokenURI(1);
    console.log(`tokenURI(1) = ${tokenUri}`);
    console.log('\nbaseURI updated successfully!');
  } catch {
    console.log('(Could not verify tokenURI - token 1 may not exist, but baseURI was set)');
  }
}

main().catch((error) => {
  console.error('Failed to update baseURI:', error);
  process.exit(1);
});
