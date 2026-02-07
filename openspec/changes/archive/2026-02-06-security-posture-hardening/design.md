# Security Posture Hardening - Design Document

## Threat Model

### Attack Scenario 1: Authentication Bypass

**Vector:** `DEV_AUTH_BYPASS=true` in production via misconfiguration or environment injection.
**Impact:** Full access to all protected endpoints including admin operations.
**Severity:** CRITICAL - admin.ts bypass has NO NODE_ENV check.

### Attack Scenario 2: CSRF Payment Attack

**Vector:** Malicious website submits payment proposal to authenticated user's session.
**Impact:** Unauthorized payment proposals, fund drainage.
**Severity:** CRITICAL - zero CSRF protection on 11 state-changing endpoints.

### Attack Scenario 3: Double Payment Race Condition

**Vector:** Concurrent payment requests pass initial status checks simultaneously.
**Exploit window:** Between status check (worker.ts:241) and status update (worker.ts:169-174).
**Impact:** Same payment executed twice, doubling fund expenditure.

### Attack Scenario 4: Log Data Exfiltration

**Vector:** Compromised log aggregation reveals API keys, user emails, payment details.
**Impact:** Credential compromise, PII exposure.

---

## 1. Remove DEV_AUTH_BYPASS

### Current State

**auth.ts (lines 17-28):**
```typescript
if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
  req.user = { id: 'dev-user-123', email: 'dev@example.com', ... } as any;
  return next();
}
```

**admin.ts (lines 6-9) - MORE DANGEROUS:**
```typescript
if (process.env.DEV_AUTH_BYPASS === 'true') {  // No NODE_ENV check!
  return next();
}
```

**sse-auth.ts (lines 26-40):**
```typescript
if (process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV === 'development') {
  req.user = { id: 'dev-user-123', ... } as any;
  return next();
}
```

### Target State

**auth.ts:** Remove bypass block entirely. Authentication always validates Supabase token.

**admin.ts:** Remove bypass block entirely. Admin check always validates role.

**sse-auth.ts:** Remove bypass block entirely.

**Compile-time guard (new file: `backend/src/config/security.ts`):**
```typescript
if (process.env.DEV_AUTH_BYPASS) {
  throw new Error(
    'FATAL: DEV_AUTH_BYPASS environment variable detected. ' +
    'This variable is no longer supported. Remove it from your environment.'
  );
}
```

Import this file in `backend/src/server.ts` before any middleware registration.

---

## 2. CSRF Protection

### Implementation: Double-Submit Cookie Pattern

**New file: `backend/src/middleware/csrf.ts`**

```typescript
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function setCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (process.env.NODE_ENV === 'test') return next();

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: { code: 'CSRF_MISSING', message: 'CSRF token required' } });
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)) {
    res.status(403).json({ error: { code: 'CSRF_MISMATCH', message: 'CSRF token invalid' } });
    return;
  }

  next();
}

export function getCsrfTokenEndpoint(req: Request, res: Response): void {
  const token = req.cookies[CSRF_COOKIE_NAME] || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
}
```

### Server Integration

**Modify `backend/src/server.ts`:**
```typescript
import { setCsrfCookie, verifyCsrfToken, getCsrfTokenEndpoint } from './middleware/csrf.js';

app.use(setCsrfCookie);
app.get('/api/v1/csrf-token', getCsrfTokenEndpoint);
app.use('/api/v1/protocols', verifyCsrfToken);
app.use('/api/v1/payments', verifyCsrfToken);
app.use('/api/v1/funding', verifyCsrfToken);
```

### Frontend Integration

**New file: `frontend/src/lib/csrf.ts`:**
```typescript
let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await fetch('/api/v1/csrf-token', { credentials: 'include' });
  const data = await res.json();
  cachedToken = data.csrfToken;
  return cachedToken!;
}

export function clearCsrfToken(): void {
  cachedToken = null;
}
```

Update `frontend/src/lib/api.ts` to include CSRF token in POST/PUT/DELETE requests.

---

## 3. Payment Race Condition Fix

### Current Vulnerable Pattern

```typescript
// worker.ts - Check-then-act with concurrency: 5
const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
if (payment.status === 'COMPLETED') return null;  // Race window here
// ... later ...
await prisma.payment.update({ where: { id: paymentId }, data: { status: 'PROCESSING' } });
```

### Fixed Implementation: Atomic Database Locking

```typescript
// Atomic status transition - only one worker succeeds
const result = await prisma.payment.updateMany({
  where: {
    id: paymentId,
    status: 'PENDING',  // Only update if still PENDING
  },
  data: {
    status: 'PROCESSING',
    processedAt: new Date(),
  },
});

if (result.count === 0) {
  // Another worker already claimed this payment
  return;
}
```

### Idempotency Keys

**Schema addition (`backend/prisma/schema.prisma`):**
```prisma
model Payment {
  // ... existing fields ...
  idempotencyKey  String?   @unique
  processedAt     DateTime?

  @@index([idempotencyKey])
  @@index([status, processedAt])
}
```

**Deduplication in payment creation:**
```typescript
if (data.idempotencyKey) {
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: data.idempotencyKey },
  });
  if (existing) return existing;  // Return existing payment, don't create duplicate
}
```

---

## 4. Secrets Management Architecture

**New file: `backend/src/lib/secrets.ts`**

Abstract secrets retrieval to support both local development (env vars) and production (AWS Secrets Manager, Vault, etc.) without modifying `.env` files.

```typescript
interface SecretsProvider {
  getSecret(name: string): Promise<string>;
}

class EnvSecretsProvider implements SecretsProvider {
  async getSecret(name: string): Promise<string> {
    const value = process.env[name];
    if (!value) throw new Error(`Secret ${name} not found in environment`);
    return value;
  }
}

// Production: swap in AWS Secrets Manager, HashiCorp Vault, etc.
export function createSecretsProvider(): SecretsProvider {
  return new EnvSecretsProvider();
}
```

---

## 5. Security Headers (Helmet Configuration)

**Enhanced `backend/src/server.ts`:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: [
        "'self'",
        'https://base-sepolia.g.alchemy.com',
        'https://*.supabase.co',
      ],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## 6. Redis-Backed Rate Limiting

Replace in-memory `Map` with Redis-backed store:

```typescript
// backend/src/middleware/rate-limit.ts (modified)
import { getRedisClient } from '../lib/redis.js';

async function checkRateLimit(clientId: string, limit: number, windowSec: number): Promise<boolean> {
  const redis = getRedisClient();
  const key = `rate:${clientId}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return current <= limit;
}
```

---

## 7. Input Validation Hardening

**Body size limit reduction:**
```typescript
app.use(express.json({ limit: '1mb' }));  // Reduced from 10mb
```

**Enhanced Zod schemas with XSS protection:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedString = z.string().transform((val) =>
  DOMPurify.sanitize(val, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
);
```

---

## Cross-Spec Coordination

- **Log sanitization** shares implementation with Backend Architecture spec Phase 4 (Pino structured logging)
- **Payment race condition fix** should be coordinated with Backend Architecture payment service refactoring
- **Secrets management** provides foundation for all services to retrieve credentials safely

## Rollback Strategy

Each fix is independently revertable:
- Auth bypass removal: revert auth.ts, admin.ts, sse-auth.ts
- CSRF: remove middleware from server.ts
- Payment locking: revert worker.ts, rollback prisma migration
- Helmet config: revert to `helmet()` defaults
