# Code Quality Improvement

## Problem Statement

The codebase has systematic type safety gaps and technical debt that compromise maintainability, runtime safety, and developer productivity:

### 1. 152 `any` Types Across 37 Files

Concentrated in the most critical parts of the system:

| File | Count | Risk Area |
|------|-------|-----------|
| payment.service.ts | 21 | Financial transactions |
| BountyPoolClient.ts | 18 | Blockchain contract calls |
| event-listener.service.ts | 12 | Blockchain event handling |
| reconciliation.service.ts | 11 | Payment reconciliation |
| ValidationRegistryClient.ts | 11 | On-chain validation |
| Remaining 32 files | 79 | Various |

These create runtime type safety blind spots in code that handles USDC payments and blockchain interactions.

### 2. Scattered Error Classes

Error classes are defined in two locations:
- `backend/src/errors/CustomError.ts`: Base classes (CustomError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError)
- `backend/src/services/payment.service.ts`: Payment-specific errors (PaymentNotFoundError, ValidationNotFoundError, VulnerabilityNotFoundError, InsufficientFundsError)

No centralized error hierarchy for blockchain errors, protocol errors, or agent errors.

### 3. 18 TODO Comments in Production Code

Critical unfulfilled TODOs include:
- "TODO: Implement actual encryption" (3 instances in proof generation/validation)
- "TODO: Load from secure key management" (crypto/proofEncryption.ts)
- "TODO: Add admin authorization check" (2 instances)
- "TODO: Implement signature verification" (decrypt.ts)
- "TODO: Restart all listeners" (event-listener.service.ts)
- "TODO: dynamic agent ID" (validator worker)

### 4. Code Duplication

- Identical `getPrismaClient()` calls in every service
- Repeated `catch (error: any) { console.error(...); throw error; }` pattern
- Similar `const where: any = {}` query construction in 4+ functions
- Duplicate Redis connection patterns

## Proposed Solution

1. **Centralized error hierarchy** in `backend/src/errors/` with payment, blockchain, validation, and protocol error classes
2. **Systematic `any` elimination** - priority-based replacement starting with payment/blockchain critical paths
3. **Utility extraction** - error handler, query builder, database utilities
4. **TODO-to-Issue migration** - 18 TODOs converted to trackable GitHub Issues
5. **ESLint enforcement** - `@typescript-eslint/no-explicit-any: error` prevents regression

## Benefits

- **Zero runtime type surprises** in payment processing
- **Faster development** via IDE autocomplete and type inference
- **Safer refactoring** with compile-time guarantees
- **Trackable debt** via GitHub Issues instead of inline comments
- **Prevented regression** via ESLint enforcement

## Success Criteria

- [ ] Zero `any` types in backend/src/ (152 -> 0)
- [ ] Zero TODO comments in production code (18 -> 0)
- [ ] All error classes centralized in `backend/src/errors/`
- [ ] ESLint rule `@typescript-eslint/no-explicit-any: error` passes
- [ ] All tests pass with new types (no runtime behavior changes)

## Impact

Code Quality score: 3.5 -> 4.5

## PR Strategy

Single PR: `spec/code-quality-improvement` -> `main`
Estimated size: ~600 lines (spec files only)
