## ADDED Requirements

### Requirement: Docker expertise applied to Railway configurations
All Dockerfile optimizations for Railway deployment SHALL use the docker-expert skill to ensure production-ready security, performance, and reliability standards.

#### Scenario: Optimizing Dockerfile for Railway
- **WHEN** preparing Dockerfile for Railway production deployment
- **THEN** docker-expert skill validates image size, security hardening, and health checks

#### Scenario: Validating production Docker configuration
- **WHEN** verifying Railway-ready Docker setup
- **THEN** docker-expert skill confirms non-root user, minimal image size, and proper layer caching

### Requirement: Railway configuration file
The backend SHALL include railway.json configuration file for declarative Railway deployment setup.

#### Scenario: Railway.json defines build command
- **WHEN** Railway reads railway.json
- **THEN** build command includes `npm install && npx prisma generate && npm run build`

#### Scenario: Railway.json defines start command
- **WHEN** Railway deploys application
- **THEN** start command runs `npx prisma migrate deploy && node dist/server.js`

#### Scenario: Railway.json configures health check
- **WHEN** Railway performs health check
- **THEN** system requests `/api/v1/health` endpoint with 100ms timeout and 30s interval

#### Scenario: Railway.json sets restart policy
- **WHEN** application crashes
- **THEN** Railway restarts container with ON_FAILURE policy up to 3 retries

### Requirement: Automated Prisma migrations on deployment
Railway deployment SHALL run Prisma migrations automatically before starting the application server.

#### Scenario: Migrations run on first deployment
- **WHEN** Railway deploys application for first time
- **THEN** `npx prisma migrate deploy` creates database schema

#### Scenario: Migrations run on subsequent deployments
- **WHEN** Railway deploys application with new migrations
- **THEN** `npx prisma migrate deploy` applies pending migrations before starting server

#### Scenario: Migration failure prevents server start
- **WHEN** Prisma migration fails
- **THEN** deployment fails and Railway does not start application server

### Requirement: Health check endpoint validates deployment
Railway SHALL use `/api/v1/health` endpoint to verify successful deployment and enable zero-downtime deployments.

#### Scenario: Health check succeeds after deployment
- **WHEN** Railway completes deployment
- **THEN** health check endpoint returns 200 status with database connectivity confirmation

#### Scenario: Health check fails triggers rollback
- **WHEN** health check fails after deployment
- **THEN** Railway marks deployment as failed and maintains previous version

#### Scenario: Health check retries on temporary failure
- **WHEN** first health check request fails
- **THEN** Railway retries up to 3 times with 5-second timeout before marking deployment failed

### Requirement: Environment variables configured via Railway dashboard
Railway deployment SHALL use environment variables set in Railway dashboard for production secrets.

#### Scenario: Database URL from Railway PostgreSQL addon
- **WHEN** Railway PostgreSQL addon is enabled
- **THEN** Railway auto-injects DATABASE_URL with connection pooling parameters

#### Scenario: Redis URL from Railway Redis addon
- **WHEN** Railway Redis addon is enabled
- **THEN** Railway auto-injects REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

#### Scenario: Supabase credentials from manual configuration
- **WHEN** deployer sets SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in Railway dashboard
- **THEN** application uses these credentials for authentication

#### Scenario: Frontend URL for CORS configuration
- **WHEN** deployer sets FRONTEND_URL in Railway dashboard
- **THEN** Express CORS middleware allows requests from this origin

#### Scenario: Node environment set to production
- **WHEN** Railway deploys application
- **THEN** NODE_ENV is set to `production` for optimized performance

### Requirement: Railway auto-assigns PORT variable
Railway deployment SHALL use auto-assigned PORT environment variable instead of hardcoded port.

#### Scenario: Railway injects PORT variable
- **WHEN** Railway starts container
- **THEN** Railway sets PORT environment variable (typically 3000-8000 range)

#### Scenario: Application listens on Railway PORT
- **WHEN** Express server starts
- **THEN** server listens on `process.env.PORT` provided by Railway

### Requirement: Railway builds use Nixpacks builder
Railway SHALL use Nixpacks builder for automatic detection and building of Node.js application.

#### Scenario: Nixpacks detects Node.js 20
- **WHEN** Railway analyzes repository
- **THEN** Nixpacks uses Node.js 20 based on package.json engines field

#### Scenario: Nixpacks caches dependencies
- **WHEN** Railway performs subsequent builds
- **THEN** Nixpacks reuses cached node_modules if package.json unchanged

#### Scenario: Build completes within timeout
- **WHEN** Railway builds application
- **THEN** total build time is less than 10 minutes (Railway free tier limit)

### Requirement: Railway deployment triggered by Git push
Railway SHALL automatically deploy application when changes are pushed to main branch.

#### Scenario: Push to main triggers deployment
- **WHEN** developer pushes commit to main branch
- **THEN** Railway automatically starts build and deployment process

#### Scenario: Deployment status visible in Railway dashboard
- **WHEN** deployment is in progress
- **THEN** Railway dashboard shows real-time build logs and deployment status

#### Scenario: Deployment URL is stable
- **WHEN** Railway completes deployment
- **THEN** application is accessible at stable Railway-provided URL (e.g., thunder-backend.up.railway.app)

### Requirement: Railway supports instant rollback
Railway SHALL provide instant rollback capability to previous successful deployment.

#### Scenario: Rollback to previous deployment
- **WHEN** deployer clicks "Rollback" in Railway dashboard
- **THEN** Railway switches traffic to previous deployment within 30 seconds

#### Scenario: Database state after rollback
- **WHEN** rollback occurs
- **THEN** database migrations remain at current state (forward-only, no automatic rollback)

### Requirement: Railway root directory configuration
Railway project SHALL be configured with root directory set to `backend/` subdirectory.

#### Scenario: Railway reads from backend subdirectory
- **WHEN** Railway builds project
- **THEN** Railway uses backend/ as root directory for package.json and build commands

#### Scenario: Railway ignores frontend directory
- **WHEN** Railway builds project
- **THEN** Railway does not include frontend/ files in build process
