## 1. Docker Configuration Files (Backend) - Use `/skill:docker-expert`

**IMPORTANT:** All tasks in this section MUST use the docker-expert skill (`/skill:docker-expert` or `/docker:expert`) to ensure best practices, security hardening, and optimization.

- [x] 1.1 Create multi-stage Dockerfile with base, development, and production targets (`backend/Dockerfile`) - VALIDATED with docker-expert
- [x] 1.2 Create .dockerignore file to exclude unnecessary files from Docker builds (`backend/.dockerignore`) - VALIDATED with docker-expert
- [x] 1.3 Create docker-compose.yml orchestrating backend, PostgreSQL, and Redis (`backend/docker-compose.yml`) - VALIDATED with docker-expert
- [x] 1.4 Create .env.docker.example template with Docker networking configuration (`backend/.env.docker.example`)

## 2. Package.json Docker Scripts (Backend)

- [x] 2.1 Add `docker:build` script to build default Docker image
- [x] 2.2 Add `docker:build:dev` script to build development target
- [x] 2.3 Add `docker:build:prod` script to build production target
- [x] 2.4 Add `docker:up` script to start all services with docker-compose
- [x] 2.5 Add `docker:down` script to stop services
- [x] 2.6 Add `docker:logs` script to tail backend logs
- [x] 2.7 Add `docker:restart` script to restart backend service
- [x] 2.8 Add `docker:clean` script to remove containers and volumes

## 3. Railway Configuration (Backend)

- [x] 3.1 Create railway.json with build and deploy configuration (`backend/railway.json`)
- [x] 3.2 Update health check endpoint to include Redis connectivity test (`backend/src/routes/health.ts`)
- [x] 3.3 Verify Prisma migration command in railway.json start script

## 4. Local Docker Testing (Phase 1) - Use `/skill:docker-expert`

**IMPORTANT:** Use docker-expert skill for troubleshooting any Docker issues in this phase.

- [x] 4.1 Copy .env.docker.example to .env.local and configure Supabase credentials
- [ ] 4.2 Build development Docker image using docker-expert guidance: `npm run docker:build:dev`
- [ ] 4.3 Start full stack with docker-compose: `npm run docker:up`
- [ ] 4.4 Verify PostgreSQL health check passes (use docker-expert for troubleshooting)
- [ ] 4.5 Verify Redis health check passes (use docker-expert for troubleshooting)
- [ ] 4.6 Verify backend health check passes at http://localhost:3000/api/v1/health
- [ ] 4.7 Test hot-reload by editing src/routes/health.ts and verifying restart
- [ ] 4.8 Test database connection by running Prisma Studio: `docker exec thunder-backend npx prisma studio`
- [ ] 4.9 Test Redis connection by checking logs for successful connection
- [ ] 4.10 Run smoke tests inside container: `docker exec thunder-backend npm run smoke`

## 5. Production Docker Image Testing - Use `/skill:docker-expert`

**IMPORTANT:** Use docker-expert skill to validate production readiness and optimization.

- [ ] 5.1 Build production Docker image with docker-expert validation: `npm run docker:build:prod`
- [ ] 5.2 Verify production image size is less than 300MB using docker-expert: `docker images thunder-backend:prod`
- [ ] 5.3 Run production container locally with environment variables (docker-expert validates security)
- [ ] 5.4 Verify production container runs as non-root user (nodejs:1001) - docker-expert confirms
- [ ] 5.5 Test health check endpoint responds correctly in production mode

## 6. Railway Project Setup (Phase 2)

- [ ] 6.1 Create new Railway project from dashboard
- [ ] 6.2 Link Railway project to GitHub repository
- [ ] 6.3 Configure root directory as `backend/` in Railway settings
- [ ] 6.4 Add PostgreSQL service/addon to Railway project
- [ ] 6.5 Add Redis service/addon to Railway project
- [ ] 6.6 Verify Railway auto-injects DATABASE_URL and REDIS_URL

## 7. Railway Environment Configuration

- [ ] 7.1 Set SUPABASE_URL in Railway environment variables
- [ ] 7.2 Set SUPABASE_ANON_KEY in Railway environment variables
- [ ] 7.3 Set SUPABASE_SERVICE_ROLE_KEY in Railway environment variables
- [ ] 7.4 Set FRONTEND_URL to production frontend domain
- [ ] 7.5 Set NODE_ENV to `production`
- [ ] 7.6 Verify all required environment variables are configured

## 8. Railway Deployment

- [ ] 8.1 Push railway.json to main branch
- [ ] 8.2 Trigger Railway deployment by pushing to main
- [ ] 8.3 Monitor Railway build logs for successful completion
- [ ] 8.4 Verify Prisma migrations run successfully during deployment
- [ ] 8.5 Verify application starts without errors
- [ ] 8.6 Test health check endpoint at Railway-provided URL
- [ ] 8.7 Verify WebSocket connections work from frontend
- [ ] 8.8 Test API endpoints (/api/v1/protocols, /api/v1/scans, /api/v1/vulnerabilities)

## 9. Documentation

- [x] 9.1 Create docs/deployment/local-docker.md with Phase 1 instructions
- [x] 9.2 Create docs/deployment/railway.md with Phase 2 instructions
- [x] 9.3 Document environment variable setup for both local and Railway
- [x] 9.4 Document troubleshooting common Docker issues (port conflicts, volume permissions)
- [x] 9.5 Document Railway rollback procedure
- [x] 9.6 Update main README.md with deployment section linking to guides

## 10. Validation and Cleanup - Use `/skill:docker-expert`

**IMPORTANT:** Final validation using docker-expert skill to ensure all Docker best practices are met.

- [ ] 10.1 Use docker-expert to verify all Docker Compose services start successfully
- [ ] 10.2 Use docker-expert to verify hot-reload works in development Docker setup
- [ ] 10.3 Use docker-expert to verify production image meets size requirements (< 300MB)
- [ ] 10.4 Verify Railway deployment completes successfully
- [ ] 10.5 Use docker-expert to verify health checks pass in both local and Railway environments
- [ ] 10.6 Clean up any test data from local PostgreSQL
- [ ] 10.7 Update backend-api-foundation change to mark deployment tasks as complete
