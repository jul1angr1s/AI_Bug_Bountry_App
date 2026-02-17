# API Specification

## Overview

RESTful API with WebSocket support. Node.js/Express backend with Zod validation.

## Source Documentation
- **Primary**: [docs/API_ROUTES.md](../../docs/API_ROUTES.md)
- **Supporting**: [docs/INTEGRATION.md](../../docs/INTEGRATION.md)

## Base Configuration
```
Base URL: /api/v1
Content-Type: application/json
Authentication: Bearer JWT or Wallet Signature
```

## Route Categories

### Public Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health check |
| GET | /stats | Dashboard statistics |
| GET | /leaderboard | Researcher rankings |
| GET | /protocols | List active protocols |

### Protocol Routes (Auth Required)
| Method | Path | Description |
|--------|------|-------------|
| POST | /protocols | Register new protocol |
| GET | /protocols/:id | Get protocol details |
| PATCH | /protocols/:id | Update protocol |
| POST | /protocols/:id/fund | Fund bounty pool |
| GET | /protocols/:id/vulnerabilities | List protocol vulns |

### Scan Routes
| Method | Path | Description |
|--------|------|-------------|
| POST | /scans | Create scan job |
| GET | /scans/:id | Get scan status |
| GET | /scans/:id/progress | SSE progress stream |
| DELETE | /scans/:id | Cancel scan |

### Vulnerability Routes
| Method | Path | Description |
|--------|------|-------------|
| POST | /vulnerabilities | Submit vulnerability |
| GET | /vulnerabilities/:id | Get vuln details |
| GET | /vulnerabilities/:id/validation | Get validation status |

### Payment Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /payments | List payments |
| GET | /payments/:id | Get payment details |
| POST | /payments/:id/retry | Retry failed payment |

### Agent Identity Routes (ERC-8004)
| Method | Path | Description |
|--------|------|-------------|
| GET | /agent-identities | List all agents with reputation |
| POST | /agent-identities/register | Register new agent (optional on-chain ERC-8004) |
| GET | /agent-identities/x402-payments | List all X.402 payment records |
| GET | /agent-identities/leaderboard | Ranked researcher leaderboard |
| GET | /agent-identities/wallet/:addr | Get agent by wallet address |
| GET | /agent-identities/type/:type | Get agents by type (RESEARCHER/VALIDATOR) |
| GET | /agent-identities/:id | Get agent details with escrow |
| GET | /agent-identities/:id/reputation | Get reputation score and stats |
| GET | /agent-identities/:id/feedback | Get on-chain/off-chain feedback history |
| GET | /agent-identities/:id/escrow | Get escrow balance and stats |
| GET | /agent-identities/:id/escrow/transactions | Get escrow transaction history |
| POST | /agent-identities/:id/escrow/deposit | Deposit to agent escrow |
| GET | /agent-identities/:id/x402-payments | Get agent's X.402 payments |
| POST | /agent-identities/:id/deactivate | Deactivate agent |

### X.402 Payment Gate
Protocol registration (`POST /protocols`) is gated by the X.402 payment protocol when `SKIP_X402_PAYMENT_GATE=false`. The middleware:
1. Returns HTTP 402 with payment terms (1 USDC on Base Sepolia)
2. Client pays via USDC transfer to platform wallet
3. Client retries with `payment-signature` header containing txHash
4. Facilitator verifies payment, middleware records `X402PaymentRequest`

### Agent Routes (Admin)
| Method | Path | Description |
|--------|------|-------------|
| GET | /agents | List agents |
| GET | /agents/:id | Get agent details |
| POST | /agents/:id/command | Send agent command |

## WebSocket Events

### Rooms
- `protocols` - Protocol updates
- `scans` - Scan lifecycle
- `vulnerabilities` - Vulnerability flow
- `payments` - Payment status
- `agents` - Agent monitoring

### Event Types
```typescript
type WSEvent =
  | 'protocol:registered' | 'protocol:updated'
  | 'scan:started' | 'scan:progress' | 'scan:completed'
  | 'vuln:discovered' | 'vuln:confirmed' | 'vuln:rejected'
  | 'payment:pending' | 'payment:released'
  | 'agent:online' | 'agent:offline' | 'agent:error'
```

## Rate Limits
| Category | Limit | Window |
|----------|-------|--------|
| Public GET | 100 | 1 minute |
| Authenticated GET | 300 | 1 minute |
| Mutations | 30 | 1 minute |
| Scan Creation | 5 | 1 hour |
| Vulnerability Submission | 10 | 1 hour |

## Requirements

### Requirement: Create scan job endpoint
The API MUST provide a POST /scans endpoint that accepts protocolId, optional branch or commit hash, and returns a scanId with initial state.

#### Scenario: Create a scan job
- **WHEN** an authenticated client submits a valid scan request
- **THEN** the API creates a scan job in queued state and returns its scanId

### Requirement: Scan status endpoint
The API SHALL provide GET /scans/:id to return scan state, current step, timestamps, and summary counts of findings.

#### Scenario: Fetch scan status
- **WHEN** a client requests scan status by id
- **THEN** the API returns the latest state and progress metadata

### Requirement: Scan progress stream
The API MUST provide a progress stream for scans via GET /scans/:id/progress and emit step updates in real time.

#### Scenario: Progress update is delivered
- **WHEN** the Researcher Agent advances a scan step
- **THEN** the progress stream emits a step update with timestamp and status

### Requirement: Findings retrieval for a scan
The API SHALL expose scan findings through existing vulnerability endpoints or a scan-specific endpoint, returning proof references and validation state.

#### Scenario: Retrieve scan findings
- **WHEN** a client requests findings for a scan
- **THEN** the API returns the findings list with proof references and validation status

### Requirement: Scan cancelation endpoint
The API MUST support DELETE /scans/:id to cancel a queued or running scan and return the updated state.

#### Scenario: Cancel a scan
- **WHEN** a client submits a cancel request for a running scan
- **THEN** the API marks the scan as canceled and returns the canceled state
