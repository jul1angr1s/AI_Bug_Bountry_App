# Security Posture Hardening - Implementation Tasks

## Phase 1: Immediate Fixes - Week 1 (5 days)

### Day 1-2: Secrets Management Architecture

- [x] Create `backend/src/lib/secrets.ts` with SecretsProvider interface
- [x] Implement EnvSecretsProvider for development
- [ ] Document production secrets provider integration (AWS Secrets Manager)
- [x] Create `backend/src/config/security.ts` with startup validation
- [ ] Document key rotation procedures in `docs/SECRETS_ROTATION.md`
- [ ] Update `.env.example` to remove actual secret values (keep variable names)

### Day 3: Remove DEV_AUTH_BYPASS

- [x] Remove bypass block from `backend/src/middleware/auth.ts` (lines 17-28)
- [x] Remove bypass block from `backend/src/middleware/admin.ts` (lines 6-9)
- [x] Remove bypass block from `backend/src/middleware/sse-auth.ts` (lines 26-40)
- [x] Add compile-time guard in `backend/src/config/security.ts`
- [x] Import security.ts in `backend/src/server.ts` before middleware
- [ ] Update test setup to use proper authentication mocking
- [ ] Verify all existing tests pass without bypass

### Day 4: CSRF Protection

- [x] Create `backend/src/middleware/csrf.ts` (double-submit cookie pattern)
- [x] Add `GET /api/v1/csrf-token` endpoint
- [x] Apply `setCsrfCookie` middleware to all requests in server.ts
- [x] Apply `verifyCsrfToken` to `/api/v1/protocols`, `/api/v1/payments`, `/api/v1/funding`
- [x] Create `frontend/src/lib/csrf.ts` with token caching
- [x] Update `frontend/src/lib/api.ts` to include CSRF token in state-changing requests
- [ ] Test: requests without token return 403
- [ ] Test: requests with valid token succeed
- [ ] Test: requests with mismatched token return 403

### Day 5: Payment Race Condition Fix

- [x] Create Prisma migration: add `idempotencyKey` (unique) and `processedAt` to Payment model
- [x] Run `npx prisma generate` to update Prisma client
- [x] Modify `backend/src/agents/payment/worker.ts`: replace findUnique+check with atomic `updateMany`
- [x] Add idempotency key check in payment creation service
- [ ] Add duplicate payment detection by validationId
- [ ] Test: concurrent payment processing (only one succeeds)
- [ ] Test: idempotency key prevents duplicate creation
- [ ] Test: already-processed payments are skipped gracefully

## Phase 2: Security Infrastructure - Week 2 (3 days)

### Day 6-7: Structured Logging with Redaction

- [x] Install pino: `npm install pino pino-pretty` (in backend/)
- [x] Create `backend/src/lib/logger.ts` with Pino configuration
- [x] Configure redaction paths: `*.privateKey`, `*.apiKey`, `*.secret`, `*.password`, `*.token`
- [x] Add correlation ID middleware via AsyncLocalStorage
- [x] Replace console.log in `backend/src/middleware/auth.ts` with logger (bypass removed, no logs remain)
- [x] Replace console.log in `backend/src/middleware/admin.ts` with logger (bypass removed, no logs remain)
- [x] Replace console.log in `backend/src/middleware/sse-auth.ts` with logger
- [x] Replace console.log in `backend/src/middleware/errorHandler.ts` with logger
- [ ] Verify: `grep -r "console\." backend/src/middleware/` returns zero matches
- [ ] *Note: Full console.log replacement coordinated with Backend Architecture spec*

### Day 8: Database Security Documentation

- [ ] Document SSL connection string configuration in `docs/DATABASE_SECURITY.md`
- [ ] Document strong credential requirements (32+ chars, rotation schedule)
- [ ] Document Redis authentication best practices
- [ ] Add SSL connection example to `.env.example` (commented)

## Phase 3: Enhanced Protection - Week 3 (2 days)

### Day 9: Rate Limiting + Input Validation

- [x] Replace in-memory Map in `backend/src/middleware/rate-limit.ts` with Redis-backed store
- [ ] Verify rate limits persist across server restarts
- [x] Reduce body size limit from 10mb to 1mb in `backend/src/server.ts`
- [ ] Install `isomorphic-dompurify`: `npm install isomorphic-dompurify`
- [ ] Add HTML sanitization to string inputs in Zod schemas
- [ ] Add stricter regex validation for Ethereum addresses, URLs, file paths
- [ ] Test: rate limiting works across multiple requests
- [ ] Test: oversized requests are rejected

### Day 10: Security Headers + Checklist

- [x] Configure Helmet with custom CSP directives in `backend/src/server.ts`
- [x] Add HSTS with 1-year max-age, includeSubDomains, preload
- [ ] Add Permissions-Policy: geolocation=(), microphone=(), camera=()
- [ ] Create `docs/SECURITY_CHECKLIST.md` with OWASP Top 10 verification steps
- [ ] Test: response headers include CSP, HSTS, X-Frame-Options
- [ ] Test: CSP does not block legitimate frontend resources

## Critical Files to Modify

| File | Change |
|------|--------|
| `backend/src/middleware/auth.ts` | Remove DEV_AUTH_BYPASS block |
| `backend/src/middleware/admin.ts` | Remove DEV_AUTH_BYPASS block (no NODE_ENV check) |
| `backend/src/middleware/sse-auth.ts` | Remove DEV_AUTH_BYPASS block |
| `backend/src/middleware/csrf.ts` | **New file** - CSRF middleware |
| `backend/src/config/security.ts` | **New file** - compile-time guard |
| `backend/src/lib/secrets.ts` | **New file** - secrets abstraction |
| `backend/src/lib/logger.ts` | **New file** - Pino structured logging |
| `backend/src/agents/payment/worker.ts` | Atomic locking, idempotency |
| `backend/src/server.ts` | CSRF, Helmet CSP, body limit, security import |
| `backend/src/middleware/rate-limit.ts` | Redis-backed storage |
| `backend/prisma/schema.prisma` | Add idempotencyKey field |
| `frontend/src/lib/csrf.ts` | **New file** - CSRF token client |
| `frontend/src/lib/api.ts` | Include CSRF token in requests |

## Dependencies

- **MUST execute before** all other specs - security blocks production
- Log sanitization shares work with Backend Architecture spec Phase 4
- Payment race condition fix should coordinate with Backend Architecture payment refactoring
