## MODIFIED Requirements

### Requirement: Frontend uses authenticated API access
The frontend SHALL attach a Supabase JWT in the `Authorization: Bearer <jwt>` header for all backend routes that require authentication.

#### Scenario: Authenticated API request
- **WHEN** a signed-in user triggers an API call to a protected endpoint
- **THEN** the client includes `Authorization: Bearer <jwt>` and handles 401 errors by prompting re-authentication

### Requirement: Frontend displays integration error states
The frontend SHALL present user-facing error states when backend requests fail due to auth, validation, or network errors.

#### Scenario: API request fails
- **WHEN** a backend request returns a non-2xx response
- **THEN** the UI displays a clear error message and any actionable remediation (e.g., re-login, retry)

