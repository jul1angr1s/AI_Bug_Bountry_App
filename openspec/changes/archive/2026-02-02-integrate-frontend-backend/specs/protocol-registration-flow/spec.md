## ADDED Requirements

### Requirement: Authenticated protocol registration submission
The frontend SHALL submit protocol registration requests to the backend using an authenticated request with a Supabase JWT in the `Authorization` header.

#### Scenario: Valid protocol registration request
- **WHEN** a signed-in user submits the protocol registration form
- **THEN** the client sends `POST /api/v1/protocols` with `Authorization: Bearer <jwt>` and receives a success response

### Requirement: Registration request payload matches backend contract
The frontend SHALL send a protocol registration payload that matches the backend API contract for protocol creation.

#### Scenario: Protocol registration payload validation
- **WHEN** the user provides required fields (e.g., protocol name, GitHub repo URL, contract path, bounty terms)
- **THEN** the client sends a payload accepted by `POST /api/v1/protocols` without schema validation errors

### Requirement: Registration status visibility
The frontend SHALL display the newly created protocol’s registration state using backend data.

#### Scenario: Protocol registration status after creation
- **WHEN** the backend returns a protocol record for the new registration
- **THEN** the UI displays the protocol status (e.g., PENDING/PROCESSING/ACTIVE/FAILED) from `GET /api/v1/protocols/:id`

