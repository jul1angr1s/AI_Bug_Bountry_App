/**
 * Blockchain integration layer for Base Sepolia smart contracts
 * Phase 3B Implementation + ERC-8004 Agent Contracts
 */

// Configuration
export {
  provider,
  getSigner,
  payerWallet,
  researcherWallet,
  contractAddresses,
  validateContractAddresses,
  chainConfig,
  usdcConfig,
} from './config.js';

// Contract clients — Core platform
export { ProtocolRegistryClient } from './contracts/ProtocolRegistryClient.js';
export { ValidationRegistryClient } from './contracts/ValidationRegistryClient.js';
export { BountyPoolClient } from './contracts/BountyPoolClient.js';

// Contract clients — ERC-8004 Agent infrastructure
export { AgentIdentityRegistryClient } from './contracts/AgentIdentityRegistryClient.js';
export { AgentReputationRegistryClient } from './contracts/AgentReputationRegistryClient.js';
export { PlatformEscrowClient } from './contracts/PlatformEscrowClient.js';

// Types and interfaces — Core
export type {
  ProtocolRegistrationResult,
  OnChainProtocol,
} from './contracts/ProtocolRegistryClient.js';

export type {
  ValidationRecordResult,
  OnChainValidation,
} from './contracts/ValidationRegistryClient.js';

export type {
  BountyReleaseResult,
  OnChainBounty,
} from './contracts/BountyPoolClient.js';

// Types and interfaces — Agent
export type {
  AgentRegistrationResult,
  OnChainAgent,
} from './contracts/AgentIdentityRegistryClient.js';

export type {
  FeedbackRecordResult,
  OnChainReputationScore,
} from './contracts/AgentReputationRegistryClient.js';

export type {
  DepositResult,
  FeeDeductionResult,
} from './contracts/PlatformEscrowClient.js';

// Enums — Core
export { ProtocolStatus } from './contracts/ProtocolRegistryClient.js';
export { ValidationOutcome, Severity } from './contracts/ValidationRegistryClient.js';
export { BountySeverity } from './contracts/BountyPoolClient.js';

// Enums — Agent
export { AgentType } from './contracts/AgentIdentityRegistryClient.js';
export { FeedbackType as OnChainFeedbackType } from './contracts/AgentReputationRegistryClient.js';
