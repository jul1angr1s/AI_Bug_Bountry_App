## Why

The project currently lacks a backend API server, blocking critical features like the dashboard-api-endpoints change (106 pending tasks). The completed frontend dashboard UI has no backend to connect to, making it non-functional. A production-ready Express API foundation is needed now to enable dashboard endpoints, agent orchestration, and real-time WebSocket updates.

## What Changes

- Create Node.js/Express 4.x backend server with TypeScript 5.x
- Set up Prisma 5.x ORM connected to Supabase PostgreSQL database
- Implement Supabase JWT authentication middleware with RLS policy enforcement
- Configure Socket.io WebSocket server for real-time updates with room-based broadcasting
- Establish base API route structure following RESTful conventions at `/api/v1`
- Add health check endpoint with database and Redis connectivity status
- Configure CORS for frontend integration (localhost + Railway production domains)
- Set up request logging, error handling middleware, and request ID tracking
- Create environment configuration management for dev/staging/production
- Add graceful shutdown handlers for database connections and WebSocket cleanup

## Capabilities

### New Capabilities
- `express-server`: Express application setup, middleware stack, error handling, and server lifecycle
- `prisma-integration`: Prisma ORM configuration, database schema, migrations, and client singleton
- `authentication`: Supabase JWT authentication middleware, user extraction, and RLS policy support
- `websocket-server`: Socket.io server setup, room management, connection handling, and event broadcasting
- `api-routing`: Base route structure, response formatting, validation middleware, and versioning strategy
- `error-handling`: Centralized error handling, custom error classes, HTTP status mapping, and error logging
- `environment-config`: Environment variable management, config validation, and multi-environment support

### Modified Capabilities
- `database`: Add Prisma schema for protocols, vulnerabilities, agents, scans, and payments (extends existing schema documentation)

## Impact

### Project Structure
- **New Directory**: `backend/` at project root with full Node.js application
  - `backend/src/` - TypeScript source code
  - `backend/prisma/` - Database schema and migrations
  - `backend/tests/` - Unit and integration tests
  - `backend/dist/` - Compiled JavaScript output

### Backend Components Created
- **Express Server**: Main application server with middleware pipeline
- **Prisma Client**: Database access layer with type-safe queries
- **Auth Middleware**: JWT verification and user context extraction
- **WebSocket Server**: Real-time communication layer
- **Route Handlers**: Base route structure for protocols, scans, vulnerabilities
- **Error Handlers**: Centralized error processing and logging

### Database Impact
- **Prisma Schema**: Define all tables (protocols, vulnerabilities, agents, scans, payments, users)
- **Migrations**: Initial migration to create database schema
- **RLS Policies**: Row-level security via Supabase for multi-tenant data isolation
- **Indexes**: Performance indexes on frequently queried fields

### Frontend Integration
- **API Endpoints**: Frontend TanStack Query hooks can connect to real endpoints
- **WebSocket**: Frontend WebSocket manager connects to Socket.io server
- **Authentication**: Frontend passes Supabase JWT in Authorization header
- **CORS**: Configured to accept requests from frontend origin

### Infrastructure Requirements
- **Railway Deployment**: Backend service deployment configuration
- **Environment Variables**: SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL, JWT_SECRET, PORT, NODE_ENV
- **Database Connection**: Supabase PostgreSQL via Prisma connection pooling
- **Port Configuration**: Default port 3000 (configurable via PORT env var)

### Dependencies Added
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@prisma/client": "^5.0.0",
    "@supabase/supabase-js": "^2.38.0",
    "socket.io": "^4.6.0",
    "zod": "^3.22.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/morgan": "^1.9.9",
    "prisma": "^5.0.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
  }
}
```

### Security Considerations
- **JWT Validation**: All protected routes verify Supabase JWT signature
- **RLS Enforcement**: Database queries respect Supabase Row Level Security policies
- **CORS Protection**: Restricted to known frontend origins only
- **Helmet Middleware**: Security headers (CSP, HSTS, X-Frame-Options)
- **Input Validation**: All request bodies/query params validated with Zod
- **Error Sanitization**: Stack traces hidden in production, only shown in development
- **Rate Limiting Foundation**: Prepared for rate-limiter-flexible integration (dashboard-api-endpoints)

### Unblocks
- ✅ dashboard-api-endpoints change (106 tasks) can proceed
- ✅ Future agent orchestration API endpoints
- ✅ Protocol registration API endpoints
- ✅ Vulnerability submission and validation endpoints
- ✅ Payment webhook handlers

### Related Documentation
- See project/Architecture.md for system architecture
- See project/DatabaseSchema.md for Prisma schema reference
- See project/APIRoutes.md for planned endpoint structure
- See project/Security.md for authentication flow diagrams
