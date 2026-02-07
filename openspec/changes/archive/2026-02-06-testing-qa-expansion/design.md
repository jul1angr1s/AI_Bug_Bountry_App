# Testing & QA Expansion - Design Document

## 1. Test Infrastructure

### Backend Mock Helpers

**Test Database (`backend/src/__tests__/helpers/test-database.ts`):**
```typescript
import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient;

export async function setupTestDatabase(): Promise<PrismaClient> {
  process.env.DATABASE_URL = 'file::memory:?cache=shared';
  testPrisma = new PrismaClient();
  return testPrisma;
}

export async function cleanupTestDatabase(): Promise<void> {
  await testPrisma.$disconnect();
}
```

**Test Blockchain (`backend/src/__tests__/helpers/test-blockchain.ts`):**
```typescript
import { vi } from 'vitest';

export function createMockProvider() {
  return {
    getNetwork: vi.fn().mockResolvedValue({ chainId: 84532 }),
    getBlockNumber: vi.fn().mockResolvedValue(12345),
    getTransactionReceipt: vi.fn().mockResolvedValue({ status: 1, hash: '0xabc' }),
  };
}

export function createMockContract() {
  return {
    releaseBounty: vi.fn().mockResolvedValue({
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({ status: 1, logs: [] }),
    }),
    getProtocolBalance: vi.fn().mockResolvedValue(BigInt(1000000)),
    depositBounty: vi.fn().mockResolvedValue({
      hash: '0xdef456',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),
  };
}
```

**Test Redis (`backend/src/__tests__/helpers/test-redis.ts`):**
```typescript
import RedisMock from 'ioredis-mock';

export function createMockRedis() {
  return new RedisMock();
}
```

### Test Fixtures

**Payment Fixtures (`backend/src/__tests__/fixtures/payment.fixtures.ts`):**
```typescript
import { PaymentStatus, Severity } from '@prisma/client';

export const mockPayment = {
  id: 'payment-123',
  vulnerabilityId: 'vuln-123',
  amount: 5.0,
  currency: 'USDC',
  status: 'PENDING' as PaymentStatus,
  txHash: null,
  onChainBountyId: null,
  researcherAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const mockProtocol = {
  id: 'protocol-123',
  authUserId: 'user-123',
  ownerAddress: '0x123...',
  githubUrl: 'https://github.com/test/repo',
  status: 'ACTIVE',
};

export const mockVulnerability = {
  id: 'vuln-123',
  protocolId: 'protocol-123',
  severity: 'HIGH' as Severity,
  status: 'CONFIRMED',
  vulnerabilityHash: '0xhash123',
};
```

### Frontend: Mock Service Worker (MSW)

```typescript
// frontend/src/__tests__/setup/msw-handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/payments', () => {
    return HttpResponse.json({
      payments: [/* mock payments */],
      total: 10, page: 1, limit: 20,
    });
  }),

  http.post('/api/v1/payments/propose', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'payment-new', ...body });
  }),

  http.get('/api/v1/protocols', () => {
    return HttpResponse.json({
      protocols: [/* mock protocols */],
      total: 5,
    });
  }),
];
```

---

## 2. Service Layer Test Strategy

### payment.service.ts (P0 - 50+ test cases)

```typescript
// backend/src/services/__tests__/payment.service.test.ts
describe('PaymentService', () => {
  let mockPrisma: MockPrismaClient;
  let mockBountyPool: MockBountyPoolClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockBountyPool = createMockBountyPool();
  });

  describe('createPaymentFromValidation', () => {
    it('should create payment with correct amount for HIGH severity');
    it('should throw ValidationNotFoundError for invalid validationId');
    it('should prevent duplicate payments for same validation');
    it('should calculate amount based on severity mapping');
  });

  describe('processPayment', () => {
    it('should release bounty and update status to COMPLETED');
    it('should handle insufficient pool balance');
    it('should set status to FAILED on blockchain error');
    it('should increment retryCount on failure');
  });

  describe('getPaymentsByProtocol', () => {
    it('should filter by status');
    it('should paginate results');
    it('should sort by date');
  });
});
```

### protocol.service.ts (P1 - 30+ test cases)

Test registration, duplicate detection, funding state, scan requests.

### escrow.service.ts (P1 - 20+ test cases)

Test deposits, deductions, balance checks, replay attack detection.

---

## 3. Blockchain Client Test Strategy

### BountyPoolClient.ts (P0 - 25+ test cases)

```typescript
// backend/src/blockchain/contracts/__tests__/BountyPoolClient.test.ts
describe('BountyPoolClient', () => {
  let client: BountyPoolClient;
  let mockContract: ReturnType<typeof createMockContract>;

  beforeEach(() => {
    mockContract = createMockContract();
    client = new BountyPoolClient(mockContract);
  });

  describe('releaseBounty', () => {
    it('should call contract with correct parameters');
    it('should return BountyReleaseResult with txHash');
    it('should parse BountyReleased event from logs');
    it('should throw on transaction failure');
    it('should handle gas estimation errors');
  });

  describe('getProtocolBalance', () => {
    it('should return balance in USDC');
    it('should handle zero balance');
  });

  describe('depositBounty', () => {
    it('should convert USDC amount correctly');
    it('should wait for confirmation');
  });
});
```

### Mocking Strategy

Mock ethers.js Contract, Provider, and Signer at the boundary. Each blockchain client receives a mock contract via constructor or DI.

---

## 4. Integration Test Strategy

### Payment Flow Integration

```typescript
// backend/src/__tests__/integration/payment-flow.integration.test.ts
describe('Payment Flow Integration', () => {
  it('should process payment from proposal to on-chain release', async () => {
    // Setup: Create protocol, vulnerability in test DB
    // Act: Create payment, process via worker
    // Assert: Payment status COMPLETED, txHash set
  });

  it('should handle concurrent payment processing safely', async () => {
    // Verify atomic locking prevents double payment
  });

  it('should retry failed payments with exponential backoff');
  it('should fall back to demo mode when pool balance is zero');
});
```

### Test Environment Setup

Integration tests use:
- Test database (SQLite in-memory or Docker PostgreSQL)
- Mock Redis (ioredis-mock)
- Mock blockchain clients (ethers.js mocks)
- Real service layer (Prisma with test DB)

---

## 5. Frontend Component Test Strategy

### PaymentHistory.tsx (P1 - 30+ test cases)

```typescript
// frontend/src/components/Payment/__tests__/PaymentHistory.test.tsx
describe('PaymentHistory', () => {
  it('should render payment list');
  it('should show loading skeleton');
  it('should show empty state when no payments');
  it('should filter by status');
  it('should filter by severity');
  it('should paginate results');
  it('should handle API errors');
});
```

### API Client Tests (P0 - 50+ test cases)

```typescript
// frontend/src/lib/__tests__/api.test.ts
describe('API Client', () => {
  describe('fetchPayments', () => {
    it('should call correct endpoint with params');
    it('should include auth headers');
    it('should handle 401 responses');
    it('should validate response with Zod schema');
  });
  // ... all 23 API functions
});
```

Uses MSW to mock backend responses.

---

## 6. Smart Contract Test Strategy

### AgentIdentityRegistry (P1 - 20+ tests)

```solidity
// backend/contracts/test/unit/AgentIdentityRegistry.t.sol
contract AgentIdentityRegistryTest is Test {
  function test_RegisterAgent() public { ... }
  function testFail_RegisterAgentTwice() public { ... }
  function test_DeactivateAgent() public { ... }
  function test_OnlyAdminCanRegister() public { ... }
}
```

### Fuzz Tests

```solidity
// backend/contracts/test/fuzz/BountyPoolFuzz.t.sol
function testFuzz_DepositBounty(uint256 amount) public {
  amount = bound(amount, 1, 1_000_000 * 10**6);
  pool.depositBounty(protocolId, amount);
  assertEq(pool.getProtocolBalance(protocolId), amount);
}
```

---

## 7. CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  backend-unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npm test -- --coverage
      - uses: codecov/codecov-action@v3

  backend-integration:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    services:
      postgres: { image: postgres:15 }
      redis: { image: redis:7 }
    steps:
      - run: cd backend && npm run test:integration

  smart-contracts:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: foundry-rs/foundry-toolchain@v1
      - run: cd backend/contracts && forge test -vvv

  frontend-unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: cd frontend && npm ci && npm test -- --coverage

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - run: npx playwright install --with-deps
      - run: cd frontend && npm run test:e2e
```

### Coverage Thresholds

**Backend (vitest.config.ts):**
- Lines: 70%, Functions: 70%, Branches: 70%, Statements: 70%

**Frontend (vitest.config.ts):**
- Lines: 70%, Functions: 70%, Branches: 65%, Statements: 70%

**Smart Contracts (foundry.toml):**
- Target: 90%

### Execution Time Targets

- Unit tests: <5 minutes
- Integration tests: <15 minutes
- E2E tests: <20 minutes
- Smart contracts: <2 minutes
- **Total CI: <45 minutes**

---

## Dependencies

- Benefits greatly from Backend Architecture DI (enables proper mocking)
- Frontend component tests should follow Frontend Architecture decomposition
- Blockchain client tests need mock infrastructure before service tests
- Smart contract tests are independent and can start immediately
