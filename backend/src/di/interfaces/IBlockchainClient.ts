import type { BountySeverity } from '../../blockchain/contracts/BountyPoolClient.js';

export interface BountyReleaseResult {
  txHash: string;
  bountyId: string;
  blockNumber: number;
  timestamp: number;
}

export interface OnChainBounty {
  bountyId: string;
  protocolId: string;
  researcher: string;
  severity: number;
  amount: number;
  timestamp: number;
  paid: boolean;
}

export interface IBountyPoolClient {
  depositBounty(protocolId: string, amountUsdc: number): Promise<string>;
  releaseBounty(
    protocolId: string,
    validationId: string,
    researcherAddress: string,
    severity: BountySeverity
  ): Promise<BountyReleaseResult>;
  calculateBountyAmount(severity: BountySeverity): Promise<number>;
  getProtocolBalance(protocolId: string): Promise<number>;
  getBounty(bountyId: string): Promise<OnChainBounty>;
  getProtocolBounties(protocolId: string): Promise<OnChainBounty[]>;
  getResearcherBounties(researcherAddress: string): Promise<OnChainBounty[]>;
  getTotalBountiesPaid(protocolId: string): Promise<number>;
  getResearcherEarnings(researcherAddress: string): Promise<number>;
  getAddress(): string;
}

export interface UnsignedTransaction {
  to: string;
  data: string;
  value?: string;
}

export interface IUSDCClient {
  getAllowance(owner: string, spender: string): Promise<bigint>;
  getBalance(address: string): Promise<bigint>;
  generateApprovalTxData(spender: string, amount: bigint): Promise<UnsignedTransaction>;
  formatUSDC(amount: bigint): string;
  parseUSDC(amount: string): bigint;
  getAddress(): string;
  getDecimals(): number;
}

export interface IValidationRegistryClient {
  getAddress(): string;
}

export interface IProtocolRegistryClient {
  getAddress(): string;
}
