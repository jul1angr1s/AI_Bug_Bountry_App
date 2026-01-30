# Spec: API Routing

## ADDED Requirements

### Requirement: Base API route structure
The system SHALL organize routes under /api/v1 base path.

#### Scenario: API versioning
- **WHEN** routes are registered
- **THEN** system mounts all routes under /api/v1 prefix

#### Scenario: Version in response headers
- **WHEN** any API response is sent
- **THEN** system includes X-API-Version: 1.0 header

### Requirement: Route organization by resource
The system SHALL group routes by resource type.

#### Scenario: Protocol routes grouped
- **WHEN** protocol-related routes are registered
- **THEN** system mounts under /api/v1/protocols router

#### Scenario: Scan routes grouped
- **WHEN** scan-related routes are registered
- **THEN** system mounts under /api/v1/scans router

### Requirement: RESTful conventions
The system SHALL follow RESTful naming and HTTP method conventions.

#### Scenario: Resource collection endpoint
- **WHEN** GET /api/v1/protocols is called
- **THEN** system returns array of protocol resources

#### Scenario: Single resource endpoint
- **WHEN** GET /api/v1/protocols/:id is called
- **THEN** system returns single protocol object

#### Scenario: Resource creation
- **WHEN** POST /api/v1/protocols is called with valid body
- **THEN** system creates resource and returns 201 with Location header

#### Scenario: Resource update
- **WHEN** PATCH /api/v1/protocols/:id is called
- **THEN** system updates specified fields and returns updated resource

#### Scenario: Resource deletion
- **WHEN** DELETE /api/v1/protocols/:id is called
- **THEN** system deletes resource and returns 204 No Content

### Requirement: Response formatting
The system SHALL use consistent JSON response format.

#### Scenario: Success response format
- **WHEN** request succeeds
- **THEN** system returns data in consistent structure with data field

#### Scenario: Error response format
- **WHEN** request fails
- **THEN** system returns error object with code, message, and optional details

#### Scenario: Pagination metadata
- **WHEN** collection endpoint returns paginated results
- **THEN** system includes total, page, limit, hasNext, hasPrev in metadata

### Requirement: Request validation middleware
The system SHALL validate request parameters using Zod schemas.

#### Scenario: Valid request body
- **WHEN** request body matches Zod schema
- **THEN** system passes validated data to route handler

#### Scenario: Invalid request body
- **WHEN** request body fails Zod validation
- **THEN** system returns 400 with detailed validation errors

#### Scenario: Query parameter validation
- **WHEN** query parameters fail validation
- **THEN** system returns 400 with parameter error details

### Requirement: Route handler error handling
The system SHALL wrap route handlers with error catching.

#### Scenario: Async handler error
- **WHEN** async route handler throws error
- **THEN** system catches error and passes to error handler middleware

#### Scenario: Synchronous error
- **WHEN** route handler throws synchronous error
- **THEN** system catches and handles with appropriate status code
