import { SiweMessage } from 'siwe';
import { BrowserProvider } from 'ethers';

/**
 * Generate a SIWE message for signing
 */
export async function createSiweMessage(
  address: string,
  statement: string
): Promise<string> {
  const domain = window.location.host;
  const origin = window.location.origin;
  const nonce = generateNonce();

  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: 1, // Ethereum mainnet - can be made configurable
    nonce,
  });

  return message.prepareMessage();
}

/**
 * Sign a SIWE message using MetaMask or other Web3 wallet
 */
export async function signSiweMessage(message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('No Web3 wallet detected. Please install MetaMask.');
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Sign the message
  const signature = await signer.signMessage(message);

  return signature;
}

/**
 * Verify a SIWE signature
 */
export async function verifySiweSignature(
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });
    return result.success;
  } catch (error) {
    console.error('SIWE verification error:', error);
    return false;
  }
}

/**
 * Generate a random nonce for SIWE
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Connect to Web3 wallet (MetaMask)
 */
export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      'No Web3 wallet detected. Please install MetaMask or another Web3 wallet.'
    );
  }

  try {
    // Request account access using window.ethereum directly
    const accounts = (await window.ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    return accounts[0];
  } catch (error) {
    if ((error as { code?: number }).code === 4001) {
      throw new Error('User rejected the connection request.');
    }
    throw error;
  }
}

/**
 * Get current connected wallet address
 */
export async function getCurrentWalletAddress(): Promise<string | null> {
  if (!window.ethereum) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return (accounts as string[])[0] || null;
  } catch (error) {
    console.error('Error getting wallet address:', error);
    return null;
  }
}

/**
 * Listen for account changes
 */
export function onAccountsChanged(
  callback: (accounts: string[]) => void
): () => void {
  if (!window.ethereum) {
    return () => {};
  }

  const handler = (...args: unknown[]) => {
    const accounts = args[0] as string[];
    callback(accounts);
  };

  window.ethereum.on('accountsChanged', handler);

  // Return cleanup function
  return () => {
    window.ethereum?.removeListener('accountsChanged', handler);
  };
}

/**
 * TypeScript declaration for window.ethereum
 */
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
