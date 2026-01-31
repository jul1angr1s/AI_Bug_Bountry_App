## 1. Project Setup & Dependencies

- [x] 1.1 Create backend/ directory structure (src/, prisma/, tests/, dist/)
- [x] 1.2 Initialize backend/package.json with Node.js 20.x and TypeScript 5.x project metadata
- [x] 1.3 Add production dependencies (express, @prisma/client, @supabase/supabase-js, socket.io, zod, cors, helmet, morgan, dotenv)
- [x] 1.4 Add dev dependencies (typescript, @types/express, @types/cors, @types/morgan, prisma, tsx, nodemon)
- [x] 1.5 Create backend/tsconfig.json configured for Node.js with strict mode and ES2022 target
- [x] 1.6 Create backend/.env.example with required variables (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL, PORT, NODE_ENV)
- [x] 1.7 Add backend/.gitignore (node_modules, dist, .env, *.log)
- [x] 1.8 Add npm scripts (dev, build, start, prisma:generate, prisma:migrate, prisma:studio) to package.json

## 2. Environment Configuration

- [x] 2.1 Create backend/src/config/env.ts with Zod schema for environment validation
- [x] 2.2 Define envSchema with required fields (NODE_ENV enum, PORT coerce.number, DATABASE_URL url, SUPABASE_URL url, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL)
- [x] 2.3 Export typed config object parsed from process.env with fail-fast validation
- [x] 2.4 Add dotenv configuration to load .env in development only (check NODE_ENV !== 'production')

## 3. Database Schema & Prisma Setup

- [x] 3.1 Create backend/prisma/schema.prisma with generator and datasource configuration
- [x] 3.2 Define Protocol model (id, authUserId, ownerAddress, githubUrl, branch, contractPath, contractName, bountyTerms, status, riskScore, createdAt, updatedAt)
- [x] 3.3 Define ProtocolStatus enum (PENDING, ACTIVE, PAUSED, DEPRECATED)
- [x] 3.4 Add unique constraint on Protocol.githubUrl and index on Protocol.ownerAddress
- [x] 3.5 Define Vulnerability model (id, protocolId, vulnerabilityHash, severity, status, discoveredAt, bounty, proof)
- [x] 3.6 Define Severity enum (CRITICAL, HIGH, MEDIUM, LOW, INFO) and VulnerabilityStatus enum
- [x] 3.7 Add Protocol foreign key to Vulnerability with onDelete Cascade
- [x] 3.8 Add composite index on Vulnerability (protocolId, discoveredAt)
- [x] 3.9 Define Agent model (id, type, status, currentTask, taskProgress, lastHeartbeat, uptime, scansCompleted)
- [x] 3.10 Define AgentType enum (PROTOCOL, RESEARCHER, VALIDATOR) and AgentStatus enum (ONLINE, OFFLINE, SCANNING, ERROR)
- [x] 3.11 Add index on Agent.lastHeartbeat for timeout detection
- [x] 3.12 Define Scan model (id, protocolId, agentId, status, startedAt, completedAt, vulnerabilitiesFound)
- [x] 3.13 Add Protocol and Agent foreign keys to Scan model
- [x] 3.14 Define Payment model (id, vulnerabilityId, amount, currency, txHash, status, paidAt)
- [x] 3.15 Define PaymentStatus enum (PENDING, COMPLETED, FAILED)
- [x] 3.16 Add Vulnerability foreign key to Payment model
- [ ] 3.17 Run prisma db push or generate initial migration to create tables in Supabase

## 4. Prisma Client Integration

- [x] 4.1 Create backend/src/lib/prisma.ts with singleton pattern implementation
- [x] 4.2 Export getPrismaClient() function with lazy initialization
- [x] 4.3 Configure PrismaClient with environment-based logging (['query', 'error'] in dev, ['error'] in prod)
- [x] 4.4 Add connection pool configuration (connectionLimit=5 in DATABASE_URL)
- [x] 4.5 Run prisma generate to create Prisma Client types

## 5. Error Handling Infrastructure

- [x] 5.1 Create backend/src/errors/CustomError.ts with base custom error class
- [x] 5.2 Define ValidationError class extending Error with details field
- [x] 5.3 Define NotFoundError class with resource type and ID fields
- [x] 5.4 Define UnauthorizedError class for authentication failures
- [x] 5.5 Define ForbiddenError class for authorization failures
- [x] 5.6 Create backend/src/middleware/errorHandler.ts with centralized error handler
- [x] 5.7 Implement mapErrorToStatus() function mapping error classes to HTTP status codes
- [x] 5.8 Implement sanitizeError() function that hides stack traces in production
- [x] 5.9 Format error responses with {error: {code, message, requestId, details?}} structure
- [x] 5.10 Add 404 handler middleware for undefined routes

## 6. Request Context Middleware

- [x] 6.1 Install nanoid dependency for request ID generation
- [x] 6.2 Create backend/src/middleware/requestId.ts attaching unique ID to req.id
- [x] 6.3 Add X-Request-ID response header with generated ID
- [x] 6.4 Extend Express Request type definition to include id and user fields

## 7. Authentication Middleware

- [x] 7.1 Create backend/src/lib/supabase.ts with admin Supabase client (service role key)
- [x] 7.2 Create backend/src/middleware/auth.ts with authenticate() middleware
- [x] 7.3 Extract Bearer token from Authorization header in authenticate()
- [x] 7.4 Call supabase.auth.getUser(token) to verify JWT and get user metadata
- [x] 7.5 Attach user object to req.user if token valid, or call next() if no token (optional auth)
- [x] 7.6 Throw UnauthorizedError if token verification fails
- [x] 7.7 Export requireAuth() middleware that throws UnauthorizedError if req.user is missing

## 8. API Routing Foundation

- [x] 8.1 Create backend/src/routes/index.ts as main router aggregator
- [x] 8.2 Create Express Router mounted at /api/v1
- [x] 8.3 Add X-API-Version: 1.0 header to all responses via middleware
- [x] 8.4 Create backend/src/routes/health.ts with /health endpoint
- [x] 8.5 Implement health check returning {status: 'ok', timestamp, database, redis?}
- [x] 8.6 Test database connectivity in health check using prisma.$queryRaw
- [x] 8.7 Create placeholder routers for /api/v1/protocols, /api/v1/scans, /api/v1/vulnerabilities (to be implemented in dashboard-api-endpoints)
- [x] 8.8 Mount placeholder routers in main router with comments indicating future implementation

## 9. WebSocket Server Setup

- [x] 9.1 Create backend/src/websocket/server.ts initializing Socket.io attached to HTTP server
- [x] 9.2 Configure Socket.io CORS to accept frontend origin from config
- [x] 9.3 Create backend/src/websocket/handlers.ts with connection event handler
- [x] 9.4 Implement WebSocket authentication by extracting token from handshake.auth
- [x] 9.5 Verify JWT using supabase.auth.getUser() and attach user to socket.data.user
- [x] 9.6 Disconnect socket if authentication fails
- [x] 9.7 Create backend/src/websocket/rooms.ts with joinProtocol event handler
- [x] 9.8 Implement joinProtocol logic: leave existing protocol rooms, join protocol:{protocolId} room
- [x] 9.9 Add disconnect event handler to clean up rooms
- [x] 9.10 Add connection limit enforcement (max 3 connections per user)
- [x] 9.11 Implement heartbeat mechanism with 60s timeout
- [x] 9.12 Add heartbeat ping/pong handlers updating lastSeen timestamp

## 10. Express Server Implementation

- [x] 10.1 Create backend/src/server.ts as main entry point
- [x] 10.2 Load environment configuration and validate with Zod
- [x] 10.3 Initialize Express app instance
- [x] 10.4 Add helmet middleware for security headers
- [x] 10.5 Configure CORS middleware with whitelist from config.FRONTEND_URL
- [x] 10.6 Set CORS credentials: true for authenticated requests
- [x] 10.7 Add morgan middleware for HTTP request logging (dev format in development, combined in production)
- [x] 10.8 Add express.json() middleware for JSON body parsing
- [x] 10.9 Add requestId middleware before routes
- [x] 10.10 Add authenticate middleware (optional auth for all routes)
- [x] 10.11 Mount /api/v1 router from routes/index.ts
- [x] 10.12 Add 404 handler after all routes
- [x] 10.13 Add centralized error handler as last middleware
- [x] 10.14 Create HTTP server from Express app
- [x] 10.15 Initialize Socket.io server attached to HTTP server
- [x] 10.16 Register WebSocket connection handlers
- [x] 10.17 Start server listening on config.PORT
- [x] 10.18 Log startup message with port and environment

## 11. Graceful Shutdown

- [x] 11.1 Create shutdown() function in server.ts accepting signal string
- [x] 11.2 Log shutdown signal received
- [x] 11.3 Set 10-second timeout that forces process.exit(1) if shutdown hangs
- [x] 11.4 Call server.close() to stop accepting new HTTP connections
- [x] 11.5 Call io.close() to disconnect all WebSocket clients
- [x] 11.6 Call prisma.$disconnect() to close database connection pool
- [x] 11.7 Clear timeout and call process.exit(0) on successful shutdown
- [x] 11.8 Register shutdown() for SIGTERM signal (Railway deployment)
- [x] 11.9 Register shutdown() for SIGINT signal (local Ctrl+C)

## Stage 1: Local Validation (Required before Stage 2)

- [x] S1.1 Run backend build (`npm --prefix backend run build`)
- [x] S1.2 Run automated smoke test script (local)
- [x] S1.3 Manual /api/v1/health check returns 200 OK (503 degraded when DB unavailable - correct behavior)
- [x] S1.4 Manual 404 response matches error format

## 12. Local Development Testing

- [x] 12.1 Create backend/.env file with local development values
- [x] 12.2 Set DATABASE_URL pointing to Supabase project with ?connection_limit=5
- [x] 12.3 Run npm install in backend/ directory
- [x] 12.4 Run npm run prisma:generate to create Prisma Client
- [x] 12.5 Start backend with npm run dev
- [x] 12.6 Test /health endpoint returns 200 OK with database connectivity (returns 503 degraded when DB unavailable - correct behavior)
- [x] 12.7 Test undefined route returns 404 with error format
- [ ] 12.8 Test WebSocket connection with valid Supabase JWT token
- [ ] 12.9 Test joinProtocol event joins correct room
- [ ] 12.10 Test authentication middleware with valid and invalid tokens

## Stage 2: Deployment (Deferred until Stage 1 complete)

## 13. Railway Deployment Setup (Stage 2)

- [ ] 13.1 Create Railway project linked to repository
- [ ] 13.2 Add backend service with root directory set to backend/
- [ ] 13.3 Configure environment variables in Railway (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL, NODE_ENV=production)
- [ ] 13.4 Set build command: npm install && npm run prisma:generate && npm run build
- [ ] 13.5 Set start command: node dist/server.js
- [ ] 13.6 Configure PORT environment variable (Railway auto-assigns)
- [ ] 13.7 Deploy backend service to Railway
- [ ] 13.8 Verify deployment health check endpoint is accessible
- [ ] 13.9 Check Railway logs for successful startup message
- [ ] 13.10 Test WebSocket connection to Railway backend URL from frontend

## 14. Frontend Integration (Stage 2)

- [ ] 14.1 Update frontend/.env with VITE_API_URL pointing to Railway backend
- [ ] 14.2 Test frontend API client connects to backend /health endpoint
- [ ] 14.3 Test frontend authentication flow passes JWT to backend
- [ ] 14.4 Verify backend returns user context in protected routes
- [ ] 14.5 Test frontend WebSocket manager connects to backend Socket.io server
- [ ] 14.6 Verify WebSocket authentication works with frontend Supabase session
- [ ] 14.7 Test joinProtocol event from frontend joins correct room
- [ ] 14.8 Verify CORS allows frontend origin (check browser console for errors)

## 15. Documentation & Cleanup

- [ ] 15.1 Create backend/README.md with setup instructions
- [ ] 15.2 Document required environment variables in README
- [ ] 15.3 Document npm scripts usage (dev, build, start, prisma commands)
- [ ] 15.4 Document Railway deployment process
- [ ] 15.5 Add TypeScript type exports from backend/src/types/ for shared types
- [ ] 15.6 Update project/Architecture.md with backend component diagram
- [ ] 15.7 Update project/APIRoutes.md with foundation endpoints (/health, /api/v1)
- [ ] 15.8 Document WebSocket events and room structure
- [ ] 15.9 Add troubleshooting section for common issues (connection limits, CORS, JWT)
- [ ] 15.10 Verify all temporary console.log statements removed or replaced with proper logging
