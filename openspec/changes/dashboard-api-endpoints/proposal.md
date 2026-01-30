## Why

The dashboard UI (Phase 4 complete) currently uses mock data and needs real backend API endpoints to function in production. Without these endpoints, the dashboard cannot display live protocol status, agent activity, vulnerability data, or statistics, making it unusable for protocol owners and security researchers.

## What Changes

- Add 4 new REST API endpoints for dashboard data retrieval
- Implement Redis caching layer for expensive queries (30-60s TTL)
- Add 3 new WebSocket events for real-time dashboard updates
- Extend existing API rate limits to accommodate dashboard auto-refresh patterns
- Create aggregation services to optimize multi-table queries
- Add error codes specific to dashboard data availability

## Capabilities

### New Capabilities
- `dashboard-endpoints`: REST endpoints for protocol overview, statistics, agent status, and alerts
- `dashboard-caching`: Redis caching strategy with WebSocket-based cache invalidation
- `dashboard-realtime`: WebSocket events for agent task updates, bounty pool changes, and vulnerability status

### Modified Capabilities
- `api`: Extended with 4 new GET endpoints and updated rate limits for dashboard usage

## Impact

### Backend Components
- **API Server**: 4 new Express routes with Zod validation schemas
- **Database**: New Prisma queries with JOIN optimizations for stats aggregation
- **Redis**: Cache layer for protocol stats, agent status, and alerts (10-60s TTL)
- **WebSocket Server**: 3 new event types for real-time dashboard updates

### Frontend Impact
- **Dashboard Page**: Can now fetch real data instead of mock data
- **TanStack Query Hooks**: Connect to actual endpoints (already implemented in Phase 4)
- **WebSocket Integration**: Receive live updates via existing WebSocket manager

### Database Queries
- Protocol overview: JOIN protocols + scans + monitoring_status
- Dashboard stats: Aggregate vulnerabilities, payments, bounty pool balance
- Agent status: Query agent heartbeats, current tasks, uptime metrics
- Alerts: Filter critical vulnerabilities by protocol and dismissed status

### Performance
- Expected load: 60-120 req/min per active dashboard session
- Caching reduces DB load by ~80% for stats and agent status
- WebSocket events minimize polling, reducing API calls by ~50%

### Security Considerations
- All endpoints require Supabase JWT authentication
- RLS policies ensure users only see their own protocol data
- Agent status endpoint limited to admin roles only
- Rate limiting prevents dashboard abuse (60-120 req/min per endpoint)
- Input validation via Zod schemas for all query parameters

### Dependencies
- Requires completed dashboard-ui frontend (✓ archived 2026-01-30)
- Requires Redis server for caching layer
- Requires WebSocket server with room-based broadcasting
- Requires agent heartbeat mechanism for status tracking
