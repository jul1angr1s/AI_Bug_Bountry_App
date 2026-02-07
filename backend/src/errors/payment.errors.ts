import { NotFoundError, ValidationError } from './CustomError.js';

export class PaymentNotFoundError extends NotFoundError {
  constructor(paymentId: string) {
    super('Payment', paymentId);
  }
}

export class InsufficientFundsError extends ValidationError {
  constructor(required: number, available: number) {
    super(`Insufficient funds. Required: ${required} USDC, Available: ${available} USDC`);
  }
}

export class PaymentProcessingError extends Error {
  constructor(paymentId: string, reason: string) {
    super(`Payment ${paymentId} processing failed: ${reason}`);
    this.name = 'PaymentProcessingError';
  }
}

export class PaymentReconciliationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentReconciliationError';
  }
}
