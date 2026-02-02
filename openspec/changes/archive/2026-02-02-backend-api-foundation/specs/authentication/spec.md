# Spec: Authentication

## ADDED Requirements

### Requirement: JWT token verification
The system SHALL verify Supabase JWT tokens on protected routes.

#### Scenario: Valid token provided
- **WHEN** request includes valid JWT in Authorization header
- **THEN** system extracts user ID and attaches to req.user

#### Scenario: Missing token
- **WHEN** protected route accessed without Authorization header
- **THEN** system returns 401 with message "Authentication required"

#### Scenario: Invalid token
- **WHEN** request includes malformed or expired JWT
- **THEN** system returns 401 with message "Invalid or expired token"

#### Scenario: Token signature verification
- **WHEN** token signature is invalid
- **THEN** system rejects token and returns 401 error

### Requirement: User context extraction
The system SHALL extract user context from verified JWT.

#### Scenario: User ID extracted
- **WHEN** JWT is verified successfully
- **THEN** system makes user.id available as req.user.id

#### Scenario: User metadata extracted
- **WHEN** JWT includes user metadata
- **THEN** system makes email and role available in req.user

### Requirement: RLS policy support
The system SHALL support Supabase Row Level Security policies.

#### Scenario: User-scoped query
- **WHEN** Prisma query is executed with req.user context
- **THEN** system applies user ID filter to enforce ownership

#### Scenario: Admin bypass
- **WHEN** user has admin role
- **THEN** system allows querying all records regardless of ownership

### Requirement: Authentication middleware
The system SHALL provide reusable authentication middleware.

#### Scenario: Middleware applied to route
- **WHEN** route uses authenticate middleware
- **THEN** system verifies token before calling route handler

#### Scenario: Optional authentication
- **WHEN** route uses optionalAuth middleware
- **THEN** system attaches user if token present, but allows anonymous access

### Requirement: Admin role enforcement
The system SHALL provide admin-only middleware.

#### Scenario: Admin access granted
- **WHEN** authenticated user has admin role
- **THEN** system allows access to admin routes

#### Scenario: Non-admin blocked
- **WHEN** authenticated user lacks admin role
- **THEN** system returns 403 with message "Admin access required"
