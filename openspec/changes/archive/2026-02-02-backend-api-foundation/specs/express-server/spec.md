# Spec: Express Server

## ADDED Requirements

### Requirement: Express application initialization
The system SHALL initialize an Express 4.x application with TypeScript 5.x configuration.

#### Scenario: Server starts successfully
- **WHEN** application is started with valid configuration
- **THEN** system binds to configured PORT and logs startup message

#### Scenario: Port already in use
- **WHEN** configured PORT is already bound by another process
- **THEN** system logs error and exits with non-zero status code

### Requirement: Middleware stack configuration
The system SHALL configure middleware in correct order for request processing.

#### Scenario: Middleware order preserved
- **WHEN** request is received
- **THEN** system processes middleware in order: helmet → cors → morgan → json → routes → error handler

#### Scenario: JSON body parsing
- **WHEN** request includes JSON body
- **THEN** system parses body and makes available as req.body object

#### Scenario: Body size limit enforcement
- **WHEN** request body exceeds 10MB limit
- **THEN** system returns 413 Payload Too Large error

### Requirement: CORS configuration
The system SHALL configure Cross-Origin Resource Sharing for frontend integration.

#### Scenario: Allowed origin request
- **WHEN** request originates from configured frontend origin
- **THEN** system includes Access-Control-Allow-Origin header in response

#### Scenario: Disallowed origin request
- **WHEN** request originates from unconfigured origin
- **THEN** system rejects request with CORS error

#### Scenario: Preflight OPTIONS request
- **WHEN** browser sends preflight OPTIONS request
- **THEN** system responds with allowed methods and headers

### Requirement: Security headers
The system SHALL apply security headers using Helmet middleware.

#### Scenario: Security headers applied
- **WHEN** any response is sent
- **THEN** system includes Content-Security-Policy, X-Frame-Options, and X-Content-Type-Options headers

### Requirement: Request logging
The system SHALL log all HTTP requests using Morgan middleware.

#### Scenario: Request logged in development
- **WHEN** request is processed in development environment
- **THEN** system logs using 'dev' format with colored output

#### Scenario: Request logged in production
- **WHEN** request is processed in production environment
- **THEN** system logs using 'combined' format with full details

### Requirement: Graceful shutdown
The system SHALL handle shutdown signals gracefully.

#### Scenario: SIGTERM received
- **WHEN** process receives SIGTERM signal
- **THEN** system stops accepting new connections, completes active requests, closes database connections, and exits with code 0

#### Scenario: SIGINT received during development
- **WHEN** process receives SIGINT signal (Ctrl+C)
- **THEN** system performs graceful shutdown sequence

### Requirement: Health check endpoint
The system SHALL provide GET /health endpoint for monitoring.

#### Scenario: Healthy server
- **WHEN** GET /health is called and all systems operational
- **THEN** system returns 200 with status "ok" and component health

#### Scenario: Degraded server
- **WHEN** GET /health is called and database unreachable
- **THEN** system returns 503 with status "degraded" and failing components
