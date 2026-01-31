/**
 * Blockchain integration layer for Base Sepolia smart contracts
 * Phase 3B Implementation
 */

// Configuration
export {
  provider,
  getSigner,
  contractAddresses,
  validateContractAddresses,
  chainConfig,
  usdcConfig,
} from './config.js';

// Contract clients
export { ProtocolRegistryClient } from './contracts/ProtocolRegistryClient.js';
export { ValidationRegistryClient } from './contracts/ValidationRegistryClient.js';
export { BountyPoolClient } from './contracts/BountyPoolClient.js';

// Types and interfaces
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

// Enums
export { ProtocolStatus } from './contracts/ProtocolRegistryClient.js';
export { ValidationOutcome, Severity } from './contracts/ValidationRegistryClient.js';
export { BountySeverity } from './contracts/BountyPoolClient.js';

// Default exports for convenience
import { ProtocolRegistryClient } from './contracts/ProtocolRegistryClient.js';
import { ValidationRegistryClient } from './contracts/ValidationRegistryClient.js';
import { BountyPoolClient } from './contracts/BountyPoolClient.js';

export default {
  ProtocolRegistryClient,
  ValidationRegistryClient,
  BountyPoolClient,
};
