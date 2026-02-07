/**
 * Typed interfaces for raw contract return values.
 * These match the Solidity struct shapes returned by ethers.js.
 */

export interface RawBounty {
  bountyId: string;
  protocolId: string;
  validationId: string;
  researcher: string;
  severity: bigint;
  amount: bigint;
  timestamp: bigint;
  paid: boolean;
}

export interface RawValidation {
  proofHash: string;
  researcher: string;
  validator: string;
  outcome: bigint;
  severity: bigint;
  timestamp: bigint;
  exists: boolean;
}
