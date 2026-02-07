import { NotFoundError } from './CustomError.js';

export class ProtocolNotFoundError extends NotFoundError {
  constructor(protocolId: string) {
    super('Protocol', protocolId);
  }
}

export class CompilationError extends Error {
  constructor(contractName: string, reason: string) {
    super(`Compilation of ${contractName} failed: ${reason}`);
    this.name = 'CompilationError';
  }
}
