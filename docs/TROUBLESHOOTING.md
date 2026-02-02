# Troubleshooting Guide

Comprehensive guide for diagnosing and resolving common production issues with the AI Bug Bounty Platform.

**Related Documentation**:
- [PRODUCTION.md](./PRODUCTION.md) - Production operations and monitoring
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [SECURITY.md](./SECURITY.md) - Security-related issues

---

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Database Connection Problems](#database-connection-problems)
- [Redis Connection Failures](#redis-connection-failures)
- [Queue Worker Issues](#queue-worker-issues)
- [WebSocket Connection Problems](#websocket-connection-problems)
- [Performance Degradation](#performance-degradation)
- [Memory Leaks](#memory-leaks)
- [High CPU Usage](#high-cpu-usage)
- [API Timeout Issues](#api-timeout-issues)
- [Blockchain Connection Errors](#blockchain-connection-errors)
- [LLM API Failures](#llm-api-failures)
- [Debug Logging Configuration](#debug-logging-configuration)
- [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)

---

## Quick Diagnostics

### Health Check Command

```bash
# Check overall system health
curl https://api.yourdomain.com/health/detailed

# If health check fails, try individual components
```

### Component Status Checks

```bash
# 1. Backend API
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. Database
psql $DATABASE_URL -c "SELECT 1;"
# Expected: 1 row returned

# 3. Redis
redis-cli -u $REDIS_URL ping
# Expected: PONG

# 4. WebSocket
wscat -c wss://api.yourdomain.com
# Expected: Connection established

# 5. Queue workers
redis-cli -u $REDIS_URL KEYS "bull:*:active"
# Expected: List of active jobs
```

### Service Logs

```bash
# Backend logs (Railway)
railway logs --tail 100

# Filter for errors
railway logs --filter "level=error" --since 1h

# Follow logs in real-time
railway logs --follow

# Specific service
railway logs --service backend --follow
```

### Resource Usage

```bash
# Check CPU and memory (Railway)
railway status

# Check database size
psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size('bugbounty'));
"

# Check Redis memory
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
```

---

## Database Connection Problems

### Problem: "Can't reach database server"

**Symptoms**:
```
Error: P1001: Can't reach database server at `host:5432`
```

**Diagnosis**:
```bash
# 1. Check database is running
pg_isready -h <host> -p 5432

# 2. Test connection
psql $DATABASE_URL -c "SELECT version();"

# 3. Check firewall rules (production)
telnet <host> 5432

# 4. Verify DATABASE_URL format
echo $DATABASE_URL
# Expected: postgresql://user:password@host:5432/dbname
```

**Solutions**:

```bash
# Solution 1: Restart database
railway restart --service postgres

# Solution 2: Check connection string
# Ensure sslmode=require for production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Solution 3: Verify network access
# Add IP to allowlist (if using IP-restricted database)

# Solution 4: Check connection pool
# Reduce connection limit if pool is exhausted
DATABASE_URL="...?connection_limit=10"
```

### Problem: "Too many connections"

**Symptoms**:
```
Error: P1001: Too many connections
```

**Diagnosis**:
```sql
-- Check current connections
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'bugbounty'
GROUP BY state;

-- Check max connections
SHOW max_connections;

-- Check connection limit from app
-- DATABASE_URL should have: ?connection_limit=20
```

**Solutions**:

```sql
-- Solution 1: Terminate idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '30 minutes'
  AND datname = 'bugbounty';

-- Solution 2: Increase max_connections (database level)
ALTER SYSTEM SET max_connections = 100;
SELECT pg_reload_conf();

-- Solution 3: Reduce pool size (application level)
-- Update DATABASE_URL
DATABASE_URL="...?connection_limit=10&pool_timeout=20"
```

### Problem: Slow queries

**Symptoms**:
- API requests taking > 5 seconds
- Database CPU at 100%

**Diagnosis**:
```sql
-- Check currently running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Check slow queries (requires pg_stat_statements)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY abs(correlation) DESC;
```

**Solutions**:

```sql
-- Solution 1: Add missing indexes
CREATE INDEX idx_scans_protocol_id ON scans(protocol_id);
CREATE INDEX idx_findings_scan_id ON findings(scan_id);
CREATE INDEX idx_findings_status ON findings(status);

-- Solution 2: Vacuum and analyze
VACUUM ANALYZE;

-- Solution 3: Kill long-running query
SELECT pg_terminate_backend(<pid>);

-- Solution 4: Optimize query
-- Use EXPLAIN ANALYZE to understand query plan
EXPLAIN ANALYZE SELECT * FROM protocols WHERE ...;
```

---

## Redis Connection Failures

### Problem: "Redis connection refused"

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Diagnosis**:
```bash
# 1. Check Redis is running
redis-cli -u $REDIS_URL ping
# Expected: PONG

# 2. Test connection manually
redis-cli -u $REDIS_URL

# 3. Verify REDIS_URL format
echo $REDIS_URL
# Expected: redis://username:password@host:6379
```

**Solutions**:

```bash
# Solution 1: Restart Redis
railway restart --service redis

# Solution 2: Check authentication
# Ensure password is correct in REDIS_URL
REDIS_URL="redis://:password@host:6379"

# Solution 3: Check TLS requirement (production)
# Some providers require TLS
REDIS_URL="rediss://..." # Note: rediss (with double s)
REDIS_TLS_ENABLED=true

# Solution 4: Increase connection timeout
REDIS_CONNECT_TIMEOUT=10000
```

### Problem: Redis out of memory

**Symptoms**:
```
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Diagnosis**:
```bash
# Check memory usage
redis-cli -u $REDIS_URL INFO memory

# Check memory policy
redis-cli -u $REDIS_URL CONFIG GET maxmemory-policy

# List largest keys
redis-cli -u $REDIS_URL --bigkeys
```

**Solutions**:

```bash
# Solution 1: Clear old cache keys
redis-cli -u $REDIS_URL --scan --pattern "cache:*" | head -1000 | xargs redis-cli -u $REDIS_URL DEL

# Solution 2: Set eviction policy
redis-cli -u $REDIS_URL CONFIG SET maxmemory-policy allkeys-lru

# Solution 3: Increase Redis memory limit (Railway)
railway redis configure --memory 512MB

# Solution 4: Clear all cache (if safe)
redis-cli -u $REDIS_URL FLUSHDB
```

---

## Queue Worker Issues

### Problem: Jobs stuck in "waiting" state

**Symptoms**:
- Jobs not processing
- Queue depth increasing
- No active workers

**Diagnosis**:
```bash
# Check queue stats
redis-cli -u $REDIS_URL LLEN bull:scan:waiting
redis-cli -u $REDIS_URL LLEN bull:scan:active
redis-cli -u $REDIS_URL LLEN bull:scan:failed

# Check worker logs
railway logs --filter "worker" --tail 100

# Check if workers are running
ps aux | grep "worker"
```

**Solutions**:

```bash
# Solution 1: Restart backend (restarts workers)
railway restart

# Solution 2: Check worker errors
railway logs --filter "worker" --filter "error"

# Solution 3: Manually process stuck jobs
# Access backend container and run:
node -e "
  const { Queue } = require('bullmq');
  const queue = new Queue('scan', { connection: redisConnection });
  queue.clean(0, 1000, 'wait');
"

# Solution 4: Increase worker concurrency
QUEUE_CONCURRENCY_SCAN=10
```

### Problem: Jobs failing repeatedly

**Symptoms**:
- High failed job count
- Same job retrying continuously

**Diagnosis**:
```bash
# Get failed jobs
redis-cli -u $REDIS_URL LRANGE bull:scan:failed 0 10

# Check job details (BullMQ Dashboard or Redis)
redis-cli -u $REDIS_URL HGETALL bull:scan:<job-id>

# Check failure reason in logs
railway logs --filter "job failed" --since 1h
```

**Solutions**:

```bash
# Solution 1: Remove failed jobs after investigation
redis-cli -u $REDIS_URL DEL bull:scan:failed

# Solution 2: Increase retry attempts
QUEUE_RETRY_ATTEMPTS=5

# Solution 3: Add delay between retries
QUEUE_RETRY_BACKOFF=exponential

# Solution 4: Fix underlying issue (e.g., LLM API key)
# Update environment variable and restart
railway variables set ANTHROPIC_API_KEY=<new-key>
railway restart
```

### Problem: Payment jobs not triggering

**Symptoms**:
- Findings validated but no payment initiated
- Payment queue empty

**Diagnosis**:
```bash
# Check validation completion
psql $DATABASE_URL -c "
  SELECT id, status, validated_at
  FROM findings
  WHERE status = 'VALIDATED'
  AND validated_at IS NOT NULL
  ORDER BY validated_at DESC
  LIMIT 10;
"

# Check if payment records were created
psql $DATABASE_URL -c "
  SELECT * FROM payments
  WHERE created_at > NOW() - INTERVAL '1 hour';
"

# Check validator worker logs
railway logs --filter "validator" --since 1h
```

**Solutions**:

```bash
# Solution 1: Verify validator triggers payment
# Check validator code triggers payment.queue.add()

# Solution 2: Manually trigger payment
# For specific finding:
curl -X POST https://api.yourdomain.com/api/v1/payments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"findingId": "finding_123"}'

# Solution 3: Check payment worker is running
railway logs --filter "payment worker started"
```

---

## WebSocket Connection Problems

### Problem: WebSocket handshake failed

**Symptoms**:
```
WebSocket connection to 'wss://...' failed: Error during WebSocket handshake
```

**Diagnosis**:
```bash
# 1. Test WebSocket connection
wscat -c wss://api.yourdomain.com

# 2. Check CORS configuration
curl -I https://api.yourdomain.com \
  -H "Origin: https://yourdomain.com"

# 3. Check logs for connection errors
railway logs --filter "websocket" --tail 50
```

**Solutions**:

```bash
# Solution 1: Verify WSS (not WS) in production
VITE_WS_URL=wss://api.yourdomain.com  # Not ws://

# Solution 2: Check CORS allows WebSocket upgrade
# Backend should have:
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

# Solution 3: Verify load balancer supports WebSocket
# NGINX configuration should include:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Solution 4: Increase timeout
proxy_read_timeout 86400;
```

### Problem: WebSocket disconnects frequently

**Symptoms**:
- Connection drops every 30-60 seconds
- "Connection closed" errors

**Diagnosis**:
```javascript
// Check client logs
console.log(socket.connected);  // Should be true

// Check disconnect reason
socket.on('disconnect', (reason) => {
  console.log('Disconnect reason:', reason);
});
```

**Solutions**:

```javascript
// Solution 1: Implement reconnection logic
const socket = io(WS_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Solution 2: Implement ping/pong
socket.on('ping', () => {
  socket.emit('pong');
});

// Solution 3: Increase server timeout
// Backend configuration:
io.pingTimeout = 60000;
io.pingInterval = 25000;

// Solution 4: Check proxy timeout
// NGINX: proxy_read_timeout 86400;
```

---

## Performance Degradation

### Problem: API response time > 2 seconds

**Symptoms**:
- Slow page loads
- Timeout errors
- Poor user experience

**Diagnosis**:
```bash
# 1. Check API latency
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourdomain.com/api/v1/protocols

# curl-format.txt:
# time_total:  %{time_total}s

# 2. Check database query time
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 5;
"

# 3. Check cache hit rate
redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits

# 4. Check system resources
railway status
```

**Solutions**:

```bash
# Solution 1: Add caching
# Cache frequently accessed data
const cached = await redis.get(`protocol:${id}`);
if (cached) return JSON.parse(cached);

# Solution 2: Add database indexes
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_findings_severity ON findings(severity);

# Solution 3: Optimize N+1 queries
# Use Prisma includes instead of separate queries
const protocols = await prisma.protocol.findMany({
  include: { scans: true, findings: true }
});

# Solution 4: Enable query result caching
# Prisma supports result caching with extensions

# Solution 5: Scale horizontally
railway scale --replicas 3
```

### Problem: High database latency

**Symptoms**:
- Queries taking > 500ms
- Connection pool exhausted

**Diagnosis**:
```sql
-- Check active queries
SELECT pid, query_start, state, query
FROM pg_stat_activity
WHERE state = 'active';

-- Check lock contention
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

**Solutions**:

```sql
-- Solution 1: Terminate blocking queries
SELECT pg_terminate_backend(<blocking_pid>);

-- Solution 2: Add missing indexes
-- Check table scans
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_scan DESC;

-- Solution 3: Vacuum and reindex
VACUUM FULL ANALYZE;
REINDEX DATABASE bugbounty;

-- Solution 4: Enable connection pooling
-- Use PgBouncer for connection pooling
# Install PgBouncer and configure
```

---

## Memory Leaks

### Problem: Node.js process memory growing

**Symptoms**:
- Memory usage increasing over time
- Out of memory crashes
- Pod/container restarts

**Diagnosis**:
```bash
# Check memory usage
railway metrics --service backend

# Check Node.js heap size
# Add to application:
console.log(process.memoryUsage());
# {
#   rss: 150MB,
#   heapTotal: 50MB,
#   heapUsed: 40MB,
#   external: 2MB
# }

# Generate heap snapshot
node --heapsnapshot-signal=SIGUSR2 app.js
# Send signal: kill -USR2 <pid>
# Analyze snapshot in Chrome DevTools
```

**Solutions**:

```bash
# Solution 1: Increase heap size
NODE_OPTIONS="--max-old-space-size=2048"

# Solution 2: Identify and fix memory leaks
# Common causes:
# - Event listeners not removed
# - Cached data not cleared
# - Circular references

# Solution 3: Implement cleanup
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
}, 60000);

# Solution 4: Restart workers periodically
# BullMQ worker configuration
const worker = new Worker('scan', processJob, {
  settings: {
    stalledInterval: 30000,
    maxStalledCount: 1,
  },
  // Restart after processing N jobs
  limiter: {
    max: 1000,
    duration: 3600000,
  },
});
```

### Problem: Redis memory growing

**Symptoms**:
- Redis memory > 80% of limit
- Eviction warnings

**Diagnosis**:
```bash
# Check memory usage
redis-cli -u $REDIS_URL INFO memory

# Check largest keys
redis-cli -u $REDIS_URL --bigkeys

# Check key counts
redis-cli -u $REDIS_URL DBSIZE
```

**Solutions**:

```bash
# Solution 1: Set TTL on cache keys
redis-cli -u $REDIS_URL --scan --pattern "cache:*" | \
  xargs -I {} redis-cli -u $REDIS_URL EXPIRE {} 3600

# Solution 2: Configure eviction policy
redis-cli -u $REDIS_URL CONFIG SET maxmemory-policy allkeys-lru

# Solution 3: Clean up old jobs
# Remove completed jobs older than 7 days
const queue = new Queue('scan');
queue.clean(7 * 24 * 60 * 60 * 1000, 'completed');

# Solution 4: Increase Redis memory
railway redis configure --memory 1GB
```

---

## High CPU Usage

### Problem: Backend CPU at 100%

**Symptoms**:
- Slow API responses
- High CPU usage
- Throttling warnings

**Diagnosis**:
```bash
# Check CPU usage
railway metrics --service backend

# Profile CPU usage (Node.js)
node --prof app.js
# Generate profile: node --prof-process isolate-*.log

# Check active workers
ps aux | grep node | wc -l
```

**Solutions**:

```bash
# Solution 1: Scale horizontally
railway scale --replicas 3

# Solution 2: Optimize CPU-intensive operations
# Move heavy computation to queue workers
# Example: Move LLM analysis to separate worker

# Solution 3: Reduce concurrency
QUEUE_CONCURRENCY_SCAN=3  # Instead of 10

# Solution 4: Add rate limiting
# Prevent CPU exhaustion from too many requests

# Solution 5: Use cluster mode
CLUSTER_WORKERS=4
```

---

## API Timeout Issues

### Problem: "Request timeout" errors

**Symptoms**:
```
Error: Request timeout after 30000ms
```

**Diagnosis**:
```bash
# Check API response time
time curl https://api.yourdomain.com/api/v1/protocols

# Check timeout configuration
echo $API_TIMEOUT

# Check long-running operations
railway logs --filter "timeout"
```

**Solutions**:

```bash
# Solution 1: Increase timeout for specific operations
# LLM analysis
AI_TIMEOUT=120000  # 2 minutes

# Solution 2: Implement pagination
# Don't fetch all data at once
GET /api/v1/protocols?limit=50&offset=0

# Solution 3: Use streaming for large responses
# Server-sent events for progress updates

# Solution 4: Optimize slow operations
# Add indexes, cache results, reduce payload size
```

---

## Blockchain Connection Errors

### Problem: "Failed to connect to Base Sepolia"

**Symptoms**:
```
Error: Could not connect to Base Sepolia RPC
```

**Diagnosis**:
```bash
# Test RPC connection
curl -X POST $BASE_SEPOLIA_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check RPC URL
echo $BASE_SEPOLIA_RPC_URL
# Expected: https://sepolia.base.org
```

**Solutions**:

```bash
# Solution 1: Use alternative RPC
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Solution 2: Implement retry logic
# Already implemented in blockchain clients

# Solution 3: Check rate limits
# Public RPCs have rate limits - use dedicated RPC

# Solution 4: Verify network
# Ensure using Base Sepolia (chainId: 84532)
cast chain-id --rpc-url $BASE_SEPOLIA_RPC_URL
```

### Problem: Transaction reverted

**Symptoms**:
```
Error: Transaction reverted without a reason string
```

**Diagnosis**:
```bash
# Check transaction details
cast tx $TX_HASH --rpc-url $BASE_SEPOLIA_RPC_URL

# Simulate transaction
cast call $CONTRACT_ADDRESS $FUNCTION_SIG \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check contract balance
cast balance $BOUNTY_POOL_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL
```

**Solutions**:

```bash
# Solution 1: Check gas price
# Transaction may be underpriced
GAS_PRICE_MULTIPLIER=1.2

# Solution 2: Check wallet balance
cast balance $WALLET_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL

# Solution 3: Check contract state
# Bounty pool may be insufficient
cast call $BOUNTY_POOL_ADDRESS "getBalance(bytes32)" $PROTOCOL_ID

# Solution 4: Debug with Foundry
forge script script/Debug.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL
```

---

## LLM API Failures

### Problem: "Anthropic API error"

**Symptoms**:
```
Error: 429 Too Many Requests
Error: 500 Internal Server Error
```

**Diagnosis**:
```bash
# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4.5-20250929","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# Check rate limits
railway logs --filter "rate limit"
```

**Solutions**:

```bash
# Solution 1: Implement rate limiting
AI_RATE_LIMIT_RPM=50
AI_CONCURRENCY_LIMIT=3

# Solution 2: Implement exponential backoff
# Already implemented in LLM clients

# Solution 3: Use different tier/model
# Upgrade to higher tier or use cheaper model

# Solution 4: Cache LLM responses
# Don't re-analyze same content
```

---

## Debug Logging Configuration

### Enable Debug Logging

```bash
# Temporary (environment variable)
LOG_LEVEL=debug
railway restart

# Check debug logs
railway logs --filter "debug" --tail 100
```

### Structured Logging

```typescript
// Use logger instead of console.log
import logger from './utils/logger';

logger.debug('Processing scan', { scanId, protocolId });
logger.info('Scan completed', { scanId, duration });
logger.error('Scan failed', { scanId, error: error.message });
```

### Log Filtering

```bash
# Filter by level
railway logs --filter "level=error"

# Filter by service
railway logs --filter "service=backend"

# Filter by keyword
railway logs --filter "scan failed"

# Combine filters
railway logs --filter "level=error" --filter "scan" --since 1h
```

---

## Monitoring and Alerting Setup

### Health Check Monitoring

**UptimeRobot Configuration**:
```
Monitor Type: HTTP(s)
URL: https://api.yourdomain.com/health
Interval: 5 minutes
Alert Contacts: team@yourdomain.com
Alert After: 2 failures
```

### Error Tracking (Sentry)

```bash
# Already configured in backend
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

**Sentry Alerts**:
- New issues (first occurrence)
- Issue spike (10x normal rate)
- Critical errors (database, payment)

### Custom Alerts

```bash
# Alert on high queue depth
railway alerts create \
  --metric queue_depth \
  --threshold 100 \
  --channel slack

# Alert on high error rate
railway alerts create \
  --metric error_rate \
  --threshold 5 \
  --channel email
```

### Metrics Dashboard

**Grafana Configuration**:
```yaml
# Connect to Prometheus data source
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090

# Import dashboard
# Use dashboard ID: 12345 (custom)
```

---

**Last Updated**: 2026-02-01
