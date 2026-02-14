import { ethers, Contract, ContractTransactionResponse } from 'ethers';
import { getSigner, contractAddresses } from '../config.js';
import ValidationRegistryABI from '../abis/ValidationRegistry.json' with { type: 'json' };
import { createLogger } from '../../lib/logger.js';

const log = createLogger('ValidationRegistry');

interface RawOnChainValidation {
    validationId: string;
    protocolId: string;
    findingId: string;
    validatorAgent: string;
    outcome: bigint;
    severity: bigint;
    vulnerabilityType: string;
    executionLog: string;
    proofHash: string;
    timestamp: bigint;
    exists: boolean;
}

export interface ValidationRecordResult {
  validationId: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface OnChainValidation {
  validationId: string;
  protocolId: string;
  findingId: string;
  validatorAgent: string;
  outcome: number;
  severity: number;
  vulnerabilityType: string;
  executionLog: string;
  proofHash: string;
  timestamp: bigint;
  exists: boolean;
}

export enum ValidationOutcome {
  CONFIRMED = 0,
  REJECTED = 1,
  INCONCLUSIVE = 2,
}

export enum Severity {
  CRITICAL = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  INFORMATIONAL = 4,
}

/**
 * Client for interacting with the ValidationRegistry smart contract
 */
export class ValidationRegistryClient {
  private contract: Contract;
  private signer: ethers.Wallet;

  constructor() {
    if (!contractAddresses.validationRegistry) {
      throw new Error('VALIDATION_REGISTRY_ADDRESS not set in environment');
    }

    this.signer = getSigner();
    this.contract = new Contract(
      contractAddresses.validationRegistry,
      ValidationRegistryABI.abi,
      this.signer
    );
  }

  /**
   * Record a validation result on-chain
   */
  async recordValidation(
    protocolId: string,
    findingId: string,
    vulnerabilityType: string,
    severity: Severity,
    outcome: ValidationOutcome,
    executionLog: string,
    proofHash: string
  ): Promise<ValidationRecordResult> {
    try {
      log.info('Recording validation...');
      log.debug(`Protocol ID: ${protocolId}`);
      log.debug(`Finding ID: ${findingId}`);
      log.debug(`Severity: ${Severity[severity]}`);
      log.debug(`Outcome: ${ValidationOutcome[outcome]}`);

      // Call the contract
      const tx: ContractTransactionResponse = await this.contract.recordValidation(
        protocolId,
        findingId,
        vulnerabilityType,
        severity,
        outcome,
        executionLog,
        proofHash
      );

      log.info(`Transaction sent: ${tx.hash}`);
      log.debug('Waiting for confirmation...');

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }

      log.info(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Parse the ValidationRecorded event to get validationId
      const event = receipt.logs.find((log) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'ValidationRecorded';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('ValidationRecorded event not found in transaction receipt');
      }

      const parsedEvent = this.contract.interface.parseLog(event);
      if (!parsedEvent) {
        throw new Error('Failed to parse ValidationRecorded event');
      }

      const validationId = parsedEvent.args.validationId;

      log.info('Validation recorded successfully!');
      log.debug(`Validation ID: ${validationId}`);
      log.debug(`TX Hash: ${receipt.hash}`);
      log.debug(`Block: ${receipt.blockNumber}`);

      // Get block timestamp
      const block = await this.signer.provider!.getBlock(receipt.blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      return {
        validationId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp,
      };
    } catch (error) {
      log.error('Validation recording failed:', error);

      // Parse revert reason if available
      const errObj = error as { data?: string; message?: string };
      if (errObj.data) {
        try {
          const decodedError = this.contract.interface.parseError(errObj.data);
          log.error(`Revert reason: ${decodedError?.name}`);
        } catch {
          // Ignore parsing errors
        }
      }

      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to record validation: ${msg}`);
    }
  }

  /**
   * Get validation details from on-chain
   */
  async getValidation(validationId: string): Promise<OnChainValidation> {
    try {
      const validation = await this.contract.getValidation(validationId);

      return {
        validationId: validation.validationId,
        protocolId: validation.protocolId,
        findingId: validation.findingId,
        validatorAgent: validation.validatorAgent,
        outcome: Number(validation.outcome),
        severity: Number(validation.severity),
        vulnerabilityType: validation.vulnerabilityType,
        executionLog: validation.executionLog,
        proofHash: validation.proofHash,
        timestamp: validation.timestamp,
        exists: validation.exists,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get validation: ${msg}`);
    }
  }

  /**
   * Get all validations for a protocol
   */
  async getProtocolValidations(protocolId: string): Promise<OnChainValidation[]> {
    try {
      const validations = await this.contract.getProtocolValidations(protocolId);

      return validations.map((v: RawOnChainValidation) => ({
        validationId: v.validationId,
        protocolId: v.protocolId,
        findingId: v.findingId,
        validatorAgent: v.validatorAgent,
        outcome: Number(v.outcome),
        severity: Number(v.severity),
        vulnerabilityType: v.vulnerabilityType,
        executionLog: v.executionLog,
        proofHash: v.proofHash,
        timestamp: v.timestamp,
        exists: v.exists,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get protocol validations: ${msg}`);
    }
  }

  /**
   * Get validation by finding ID
   */
  async getValidationByFinding(findingId: string): Promise<OnChainValidation> {
    try {
      const validation = await this.contract.getValidationByFinding(findingId);

      return {
        validationId: validation.validationId,
        protocolId: validation.protocolId,
        findingId: validation.findingId,
        validatorAgent: validation.validatorAgent,
        outcome: Number(validation.outcome),
        severity: Number(validation.severity),
        vulnerabilityType: validation.vulnerabilityType,
        executionLog: validation.executionLog,
        proofHash: validation.proofHash,
        timestamp: validation.timestamp,
        exists: validation.exists,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get validation by finding: ${msg}`);
    }
  }

  /**
   * Check if a finding has been validated
   */
  async isFindingValidated(findingId: string): Promise<boolean> {
    try {
      return await this.contract.isFindingValidated(findingId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check finding validation: ${msg}`);
    }
  }

  /**
   * Get confirmed validations for a protocol
   */
  async getConfirmedValidations(protocolId: string): Promise<OnChainValidation[]> {
    try {
      const validations = await this.contract.getConfirmedValidations(protocolId);

      return validations.map((v: RawOnChainValidation) => ({
        validationId: v.validationId,
        protocolId: v.protocolId,
        findingId: v.findingId,
        validatorAgent: v.validatorAgent,
        outcome: Number(v.outcome),
        severity: Number(v.severity),
        vulnerabilityType: v.vulnerabilityType,
        executionLog: v.executionLog,
        proofHash: v.proofHash,
        timestamp: v.timestamp,
        exists: v.exists,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get confirmed validations: ${msg}`);
    }
  }

  /**
   * Get total validation count
   */
  async getTotalValidationCount(): Promise<number> {
    try {
      const count = await this.contract.getTotalValidationCount();
      return Number(count);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get validation count: ${msg}`);
    }
  }

  /**
   * Check if an address has validator role
   */
  async isValidator(address: string): Promise<boolean> {
    try {
      return await this.contract.isValidator(address);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check validator role: ${msg}`);
    }
  }

  /**
   * Get the contract instance (for advanced usage)
   */
  getContract(): Contract {
    return this.contract;
  }

  /**
   * Get the contract address
   */
  getAddress(): string {
    return contractAddresses.validationRegistry;
  }
}

export default ValidationRegistryClient;
