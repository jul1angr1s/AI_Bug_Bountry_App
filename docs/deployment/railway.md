# Railway Production Deployment Guide

This guide covers deploying the Thunder Security backend to Railway for production use.

## Prerequisites

- Railway CLI installed (`npm install -g @railway/cli`)
- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Supabase production database provisioned

## Deployment Steps

### 1. Create Railway Project

**Via Railway Dashboard:**
1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `jul1angr1s/AI_Bug_Bountry_App`

**Via CLI:**
```bash
# Login to Railway
railway login

# Initialize project
railway init
```

### 2. Configure Project Settings

**Set Root Directory:**
1. Go to Project Settings in Railway dashboard
2. Set **Root Directory** to: `backend/`
3. Save changes

This tells Railway to look for `package.json` in the `backend/` directory.

### 3. Add PostgreSQL Service

**Option A: Railway PostgreSQL (Recommended for simplicity)**
1. Click **"New"** in Railway dashboard
2. Select **Database** → **Add PostgreSQL**
3. Railway auto-injects `DATABASE_URL`

**Option B: External Supabase PostgreSQL**
- Use your existing Supabase database
- Set `DATABASE_URL` manually in environment variables

### 4. Add Redis Service

1. Click **"New"** in Railway dashboard
2. Select **Database** → **Add Redis**
3. Railway auto-injects:
   - `REDIS_URL`
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `REDIS_PASSWORD`

### 5. Configure Environment Variables

Set these in Railway dashboard (Variables tab):

**Required:**
| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://ekxbtdlnbellyhovgoxw.supabase.co` | Supabase dashboard |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase dashboard |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` | Your frontend URL |
| `NODE_ENV` | `production` | Fixed |

**Auto-injected by Railway:**
| Variable | Description |
|----------|-------------|
| `PORT` | Railway assigns a port (usually 3000+) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `RAILWAY_ENVIRONMENT` | Current environment name |
| `RAILWAY_SERVICE_NAME` | Service name |

### 6. Verify railway.json Configuration

The `backend/railway.json` file is pre-configured:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && node dist/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  },
  "healthcheck": {
    "path": "/api/v1/health",
    "timeout": 100,
    "interval": 30
  },
  "regions": ["us-west1"]
}
```

This configuration:
- Builds with Nixpacks (Node 20)
- Runs Prisma migrations on startup
- Health checks at `/api/v1/health`
- Auto-restarts on failure (max 3 retries)

### 7. Deploy

**Automatic Deployment:**
```bash
# Push to main branch triggers deployment
git checkout main
git merge feature/backend-deployment-infrastructure
git push origin main
```

**Manual Deployment (via CLI):**
```bash
cd backend
railway up
```

### 8. Monitor Deployment

**Via Dashboard:**
1. Go to your project in Railway dashboard
2. Click on the backend service
3. View **Deployments** tab
4. Monitor build logs in real-time

**What to look for:**
- ✅ Build completes successfully
- ✅ Prisma migrations run without errors
- ✅ Application starts without crashes
- ✅ Health checks pass (200 OK)

### 9. Verify Deployment

**Check Health Endpoint:**
```bash
# Replace with your Railway URL
curl https://your-app.railway.app/api/v1/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-01-31T...",
#   "database": "ok",
#   "redis": "ok"
# }
```

**Test API Endpoints:**
```bash
# List protocols
curl https://your-app.railway.app/api/v1/protocols

# Check scans
curl https://your-app.railway.app/api/v1/scans

# Vulnerabilities
curl https://your-app.railway.app/api/v1/vulnerabilities
```

**Test WebSocket:**
Connect from your frontend to:
```
wss://your-app.railway.app/ws
```

## Environment Variables Reference

### Supabase (Required)
Get from: https://supabase.com/dashboard/project/ekxbtdlnbellyhovgoxw/settings/api

- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key (keep secret!)

### Database (Auto-injected by Railway)
- `DATABASE_URL` - Full PostgreSQL connection string

### Cache (Auto-injected by Railway)
- `REDIS_URL` - Full Redis connection string
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password

### Application (Required)
- `NODE_ENV` - Must be `production`
- `FRONTEND_URL` - Your frontend domain for CORS

### Railway (Auto-injected)
- `PORT` - Assigned port (don't hardcode 3000)
- `RAILWAY_STATIC_URL` - Static asset URL (if applicable)

## Troubleshooting

### Build Failures

**Issue: Prisma generate fails**
```
Error: Prisma schema not found
```
**Solution:** Ensure `prisma/schema.prisma` exists in the repository

**Issue: TypeScript compilation errors**
```
Error: Cannot find module
```
**Solution:** Check that all imports are correct and dependencies are in package.json

### Deployment Failures

**Issue: Health check fails**
```
Health check failed: connection refused
```
**Solution:** 
- Check application logs for startup errors
- Verify `PORT` environment variable is used (not hardcoded)
- Ensure health endpoint is at `/api/v1/health`

**Issue: Prisma migration fails**
```
Error: P1001: Can't reach database server
```
**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check if PostgreSQL service is healthy in Railway dashboard
- Ensure migrations are in `prisma/migrations/` directory

### Runtime Issues

**Issue: CORS errors from frontend**
```
Access to fetch blocked by CORS policy
```
**Solution:** 
- Verify `FRONTEND_URL` matches your actual frontend domain
- Check if `http://` vs `https://` mismatch

**Issue: WebSocket connection fails**
```
WebSocket connection failed
```
**Solution:**
- Use `wss://` (secure) not `ws://`
- Verify WebSocket path matches backend configuration

## Rollback Procedure

**Instant Rollback (Railway Dashboard):**
1. Go to Deployments tab
2. Find the previous working deployment
3. Click **"Rollback"**
4. Traffic switches within 30 seconds

**Important:** Database migrations are forward-only. Rolling back code doesn't rollback database schema changes.

## Scaling

**Vertical Scaling:**
- Upgrade service plan in Railway dashboard
- More CPU/RAM automatically allocated

**Horizontal Scaling:**
- Railway auto-scales based on traffic (on paid plans)
- No configuration needed

## Monitoring

**Railway Dashboard:**
- View logs in real-time
- Check resource usage (CPU, memory)
- Monitor deployment history

**Health Checks:**
- Railway pings `/api/v1/health` every 30 seconds
- Failed health checks trigger auto-restart
- 3 consecutive failures mark deployment as unhealthy

## Security Best Practices

1. **Never commit secrets** - Use Railway environment variables
2. **Service Role Key** - Only use on server, never expose to client
3. **CORS Configuration** - Restrict to your frontend domain only
4. **Health Endpoint** - Don't expose sensitive data in health checks

## Cost Optimization

**Free Tier Limits:**
- 10GB egress/month
- 10GB disk total
- 512MB RAM per service
- Shared CPU

**Optimization Tips:**
- Use connection pooling (already configured in DATABASE_URL)
- Enable Prisma query caching for repeated queries
- Monitor logs to detect inefficient queries

## Next Steps

After successful deployment:
1. Update frontend to use production backend URL
2. Configure custom domain (optional)
3. Set up monitoring/alerts
4. Document API endpoints for consumers

## Architecture

```
┌──────────────────────────────────────────┐
│           Railway Platform               │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │   Backend    │  │  PostgreSQL  │     │
│  │   (Node 20)  │  │   (Railway)  │     │
│  │   Nixpacks   │  │              │     │
│  └──────────────┘  └──────────────┘     │
│         │                                │
│  ┌──────────────┐                       │
│  │    Redis     │                       │
│  │   (Railway)  │                       │
│  └──────────────┘                       │
│                                          │
└──────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   Supabase      │
    │  (Auth/Storage) │
    └─────────────────┘
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Prisma Deployment: https://prisma.io/docs/deployment
