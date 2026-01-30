# Design: Dashboard API Endpoints

## Context

The completed dashboard UI (archived 2026-01-30) currently uses mock data and is ready for backend integration. The system already has:
- Express API server with Supabase JWT authentication
- Prisma ORM connected to Supabase PostgreSQL
- Socket.io WebSocket server for real-time updates
- Existing API routes for protocols, scans, and vulnerabilities

**Current State:**
- Dashboard frontend fetches from non-existent endpoints
- No caching layer exists for expensive aggregation queries
- WebSocket events for agent/bounty updates are not emitted
- API rate limits are generic, not optimized for dashboard auto-refresh

**Constraints:**
- Must work with existing Supabase RLS policies
- Cannot modify frontend API contract (already implemented)
- Redis must be added without disrupting existing infrastructure
- WebSocket events must integrate with existing Socket.io rooms

**Stakeholders:**
- Frontend team (needs API contract fulfilled)
- Protocol owners (need real-time dashboard visibility)
- DevOps (concerned about DB load and caching strategy)

## Goals / Non-Goals

**Goals:**
- Implement 4 REST endpoints matching frontend's TanStack Query hooks
- Reduce database load by 80% through Redis caching
- Enable real-time dashboard updates via 3 new WebSocket events
- Support 60-120 req/min per active dashboard without performance degradation
- Maintain sub-2s response times for all dashboard endpoints

**Non-Goals:**
- Historical analytics or time-series data (future feature)
- Dashboard customization or layout preferences
- Multi-protocol comparison views
- Agent control/command features (admin panel scope)
- Offline data synchronization

## Decisions

### Decision 1: Express Route Structure
**Choice:** Create dedicated `/api/v1/dashboard/*` namespace for new endpoints

**Rationale:**
- Groups dashboard-specific routes for easier maintenance
- Allows separate rate limiting middleware for dashboard endpoints
- Keeps existing `/api/v1/protocols/:id` routes unchanged
- Enables future dashboard features without polluting main API namespace

**Alternatives Considered:**
- Extend existing `/api/v1/protocols/:id` routes → Rejected: Complicates existing route logic
- Create separate dashboard microservice → Rejected: Overkill for 4 endpoints, adds deployment complexity

**Implementation:**
```typescript
// src/routes/dashboard.ts
router.get('/stats', authenticate, getDashboardStats);
router.get('/agents', authenticate, requireAdmin, getAgentStatus);
```

### Decision 2: Redis Caching Strategy
**Choice:** Write-through cache with WebSocket-based invalidation

**Rationale:**
- Write-through ensures cache consistency on data changes
- WebSocket events trigger targeted cache invalidation
- TTL provides fallback if invalidation fails
- No cache stampede risk with single-flight pattern

**Alternatives Considered:**
- Cache-aside pattern → Rejected: Risk of stale data with frequent updates
- No caching → Rejected: DB queries too expensive (5-7 JOINs for stats)
- Client-side caching only → Rejected: Doesn't reduce server load

**Cache Keys:**
```
dashboard:stats:{protocolId}        TTL: 30s
dashboard:agents                     TTL: 10s
protocol:vulnerabilities:{id}:p{n}   TTL: 60s
```

**Invalidation Strategy:**
```typescript
// On vuln:discovered event
redis.del(`dashboard:stats:${protocolId}`);
redis.del(`protocol:vulnerabilities:${protocolId}:*`);

// On agent:status event
redis.del('dashboard:agents');
```

### Decision 3: Database Query Optimization
**Choice:** Dedicated Prisma aggregate queries with selective field inclusion

**Rationale:**
- Aggregate queries reduce N+1 query problems
- `select` clause limits data transfer from DB
- Compound indexes on frequently queried fields
- Read replicas for dashboard queries (future Railway scaling)

**Query Pattern:**
```typescript
const stats = await prisma.protocol.findUnique({
  where: { id: protocolId },
  select: {
    bountyPool: true,
    _count: {
      select: {
        vulnerabilities: { where: { severity: 'CRITICAL' } }
      }
    },
    payments: {
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  }
});
```

**Alternatives Considered:**
- Raw SQL queries → Rejected: Lose Prisma type safety, harder to maintain
- Multiple separate queries → Rejected: N+1 problem, higher latency
- Materialized views → Rejected: Overkill, adds DB migration complexity

### Decision 4: WebSocket Event Architecture
**Choice:** Extend existing Socket.io with new event types, use protocol-based rooms

**Rationale:**
- Leverages existing Socket.io infrastructure
- Room-based broadcasting ensures users only receive relevant updates
- Event naming convention matches existing patterns
- Backward compatible with existing WebSocket clients

**Room Structure:**
```typescript
io.to(`protocol:${protocolId}`).emit('bounty_pool:updated', payload);
io.to('agents').emit('agent:task_update', payload);
```

**Alternatives Considered:**
- Separate WebSocket server for dashboard → Rejected: Infrastructure duplication
- Server-Sent Events (SSE) → Rejected: No bidirectional communication if needed later
- Polling only → Rejected: Higher latency and server load

### Decision 5: Rate Limiting Strategy
**Choice:** Per-endpoint rate limits with Redis-backed sliding window

**Rationale:**
- Dashboard auto-refreshes every 30s need higher limits than mutations
- Per-endpoint limits prevent one endpoint from blocking others
- Redis sliding window provides accurate rate counting
- Includes Retry-After headers for client backoff

**Rate Limit Configuration:**
```typescript
const dashboardLimits = {
  '/api/v1/stats': { points: 60, duration: 60 }, // 60/min
  '/api/v1/agents': { points: 120, duration: 60 }, // 120/min (admin)
  '/api/v1/protocols/:id': { points: 60, duration: 60 }
};
```

**Alternatives Considered:**
- Global rate limit for all dashboard endpoints → Rejected: Unfair to different use patterns
- Token bucket algorithm → Rejected: Sliding window more accurate for burst protection
- No rate limiting → Rejected: Risk of DB overload from malicious/buggy clients

### Decision 6: Error Handling and Observability
**Choice:** Structured error codes with OpenTelemetry tracing

**Rationale:**
- Specific error codes help frontend show meaningful messages
- OpenTelemetry spans track query performance
- Logging includes request ID for debugging
- Metrics track cache hit rates and endpoint latency

**Error Code Strategy:**
```typescript
enum DashboardError {
  PROTOCOL_NOT_MONITORED = 'PROTOCOL_NOT_MONITORED', // 400
  AGENT_UNREACHABLE = 'AGENT_UNREACHABLE',           // 503
  STATS_UNAVAILABLE = 'STATS_UNAVAILABLE'            // 503
}
```

**Alternatives Considered:**
- Generic error messages → Rejected: Harder for frontend to show user-friendly errors
- No distributed tracing → Rejected: Hard to debug performance issues
- Console.log only → Rejected: Insufficient for production debugging

## Risks / Trade-offs

### Risk 1: Redis Single Point of Failure
**Impact:** If Redis goes down, all dashboard requests hit the database directly, potentially causing overload.

**Mitigation:**
- Implement circuit breaker pattern to detect Redis failures
- Fall through to database queries when Redis is unavailable
- Set up Redis monitoring and alerts (Railway Redis health checks)
- Consider Redis Sentinel/Cluster for production HA

### Risk 2: Cache Invalidation Misses
**Impact:** WebSocket event fails to invalidate cache, users see stale data for up to 60 seconds.

**Mitigation:**
- Use TTL as fallback mechanism (max 60s staleness)
- Log all cache invalidation operations for debugging
- Add cache invalidation retry logic with exponential backoff
- Monitor cache hit rates to detect invalidation issues

### Risk 3: Database Query Performance Degradation
**Impact:** As data grows, aggregation queries may slow down beyond 2s SLA.

**Mitigation:**
- Add compound indexes on frequently queried fields (protocolId + createdAt)
- Implement query timeout (5s) to prevent long-running queries
- Monitor p95/p99 latency and set up alerts at 1.5s threshold
- Plan for read replica separation when needed

### Risk 4: WebSocket Connection Scalability
**Impact:** High number of concurrent dashboard users may exhaust WebSocket connections.

**Mitigation:**
- Use Socket.io Redis adapter for horizontal scaling
- Implement connection limits per user (max 3 concurrent)
- Add WebSocket health check and automatic reconnection
- Monitor active WebSocket connections in Railway metrics

### Risk 5: Rate Limit False Positives
**Impact:** Legitimate users hit rate limits due to frontend bugs or fast navigation.

**Mitigation:**
- Set limits based on actual usage patterns (60-120/min is 2x expected load)
- Include clear error messages with Retry-After headers
- Log rate limit hits to identify problematic clients
- Provide admin bypass for troubleshooting

## Architecture Diagram

```
┌─────────────────┐
│  Dashboard UI   │
│  (React + WS)   │
└────────┬────────┘
         │
    ┌────┴─────┐
    │  HTTP    │  WebSocket
    │  Req     │  Events
    ▼          ▼
┌─────────────────────────┐
│   Express API Server    │
│  ┌──────────────────┐   │
│  │ Rate Limiter     │   │
│  │ (Redis)          │   │
│  └────────┬─────────┘   │
│           ▼             │
│  ┌──────────────────┐   │
│  │ Auth Middleware  │   │
│  │ (Supabase JWT)   │   │
│  └────────┬─────────┘   │
│           ▼             │
│  ┌──────────────────┐   │
│  │ Dashboard Routes │   │
│  │  /stats          │   │
│  │  /agents         │   │
│  └────────┬─────────┘   │
└───────────┼─────────────┘
            │
    ┌───────┴──────┐
    │              │
    ▼              ▼
┌────────┐    ┌──────────┐
│ Redis  │    │ Postgres │
│ Cache  │    │ (Prisma) │
└────────┘    └──────────┘
    ▲              │
    │              │
    └──────┬───────┘
           │
    Cache Invalidation
    on WebSocket Events
```

## Migration Plan

### Phase 1: Infrastructure Setup (Day 1)
1. Add Redis to Railway (create Redis service)
2. Install dependencies: `ioredis`, `rate-limiter-flexible`
3. Create Redis client singleton with connection pooling
4. Add Redis health check to `/health` endpoint

### Phase 2: Core Endpoints (Days 2-3)
1. Implement `/api/v1/stats` endpoint with caching
2. Implement `/api/v1/agents` endpoint (admin-only)
3. Implement `/api/v1/protocols/:id/vulnerabilities` with pagination
4. Add Zod validation schemas for all endpoints

### Phase 3: WebSocket Events (Day 4)
1. Extend Socket.io event emitters in existing code paths
2. Add `agent:task_update` event on agent heartbeat updates
3. Add `bounty_pool:updated` event on pool balance changes
4. Add `vuln:status_changed` event on vulnerability transitions

### Phase 4: Rate Limiting & Monitoring (Day 5)
1. Apply per-endpoint rate limiters
2. Add OpenTelemetry spans for query tracing
3. Set up Grafana dashboard for cache hit rates
4. Configure alerts for p95 latency > 1.5s

### Rollback Strategy
- Feature flags for each endpoint (enable/disable without deploy)
- Keep mock data fallback in frontend for 1 week
- Redis failure automatically falls back to DB queries
- Rate limiter disabled by environment variable if needed

### Testing Plan
- Unit tests for each endpoint with mocked Prisma/Redis
- Integration tests for cache invalidation flows
- Load testing with k6 (simulate 100 concurrent users)
- WebSocket event delivery testing with multiple clients

## Open Questions

1. **Agent Heartbeat Mechanism**: Does the agent heartbeat system already exist, or do we need to implement it?
   - **Resolution Needed:** Check with agent team if heartbeat table/mechanism exists

2. **Read Replica Separation**: When should we plan for read replica if query load exceeds expectations?
   - **Resolution Needed:** Set threshold (e.g., p95 latency > 1s consistently)

3. **Dashboard Access Control**: Should non-admin users see any agent status information?
   - **Resolution Needed:** Confirm with product team if aggregate agent health is public

4. **Cache Warming**: Should we pre-warm cache for frequently accessed protocols on server startup?
   - **Resolution Needed:** Measure cache miss impact, implement if cold start > 3s
