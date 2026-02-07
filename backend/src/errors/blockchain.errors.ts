export class ContractCallError extends Error {
  constructor(method: string, reason: string) {
    super(`Contract call ${method} failed: ${reason}`);
    this.name = 'ContractCallError';
  }
}

export class TransactionFailedError extends Error {
  constructor(txHash: string, reason: string) {
    super(`Transaction ${txHash} failed: ${reason}`);
    this.name = 'TransactionFailedError';
  }
}

export class EventParsingError extends Error {
  constructor(eventName: string, reason: string) {
    super(`Failed to parse event ${eventName}: ${reason}`);
    this.name = 'EventParsingError';
  }
}

export class InsufficientGasError extends Error {
  constructor(required: string, available: string) {
    super(`Insufficient gas. Required: ${required}, Available: ${available}`);
    this.name = 'InsufficientGasError';
  }
}
