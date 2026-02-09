import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ========== Explorer URL Utilities ==========

const EXPLORER_BASE_URL =
  import.meta.env.VITE_EXPLORER_BASE_URL || 'https://sepolia.basescan.org';

export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

const AGENT_REGISTRY_ADDRESS =
  import.meta.env.VITE_AGENT_REGISTRY_ADDRESS || '';

export function getExplorerNftUrl(contractAddress: string, tokenId: string | number): string {
  return `${EXPLORER_BASE_URL}/nft/${contractAddress}/${tokenId}`;
}

export function getAgentNftUrl(tokenId: string | number): string {
  return getExplorerNftUrl(AGENT_REGISTRY_ADDRESS, tokenId);
}

export function truncateHash(hash: string, startLen = 6, endLen = 4): string {
  if (hash.length <= startLen + endLen + 3) return hash;
  return `${hash.slice(0, startLen)}...${hash.slice(-endLen)}`;
}

export function formatUSDC(amount: string): string {
  const value = Number(amount) / 1e6;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========== Agent Description Maps ==========

export const AGENT_DESCRIPTIONS: Record<
  string,
  { label: string; description: string; capabilities: string[]; icon: string; color: string }
> = {
  Protocol: {
    label: 'Protocol Agent',
    description: 'Analyzes and registers smart contract protocols for security review.',
    capabilities: ['Repository cloning', 'Contract compilation', 'Risk scoring', 'On-chain registration'],
    icon: 'developer_board',
    color: 'blue',
  },
  Researcher: {
    label: 'Researcher Agent',
    description: 'Scans smart contracts for vulnerabilities using static and dynamic analysis.',
    capabilities: ['Static analysis (Slither)', 'Dynamic testing (Anvil)', 'AI deep analysis', 'Proof generation'],
    icon: 'bug_report',
    color: 'cyan',
  },
  Validator: {
    label: 'Validator Agent',
    description: 'Reviews and validates vulnerability findings using LLM-powered analysis.',
    capabilities: ['Finding validation', 'Confidence scoring', 'Reputation feedback', 'On-chain attestation'],
    icon: 'verified',
    color: 'green',
  },
  Payment: {
    label: 'Payment Agent',
    description: 'Processes USDC bounty payments to researchers for confirmed vulnerabilities.',
    capabilities: ['USDC transfers', 'Bounty calculation', 'On-chain settlement', 'Payment tracking'],
    icon: 'payments',
    color: 'purple',
  },
};

// ========== X.402 Payment Description Maps ==========

export const X402_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  PROTOCOL_REGISTRATION: {
    label: 'Protocol Registration',
    description: 'One-time fee to register a smart contract for security analysis.',
  },
  FINDING_SUBMISSION: {
    label: 'Finding Submission',
    description: 'Fee deducted from escrow when submitting a vulnerability finding.',
  },
};

export const PAYMENT_STATUS_LABELS: Record<
  string,
  { label: string; description: string }
> = {
  PENDING: { label: 'Processing', description: 'Payment is being verified on-chain.' },
  COMPLETED: { label: 'Confirmed', description: 'Payment verified and recorded on the blockchain.' },
  EXPIRED: { label: 'Expired', description: 'Payment window expired before completion.' },
  FAILED: { label: 'Failed', description: 'Payment could not be processed.' },
};
