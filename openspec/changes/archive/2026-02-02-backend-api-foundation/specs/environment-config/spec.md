# Spec: Environment Config

## ADDED Requirements

### Requirement: Environment variable loading
The system SHALL load environment variables from .env file in development.

#### Scenario: Development environment
- **WHEN** NODE_ENV is development or undefined
- **THEN** system loads variables from .env file using dotenv

#### Scenario: Production environment
- **WHEN** NODE_ENV is production
- **THEN** system uses environment variables from Railway without loading .env

### Requirement: Required variable validation
The system SHALL validate required environment variables on startup.

#### Scenario: All required variables present
- **WHEN** application starts with all required variables
- **THEN** system proceeds with initialization

#### Scenario: Missing required variable
- **WHEN** required variable like DATABASE_URL is missing
- **THEN** system logs error and exits with code 1

### Requirement: Configuration schema
The system SHALL define typed configuration schema using Zod.

#### Scenario: Valid configuration
- **WHEN** environment variables match schema
- **THEN** system provides typed config object

#### Scenario: Invalid configuration
- **WHEN** environment variable has wrong type (e.g., PORT not a number)
- **THEN** system throws validation error with details

### Requirement: Multi-environment support
The system SHALL support development, staging, and production environments.

#### Scenario: Development defaults
- **WHEN** NODE_ENV is development
- **THEN** system uses localhost URLs and verbose logging

#### Scenario: Production configuration
- **WHEN** NODE_ENV is production
- **THEN** system requires HTTPS, disables debug logging, and enforces security

### Requirement: Sensitive data protection
The system SHALL never log sensitive configuration values.

#### Scenario: Config logged at startup
- **WHEN** application logs configuration
- **THEN** system masks values for DATABASE_URL, JWT_SECRET, and API keys

### Requirement: Configuration access
The system SHALL provide centralized config access throughout application.

#### Scenario: Config imported in module
- **WHEN** module imports config
- **THEN** system provides validated, typed configuration object

#### Scenario: Config hot reload in development
- **WHEN** .env file changes during development
- **THEN** system requires restart to load new values
