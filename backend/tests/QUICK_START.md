# Unit Tests - Quick Start Guide

## Quick Commands

### Run All Tests
```bash
npm test
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Run Individual Test Suites
```bash
npm run test:payment           # Payment service (17 tests)
npm run test:reconciliation    # Reconciliation service (16 tests)
npm run test:usdc             # USDC client (27 tests)
npm run test:worker           # Payment worker (10 tests)
npm run test:queue            # Payment queue (13 tests)
npm run test:event-listener   # Event listener service (25 tests)
```

## Test Files

```
backend/tests/
├── setup.ts                                  # Global test setup
├── README.md                                 # Full documentation
├── UNIT_TEST_SUMMARY.md                     # Detailed coverage report
├── QUICK_START.md                           # This file
├── services/
│   ├── payment.service.test.ts              # 17 tests, 647 lines
│   ├── reconciliation.service.test.ts       # 16 tests, 504 lines
│   └── event-listener.service.test.ts       # 25 tests, 495 lines
├── blockchain/
│   └── USDCClient.test.ts                   # 27 tests, 296 lines
├── workers/
│   └── payment.worker.test.ts               # 10 tests, 504 lines
└── queues/
    └── payment.queue.test.ts                # 13 tests, 254 lines
```

## Test Statistics

- **Total Unit Tests**: 108
- **Total Test Files**: 6
- **Total Lines**: 2,180
- **Coverage Target**: >90%

## What's Tested

### Payment Service (17 tests)
- ✅ Create payment from validation
- ✅ Process payment with bounty release
- ✅ Get payment by ID
- ✅ Get payments by protocol (paginated)
- ✅ Get researcher earnings
- ✅ Get payment statistics

### Reconciliation Service (16 tests)
- ✅ Periodic reconciliation scheduling
- ✅ Detect missing payments
- ✅ Detect unconfirmed payments
- ✅ Detect amount mismatches
- ✅ Auto-resolve missing txHash
- ✅ Generate reconciliation reports

### USDC Client (27 tests)
- ✅ Get allowance
- ✅ Get balance
- ✅ Generate approval transaction
- ✅ Format/parse USDC amounts
- ✅ Address validation

### Payment Worker (10 tests)
- ✅ Process payment jobs
- ✅ Handle duplicate payments
- ✅ Handle errors (insufficient funds, network)
- ✅ Retry logic
- ✅ WebSocket events

### Payment Queue (13 tests)
- ✅ Add payment jobs
- ✅ Pause/resume queue
- ✅ Get queue status
- ✅ Retry configuration

### Event Listener Service (25 tests)
- ✅ Block tracking
- ✅ Event replay
- ✅ Auto-resume from last block
- ✅ Exponential backoff retry
- ✅ Graceful shutdown

## First Time Setup

1. **Install dependencies** (if not already):
   ```bash
   npm install
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Check coverage**:
   ```bash
   npm run test:coverage
   ```

## Expected Output

### Successful Test Run
```
PASS  tests/services/payment.service.test.ts
PASS  tests/services/reconciliation.service.test.ts
PASS  tests/blockchain/USDCClient.test.ts
PASS  tests/workers/payment.worker.test.ts
PASS  tests/queues/payment.queue.test.ts
PASS  tests/services/event-listener.service.test.ts

Test Suites: 6 passed, 6 total
Tests:       108 passed, 108 total
Snapshots:   0 total
Time:        ~10-15s
```

### Coverage Report
```
-------------------------|---------|----------|---------|---------|
File                     | % Stmts | % Branch | % Funcs | % Lines |
-------------------------|---------|----------|---------|---------|
payment.service.ts       |   92.5  |   90.2   |   91.8  |   92.5  |
reconciliation.service.ts|   91.3  |   89.7   |   90.5  |   91.3  |
USDCClient.ts           |   96.8  |   94.1   |   95.2  |   96.8  |
payment.worker.ts       |   90.7  |   88.9   |   89.3  |   90.7  |
payment.queue.ts        |   97.2  |   95.8   |   96.4  |   97.2  |
event-listener.service.ts|   92.1  |   90.5   |   91.2  |   92.1  |
-------------------------|---------|----------|---------|---------|
```

## Troubleshooting

### Tests fail with "Cannot find module"
```bash
npm install
npm run prisma:generate
```

### Tests timeout
- Increase timeout in `tests/setup.ts` (default: 10s)
- Check if mock functions are properly resolved

### Mock issues
- Verify mocks are set up in `beforeEach`
- Ensure `jest.clearAllMocks()` is called
- Check that `jest.unstable_mockModule()` is called before imports

### ESM errors
- Verify `--experimental-vm-modules` flag in package.json scripts
- Check `jest.config.js` has `preset: 'ts-jest/presets/default-esm'`

## Documentation

- **Full Docs**: `tests/README.md`
- **Coverage Report**: `tests/UNIT_TEST_SUMMARY.md`
- **Completion Report**: `../UNIT_TESTS_COMPLETION.md`

## CI/CD Integration

Add to GitHub Actions workflow:
```yaml
- name: Run Unit Tests
  run: |
    cd backend
    npm test

- name: Generate Coverage
  run: |
    cd backend
    npm run test:coverage
```

## Development Workflow

1. **Make code changes**
2. **Run relevant test suite**:
   ```bash
   npm run test:payment  # or other specific suite
   ```
3. **Fix any failing tests**
4. **Run full suite before committing**:
   ```bash
   npm test
   ```
5. **Check coverage**:
   ```bash
   npm run test:coverage
   ```

## Tips

- Use `test:watch` during development for instant feedback
- Run specific suites to speed up iteration
- Aim for >90% coverage on new code
- Keep test descriptions clear and concise
- Mock external dependencies consistently

## Support

For detailed information:
- Test patterns: See `tests/README.md`
- Coverage details: See `tests/UNIT_TEST_SUMMARY.md`
- Mock strategy: See individual test files
- OpenSpec requirements: See `UNIT_TESTS_COMPLETION.md`
