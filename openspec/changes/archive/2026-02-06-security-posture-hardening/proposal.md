# Security Posture Hardening

## Problem Statement

The AI Bug Bounty Platform has a security score of **2.1/5**, the lowest of all architectural dimensions and the primary blocker for production deployment. The platform handles financial transactions (USDC payments) and private keys for blockchain operations, making security critical.

### Critical Vulnerabilities (8 Production Blockers)

1. **DEV_AUTH_BYPASS enabled** - `backend/src/middleware/auth.ts:17` creates mock user bypassing Supabase authentication. The admin middleware (`backend/src/middleware/admin.ts:6`) has an even more dangerous version that **does not check NODE_ENV**, meaning if the environment variable is set in production, all admin checks are bypassed.

2. **No CSRF protection** - Zero CSRF middleware on any of the 11 state-changing POST/PUT/DELETE endpoints. An attacker can submit payment proposals, register protocols, or trigger scans via cross-site request forgery.

3. **Payment race condition** - `backend/src/agents/payment/worker.ts` uses check-then-act pattern with `concurrency: 5`. No database-level locking or idempotency keys. Two concurrent workers can process the same payment.

4. **Sensitive data in logs** - 919 `console.log` statements across 67 files. API keys logged in test files (`kimi-debug-test.ts:490`), user emails logged (`sse-auth.ts:71`), request bodies sent to Sentry including potential secrets (`errorHandler.ts:110-116`).

5. **Hardcoded Redis password** - `backend/src/lib/redis.ts:11` falls back to `'redis_dev_2024'` default password if environment variable is not set.

6. **Potential XSS in error messages** - `backend/src/middleware/errorHandler.ts:146-165` reflects user-controlled input (protocol IDs, addresses) in error responses without sanitization.

7. **No Content-Security-Policy** - Helmet.js is enabled with defaults only (`server.ts:30`), no custom CSP directives configured for the application's specific needs.

8. **In-memory rate limiting** - `backend/src/middleware/rate-limit.ts` uses JavaScript `Map` for storage. Rate limits reset on server restart and are not shared across instances.

### High Severity Issues (10)

- Admin authorization bypass via DEV_AUTH_BYPASS (no NODE_ENV check)
- No transaction replay protection
- Unbounded gas limits in blockchain operations
- Missing input size limits (10MB body allowed)
- No encryption at rest for database/Redis
- No payment idempotency enforcement
- Insufficient payment amount validation
- No security event logging/monitoring
- No secrets rotation strategy
- Request body logged to Sentry without redaction

## Proposed Solution

Systematic remediation in 3 phases over 2-3 weeks:

1. **Phase 1 (Week 1):** Remove auth bypass, implement CSRF protection, fix payment race condition with atomic database locking + idempotency keys, create secrets management abstraction
2. **Phase 2 (Week 2):** Structured logging with PII redaction (coordinates with Backend Architecture spec), database security documentation, Redis-backed rate limiting
3. **Phase 3 (Week 3):** Enhanced Helmet configuration with CSP, input validation hardening, penetration test checklist

**Critical constraint:** Do NOT modify the `.env` file directly.

## Benefits

- **Unblocks production deployment** - eliminates all 8 critical blockers
- **Financial safety** - payment race condition fix prevents double-payment attacks
- **Compliance ready** - OWASP Top 10 coverage
- **Audit trail** - structured security event logging

## Success Criteria

- [ ] DEV_AUTH_BYPASS code completely removed from auth.ts, admin.ts, sse-auth.ts
- [ ] Compile-time guard prevents reintroduction of auth bypass
- [ ] CSRF tokens required on all state-changing endpoints
- [ ] Payment race condition eliminated (concurrent test passes)
- [ ] Idempotency keys prevent duplicate payments
- [ ] Zero sensitive data in structured logs (verified by grep)
- [ ] Security headers include CSP, HSTS, X-Frame-Options
- [ ] Rate limiting backed by Redis (shared across instances)
- [ ] Security score reaches 4.0/5

## PR Strategy

Single PR: `spec/security-posture-hardening` → `main`
Estimated size: ~900 lines (spec files only)
