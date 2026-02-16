export interface ContractInfo {
  name: string;
  address: string;
  description: string;
  standard: string;
  verified: boolean;
  category: 'protocol' | 'agent' | 'payment';
}

const CONTRACTS: ContractInfo[] = [
  {
    name: 'ProtocolRegistry',
    address: import.meta.env.VITE_PROTOCOL_REGISTRY_ADDRESS || '',
    description: 'Registers smart contract protocols for security review. Stores protocol metadata, risk scores, and audit status on-chain.',
    standard: 'Custom',
    verified: true,
    category: 'protocol',
  },
  {
    name: 'ValidationRegistry',
    address: import.meta.env.VITE_VALIDATION_REGISTRY_ADDRESS || '',
    description: 'Records vulnerability validation outcomes. Tracks validator attestations and proof verification results.',
    standard: 'Custom',
    verified: true,
    category: 'protocol',
  },
  {
    name: 'BountyPool',
    address: import.meta.env.VITE_BOUNTY_POOL_ADDRESS || '',
    description: 'Manages USDC bounty funds for each protocol. Handles deposits, severity-based payouts, and researcher rewards.',
    standard: 'Custom',
    verified: true,
    category: 'payment',
  },
  {
    name: 'AgentIdentityRegistry',
    address: import.meta.env.VITE_AGENT_IDENTITY_REGISTRY_ADDRESS || '',
    description: 'Issues soulbound NFT identities to AI agents. Each agent receives a non-transferable ERC-721 token as proof of identity.',
    standard: 'ERC-721 / ERC-8004',
    verified: true,
    category: 'agent',
  },
  {
    name: 'AgentReputationRegistry',
    address: import.meta.env.VITE_AGENT_REPUTATION_REGISTRY_ADDRESS || '',
    description: 'Tracks on-chain reputation scores for agents. Records mutual feedback between researchers and validators.',
    standard: 'Custom',
    verified: true,
    category: 'agent',
  },
];

export function getAllContracts(): ContractInfo[] {
  return CONTRACTS;
}

export function getContractByName(name: string): ContractInfo | undefined {
  return CONTRACTS.find((c) => c.name === name);
}

export function getContractsByCategory(category: ContractInfo['category']): ContractInfo[] {
  return CONTRACTS.filter((c) => c.category === category);
}
