import { ethers } from 'ethers';

/**
 * Blockchain configuration for Base Sepolia
 */

// Create provider for Base Sepolia
export const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
);

// Wallet configuration validation
const validateWalletKeys = (): { privateKey1: string; privateKey2: string } => {
  const privateKey1 = process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  const privateKey2 = process.env.PRIVATE_KEY2;

  if (!privateKey1) {
    throw new Error('PRIVATE_KEY or WALLET_PRIVATE_KEY must be set in environment variables');
  }

  if (!privateKey2) {
    throw new Error('PRIVATE_KEY2 must be set in environment variables for researcher wallet');
  }

  return { privateKey1, privateKey2 };
};

/**
 * Get optional agent wallets for server-side USDC transfers.
 * PRIVATE_KEY3 = researcher agent wallet (pays exploit fees)
 * PRIVATE_KEY4 = validator agent wallet (receives exploit fees)
 * These are optional - if not set, exploit fee payments are skipped.
 */
const getAgentWalletKey = (envVar: string): string | null => {
  const key = process.env[envVar];
  return key || null;
};

/**
 * Payer wallet - Has PAYER_ROLE on BountyPool contract
 * This wallet is authorized to release bounty payments to researchers
 * Uses PRIVATE_KEY environment variable
 */
export const payerWallet = (() => {
  const { privateKey1 } = validateWalletKeys();
  const formattedKey = privateKey1.startsWith('0x') ? privateKey1 : `0x${privateKey1}`;
  return new ethers.Wallet(formattedKey, provider);
})();

/**
 * Researcher wallet - Receives bounty payments (for testing)
 * This wallet represents a researcher who will receive USDC payments
 * Uses PRIVATE_KEY2 environment variable
 */
export const researcherWallet = (() => {
  const { privateKey2 } = validateWalletKeys();
  const formattedKey = privateKey2.startsWith('0x') ? privateKey2 : `0x${privateKey2}`;
  return new ethers.Wallet(formattedKey, provider);
})();

/**
 * Address of the researcher wallet for payment testing
 */
export const RESEARCHER_ADDRESS = researcherWallet.address;

/**
 * Researcher agent wallet - Used for server-side exploit fee payments
 * Sends $0.50 USDC to validator per exploit submission
 * Uses PRIVATE_KEY3 environment variable (optional)
 */
export const researcherAgentWallet = (() => {
  const key = getAgentWalletKey('PRIVATE_KEY3');
  if (!key) return null;
  const formattedKey = key.startsWith('0x') ? key : `0x${key}`;
  return new ethers.Wallet(formattedKey, provider);
})();

/**
 * Validator agent wallet address - Receives exploit fee payments
 * Uses PRIVATE_KEY4 environment variable (optional, only needed for address derivation)
 */
export const validatorAgentWallet = (() => {
  const key = getAgentWalletKey('PRIVATE_KEY4');
  if (!key) return null;
  const formattedKey = key.startsWith('0x') ? key : `0x${key}`;
  return new ethers.Wallet(formattedKey, provider);
})();

/**
 * @deprecated Use payerWallet instead for explicit wallet role clarity
 */
export const getSigner = (): ethers.Wallet => {
  return payerWallet;
};

// Contract addresses
export const contractAddresses = {
  protocolRegistry: process.env.PROTOCOL_REGISTRY_ADDRESS as string,
  validationRegistry: process.env.VALIDATION_REGISTRY_ADDRESS as string,
  bountyPool: process.env.BOUNTY_POOL_ADDRESS as string,
  agentIdentityRegistry: process.env.AGENT_IDENTITY_REGISTRY_ADDRESS as string,
  agentReputationRegistry: process.env.AGENT_REPUTATION_REGISTRY_ADDRESS as string,
  platformEscrow: process.env.PLATFORM_ESCROW_ADDRESS as string,
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
  if (!contractAddresses.agentIdentityRegistry) {
    missing.push('AGENT_IDENTITY_REGISTRY_ADDRESS');
  }
  if (!contractAddresses.agentReputationRegistry) {
    missing.push('AGENT_REPUTATION_REGISTRY_ADDRESS');
  }
  if (!contractAddresses.platformEscrow) {
    missing.push('PLATFORM_ESCROW_ADDRESS');
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
  payerWallet,
  researcherWallet,
  researcherAgentWallet,
  validatorAgentWallet,
  RESEARCHER_ADDRESS,
  contractAddresses,
  validateContractAddresses,
  chainConfig,
  usdcConfig,
};
