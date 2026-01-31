## Why

The backend API foundation is ~90% complete but lacks deployment infrastructure for Phase 1 local validation and Phase 2 production deployment. Without containerization and proper deployment configurations, we cannot reliably test the backend in isolation before Railway deployment, leading to potential production issues and slower iteration cycles.

## What Changes

- Add multi-stage Dockerfile supporting development (hot-reload) and production (optimized) builds
- Create docker-compose.yml orchestrating backend + PostgreSQL + Redis for full local stack testing
- Add Railway configuration (railway.json) for production deployment with health checks
- Include Docker convenience scripts in package.json for common operations
- Provide environment templates (.env.docker.example) for local Docker setup
- Document deployment workflows for both Phase 1 (local Docker) and Phase 2 (Railway)

## Capabilities

### New Capabilities
- `local-docker-deployment`: Local containerized backend deployment with hot-reload for development and testing before Railway deployment
- `railway-production-deployment`: Production deployment configuration for Railway PaaS with automated builds, health checks, and Prisma migrations

### Modified Capabilities
<!-- No existing capabilities have requirement changes - this is purely additive infrastructure -->

## Impact

**Affected Components**:
- Backend: New Dockerfile, docker-compose.yml, railway.json, updated package.json scripts
- Environment Management: New .env.docker.example template for local Docker setup
- Documentation: New deployment guides needed for local and Railway workflows
- **Skills**: New docker-expert skill added to `.claude/skills/` for all Docker operations

**Dependencies**:
- Requires backend-api-foundation to be complete (currently at ~90%)
- Enables completion of backend-api-foundation tasks 12.5-12.10 (local validation)
- Unblocks backend-api-foundation tasks 13.1-13.10 (Railway deployment)
- **CRITICAL**: All Docker operations MUST use the docker-expert skill (`/skill:docker-expert` or `/docker:expert`)

**Systems Affected**:
- Development: Developers can now run full stack locally with Docker
- Testing: Enables integration testing against containerized PostgreSQL + Redis
- Production: Standardizes Railway deployment process with health checks and migrations
- **Skills System**: Docker-expert skill ensures consistent best practices across all Docker implementations
