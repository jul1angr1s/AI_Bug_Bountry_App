# Spec: Error Handling

## ADDED Requirements

### Requirement: Centralized error handler middleware
The system SHALL handle all errors through centralized middleware.

#### Scenario: Express error caught
- **WHEN** route handler throws error
- **THEN** system catches in error middleware and formats response

#### Scenario: 404 Not Found
- **WHEN** request matches no route
- **THEN** system returns 404 with message "Route not found"

### Requirement: Custom error classes
The system SHALL provide custom error classes for common scenarios.

#### Scenario: ValidationError thrown
- **WHEN** input validation fails
- **THEN** system returns 400 with validation details

#### Scenario: NotFoundError thrown
- **WHEN** resource not found in database
- **THEN** system returns 404 with resource type and ID

#### Scenario: UnauthorizedError thrown
- **WHEN** authentication fails
- **THEN** system returns 401 with auth error message

#### Scenario: ForbiddenError thrown
- **WHEN** user lacks required permissions
- **THEN** system returns 403 with permission error

### Requirement: Error logging
The system SHALL log errors with context for debugging.

#### Scenario: Error logged with request context
- **WHEN** error occurs during request
- **THEN** system logs error with request ID, user ID, endpoint, and stack trace

#### Scenario: Production error sanitization
- **WHEN** error occurs in production environment
- **THEN** system logs full details but returns sanitized message to client

### Requirement: HTTP status code mapping
The system SHALL map errors to appropriate HTTP status codes.

#### Scenario: Database connection error
- **WHEN** Prisma throws connection error
- **THEN** system returns 503 Service Unavailable

#### Scenario: Validation error
- **WHEN** Zod validation fails
- **THEN** system returns 400 Bad Request

#### Scenario: Unhandled error
- **WHEN** unexpected error occurs
- **THEN** system returns 500 Internal Server Error

### Requirement: Request ID tracking
The system SHALL attach unique request ID to all requests.

#### Scenario: Request ID generated
- **WHEN** request enters system
- **THEN** system generates UUID and attaches as req.id

#### Scenario: Request ID in error response
- **WHEN** error response is sent
- **THEN** system includes request ID for debugging

#### Scenario: Request ID in logs
- **WHEN** error is logged
- **THEN** system includes request ID in log entry
