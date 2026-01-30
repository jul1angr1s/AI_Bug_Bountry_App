# Tasks: Dashboard API Endpoints Implementation

## 1. Infrastructure Setup

- [ ] 1.1 Add Redis service to Railway project for caching
- [ ] 1.2 Install dependencies: ioredis, rate-limiter-flexible, @opentelemetry/api
- [ ] 1.3 Create Redis client singleton in `backend/src/lib/redis.ts` with connection pooling
- [ ] 1.4 Add Redis health check to existing `/api/v1/health` endpoint
- [ ] 1.5 Create Redis connection error handler with circuit breaker pattern

## 2. Data Layer & Caching

- [ ] 2.1 Create Prisma aggregation query helpers in `backend/src/services/dashboard.service.ts`
- [ ] 2.2 Implement cache utility functions (get, set, invalidate) in `backend/src/lib/cache.ts`
- [ ] 2.3 Add cache key constants for dashboard data (stats, agents, vulnerabilities)
- [ ] 2.4 Create cache invalidation service in `backend/src/services/cache-invalidation.service.ts`
- [ ] 2.5 Add database indexes: (protocolId + createdAt) on vulnerabilities and payments tables

## 3. Validation Schemas

- [ ] 3.1 Create Zod schemas for dashboard endpoints in `backend/src/schemas/dashboard.schema.ts`
- [ ] 3.2 Add protocol ID validation schema (UUID format)
- [ ] 3.3 Add pagination parameters schema (page, limit, with defaults)
- [ ] 3.4 Add sort/filter parameters schema (severity, status, date)
- [ ] 3.5 Create dashboard error code enum in `backend/src/types/errors.ts`

## 4. Dashboard Statistics Endpoint

- [ ] 4.1 Create `/api/v1/stats` route handler in `backend/src/routes/dashboard.routes.ts`
- [ ] 4.2 Implement stats aggregation service with Prisma queries (bounty pool, vulns, payments)
- [ ] 4.3 Add Redis caching layer with 30s TTL for stats
- [ ] 4.4 Implement protocol filtering via query parameter (optional protocolId)
- [ ] 4.5 Add RLS policy check to ensure user owns protocol
- [ ] 4.6 Include Cache-Control header: private, max-age=30
- [ ] 4.7 Add X-Cache header (HIT/MISS) for monitoring

## 5. Agent Status Endpoint

- [ ] 5.1 Create `/api/v1/agents` route handler with admin middleware
- [ ] 5.2 Implement agent status service querying agent heartbeats table
- [ ] 5.3 Add logic to mark agents OFFLINE if heartbeat > 120 seconds old
- [ ] 5.4 Add Redis caching with 10s TTL for agent status
- [ ] 5.5 Implement type filtering (PROTOCOL, RESEARCHER, VALIDATOR)
- [ ] 5.6 Include agent metadata: currentTask, taskProgress, uptime, scansCompleted
- [ ] 5.7 Add Cache-Control header: private, max-age=10

## 6. Protocol Overview Endpoint

- [ ] 6.1 Extend existing `/api/v1/protocols/:id` route with dashboard fields
- [ ] 6.2 Add protocol overview service with JOIN on scans and monitoring_status
- [ ] 6.3 Include lastScanAt and nextScanScheduled in response
- [ ] 6.4 Add Redis caching with 60s TTL
- [ ] 6.5 Add RLS policy enforcement for protocol ownership
- [ ] 6.6 Include Cache-Control header: private, max-age=60

## 7. Vulnerabilities List Endpoint

- [ ] 7.1 Extend `/api/v1/protocols/:id/vulnerabilities` with pagination support
- [ ] 7.2 Implement sorting by severity, date, and status
- [ ] 7.3 Add filtering by severity and status query parameters
- [ ] 7.4 Return pagination metadata (total, page, totalPages, hasNext, hasPrev)
- [ ] 7.5 Add Redis caching with cache key including page/limit/sort parameters
- [ ] 7.6 Set cache TTL to 60s for vulnerability lists
- [ ] 7.7 Include Cache-Control header: private, max-age=60

## 8. WebSocket Events - Agent Updates

- [ ] 8.1 Add agent:task_update event emitter in agent heartbeat handler
- [ ] 8.2 Include agentId, task name, progress percentage, estimatedCompletion in payload
- [ ] 8.3 Emit to 'agents' room for broadcast to all connected clients
- [ ] 8.4 Add rate limiting: max 1 event per second per agent
- [ ] 8.5 Invalidate agent:status cache on event emission

## 9. WebSocket Events - Bounty Pool

- [ ] 9.1 Add bounty_pool:updated event in pool balance change handlers
- [ ] 9.2 Emit on deposit, payment release, and reservation actions
- [ ] 9.3 Include protocolId, pool totals, change type, and amount in payload
- [ ] 9.4 Emit to protocol:{protocolId} room for targeted delivery
- [ ] 9.5 Invalidate dashboard:stats:{protocolId} cache on event emission

## 10. WebSocket Events - Vulnerability Status

- [ ] 10.1 Add vuln:status_changed event in vulnerability status transition handlers
- [ ] 10.2 Include vulnerabilityId, protocolId, old/new status, severity, timestamp
- [ ] 10.3 Emit to protocol:{protocolId} room
- [ ] 10.4 Invalidate dashboard:stats and vulnerabilities cache on event emission
- [ ] 10.5 Add rate limiting: max 10 events per second per protocol room

## 11. Rate Limiting

- [ ] 11.1 Create rate limiter middleware using rate-limiter-flexible in `backend/src/middleware/rate-limit.ts`
- [ ] 11.2 Configure Redis-backed sliding window rate limiter
- [ ] 11.3 Apply 60 req/min limit to /api/v1/stats endpoint
- [ ] 11.4 Apply 120 req/min limit to /api/v1/agents endpoint (admin only)
- [ ] 11.5 Apply 60 req/min limit to /api/v1/protocols/:id endpoints
- [ ] 11.6 Include rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] 11.7 Return 429 status with Retry-After header on limit exceeded

## 12. Error Handling

- [ ] 12.1 Create dashboard-specific error handler in `backend/src/middleware/error-handler.ts`
- [ ] 12.2 Implement PROTOCOL_NOT_MONITORED error (400 status)
- [ ] 12.3 Implement AGENT_UNREACHABLE error (503 status)
- [ ] 12.4 Implement STATS_UNAVAILABLE error (503 status)
- [ ] 12.5 Add request ID to all error responses for debugging
- [ ] 12.6 Log errors with context (user, endpoint, parameters)

## 13. Monitoring & Observability

- [ ] 13.1 Add OpenTelemetry spans for dashboard endpoint handlers
- [ ] 13.2 Track query execution time for all Prisma queries
- [ ] 13.3 Add cache hit/miss metrics to monitoring system
- [ ] 13.4 Create custom metrics for endpoint latency (p50, p95, p99)
- [ ] 13.5 Set up alert for p95 latency > 1.5s
- [ ] 13.6 Add metrics for rate limit hits per endpoint

## 14. Testing - Unit Tests

- [ ] 14.1 Write unit tests for stats aggregation service with mocked Prisma
- [ ] 14.2 Write unit tests for agent status service with heartbeat scenarios
- [ ] 14.3 Write unit tests for cache utility functions (get/set/invalidate)
- [ ] 14.4 Write unit tests for Zod validation schemas
- [ ] 14.5 Write unit tests for rate limiter with various scenarios
- [ ] 14.6 Write unit tests for error handler with different error codes

## 15. Testing - Integration Tests

- [ ] 15.1 Write integration test for /api/v1/stats endpoint with real Redis/DB
- [ ] 15.2 Write integration test for /api/v1/agents endpoint with admin auth
- [ ] 15.3 Write integration test for vulnerabilities pagination and sorting
- [ ] 15.4 Write integration test for cache invalidation on WebSocket events
- [ ] 15.5 Write integration test for rate limiting behavior across endpoints
- [ ] 15.6 Write integration test for RLS policy enforcement

## 16. Testing - Load & WebSocket

- [ ] 16.1 Create k6 load testing script simulating 100 concurrent dashboard users
- [ ] 16.2 Test cache hit rate under load (target >70% hit rate)
- [ ] 16.3 Verify endpoint latency stays <2s at p95 under load
- [ ] 16.4 Test WebSocket event delivery with multiple connected clients
- [ ] 16.5 Test WebSocket rate limiting with rapid event emission
- [ ] 16.6 Test Redis failure scenario (verify fallback to DB)

## 17. Documentation & Deployment

- [ ] 17.1 Update API documentation with new dashboard endpoints
- [ ] 17.2 Document cache key patterns and TTL values
- [ ] 17.3 Document WebSocket event payloads and room structure
- [ ] 17.4 Create Railway Redis configuration documentation
- [ ] 17.5 Add feature flags for dashboard endpoints in environment config
- [ ] 17.6 Update deployment checklist with Redis setup steps

## 18. Verification & Rollout

- [ ] 18.1 Verify frontend TanStack Query hooks connect to real endpoints
- [ ] 18.2 Test end-to-end dashboard functionality with real data
- [ ] 18.3 Monitor cache hit rates in production for first 24 hours
- [ ] 18.4 Monitor endpoint latency and set baseline for alerts
- [ ] 18.5 Verify WebSocket events are received in dashboard UI
- [ ] 18.6 Remove mock data fallback from frontend after 1 week of stable operation
