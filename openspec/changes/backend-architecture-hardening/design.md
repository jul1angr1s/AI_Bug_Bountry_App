# Backend Architecture Hardening - Design Document

## 1. Dependency Injection with tsyringe

### Why tsyringe

- Lightweight: 3.5KB, zero runtime overhead with decorators
- TypeScript-native: better than inversify for TS projects
- Supports singleton, transient, and scoped lifecycles
- Minimal boilerplate vs manual DI

### File Structure

```
backend/src/
├── di/
│   ├── container.ts              # DI container initialization
│   ├── tokens.ts                 # Injection tokens
│   └── interfaces/
│       ├── IPaymentService.ts
│       ├── IBlockchainClient.ts
│       ├── IDatabase.ts
│       └── ILogger.ts
├── services/
│   ├── payment/
│   │   ├── PaymentService.ts
│   │   ├── PaymentStatisticsService.ts
│   │   ├── USDCService.ts
│   │   ├── PaymentProposalService.ts
│   │   └── index.ts             # Barrel export
│   └── ...existing services
└── lib/
    └── logger.ts                 # Pino logger
```

### Container Setup

```typescript
// backend/src/di/container.ts
import { container } from 'tsyringe';

container.registerSingleton('ILogger', PinoLogger);
container.registerSingleton('PrismaClient', PrismaClientProvider);
container.registerSingleton('IBountyPoolClient', BountyPoolClient);
container.registerSingleton('IUSDCClient', USDCClient);
container.registerSingleton('IValidationRegistryClient', ValidationRegistryClient);
container.registerSingleton(PaymentService);
container.registerSingleton(PaymentStatisticsService);
container.registerSingleton(USDCService);
container.registerSingleton(PaymentProposalService);
```

### Interface Pattern

```typescript
// di/interfaces/IBlockchainClient.ts
export interface IBountyPoolClient {
  releaseBounty(protocolId: string, validationId: string,
    researcherAddress: string, severity: BountySeverity): Promise<BountyReleaseResult>;
  getProtocolBalance(protocolId: string): Promise<number>;
  depositBounty(protocolId: string, amount: number): Promise<DepositResult>;
}
```

### Service Pattern

```typescript
// services/payment/PaymentService.ts
import { injectable, inject } from 'tsyringe';

@injectable()
export class PaymentService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('IBountyPoolClient') private bountyPool: IBountyPoolClient,
    @inject('IValidationRegistryClient') private validation: IValidationRegistryClient,
    @inject('ILogger') private logger: ILogger
  ) {}

  async processPayment(paymentId: string): Promise<PaymentWithDetails> {
    this.logger.info('Processing payment', { paymentId });
    // ...
  }
}
```

### Test Container

```typescript
// __tests__/testContainer.ts
export function createTestContainer() {
  const testContainer = container.createChildContainer();
  testContainer.registerInstance('PrismaClient', createMockPrisma());
  testContainer.registerInstance('IBountyPoolClient', createMockBountyPool());
  testContainer.registerInstance('ILogger', createMockLogger());
  return testContainer;
}
```

---

## 2. Payment Service Decomposition

### Current: 1 file, 1,393 lines, 19 public functions

### Target: 4 files, ~250-400 lines each

**PaymentService.ts (~400 lines):**
- `createPaymentFromValidation(validationId)` - lines 149-260
- `processPayment(paymentId)` - lines 261-385
- `getPaymentById(paymentId)` - lines 390-420
- `getPaymentsByProtocol(protocolId, filters)` - lines 421-490
- `getPaymentsByResearcher(address, query)` - lines 491-562

**PaymentStatisticsService.ts (~300 lines):**
- `getPaymentStats(filters)` - lines 563-710
- `getResearcherEarnings(query)` - lines 976-1073
- `getEarningsLeaderboard(query)` - lines 1074-1149

**USDCService.ts (~200 lines):**
- `getUsdcAllowance(owner, spender)` - lines 711-742
- `getUsdcBalance(address)` - lines 743-776
- `generateApprovalTransaction(params)` - lines 777-820

**PaymentProposalService.ts (~250 lines):**
- `getPoolStatus(protocolId)` - lines 1150-1262
- `proposeManualPayment(data)` - lines 1263-1393

### Migration Strategy

1. Create new services with DI
2. Copy methods from payment.service.ts to new services
3. Update route handlers to resolve services from DI container
4. Update payment.worker.ts to use new PaymentService
5. Write tests for each new service
6. Delete old payment.service.ts
7. Create barrel export in `services/payment/index.ts`

### Shared Types

Move existing interfaces from payment.service.ts to dedicated types file:
- `PaymentWithDetails`, `PaginationMetadata`, `PaymentFilters`
- `ResearcherEarnings`, `PaymentStatistics`
- `UsdcAllowanceResult`, `UsdcBalanceResult`, `ApprovalTransactionResult`
- `PaymentListResult`, `LeaderboardResult`, `PoolStatusResult`

---

## 3. Type Safety Strategy

### Pattern 1: Error Handling (67 instances)

```typescript
// Before
} catch (error: any) {
  console.error('[PaymentService] Error:', error);
  throw error;
}

// After
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  this.logger.error('Payment processing failed', {
    error: err.message,
    stack: err.stack,
    paymentId,
  });
  throw err;
}
```

### Pattern 2: Prisma Where Clauses (8 instances)

```typescript
// Before (payment.service.ts:428, 498, 569, 847)
const where: any = {};

// After
import type { Prisma } from '@prisma/client';
const where: Prisma.PaymentWhereInput = {
  ...(protocolId && { vulnerability: { protocolId } }),
  ...(status && { status }),
  ...(startDate && { paidAt: { gte: startDate } }),
};
```

### Pattern 3: ethers.js Responses (30+ instances in blockchain clients)

```typescript
// Before (BountyPoolClient.ts:126)
const event = receipt.logs.find((log: any) => { ... });

// After
import type { EventLog } from 'ethers';
const event = receipt.logs.find((log): log is EventLog => {
  if (!('topics' in log)) return false;
  try {
    const parsed = this.contract.interface.parseLog(log);
    return parsed?.name === 'BountyReleased';
  } catch { return false; }
});
```

### Pattern 4: Contract Return Types (15+ instances)

```typescript
// Before (BountyPoolClient.ts:233)
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
return bounties.map((b: RawBounty): OnChainBounty => ({...}));
```

### Priority Order

1. BountyPoolClient.ts (18 instances) - financial safety
2. payment.service.ts (21 instances) - core business logic
3. reconciliation.service.ts (11 instances) - data integrity
4. event-listener.service.ts (12 instances) - event handling
5. Remaining 82 instances across 29 files

---

## 4. Pino Structured Logging

### Configuration

```typescript
// backend/src/lib/logger.ts
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'researcherAddress', 'txHash', 'privateKey', 'apiKey',
      'authorization', '*.researcherAddress', '*.txHash',
    ],
    censor: '[REDACTED]',
  },
  mixin() {
    const correlationId = correlationStorage.getStore();
    return correlationId ? { correlationId } : {};
  },
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
```

### Correlation Middleware

```typescript
// backend/src/middleware/correlation.ts
import { nanoid } from 'nanoid';
import { correlationStorage } from '../lib/logger.js';

export function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] as string || nanoid();
  res.setHeader('X-Correlation-ID', correlationId);
  correlationStorage.run(correlationId, () => next());
}
```

### Log Level Strategy

- **ERROR:** Payment failures, blockchain reverts, database errors
- **WARN:** Pool balance low, retry attempts, demo mode fallback
- **INFO:** Payment completed, protocol registered, scan started
- **DEBUG:** Validation checks, state transitions, cache operations

### console.log Replacement Scope

Replace 919 console statements across 67 files. Services (126 in 11 files) are the priority; remaining files are addressed in coordination with other specs.

---

## Dependencies and Sequencing

```
Phase 1 (DI Infrastructure) - 3 days
    ↓
Phase 2 (Payment Service Refactoring) - 4 days  ← depends on Phase 1
    ↓
Phase 3 (Type Safety) - 4 days  ← can start after Phase 1
Phase 4 (Logging) - 3 days     ← can start after Phase 1
```

Phases 3 and 4 can run in parallel after Phase 1 completes.

## Backward Compatibility

All existing API endpoints maintain the same request/response shapes. Payment worker processes payments identically. Frontend receives the same response structures. No breaking changes to routes.
