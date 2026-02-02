# Design: Backend API Foundation

## Context

The frontend dashboard is complete but non-functional because no backend API exists. The dashboard-api-endpoints change (106 tasks) is blocked awaiting this foundation. This design establishes the Express/Prisma/Socket.io infrastructure needed to support dashboard endpoints, agent orchestration APIs, and real-time updates.

**Current State:**
- Frontend: React + TanStack Query + Zustand (complete)
- Backend: None - no Express server, no API routes, no database connection
- Database: Supabase PostgreSQL exists with schema documentation, but no Prisma implementation
- Authentication: Supabase JWT works on frontend, but no backend validation

**Technical Constraints:**
- Must integrate with existing Supabase Auth (JWT tokens)
- Must connect to existing Supabase PostgreSQL database
- Must support Railway deployment platform
- Must enable real-time WebSocket updates for dashboard
- Frontend already uses TanStack Query expecting RESTful endpoints at `/api/v1`

## Goals / Non-Goals

**Goals:**
- Create production-ready Express API server with TypeScript
- Implement Prisma ORM connected to Supabase PostgreSQL
- Add JWT authentication middleware validating Supabase tokens
- Set up Socket.io for real-time dashboard updates
- Establish RESTful route structure and error handling patterns
- Enable graceful shutdown for database and WebSocket cleanup
- Support dev/staging/production environment configurations

**Non-Goals:**
- Business logic endpoints (protocols, vulnerabilities) - handled in dashboard-api-endpoints change
- Agent task queue implementation - deferred to future agent-orchestration change
- Rate limiting implementation - part of dashboard-api-endpoints
- Redis caching logic - part of dashboard-api-endpoints
- Frontend changes - this is backend-only

## Decisions

### Decision 1: Prisma Client Singleton Pattern

**Choice:** Single Prisma client instance in `backend/src/lib/prisma.ts`, imported everywhere

**Rationale:**
- Prevents connection pool exhaustion (Prisma creates pool per client)
- Supabase free tier has 15 connection limit - must be conservative
- Singleton ensures one pool shared across all request handlers
- Enables centralized connection error handling

**Alternatives Considered:**
- ❌ New `PrismaClient()` in each module → Connection pool explosion
- ❌ Dependency injection → Over-engineering for current scale
- ✅ Singleton with lazy initialization → Simple, safe, testable

**Implementation:**
```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    });
  }
  return prisma;
}
```

### Decision 2: JWT Verification Strategy

**Choice:** Verify Supabase JWT using `@supabase/supabase-js` admin client, attach user to `req.user`

**Rationale:**
- Supabase JWTs are signed with project secret (not RS256 public key)
- Using `supabase.auth.getUser(token)` validates signature and returns user metadata
- Middleware pattern follows Express conventions
- Enables optional authentication (some routes public, others protected)

**Alternatives Considered:**
- ❌ Manual JWT verification with `jsonwebtoken` → Requires managing Supabase secret rotation
- ❌ Supabase RLS only (no middleware) → Loses request-level user context for logging
- ✅ `supabase.auth.getUser()` → Official, handles signature verification and expiry

**Implementation:**
```typescript
// backend/src/middleware/auth.ts
export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(); // Optional auth - let route decide if required

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) throw new UnauthorizedError('Invalid token');

  req.user = user;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  next();
}
```

### Decision 3: Socket.io Room Architecture

**Choice:** Protocol-scoped rooms (`protocol:{protocolId}`) for targeted broadcasting

**Rationale:**
- Dashboard shows data for one protocol at a time
- Clients should only receive updates for the protocol they're viewing
- Prevents unnecessary data transfer and client-side filtering
- Supports future multi-protocol dashboards (users can join multiple rooms)

**Alternatives Considered:**
- ❌ Broadcast all events to all clients → Wasteful, scales poorly
- ❌ User-specific rooms → Doesn't match dashboard's protocol-centric model
- ✅ Protocol rooms → Aligns with frontend state, efficient broadcasting

**Implementation:**
```typescript
// backend/src/websocket/rooms.ts
io.on('connection', (socket) => {
  socket.on('joinProtocol', (protocolId) => {
    socket.leave([...socket.rooms].filter(r => r.startsWith('protocol:')));
    socket.join(`protocol:${protocolId}`);
  });
});

// Emit to protocol room
io.to(`protocol:${protocolId}`).emit('vulnerabilityFound', payload);
```

### Decision 4: Error Handling Architecture

**Choice:** Custom error classes extending `Error`, centralized middleware, HTTP status mapping

**Rationale:**
- Typed errors enable consistent response formatting
- Middleware catches both sync and async errors (using express-async-errors pattern)
- HTTP status codes mapped from error type, not hardcoded in routes
- Production sanitization (hide stack traces) centralized in one place

**Alternatives Considered:**
- ❌ Manual try-catch in every route → Repetitive, inconsistent formatting
- ❌ HTTP-specific errors (like `http-errors` lib) → Couples domain logic to HTTP layer
- ✅ Domain error classes + middleware mapper → Clean separation, testable

**Implementation:**
```typescript
// backend/src/errors/CustomError.ts
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

// backend/src/middleware/errorHandler.ts
export function errorHandler(err, req, res, next) {
  const statusCode = mapErrorToStatus(err);
  const sanitized = sanitizeError(err, req.app.get('env'));

  res.status(statusCode).json({
    error: {
      code: err.name,
      message: sanitized.message,
      requestId: req.id,
      ...(sanitized.details && { details: sanitized.details }),
    },
  });
}
```

### Decision 5: Environment Configuration Management

**Choice:** Zod schema validation, typed config object, fail-fast on startup

**Rationale:**
- Prevents runtime errors from missing/invalid env vars
- Typed config provides autocomplete and type safety
- Fails during initialization (not mid-request)
- Supports defaults for dev environment

**Alternatives Considered:**
- ❌ Raw `process.env` access → No validation, runtime failures
- ❌ Config library (like `config` npm) → Overkill, prefers files over env vars
- ✅ Zod validation → Type-safe, explicit schema, Railway-friendly

**Implementation:**
```typescript
// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  FRONTEND_URL: z.string().url(),
});

export const config = envSchema.parse(process.env);
```

### Decision 6: Graceful Shutdown Handling

**Choice:** SIGTERM/SIGINT handlers with 10s timeout, close server → WebSocket → Prisma

**Rationale:**
- Railway sends SIGTERM 30s before force-kill
- Need time to finish in-flight requests and close connections cleanly
- Order matters: HTTP server first (stop new requests), then WebSocket (disconnect clients), then DB (close pool)
- Prevents "connection lost" errors during deployment

**Alternatives Considered:**
- ❌ No shutdown handling → Connections left open, potential data corruption
- ❌ Immediate `process.exit()` → Cuts off in-flight requests
- ✅ Graceful drain with timeout → Safe, Railway-compatible

**Implementation:**
```typescript
// backend/src/server.ts
async function shutdown(signal: string) {
  console.log(`${signal} received, starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    console.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000);

  server.close(() => {
    io.close(() => {
      prisma.$disconnect().then(() => {
        clearTimeout(timeout);
        process.exit(0);
      });
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Decision 7: Middleware Pipeline Order

**Choice:** helmet → cors → morgan → json → requestId → auth → routes → 404 → errorHandler

**Rationale:**
- helmet first: Security headers before any processing
- cors second: Reject cross-origin requests early
- morgan third: Log all requests (even CORS failures)
- json fourth: Parse body before validation
- requestId fifth: Attach ID for all subsequent logs
- auth sixth: User context available to all routes
- routes seventh: Business logic
- 404 eighth: Catch undefined routes
- errorHandler last: Catch all thrown errors

**Alternatives Considered:**
- ❌ auth before requestId → Loses request ID in auth errors
- ❌ errorHandler not last → Some errors bypass central handler
- ✅ Security → Logging → Parsing → Context → Logic → Error → Well-established pattern

### Decision 8: API Versioning Strategy

**Choice:** `/api/v1` prefix for all routes, version in response header

**Rationale:**
- Frontend already expects `/api/v1` structure
- Enables future `/api/v2` without breaking existing clients
- Version header (`X-API-Version: 1.0`) enables monitoring of client versions
- Simple path-based versioning (not subdomain, not header-based routing)

**Alternatives Considered:**
- ❌ No versioning → Breaking changes force frontend redeployment
- ❌ Header-based versioning → Harder to debug, not RESTful
- ✅ Path-based versioning → Standard, explicit, cache-friendly

## Risks / Trade-offs

### Risk 1: Supabase Connection Pool Limits
**Risk:** Free tier limits to 15 connections, Prisma defaults to 10 connections per Prisma Client

**Mitigation:**
- Use singleton Prisma client pattern (one pool for entire app)
- Configure Prisma connection limit: `connection_limit=5` in DATABASE_URL
- Monitor connection usage with Prisma metrics
- Document upgrade path to Supabase Pro ($25/mo → 50 connections) if needed

### Risk 2: WebSocket Memory Leaks
**Risk:** Socket.io rooms not cleaned up on disconnect, causing memory growth

**Mitigation:**
- Implement disconnect handler that leaves all rooms
- Add connection limit per user (max 3 concurrent connections)
- Monitor memory usage with Node.js heap snapshots
- Use Socket.io adapter (Redis) for multi-instance deployment (future)

### Risk 3: JWT Expiry Handling
**Risk:** Long-lived WebSocket connections may outlive JWT expiry (1hr default)

**Mitigation:**
- WebSocket authentication checks token on connection only
- Client responsible for reconnecting with fresh token on expiry
- Server disconnects sockets older than 1hr (heartbeat timeout)
- Frontend already has Supabase session refresh logic

### Risk 4: Error Information Leakage
**Risk:** Stack traces or internal errors exposed in production responses

**Mitigation:**
- Error sanitization checks `NODE_ENV` before including details
- Custom error classes only expose intended fields
- Centralized error handler prevents accidental verbose errors
- Security audit of error responses before production deployment

### Risk 5: CORS Misconfiguration
**Risk:** Overly permissive CORS allows malicious frontend to call API

**Mitigation:**
- Whitelist specific origins (localhost for dev, Railway URL for prod)
- No wildcard `*` allowed in production
- Credentials support (`credentials: true`) only for whitelisted origins
- Environment-specific CORS configuration

### Risk 6: Prisma Migration Conflicts
**Risk:** Manual Supabase SQL changes conflict with Prisma migrations

**Mitigation:**
- Use `prisma db pull` to introspect existing schema before first migration
- Document Prisma as source of truth for schema changes
- Disable direct SQL access in Supabase UI (team policy)
- Test migrations in staging environment before production

## Migration Plan

### Phase 1: Project Setup (No Deployment)
1. Create `backend/` directory structure
2. Initialize `package.json` with dependencies
3. Configure `tsconfig.json` for Node.js + Express
4. Set up `.env.example` with required variables

### Phase 2: Prisma Integration (Safe)
1. Create `backend/prisma/schema.prisma` with full data model
2. Run `prisma db pull` to verify Supabase schema compatibility
3. Generate initial migration (or use `db push` for prototyping)
4. Run migration against Supabase database
5. Verify tables created correctly in Supabase dashboard

### Phase 3: Express Foundation (Local Only)
1. Implement Express server in `backend/src/server.ts`
2. Add middleware pipeline (helmet, cors, morgan, json)
3. Create health check endpoint (`/health`)
4. Test locally with `npm run dev`

### Phase 4: Authentication (Local + Staging)
1. Implement JWT verification middleware
2. Add protected route for testing (`/api/v1/me`)
3. Test with real Supabase tokens from frontend
4. Verify user context extraction

### Phase 5: WebSocket Setup (Local)
1. Initialize Socket.io server attached to Express
2. Implement connection handler with auth
3. Add protocol room join/leave logic
4. Test with frontend WebSocket client

### Phase 6: Railway Deployment (Staging)
1. Create Railway service linked to backend/ directory
2. Configure environment variables in Railway
3. Set build command: `npm run build`
4. Set start command: `node dist/server.js`
5. Deploy and verify health check

### Phase 7: Frontend Integration (Staging)
1. Update frontend `VITE_API_URL` to Railway backend URL
2. Test authentication flow end-to-end
3. Test WebSocket connection and room joining
4. Verify CORS allows frontend origin

### Phase 8: Production Promotion (Manual)
1. Test all endpoints in staging environment
2. Verify error handling returns sanitized messages
3. Check logs for any leaked sensitive data
4. Promote Railway service to production environment
5. Update frontend production build with production API URL

### Rollback Strategy
- **If deployment fails:** Railway auto-reverts to last successful deployment
- **If runtime errors:** Roll back via Railway UI to previous build
- **If database issues:** Prisma migrations are version-controlled - revert migration and redeploy
- **If frontend broken:** Frontend can temporarily point back to no backend (graceful degradation)

## Open Questions

### Q1: Redis Connection Management
**Question:** Should Redis connection be established in this foundation, or deferred to dashboard-api-endpoints?

**Context:** Redis is needed for caching dashboard data (dashboard-api-endpoints) but not for basic server operation.

**Recommendation:** Defer to dashboard-api-endpoints. This foundation should boot without Redis dependency. Add optional Redis client (`getRedisClient()`) that returns `null` if not configured.

### Q2: Request ID Generation
**Question:** Use UUID v4, nanoid, or sequential counter for request IDs?

**Context:** Request IDs are used for log correlation and error tracking.

**Recommendation:** Use `nanoid(10)` - shorter than UUID (10 chars vs 36), URL-safe, cryptographically random. Fast generation, low collision probability for request volume.

### Q3: Logging Library
**Question:** Use morgan only, or add structured logger (winston/pino)?

**Context:** Morgan logs HTTP requests but not application-level logs (like Prisma queries, WebSocket events).

**Recommendation:** Start with morgan + console.log, upgrade to pino if structured logging needed later. Premature optimization for current scale.

### Q4: Testing Strategy
**Question:** Should this foundation include unit tests, or defer to dashboard-api-endpoints implementation?

**Context:** No test infrastructure exists yet. Tests would cover middleware, error handlers, WebSocket rooms.

**Recommendation:** Defer comprehensive testing to implementation phase. Include basic smoke tests (server starts, health check responds). Full test suite when business logic added.

### Q5: Database Connection Pooling
**Question:** Use Prisma's default connection pooling or configure pgBouncer?

**Context:** Supabase offers pgBouncer but requires transaction mode (incompatible with some Prisma features).

**Recommendation:** Start with Prisma's connection pooling. Set `connection_limit=5` in DATABASE_URL. Revisit if connection exhaustion occurs in production.
