## ADDED Requirements

### Requirement: Protocol registration via UI and API
The system MUST allow a protocol owner to register a protocol by submitting GitHub repository details, contract metadata, and bounty terms through the dashboard UI and the `/api/v1/protocols` endpoint.

#### Scenario: Successful protocol registration submission
- **WHEN** an authenticated protocol owner submits a valid registration payload
- **THEN** the system creates a protocol record in a PENDING state and queues a Protocol Agent registration job

#### Scenario: Duplicate repository registration
- **WHEN** a registration request targets a GitHub URL that already exists
- **THEN** the system rejects the request with a duplicate error and does not enqueue a job

### Requirement: Protocol Agent registration workflow
The Protocol Agent MUST validate repository access, contract path, and compilation before registering the protocol on Base Sepolia.

#### Scenario: Repository validation and contract verification
- **WHEN** the Protocol Agent receives a registration job
- **THEN** it clones the specified repo/branch or commit, verifies the contract path, and compiles the contracts before on-chain registration

#### Scenario: Registration failure handling
- **WHEN** repository validation or compilation fails
- **THEN** the system marks the protocol registration as FAILED with a recorded reason and notifies the dashboard

### Requirement: On-chain registration and funding integration
The system MUST register protocols in ProtocolRegistry and allow bounty pool funding via BountyPool on Base Sepolia.

#### Scenario: On-chain registration success
- **WHEN** the Protocol Agent successfully submits a registerProtocol transaction
- **THEN** the system records the transaction hash and transitions the protocol status to ACTIVE upon confirmation

#### Scenario: Funding request
- **WHEN** a protocol owner submits a funding request to `/api/v1/protocols/:id/fund`
- **THEN** the system records the funding intent and links the transaction hash to the protocol record
