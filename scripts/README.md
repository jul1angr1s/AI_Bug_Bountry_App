# Development Scripts

This directory contains automation scripts for managing the Thunder Security development environment.

## Scripts Overview

### `dev.sh` - Start Development Environment

Starts the complete development stack including Docker services and local dev servers.

**Usage:**
```bash
bash scripts/dev.sh
```

**What it does:**
1. Loads environment variables from `.env.local` and `.env`
2. Validates Docker is running
3. Builds/rebuilds Docker images if needed
4. Starts Postgres + Redis containers
5. Starts backend dev server (port 3000)
6. Starts researcher worker
7. Starts frontend dev server (port 5173)
8. Waits for backend health check

**Shutdown behavior:**
- Press `Ctrl+C` to stop all dev servers
- Fast shutdown (2-3 seconds) with graceful then forced termination
- Automatically kills tsx/vite processes and child processes
- Cleans up ports 3000 and 5173
- Docker services (Postgres/Redis) keep running

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `START_BACKEND` | `1` | Set to `0` to skip backend server |
| `START_FRONTEND` | `1` | Set to `0` to skip frontend server |
| `START_RESEARCHER_WORKER` | `1` | Set to `0` to skip researcher worker |
| `KILL_EXISTING` | `0` | Set to `1` to kill processes on ports 3000/5173 |
| `REBUILD` | `0` | Set to `1` to rebuild Docker images before starting |
| `FORCE_REBUILD` | `0` | Set to `1` to rebuild with `--no-cache` |
| `SKIP_DB_INIT` | `0` | Set to `1` to skip automatic database schema sync |

**Examples:**
```bash
# Standard start
bash scripts/dev.sh

# Start with rebuild
REBUILD=1 bash scripts/dev.sh

# Start only backend + Docker services
START_FRONTEND=0 bash scripts/dev.sh

# Force rebuild from scratch
FORCE_REBUILD=1 bash scripts/dev.sh

# Kill existing processes and start fresh
KILL_EXISTING=1 bash scripts/dev.sh
```

---

### `rebuild.sh` - Clean Rebuild

Completely rebuilds Docker environment from scratch. Use when dependencies change or containers misbehave.

**Usage:**
```bash
bash scripts/rebuild.sh
```

**What it does:**
1. Stops all Thunder Security containers
2. Removes all volumes (⚠️ **database data will be lost**)
3. Removes dangling images and build cache
4. Rebuilds all Docker images with `--no-cache`
5. Starts fresh containers
6. Waits for health checks

**When to use:**
- After updating `package.json` dependencies
- After modifying `Dockerfile`
- When containers fail to start properly
- When you need a completely clean state
- When getting "module not found" errors

**Interactive prompt:**
The script will ask for confirmation before proceeding since it destroys data.

---

## Common Workflows

### First Time Setup
```bash
# 1. Copy environment files
cp backend/.env.example backend/.env
cp backend/.env.docker.example backend/.env.docker

# 2. Update .env with your credentials

# 3. Build and start
REBUILD=1 bash scripts/dev.sh
```

### Daily Development
```bash
# Quick start (uses existing containers)
bash scripts/dev.sh
```

### After Updating Dependencies
```bash
# Full rebuild
bash scripts/rebuild.sh

# Then start dev environment
bash scripts/dev.sh
```

### Debugging Container Issues
```bash
# 1. Check container status
docker ps --filter "name=thunder"

# 2. View logs
docker logs thunder-backend
docker logs thunder-postgres
docker logs thunder-redis

# 3. Force rebuild if needed
bash scripts/rebuild.sh
```

### Working on Backend Only
```bash
START_FRONTEND=0 bash scripts/dev.sh
```

### Working on Frontend Only
```bash
# Start just Docker services
START_BACKEND=0 START_FRONTEND=0 START_RESEARCHER_WORKER=0 bash scripts/dev.sh

# In another terminal, start frontend manually
cd frontend && npm run dev
```

---

## Troubleshooting

### "Docker is not running"
**Solution:** Start Docker Desktop application

### "Port 3000 already in use"
**Solution 1:** Set `KILL_EXISTING=1` to kill existing process
```bash
KILL_EXISTING=1 bash scripts/dev.sh
```

**Solution 2:** Manually kill the process
```bash
lsof -ti tcp:3000 | xargs kill
```

### "Cannot find package 'X'"
This usually means Docker image is outdated.

**Solution:** Rebuild Docker images
```bash
bash scripts/rebuild.sh
```

### "Backend is unhealthy"
**Check logs:**
```bash
docker logs thunder-backend --tail 50
```

**Common fixes:**
1. Rebuild: `bash scripts/rebuild.sh`
2. Check environment variables in `.env`
3. Verify database connection string

### Database Connection Errors
**Check Postgres is healthy:**
```bash
docker ps --filter "name=thunder-postgres"
```

**If unhealthy, rebuild:**
```bash
bash scripts/rebuild.sh
```

---

## Service URLs

When running `dev.sh`, services are available at:

| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:3000 | Express server |
| Frontend | http://localhost:5173 | Vite dev server |
| Postgres | localhost:5432 | Database |
| Redis | localhost:6379 | Cache/Queue |
| Health Check | http://localhost:3000/api/v1/health | Backend health |

---

## Tips

1. **Use REBUILD=1 sparingly** - Only rebuild when dependencies change
2. **Keep Docker Desktop running** - Pre-flight checks will catch this
3. **Check logs first** - Before rebuilding, check `docker logs` to diagnose
4. **Use environment variables** - Customize behavior without editing scripts
5. **Ctrl+C stops cleanly** - Dev servers will shut down gracefully

---

## Advanced Usage

### Custom Environment Files
```bash
# Load custom env file
export ENV_FILE=/path/to/custom.env
bash scripts/dev.sh
```

### Running in CI/CD
```bash
# Non-interactive mode
START_FRONTEND=0 START_RESEARCHER_WORKER=0 bash scripts/dev.sh
```

### Selective Service Start
```bash
# Only start Postgres
docker compose -f backend/docker-compose.yml up -d postgres

# Only start Redis
docker compose -f backend/docker-compose.yml up -d redis

# Start backend container
docker compose -f backend/docker-compose.yml up -d backend
```

---

## Script Maintenance

### Adding New Services

1. Update `docker-compose.yml` with new service
2. Add health check to `dev.sh` waiting loop
3. Update this README with new service info

### Modifying Scripts

- Always use `set -euo pipefail` for safety
- Add descriptive comments
- Test on clean environment before committing
- Update README documentation
