# Backend Architecture Hardening

## Problem Statement

The backend has strong foundational architecture (Routes -> Services -> Repositories, BullMQ queues, blockchain integration) but suffers from critical maintainability and testability gaps:

### 1. No Dependency Injection Framework

Services directly instantiate dependencies at module level:
```typescript
const prisma = getPrismaClient();          // Global singleton
const usdcClient = new USDCClient();       // Direct instantiation
const bountyClient = new BountyPoolClient(); // New instance every call
```

**Impact:** Services are completely untestable (cannot inject mocks), tight coupling violates Dependency Inversion, impossible to swap implementations for testing/demo modes.

### 2. God Service: payment.service.ts (1,393 lines)

Mixes 5+ responsibilities: payment processing, USDC operations, statistics/analytics, leaderboards, pool management, and manual proposals. Violates Single Responsibility Principle. Every change impacts too many concerns.

### 3. Type Safety Gaps: 144 `any` Types

Concentrated in critical payment and blockchain code:
- `payment.service.ts`: 21 instances
- `BountyPoolClient.ts`: 18 instances
- `event-listener.service.ts`: 12 instances
- `reconciliation.service.ts`: 11 instances

### 4. Unstructured Logging: 919 console.log Statements

No log levels, no correlation IDs, sensitive data exposed (addresses, amounts), cannot filter/search logs in production, no structured metadata for observability.

## Proposed Solution

1. **tsyringe DI** - Lightweight decorator-based DI (3.5KB, zero runtime overhead)
2. **Payment service split** into 4 focused services (~250-400 lines each)
3. **Systematic `any` elimination** - 144 instances replaced with proper types
4. **Pino structured logging** with correlation IDs and PII redaction

## Benefits

- **Testable architecture** - All services mockable via DI interfaces
- **Maintainable services** - No file exceeds 500 lines
- **Type-safe codebase** - Compile-time guarantees across all services
- **Production observability** - Structured logs with correlation tracing

## Success Criteria

- [ ] 100% of services use DI (zero direct instantiation in services)
- [ ] payment.service.ts deleted, replaced by 4 services each under 500 lines
- [ ] Zero `any` types in backend/src/ (144 -> 0)
- [ ] Zero console.log in services (919 -> 0 in services)
- [ ] Pino logger with correlation IDs and PII redaction
- [ ] 70%+ test coverage for new services
- [ ] All existing API endpoints work unchanged

## Impact

Backend Architecture score: 3.8 -> 4.5

## PR Strategy

Single PR: `spec/backend-architecture-hardening` -> `main`
Estimated size: ~800 lines (spec files only)
