## ADDED Requirements

### Requirement: All Docker operations use docker-expert skill
All Docker-related file creation, modification, optimization, and troubleshooting SHALL be performed using the docker-expert skill to ensure best practices, security hardening, and optimization standards.

#### Scenario: Creating Docker configurations
- **WHEN** implementing Docker files (Dockerfile, docker-compose.yml, .dockerignore)
- **THEN** developer invokes `/skill:docker-expert` or `/docker:expert` for expert guidance

#### Scenario: Optimizing existing Docker setup
- **WHEN** modifying Docker configurations for optimization or security
- **THEN** docker-expert skill validates changes against best practices

#### Scenario: Troubleshooting Docker issues
- **WHEN** debugging container problems or build failures
- **THEN** docker-expert skill provides expert troubleshooting guidance

### Requirement: Multi-stage Dockerfile with development target
The backend Dockerfile SHALL provide a multi-stage build with a `development` target that supports hot-reload functionality for local development.

#### Scenario: Building development image
- **WHEN** developer runs `docker build --target development -t thunder-backend:dev .`
- **THEN** Docker successfully builds image with tsx watch and source code mounting capabilities

#### Scenario: Hot-reload on code changes
- **WHEN** developer edits source file in mounted volume
- **THEN** tsx watch detects change and restarts server within 5 seconds

#### Scenario: Development image includes devDependencies
- **WHEN** development container starts
- **THEN** container includes tsx, typescript, and other devDependencies for compilation

### Requirement: Multi-stage Dockerfile with production target
The backend Dockerfile SHALL provide a multi-stage build with a `production` target that creates an optimized, minimal image for Railway deployment.

#### Scenario: Building production image
- **WHEN** developer runs `docker build --target production -t thunder-backend:prod .`
- **THEN** Docker builds image excluding devDependencies and including only compiled dist/ output

#### Scenario: Production image size optimization
- **WHEN** production image is built
- **THEN** final image size is less than 300MB

#### Scenario: Production image runs as non-root user
- **WHEN** production container starts
- **THEN** Node.js process runs as user `nodejs` (UID 1001) for security

### Requirement: Docker Compose orchestrates full local stack
The docker-compose.yml file SHALL orchestrate backend API, PostgreSQL 15, and Redis 7 services with proper networking and health checks.

#### Scenario: Starting full stack
- **WHEN** developer runs `docker-compose up -d`
- **THEN** all three services (backend, postgres, redis) start successfully and become healthy

#### Scenario: Service dependency ordering
- **WHEN** docker-compose starts services
- **THEN** backend waits for postgres and redis health checks to pass before starting

#### Scenario: Backend connects to PostgreSQL
- **WHEN** backend container starts
- **THEN** Prisma connects to postgres service using `postgresql://thunder:thunder_dev_2024@postgres:5432/thunder_security`

#### Scenario: Backend connects to Redis
- **WHEN** backend container starts
- **THEN** application connects to redis service using `redis://redis:6379`

### Requirement: Data persistence across container restarts
Docker Compose SHALL use named volumes to persist PostgreSQL and Redis data across container stop/start cycles.

#### Scenario: PostgreSQL data persists after restart
- **WHEN** developer stops and restarts postgres container
- **THEN** database tables and data remain intact

#### Scenario: Redis data persists after restart
- **WHEN** developer stops and restarts redis container
- **THEN** cached data remains intact (appendonly persistence enabled)

### Requirement: Health checks for all services
All services in docker-compose.yml SHALL include health check configurations to ensure proper startup sequencing.

#### Scenario: PostgreSQL health check
- **WHEN** postgres container starts
- **THEN** health check uses `pg_isready` command and passes within 30 seconds

#### Scenario: Redis health check
- **WHEN** redis container starts
- **THEN** health check uses `redis-cli ping` and passes within 30 seconds

#### Scenario: Backend health check
- **WHEN** backend container starts
- **THEN** health check requests `/api/v1/health` endpoint and passes within 30 seconds

### Requirement: Environment variable configuration for Docker
The system SHALL provide .env.docker.example template with Docker-specific connection strings and configuration.

#### Scenario: Environment template includes Docker networking
- **WHEN** developer copies .env.docker.example to .env.local
- **THEN** file includes postgres:5432 and redis:6379 service names for container networking

#### Scenario: Supabase credentials are configurable
- **WHEN** developer sets SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local
- **THEN** backend container uses these credentials for authentication

### Requirement: Docker convenience scripts
The package.json SHALL include npm scripts for common Docker operations.

#### Scenario: Building Docker images
- **WHEN** developer runs `npm run docker:build`
- **THEN** system builds default Docker image

#### Scenario: Starting services
- **WHEN** developer runs `npm run docker:up`
- **THEN** docker-compose starts all services in detached mode

#### Scenario: Viewing logs
- **WHEN** developer runs `npm run docker:logs`
- **THEN** system tails logs from backend container

#### Scenario: Stopping services
- **WHEN** developer runs `npm run docker:down`
- **THEN** docker-compose stops all containers but preserves volumes

#### Scenario: Complete cleanup
- **WHEN** developer runs `npm run docker:clean`
- **THEN** docker-compose stops containers and removes volumes for fresh state

### Requirement: Dockerfile excludes unnecessary files
The .dockerignore file SHALL exclude development files, tests, and documentation from Docker builds.

#### Scenario: Excluding node_modules
- **WHEN** Docker builds image
- **THEN** host node_modules directory is not copied (container installs its own)

#### Scenario: Excluding build artifacts
- **WHEN** Docker builds image
- **THEN** dist/, build/, coverage/ directories are not copied

#### Scenario: Excluding environment files
- **WHEN** Docker builds image
- **THEN** .env, .env.local, .env.*.local files are excluded for security
