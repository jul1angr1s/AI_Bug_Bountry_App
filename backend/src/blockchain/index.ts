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
} from './config';

// Contract clients
export { ProtocolRegistryClient } from './contracts/ProtocolRegistryClient';
export { ValidationRegistryClient } from './contracts/ValidationRegistryClient';
export { BountyPoolClient } from './contracts/BountyPoolClient';

// Types and interfaces
export type {
  ProtocolRegistrationResult,
  OnChainProtocol,
} from './contracts/ProtocolRegistryClient';

export type {
  ValidationRecordResult,
  OnChainValidation,
} from './contracts/ValidationRegistryClient';

export type {
  BountyReleaseResult,
  OnChainBounty,
} from './contracts/BountyPoolClient';

// Enums
export { ProtocolStatus } from './contracts/ProtocolRegistryClient';
export { ValidationOutcome, Severity } from './contracts/ValidationRegistryClient';
export { BountySeverity } from './contracts/BountyPoolClient';

// Default exports for convenience
import { ProtocolRegistryClient } from './contracts/ProtocolRegistryClient';
import { ValidationRegistryClient } from './contracts/ValidationRegistryClient';
import { BountyPoolClient } from './contracts/BountyPoolClient';

export default {
  ProtocolRegistryClient,
  ValidationRegistryClient,
  BountyPoolClient,
};
