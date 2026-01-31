import { ethers } from 'ethers';

/**
 * Blockchain configuration for Base Sepolia
 */

// Create provider for Base Sepolia
export const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
);

// Create signer from private key
export const getSigner = (): ethers.Wallet => {
  const privateKey = process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY or WALLET_PRIVATE_KEY must be set in environment variables');
  }

  // Add 0x prefix if not present
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  return new ethers.Wallet(formattedKey, provider);
};

// Contract addresses
export const contractAddresses = {
  protocolRegistry: process.env.PROTOCOL_REGISTRY_ADDRESS as string,
  validationRegistry: process.env.VALIDATION_REGISTRY_ADDRESS as string,
  bountyPool: process.env.BOUNTY_POOL_ADDRESS as string,
};

// Validate that all contract addresses are set
export const validateContractAddresses = (): void => {
  const missing: string[] = [];

  if (!contractAddresses.protocolRegistry) {
    missing.push('PROTOCOL_REGISTRY_ADDRESS');
  }
  if (!contractAddresses.validationRegistry) {
    missing.push('VALIDATION_REGISTRY_ADDRESS');
  }
  if (!contractAddresses.bountyPool) {
    missing.push('BOUNTY_POOL_ADDRESS');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing contract addresses in environment variables: ${missing.join(', ')}`
    );
  }
};

// Chain configuration
export const chainConfig = {
  chainId: 84532, // Base Sepolia
  name: 'Base Sepolia',
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
};

// USDC configuration
export const usdcConfig = {
  address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  decimals: 6,
  symbol: 'USDC',
};

export default {
  provider,
  getSigner,
  contractAddresses,
  validateContractAddresses,
  chainConfig,
  usdcConfig,
};
