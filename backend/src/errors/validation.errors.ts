import { NotFoundError } from './CustomError.js';

export class ValidationNotFoundError extends NotFoundError {
  constructor(validationId: string) {
    super('Validation', validationId);
  }
}

export class VulnerabilityNotFoundError extends NotFoundError {
  constructor(vulnerabilityId: string) {
    super('Vulnerability', vulnerabilityId);
  }
}

export class ProofValidationError extends Error {
  constructor(proofId: string, reason: string) {
    super(`Proof ${proofId} validation failed: ${reason}`);
    this.name = 'ProofValidationError';
  }
}
