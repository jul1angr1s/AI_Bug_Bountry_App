## ADDED Requirements

### Requirement: SIWE message verification MUST be server-authoritative
The backend MUST validate SIWE message semantics server-side, including domain, chain ID, nonce freshness, issued-at window, and expiration, before issuing any session token.

#### Scenario: SIWE message has mismatched domain
- **WHEN** a signed SIWE message contains a domain that does not match allowed backend domains
- **THEN** the authentication request is rejected with an authorization error

#### Scenario: SIWE nonce is replayed
- **WHEN** a previously accepted nonce is submitted again
- **THEN** the authentication request is rejected and a security event is logged

### Requirement: Session tokens MUST use storage and transport with minimal XSS exposure
Browser-accessible long-lived bearer token persistence MUST NOT be the default for authenticated user sessions.

#### Scenario: Session is established
- **WHEN** a user successfully authenticates
- **THEN** session continuity uses HttpOnly cookie transport by default and does not require localStorage token persistence

### Requirement: CSRF protections MUST remain strict on browser mutation paths
State-changing browser requests MUST fail closed if CSRF proof is absent or invalid, including bearer-authenticated browser-originated paths.

#### Scenario: Missing CSRF proof on mutation request
- **WHEN** a browser client submits a POST, PUT, PATCH, or DELETE request without valid CSRF proof
- **THEN** the server returns a CSRF error and no state mutation occurs

### Requirement: SSE authentication MUST avoid query-string credentials
SSE authentication MUST use cookie-based or equivalent secure channel authentication and MUST NOT rely on query-string tokens in normal operation.

#### Scenario: SSE request includes query token
- **WHEN** an SSE endpoint receives authentication only from a query-string token
- **THEN** the request is rejected outside explicitly documented, non-production fallback test mode
