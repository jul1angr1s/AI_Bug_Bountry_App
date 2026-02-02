## Context

The Thunder Security backend is built with Express + Prisma + Socket.io and currently runs via `npm run dev` for local development. The backend-api-foundation change has implemented core infrastructure (auth, middleware, WebSocket, health checks) but lacks deployment configurations for containerized testing and production deployment.

**Current State:**
- Backend runs directly on host machine with `tsx watch` for hot-reload
- Database and Redis connections require external Supabase and local/external Redis instances
- No standardized way to test the full stack (backend + database + cache) locally
- Railway deployment is documented but not configured with infrastructure-as-code

**Constraints:**
- Must support hot-reload for development to maintain developer productivity
- Must minimize image size for production to reduce costs and deployment time
- Railway uses Nixpacks builder by default (supports Dockerfile and package.json builds)
- Prisma requires `npx prisma generate` at build time and `npx prisma migrate deploy` at startup
- Health checks are required for Railway's zero-downtime deployments

**Stakeholders:**
- Developers: Need fast local iteration with hot-reload
- DevOps/Platform: Need standardized, reproducible deployments
- QA/Testing: Need full-stack local environment for integration tests

## Goals / Non-Goals

**Goals:**
- Provide multi-stage Dockerfile supporting both development (hot-reload) and production (optimized) builds
- Enable full local stack testing with docker-compose (backend + PostgreSQL + Redis)
- Configure Railway deployment with health checks, automatic migrations, and proper build commands
- Maintain fast rebuild times in development (< 5 seconds for code changes)
- Minimize production image size (< 300MB) by excluding dev dependencies
- Document deployment workflows for both Phase 1 (local) and Phase 2 (Railway)

**Non-Goals:**
- Kubernetes manifests or Helm charts (Railway handles orchestration)
- Multi-region deployment strategy (Railway's future enhancement)
- CI/CD pipeline setup (GitHub Actions - separate change)
- Frontend containerization (frontend deployed to Vercel/Netlify)
- Load balancing configuration (Railway auto-scales with built-in LB)

## Decisions

### 1. Multi-Stage Dockerfile with Development and Production Targets

**Decision:** Use Docker multi-stage build with three targets: `base` (common setup), `development` (hot-reload), and `production` (optimized).

**Rationale:**
- Single Dockerfile maintains consistency between dev and prod environments
- Development stage mounts source code as volume for hot-reload without rebuilding
- Production stage uses compiled TypeScript with minimal dependencies
- Base stage eliminates duplication of common setup (Node 20 Alpine, OpenSSL for Prisma)

**Alternatives Considered:**
- **Separate Dockerfiles**: Rejected - leads to drift between dev/prod configurations
- **Single-stage production-only**: Rejected - no hot-reload for local development
- **Node 20 Debian vs Alpine**: Chose Alpine for 50% smaller image size (150MB vs 300MB base)

### 2. Docker Compose for Full Local Stack

**Decision:** Create docker-compose.yml orchestrating backend, PostgreSQL 15, and Redis 7 with health checks and volume persistence.

**Rationale:**
- Simulates production environment locally (separate database, not host machine DB)
- Enables integration testing without external Supabase dependency
- Health checks ensure services start in correct order (DB ready → backend starts)
- Named volumes persist data across container restarts

**Alternatives Considered:**
- **Use external Supabase for local dev**: Rejected - requires internet, slower, can't test DB migrations locally
- **SQLite for local dev**: Rejected - PostgreSQL-specific features (JSONB, arrays) not compatible
- **Separate docker-compose files per service**: Rejected - overhead for simple stack, prefer single orchestration file

### 3. Railway Configuration via railway.json

**Decision:** Use railway.json for declarative infrastructure configuration with Nixpacks builder, custom build/start commands, and health checks.

**Rationale:**
- Declarative config committed to git ensures reproducible deployments
- Railway auto-injects `PORT` environment variable (no hardcoding needed)
- Health check path `/api/v1/health` enables zero-downtime deployments
- Custom start command runs `prisma migrate deploy` before starting server (idempotent)

**Alternatives Considered:**
- **Rely on Railway dashboard config only**: Rejected - not version-controlled, hard to reproduce
- **Use Dockerfile for Railway**: Rejected - Nixpacks is Railway's recommended approach, faster builds
- **Separate migration job**: Rejected - Railway's ephemeral runners make this complex, prefer migration on startup

### 4. Environment Variable Strategy

**Decision:** Three environment file templates:
- `.env.example`: Direct host development (existing)
- `.env.docker.example`: Docker Compose setup with container networking
- Railway dashboard: Production secrets (not in git)

**Rationale:**
- Docker Compose uses service names for networking (`postgres:5432`, `redis:6379`)
- Supabase credentials must be provided by developer (security - not committed)
- Railway injects `DATABASE_URL` and `REDIS_URL` automatically via add-ons

**Alternatives Considered:**
- **Single .env file for all environments**: Rejected - different connection strings for host/container/Railway
- **Hardcode Docker connection strings**: Rejected - reduces flexibility, harder to override

### 5. Package.json Convenience Scripts

**Decision:** Add `docker:*` scripts for common Docker operations (build, up, down, logs, restart, clean).

**Rationale:**
- Developers shouldn't need to remember long docker-compose commands
- Consistent with existing script patterns (`prisma:*`, `dev`, `build`)
- `docker:clean` removes volumes for fresh state (useful for migration testing)

**Alternatives Considered:**
- **Makefile**: Rejected - Node.js projects typically use npm scripts, avoids adding Make dependency
- **Bash scripts in bin/**: Rejected - npm scripts are more discoverable and cross-platform

### 6. Docker Expert Skill for All Docker Operations

**Decision:** Mandate using the `docker-expert` skill (`.claude/skills/docker-expert/`) for all Docker-related operations, configurations, and optimizations throughout the project.

**Rationale:**
- Ensures consistent Docker best practices (security hardening, layer optimization, multi-stage builds)
- Provides expert guidance for container security (non-root users, secrets management)
- Applies optimization strategies automatically (image size, build cache, layer ordering)
- Validates configurations against production deployment standards
- Maintains knowledge consistency across all Docker implementations

**Implementation:**
- All Docker file creation/modification must invoke `/skill:docker-expert` or `/docker:expert`
- Skill provides comprehensive expertise in: optimization, security, multi-stage builds, orchestration
- Skill validates: non-root users, health checks, .dockerignore, layer caching, image size
- OpenSpec tasks reference the skill explicitly for Docker operations

**Alternatives Considered:**
- **Manual Docker implementation**: Rejected - inconsistent practices, potential security gaps
- **Generic container skill**: Rejected - need Docker-specific expertise for production readiness

## Risks / Trade-offs

### 1. Docker Image Size

**Risk:** Production image could exceed 300MB due to Prisma binaries and dependencies.

**Mitigation:**
- Use Alpine base (50% smaller than Debian)
- Multi-stage build excludes devDependencies
- .dockerignore prevents copying node_modules, tests, docs

### 2. Local PostgreSQL vs Supabase Drift

**Risk:** Local PostgreSQL might diverge from Supabase (different versions, extensions).

**Mitigation:**
- Use PostgreSQL 15 (same as Supabase default)
- Document migration: test locally → deploy to Railway with Supabase connection
- Prisma schema is source of truth (migrations are version-controlled)

### 3. Prisma Generate Performance

**Risk:** Running `prisma generate` on every Docker build adds 10-15 seconds.

**Mitigation:**
- Cache node_modules layer in Dockerfile (only regenerates if package.json changes)
- Development stage reuses generated client from initial build
- Production builds are infrequent (only on deployment)

### 4. Health Check False Positives

**Risk:** Health check passes but database connection fails (Prisma pool exhaustion).

**Mitigation:**
- Health check endpoint (`/api/v1/health`) tests database connectivity with `prisma.$queryRaw`
- Connection pool limit set to 5 (prevents exhaustion on Supabase free tier)
- Railway retries health check 3 times with 5s timeout

### 5. Hot-Reload Performance in Docker

**Risk:** File change detection might be slow on macOS/Windows due to filesystem mounting overhead.

**Mitigation:**
- Use `:ro` (read-only) volume mounts for source code (reduces sync overhead)
- tsx watch uses native Node.js watch mode (efficient)
- Developers can still use direct `npm run dev` if Docker watch is slow

### 6. Railway Build Timeouts

**Risk:** Railway free tier has 10-minute build timeout; TypeScript compilation + Prisma generation might exceed this.

**Mitigation:**
- Optimize `tsconfig.json` for faster builds (`incremental: true`)
- Railway caches dependencies between builds (only rebuilds on package.json change)
- Estimated build time: < 3 minutes (well under limit)

## Migration Plan

### Phase 1: Local Docker Deployment (Staging)

**Objective:** Enable developers to test backend in containerized environment before Railway deployment.

**Steps:**
1. Copy `.env.docker.example` to `.env.local` and add Supabase credentials
2. Run `npm run docker:up` to start full stack (backend + PostgreSQL + Redis)
3. Verify health check: `curl http://localhost:3000/api/v1/health`
4. Test WebSocket connections: Connect from frontend to `ws://localhost:3000`
5. Run smoke tests: `docker exec thunder-backend npm run smoke`
6. Test hot-reload: Edit `src/routes/health.ts`, verify logs show restart
7. Test Prisma migrations: `docker exec thunder-backend npx prisma migrate dev`

**Rollback:** Stop containers with `npm run docker:down`, revert to direct `npm run dev`.

### Phase 2: Railway Production Deployment

**Objective:** Deploy backend to Railway with automated migrations and health checks.

**Prerequisites:**
- Phase 1 local testing complete
- Railway project created and linked to GitHub repo
- Supabase production database provisioned
- Redis add-on enabled in Railway

**Steps:**
1. Create Railway project: `railway init` (link to GitHub repo)
2. Set root directory: Railway dashboard → Settings → `backend/`
3. Add Supabase PostgreSQL add-on or use external DATABASE_URL
4. Add Redis add-on (Railway auto-injects REDIS_URL)
5. Set environment variables in Railway dashboard:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL=https://yourdomain.com`
   - `NODE_ENV=production`
6. Deploy: Push to `main` branch → Railway auto-builds and deploys
7. Verify deployment:
   - Check Railway logs for migration success
   - Test health endpoint: `curl https://your-app.railway.app/api/v1/health`
   - Connect frontend to production backend URL

**Rollback:**
- Railway supports instant rollback to previous deployment (click "Rollback" in dashboard)
- Database migrations are forward-only (rollback requires manual migration reversal)

### Deployment Checklist

**Before First Deployment:**
- [ ] Railway project created and linked to GitHub
- [ ] Environment variables set in Railway dashboard
- [ ] Supabase production database provisioned
- [ ] Redis add-on enabled
- [ ] `railway.json` reviewed and committed
- [ ] Health check endpoint tested locally

**Per Deployment:**
- [ ] Local tests pass (`npm run smoke`)
- [ ] Docker build succeeds (`npm run docker:build:prod`)
- [ ] Prisma migrations reviewed (`prisma migrate diff`)
- [ ] Frontend updated with new backend URL (if changed)

## Open Questions

1. **Should we add a staging Railway environment?**
   - Consideration: Separate Railway project for staging vs production
   - Decision: Defer to future change; start with single production environment

2. **Do we need database migration rollback scripts?**
   - Consideration: Prisma doesn't support automatic rollbacks
   - Decision: Document manual rollback procedures in future operations guide

3. **Should health check include Redis connectivity test?**
   - Consideration: Current health check only tests database
   - Decision: Yes, add Redis ping to health check (low overhead, high value)

4. **Should we implement graceful shutdown for in-flight WebSocket connections?**
   - Consideration: Railway sends SIGTERM with 10s timeout; current server.ts handles this
   - Decision: Already implemented in backend-api-foundation (graceful shutdown with 10s timeout)
