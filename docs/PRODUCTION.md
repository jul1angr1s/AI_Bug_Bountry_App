# Production Operations Guide

Complete reference for running the AI Bug Bounty Platform in production environments. This guide covers configuration, monitoring, scaling, and maintenance procedures.

**Related Documentation**:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Initial deployment and setup
- [SECURITY.md](./SECURITY.md) - Security best practices
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) - Backup and disaster recovery

---

## Table of Contents

- [Production Environment Variables](#production-environment-variables)
- [Health Check Monitoring](#health-check-monitoring)
- [Rate Limiting Configuration](#rate-limiting-configuration)
- [Load Balancing](#load-balancing)
- [Database Connection Pooling](#database-connection-pooling)
- [Redis Clustering](#redis-clustering)
- [Auto-Scaling Configuration](#auto-scaling-configuration)
- [Logging and Observability](#logging-and-observability)
- [Performance Tuning](#performance-tuning)
- [Maintenance Procedures](#maintenance-procedures)

---

## Production Environment Variables

### Critical Production Variables

**Backend (`backend/.env.production`)**:

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com

# ============================================
# DATABASE CONFIGURATION (Production)
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/bugbounty?sslmode=require&connection_limit=20&pool_timeout=30"

# Connection Pool Settings
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=20
DATABASE_STATEMENT_TIMEOUT=30000
DATABASE_IDLE_TIMEOUT=600000

# ============================================
# REDIS CONFIGURATION (Production)
# ============================================
REDIS_URL="redis://username:password@host:6379"
REDIS_TLS_ENABLED=true
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Redis Cluster (if using clustering)
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379

# ============================================
# QUEUE CONFIGURATION
# ============================================
QUEUE_CONCURRENCY_PROTOCOL=2
QUEUE_CONCURRENCY_SCAN=5
QUEUE_CONCURRENCY_VALIDATION=3
QUEUE_CONCURRENCY_PAYMENT=2

QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_BACKOFF=exponential

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Per-route rate limits
RATE_LIMIT_AUTH=20
RATE_LIMIT_API=100
RATE_LIMIT_WEBSOCKET=50

# ============================================
# BLOCKCHAIN CONFIGURATION
# ============================================
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# For production on Base mainnet:
# BASE_MAINNET_RPC_URL=https://mainnet.base.org

PRIVATE_KEY=0x...  # Secured in secrets manager
GAS_PRICE_MULTIPLIER=1.1
MAX_GAS_PRICE=100000000000  # 100 gwei
TRANSACTION_TIMEOUT=300000  # 5 minutes

# ============================================
# AI/LLM CONFIGURATION
# ============================================
ANTHROPIC_API_KEY=sk-ant-...  # Secured in secrets manager
MOONSHOT_API_KEY=...  # Secured in secrets manager

AI_CONCURRENCY_LIMIT=5
AI_RATE_LIMIT_RPM=150
AI_TIMEOUT=60000
AI_MAX_RETRIES=3

# ============================================
# MONITORING & OBSERVABILITY
# ============================================
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

LOG_LEVEL=info
LOG_FORMAT=json
LOG_DESTINATION=stdout

# ============================================
# SECURITY
# ============================================
JWT_SECRET=...  # Secured in secrets manager (min 32 chars)
SESSION_SECRET=...  # Secured in secrets manager
BCRYPT_ROUNDS=12

CORS_ENABLED=true
CORS_ORIGIN=https://your-frontend-domain.com
HELMET_ENABLED=true

# ============================================
# PERFORMANCE
# ============================================
NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384"
CLUSTER_WORKERS=auto  # or specific number
GRACEFUL_SHUTDOWN_TIMEOUT=30000
```

### Environment Variable Validation

On startup, the backend validates all required environment variables (there is no standalone `check:env` script):

```bash
# Validate by starting the backend in production mode
cd backend
npm run build
NODE_ENV=production npm run start
```

---

## Health Check Monitoring

### Health Check Endpoints

**Basic Health Check**:
```bash
curl https://api.yourdomain.com/health

# Response:
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

**Detailed Health Check**:
```bash
curl https://api.yourdomain.com/health/detailed

# Response:
{
  "status": "ok",
  "timestamp": "2026-02-01T12:00:00Z",
  "services": {
    "database": {
      "status": "ok",
      "latency": 12,
      "connections": {"active": 5, "idle": 15, "max": 20}
    },
    "redis": {
      "status": "ok",
      "latency": 3,
      "memory": {"used": "50MB", "max": "256MB"}
    },
    "queues": {
      "protocol": {"waiting": 0, "active": 1, "completed": 150, "failed": 2},
      "scan": {"waiting": 3, "active": 2, "completed": 450, "failed": 5},
      "validation": {"waiting": 1, "active": 1, "completed": 200, "failed": 1},
      "payment": {"waiting": 0, "active": 0, "completed": 180, "failed": 3}
    },
    "blockchain": {
      "status": "ok",
      "network": "base-sepolia",
      "blockNumber": 12345678
    }
  }
}
```

### Monitoring Integration

**Uptime Monitoring** (UptimeRobot, Pingdom):
```
Monitor URL: https://api.yourdomain.com/health
Check interval: 60 seconds
Alert on: 3 consecutive failures
```

**Application Performance Monitoring** (Sentry):
```javascript
// Already integrated in backend/src/server.ts
// Monitors:
// - Error rates and exceptions
// - Transaction performance
// - Database query performance
// - API endpoint latency
```

---

## Rate Limiting Configuration

### Global Rate Limiting

Implemented in `backend/src/middleware/rate-limiter.ts`:

```typescript
// Production configuration
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});
```

### Per-Route Rate Limits

```typescript
// Authentication endpoints - stricter limits
POST /api/v1/auth/login       → 5 requests/min
POST /api/v1/auth/register    → 3 requests/min

// Protocol operations
POST /api/v1/protocols        → 10 requests/min
GET  /api/v1/protocols        → 100 requests/min

// Scan operations
POST /api/v1/scans            → 20 requests/min
GET  /api/v1/scans/:id        → 100 requests/min

// Payment operations (admin only)
POST /api/v1/payments/:id/retry → 5 requests/min
```

### Redis-Based Rate Limiting

For distributed deployments:

```bash
# Enable Redis-based rate limiting
RATE_LIMIT_STORE=redis
REDIS_URL=redis://...

# Shared across all backend instances
```

---

## Load Balancing

### Recommended Architecture

```
Internet → Load Balancer → Backend Instances (2+)
                         → PostgreSQL (primary + replica)
                         → Redis (cluster)
```

### NGINX Configuration

```nginx
upstream backend {
    least_conn;  # Use least connections algorithm

    server backend-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server backend-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server backend-3:3000 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### Railway Load Balancing

Railway automatically load balances across multiple replicas:

```bash
# Scale to 3 replicas
railway scale --replicas 3

# Configure health checks
railway healthcheck --path /health --interval 30
```

---

## Database Connection Pooling

### Prisma Connection Pool

Configuration in `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  // Format: ?connection_limit=20&pool_timeout=30
}
```

### Production Pool Settings

```bash
# DATABASE_URL with pool configuration
DATABASE_URL="postgresql://user:password@host:5432/bugbounty?sslmode=require&connection_limit=20&pool_timeout=30&connect_timeout=10"

# Recommended settings:
# - connection_limit: 20 (per backend instance)
# - pool_timeout: 30 seconds
# - connect_timeout: 10 seconds
# - statement_timeout: 30 seconds
```

### Pool Monitoring

```typescript
// Monitor pool health
import { prisma } from './config/database';

async function checkPoolHealth() {
  const metrics = await prisma.$metrics.json();
  console.log('Database pool:', metrics.counters);

  // Expected output:
  // {
  //   "prisma_pool_connections_open": 5,
  //   "prisma_pool_connections_busy": 2,
  //   "prisma_pool_connections_idle": 3
  // }
}
```

### Connection Leak Detection

```bash
# Check for connection leaks
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'bugbounty'
GROUP BY state;

# Expected: idle connections should close within pool_timeout
```

---

## Redis Clustering

### Redis Cluster Setup

For high availability and horizontal scaling:

```bash
# Create Redis cluster (6 nodes: 3 primary + 3 replica)
redis-cli --cluster create \
  redis1:6379 redis2:6379 redis3:6379 \
  redis4:6379 redis5:6379 redis6:6379 \
  --cluster-replicas 1
```

### Application Configuration

```bash
# Enable cluster mode
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379,redis3:6379
REDIS_CLUSTER_RETRY_ATTEMPTS=3
```

### Railway Redis (Managed)

Railway provides managed Redis with automatic failover:

```bash
# Add Redis to Railway project
railway add redis

# Redis URL is automatically configured
# No cluster setup needed - handled by Railway
```

### Redis Sentinel (Alternative)

For managed failover without clustering:

```bash
# Sentinel configuration
REDIS_SENTINEL_ENABLED=true
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_MASTER_NAME=mymaster
```

---

## Auto-Scaling Configuration

### Horizontal Pod Autoscaling (HPA)

For Kubernetes deployments:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Railway Auto-Scaling

```bash
# Configure auto-scaling on Railway
railway autoscale --min 2 --max 10 \
  --cpu-target 70 \
  --memory-target 80
```

### Queue Worker Scaling

BullMQ workers scale based on queue depth:

```typescript
// Configure in backend/src/queues/protocol.queue.ts
const worker = new Worker('protocol', processProtocol, {
  concurrency: process.env.QUEUE_CONCURRENCY_PROTOCOL || 2,
  limiter: {
    max: 5,      // 5 jobs per interval
    duration: 60000  // per 60 seconds
  }
});

// Scale based on queue metrics
async function scaleWorkers() {
  const waiting = await protocolQueue.getWaitingCount();
  const active = await protocolQueue.getActiveCount();

  // If queue depth > 10, request additional workers
  if (waiting > 10 && active < 5) {
    // Trigger scale-up (via cloud provider API)
  }
}
```

---

## Logging and Observability

### Structured Logging

Production logs use JSON format:

```typescript
// Example log output (backend/src/utils/logger.ts)
{
  "level": "info",
  "timestamp": "2026-02-01T12:00:00.000Z",
  "service": "backend",
  "environment": "production",
  "message": "Protocol registered successfully",
  "protocolId": "proto_abc123",
  "userId": "user_xyz789",
  "duration": 1250,
  "traceId": "trace_123"
}
```

### Log Levels

```bash
# Production log level
LOG_LEVEL=info  # Options: error, warn, info, debug, trace

# Only log errors and warnings in production
# Use 'debug' for troubleshooting
```

### Centralized Logging

**Option 1: Cloud Provider Logs** (Railway, Vercel)
```bash
# View logs
railway logs --tail 100
railway logs --filter "level=error"
```

**Option 2: External Service** (Papertrail, Loggly)
```bash
# Configure log drain
LOG_DRAIN_URL=syslog+tls://logs.papertrailapp.com:12345
```

**Option 3: ELK Stack** (Elasticsearch, Logstash, Kibana)
```bash
# Ship logs to Elasticsearch
LOG_DESTINATION=elasticsearch
ELASTICSEARCH_URL=https://elasticsearch:9200
ELASTICSEARCH_INDEX=bugbounty-logs
```

### Metrics and Monitoring

**Application Metrics** (Prometheus format):

```bash
# Metrics endpoint
curl https://api.yourdomain.com/metrics

# Example metrics:
# http_requests_total{method="GET",route="/api/v1/protocols",status="200"} 1523
# http_request_duration_seconds{method="GET",route="/api/v1/protocols"} 0.045
# queue_jobs_waiting{queue="scan"} 3
# queue_jobs_active{queue="scan"} 2
# database_query_duration_seconds{query="findProtocol"} 0.012
```

**Grafana Dashboards**:
- Request rate and latency
- Queue depths and processing rates
- Database connection pool usage
- Error rates by endpoint
- WebSocket connection count

---

## Performance Tuning

### Node.js Optimization

```bash
# Increase heap size for large workloads
NODE_OPTIONS="--max-old-space-size=2048"

# Enable HTTP/2
# Already configured in server.ts

# Use cluster mode for multi-core utilization
CLUSTER_WORKERS=4  # or 'auto' for CPU count
```

### Database Query Optimization

```bash
# Enable query logging (temporarily for analysis)
DATABASE_LOG_QUERIES=true
DATABASE_LOG_SLOW_QUERIES_MS=100

# Analyze slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# Add indexes for common queries
CREATE INDEX idx_protocols_status ON protocols(status);
CREATE INDEX idx_scans_protocol_id ON scans(protocol_id);
CREATE INDEX idx_findings_scan_id ON findings(scan_id);
```

### Caching Strategy

```typescript
// Cache frequently accessed data
const protocolCache = {
  ttl: 300, // 5 minutes
  key: (id) => `protocol:${id}`,
};

// Cache invalidation on updates
async function updateProtocol(id, data) {
  await prisma.protocol.update({ where: { id }, data });
  await redis.del(`protocol:${id}`);
}
```

### CDN Configuration

Serve static assets via CDN:

```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily**:
```bash
# Check health status
curl https://api.yourdomain.com/health/detailed

# Monitor error rates
railway logs --filter "level=error" --since 24h

# Check queue depths
redis-cli LLEN bull:scan:waiting
```

**Weekly**:
```bash
# Analyze database performance
SELECT * FROM pg_stat_database WHERE datname = 'bugbounty';

# Clean up old Redis keys
redis-cli --scan --pattern "cache:*" | xargs redis-cli DEL

# Review Sentry errors
# Visit: https://sentry.io/organizations/your-org/issues/
```

**Monthly**:
```bash
# Update dependencies
npm outdated
npm update

# Vacuum database
psql -c "VACUUM ANALYZE;"

# Review and rotate logs
# Clean up logs older than 90 days
```

### Deployment Procedure

```bash
# 1. Run tests
npm run test
npm run test:e2e

# 2. Build application
npm run build

# 3. Run database migrations
npx prisma migrate deploy

# 4. Deploy with zero downtime
railway up --detach

# 5. Verify health
curl https://api.yourdomain.com/health

# 6. Monitor for errors (5 minutes)
railway logs --follow
```

### Rollback Procedure

```bash
# 1. Rollback to previous deployment
railway rollback

# 2. Rollback database migrations (if needed)
npx prisma migrate resolve --rolled-back <migration_name>

# 3. Verify health
curl https://api.yourdomain.com/health

# 4. Notify team and review incident
```

### Security Updates

```bash
# Check for security vulnerabilities
npm audit

# Update vulnerable packages
npm audit fix

# For breaking changes, update manually
npm update package-name
```

---

## Production Checklist

Before going live:

- [ ] All environment variables configured and secured
- [ ] Database connection pool optimized (20 connections per instance)
- [ ] Redis configured with persistence and backups
- [ ] Rate limiting enabled on all endpoints
- [ ] HTTPS/WSS enforced for all connections
- [ ] CORS configured with production domain
- [ ] Health checks return 200 OK
- [ ] Monitoring and alerting configured (Sentry, UptimeRobot)
- [ ] Load balancing configured (2+ backend instances)
- [ ] Auto-scaling policies defined
- [ ] Database backups automated (daily + continuous WAL)
- [ ] Logs shipped to centralized logging
- [ ] Performance testing completed (load testing with 1000+ concurrent users)
- [ ] Security audit passed
- [ ] Incident response procedures documented
- [ ] On-call rotation established

---

**Last Updated**: 2026-02-01
