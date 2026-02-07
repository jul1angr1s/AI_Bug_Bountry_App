# Code Quality Improvement - Design Document

## 1. Centralized Error Hierarchy

### Current State

**`backend/src/errors/CustomError.ts`** - Base classes:
- CustomError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError

**`backend/src/services/payment.service.ts`** - Scattered payment errors:
- PaymentNotFoundError, ValidationNotFoundError, VulnerabilityNotFoundError, InsufficientFundsError

### Target: `backend/src/errors/` Directory

```
backend/src/errors/
├── CustomError.ts              # Existing base classes (unchanged)
├── payment.errors.ts           # New: payment-specific errors
├── blockchain.errors.ts        # New: blockchain interaction errors
├── protocol.errors.ts          # New: protocol operation errors
├── validation.errors.ts        # New: validation/proof errors
└── index.ts                    # Barrel export
```

### Error Class Definitions

**`payment.errors.ts`:**
```typescript
import { NotFoundError, ValidationError, CustomError } from './CustomError.js';

export class PaymentNotFoundError extends NotFoundError {
  constructor(paymentId: string) { super('Payment', paymentId); }
}

export class InsufficientFundsError extends ValidationError {
  constructor(public required: number, public available: number) {
    super(`Insufficient funds. Required: ${required} USDC, Available: ${available} USDC`);
  }
}

export class PaymentProcessingError extends CustomError {
  constructor(message: string, public paymentId: string, public cause?: Error) {
    super(message);
  }
}

export class PaymentReconciliationError extends CustomError {
  constructor(message: string, public discrepancyId?: string) {
    super(message);
  }
}
```

**`blockchain.errors.ts`:**
```typescript
export class ContractCallError extends CustomError {
  constructor(message: string, public contractAddress: string, public method: string) {
    super(message);
  }
}

export class TransactionFailedError extends CustomError {
  constructor(message: string, public txHash?: string, public reason?: string) {
    super(message);
  }
}

export class EventParsingError extends CustomError {
  constructor(message: string, public eventName: string) {
    super(message);
  }
}

export class InsufficientGasError extends CustomError {
  constructor(public estimatedGas: bigint, public availableBalance: bigint) {
    super(`Insufficient gas. Estimated: ${estimatedGas}, Available: ${availableBalance}`);
  }
}
```

**`protocol.errors.ts`:**
```typescript
export class ProtocolNotFoundError extends NotFoundError {
  constructor(protocolId: string) { super('Protocol', protocolId); }
}

export class CompilationError extends CustomError {
  constructor(message: string, public contractPath: string) { super(message); }
}
```

**`validation.errors.ts`:**
```typescript
export class ValidationNotFoundError extends NotFoundError {
  constructor(validationId: string) { super('Validation', validationId); }
}

export class VulnerabilityNotFoundError extends NotFoundError {
  constructor(vulnerabilityId: string) { super('Vulnerability', vulnerabilityId); }
}

export class ProofValidationError extends CustomError {
  constructor(message: string, public proofId?: string) { super(message); }
}
```

### Migration Pattern

Move error classes from payment.service.ts to errors/payment.errors.ts, then update imports in:
- payment.service.ts (or new Payment services)
- payment.controller.ts
- payment.worker.ts

---

## 2. Type Replacement Patterns

### Pattern 1: Error Handling (`catch (error: any)` -> `catch (error: unknown)`)

67 instances across the codebase.

```typescript
// Before
} catch (error: any) {
  console.error('[Service] Error:', error);
  throw new Error(`Failed: ${error.message}`);
}

// After
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Operation failed', { error: err.message, stack: err.stack });
  throw new PaymentProcessingError(`Failed: ${err.message}`, paymentId, err);
}
```

### Pattern 2: Prisma Where Clauses (8 instances)

```typescript
// Before (payment.service.ts lines 428, 498, 569, 847)
const where: any = {};
if (status) where.status = status;

// After
import type { Prisma } from '@prisma/client';
const where: Prisma.PaymentWhereInput = {
  ...(protocolId && { vulnerability: { protocolId } }),
  ...(status && { status }),
  ...(startDate || endDate ? {
    paidAt: {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    },
  } : {}),
};
```

### Pattern 3: ethers.js Event Logs (18 instances in BountyPoolClient)

```typescript
// Before
const event = receipt.logs.find((log: any) => {
  const parsed = this.contract.interface.parseLog(log);
  return parsed?.name === 'BountyReleased';
});

// After
import type { EventLog, Log } from 'ethers';

const event = receipt.logs.find((log): log is EventLog => {
  if (!('topics' in log)) return false;
  try {
    const parsed = this.contract.interface.parseLog(log as Log);
    return parsed?.name === 'BountyReleased';
  } catch { return false; }
});
```

### Pattern 4: Contract Return Types (15 instances)

```typescript
// Before
return bounties.map((b: any) => ({...}));

// After
interface RawBounty {
  bountyId: string;
  protocolId: string;
  researcher: string;
  severity: bigint;
  amount: bigint;
  timestamp: bigint;
  paid: boolean;
}
return bounties.map((b: RawBounty): OnChainBounty => ({
  bountyId: b.bountyId,
  protocolId: b.protocolId,
  researcher: b.researcher,
  severity: Number(b.severity),
  amount: b.amount,
  timestamp: b.timestamp,
  paid: b.paid,
}));
```

### Priority Order

| Priority | Files | Instances | Reason |
|----------|-------|-----------|--------|
| P0 | BountyPoolClient.ts | 18 | Financial safety |
| P0 | payment.service.ts | 21 | Core business logic |
| P1 | reconciliation.service.ts | 11 | Data integrity |
| P1 | event-listener.service.ts | 12 | Event handling |
| P1 | ValidationRegistryClient.ts | 11 | On-chain validation |
| P2 | Remaining 32 files | 79 | Various |

---

## 3. Code Deduplication

### Error Handler Utility

```typescript
// backend/src/utils/error-handler.ts
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
```

### Query Builder Utility

```typescript
// backend/src/utils/query-builder.ts
import type { Prisma } from '@prisma/client';

export function buildDateRangeFilter(
  startDate?: Date, endDate?: Date
): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate && { gte: startDate }),
    ...(endDate && { lte: endDate }),
  };
}

export function buildPaymentWhereClause(filters: {
  protocolId?: string; status?: string; startDate?: Date; endDate?: Date;
}): Prisma.PaymentWhereInput {
  return {
    ...(filters.protocolId && { vulnerability: { protocolId: filters.protocolId } }),
    ...(filters.status && { status: filters.status }),
    ...(filters.startDate || filters.endDate
      ? { paidAt: buildDateRangeFilter(filters.startDate, filters.endDate) }
      : {}),
  };
}
```

---

## 4. TODO-to-Issue Migration

### Inventory of TODOs (18 total)

**Security-Critical (create GitHub Issues with `security` label):**
1. `agents/researcher/steps/proof-generation.ts:140` - "Implement actual encryption"
2. `agents/researcher/steps/proof-generation.ts:144` - "Implement actual signature"
3. `agents/researcher/crypto/proofEncryption.ts:10` - "Load from secure key management"
4. `agents/validator/steps/decrypt.ts:68` - "Implement actual decryption"
5. `agents/validator/steps/decrypt.ts:160` - "Implement signature verification"

**Feature/Enhancement (label: `enhancement`):**
6. `services/event-listener.service.ts:399` - "Restart all listeners"
7. `services/payment.service.ts:1178` - "Add getPoolBalance method"
8. `agents/validator/worker.ts:228` - "dynamic agent ID"
9. `routes/admin.ts:43` - "Implement actual knowledge base rebuild logic"

**Authorization (label: `security`, `authorization`):**
10. `routes/payment.routes.ts:497` - "Add admin role check here"
11. `controllers/payment.controller.ts:199` - "Add admin authorization check"

**Technical Debt (label: `tech-debt`):**
12-18. Remaining TODOs for metrics tracking, schema changes, etc.

### Migration Process

For each TODO:
1. Create GitHub Issue with title, description, file location, and labels
2. Replace inline TODO with issue reference: `// See GitHub Issue #NNN`
3. Group related TODOs into single issues where appropriate

---

## 5. ESLint Enforcement

### Configuration

```json
// backend/.eslintrc.json (add rules)
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn"
  }
}
```

Start with `no-explicit-any: error` immediately. Upgrade unsafe-* rules to `error` after all `any` types are replaced.

### Pre-commit Hook

Add lint check to prevent `any` types from being committed:
```json
// package.json
{
  "scripts": {
    "lint": "eslint src --ext .ts",
    "lint:check-any": "eslint src --ext .ts --rule '{\"@typescript-eslint/no-explicit-any\": \"error\"}'"
  }
}
```

---

## Overlap with Other Specs

- **Backend Architecture spec:** Shares type safety work (Phase 3). Coordinate to avoid duplicate effort. The error hierarchy created here is used by the new DI-based services.
- **Security spec:** Log sanitization removes sensitive data from error messages.
- **Testing spec:** Tests should use proper types from the start, not `any` in mocks.

Execute after Backend Architecture Phase 1 (DI) so new services get proper types from the start. ESLint rule should be added last to avoid blocking other work.
