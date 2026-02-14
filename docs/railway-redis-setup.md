# Railway Redis Setup Guide

## Overview
This guide covers adding Redis to your Railway project for the Dashboard API endpoints caching layer.

## Steps

### 1. Add Redis Service
1. Log in to Railway dashboard
2. Navigate to your project
3. Click "New Service" → "Database" → "Redis"
4. Railway will automatically provision Redis 7.x

### 2. Environment Variables
Railway automatically creates these variables:
- `REDIS_URL` - Full connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Authentication password

### 3. Connect to Backend Service
Link the Redis service to your backend API service:
1. Go to backend service settings
2. Under "Service Variables", the Redis variables will be available
3. The backend will use `REDIS_URL` for connection

### 4. Local Development
For local development, add to `.env`:
```
REDIS_URL=redis://localhost:6379
```

Run Redis locally with Docker:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 5. Health Check Configuration
Redis health checks are automatic in Railway. Monitor via:
- Railway Dashboard → Redis Service → Metrics
- Custom health endpoint: `/api/v1/health` (includes Redis status)

### 6. Resource Limits
Default Railway Redis configuration:
- Memory: 512MB (can be increased)
- Connections: 10,000
- Persistence: RDB snapshots enabled

Increase memory if needed:
- Railway Dashboard → Redis Service → Settings → Resources

## Verification
Test Redis connection:
```bash
# From Railway CLI
railway run redis-cli -u $REDIS_URL ping
# Expected: PONG
```

## Cost
Railway Redis pricing:
- Free tier: Included (with usage limits)
- Pro tier: ~$5/month for 512MB
- Scale tier: Pay-as-you-grow

## Next Steps
After Redis is provisioned:
1. Note the REDIS_URL from Railway dashboard
2. Proceed with Task 1.2 (Install dependencies)
3. Backend will auto-connect using REDIS_URL environment variable
