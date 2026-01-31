# Local Docker Deployment Guide

This guide covers how to run the Thunder Security backend locally using Docker Compose for development and testing.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- Git repository cloned locally

## Quick Start

### 1. Configure Environment Variables

The `.env.local` file is already configured with your Supabase credentials. Verify it exists in `backend/.env.local`:

```bash
cd backend
cat .env.local
```

### 2. Build Development Image

```bash
npm run docker:build:dev
```

This creates the `thunder-backend:dev` image with hot-reload capabilities.

### 3. Start Full Stack

```bash
npm run docker:up
```

This starts three services:
- **Backend API** (http://localhost:3000)
- **PostgreSQL 15** (port 5432)
- **Redis 7** (port 6379)

### 4. Verify Health Checks

Wait 30 seconds for services to initialize, then check:

```bash
# Backend health
curl http://localhost:3000/api/v1/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-01-31T...",
#   "database": "ok",
#   "redis": "ok"
# }
```

### 5. Test Hot-Reload

Edit `backend/src/routes/health.ts` and save. The container should automatically restart within 5 seconds.

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build default image |
| `npm run docker:build:dev` | Build development image with hot-reload |
| `npm run docker:build:prod` | Build production image (optimized) |
| `npm run docker:up` | Start all services |
| `npm run docker:down` | Stop all services |
| `npm run docker:logs` | Tail backend logs |
| `npm run docker:restart` | Restart backend service |
| `npm run docker:clean` | Stop and remove all containers + volumes |

## Service Details

### Backend API
- **URL**: http://localhost:3000
- **Health Endpoint**: http://localhost:3000/api/v1/health
- **Hot-Reload**: Enabled via `tsx watch`
- **Logs**: `docker-compose logs -f backend`

### PostgreSQL
- **Host**: localhost:5432 (or `postgres` from within containers)
- **Database**: thunder_security
- **User**: thunder
- **Password**: thunder_dev_2024
- **Data Persistence**: Named volume `postgres_data`

### Redis
- **Host**: localhost:6379 (or `redis` from within containers)
- **Password**: redis_dev_2024
- **Data Persistence**: Named volume `redis_data`

## Common Operations

### View Logs
```bash
# All services
docker-compose logs

# Backend only
docker-compose logs -f backend

# PostgreSQL
docker-compose logs postgres

# Redis
docker-compose logs redis
```

### Run Prisma Commands
```bash
# Access Prisma Studio
docker exec thunder-backend npx prisma studio

# Run migrations
docker exec thunder-backend npx prisma migrate dev

# Generate Prisma client
docker exec thunder-backend npx prisma generate
```

### Execute Commands in Container
```bash
# Open shell
docker exec -it thunder-backend sh

# Run tests
docker exec thunder-backend npm run smoke

# Check Node version
docker exec thunder-backend node --version
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process or change port in docker-compose.yml
```

### Permission Denied (Linux/Mac)
```bash
# Fix Docker socket permissions
sudo chown $USER /var/run/docker.sock
```

### Container Won't Start
```bash
# Check logs for errors
docker-compose logs backend

# Verify environment file exists
ls -la backend/.env.local

# Clean restart
npm run docker:clean
npm run docker:up
```

### Database Connection Failed
```bash
# Check PostgreSQL health
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Verify credentials in .env.local
```

### Hot-Reload Not Working
```bash
# Check if volume is mounted
docker inspect thunder-backend | grep -A 5 Mounts

# Verify file changes are detected
docker exec thunder-backend ls -la src/
```

## Environment Variables

Key variables in `.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | thunder |
| `POSTGRES_PASSWORD` | PostgreSQL password | thunder_dev_2024 |
| `POSTGRES_DB` | PostgreSQL database | thunder_security |
| `REDIS_PASSWORD` | Redis password | redis_dev_2024 |
| `SUPABASE_URL` | Supabase project URL | (from .env) |
| `SUPABASE_ANON_KEY` | Supabase anon key | (from .env) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | (from .env) |
| `FRONTEND_URL` | Frontend origin | http://localhost:5173 |

## Data Persistence

Data is stored in Docker volumes:
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence files

To reset data:
```bash
npm run docker:clean
```

## Next Steps

Once local Docker testing passes:
1. Build production image: `npm run docker:build:prod`
2. Deploy to Railway: See [Railway Deployment Guide](./railway.md)

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Backend    │  │  PostgreSQL  │    │
│  │   (Node 20)  │  │    (15)      │    │
│  │   :3000      │  │   :5432      │    │
│  └──────────────┘  └──────────────┘    │
│         │                                 │
│  ┌──────────────┐                     │
│  │    Redis     │                     │
│  │     (7)      │                     │
│  │    :6379     │                     │
│  └──────────────┘                     │
│                                         │
└─────────────────────────────────────────┘
```
