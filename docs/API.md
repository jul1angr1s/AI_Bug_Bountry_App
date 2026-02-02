# API Documentation

Complete API reference for the AI Bug Bounty Platform. All endpoints are prefixed with `/api/v1` unless otherwise noted.

## Table of Contents

- [Authentication](#authentication)
- [Protocols](#protocols)
- [Scans](#scans)
- [Findings](#findings)
- [Validations](#validations)
- [Payments](#payments)
- [Dashboard](#dashboard)
- [Agents](#agents)
- [Reconciliation](#reconciliation)
- [Health & Monitoring](#health--monitoring)
- [Error Responses](#error-responses)

---

## Authentication

All authenticated endpoints require a valid session or API key.

### Headers

```
Authorization: Bearer <token>
```

### Rate Limits

- **Unauthenticated**: 100 requests/minute
- **Authenticated**: 500 requests/minute
- **Admin**: 500 requests/minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 499
X-RateLimit-Reset: 1706812800
```

---

## Protocols

Manage protocol registration and funding.

### POST /api/v1/protocols

Register a new protocol for vulnerability scanning.

**Authentication**: Required

**Request Body**:

```json
{
  "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  "contractPath": "src/protocol/ThunderLoan.sol",
  "contractName": "ThunderLoan",
  "bountyPoolAddress": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0",
  "targetBranch": "main",
  "targetCommitHash": "abc123def456" // optional
}
```

**Response**: `201 Created`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "contractPath": "src/protocol/ThunderLoan.sol",
    "contractName": "ThunderLoan",
    "status": "PENDING",
    "createdAt": "2024-02-01T12:00:00Z",
    "updatedAt": "2024-02-01T12:00:00Z"
  }
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/api/v1/protocols \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "contractPath": "src/protocol/ThunderLoan.sol",
    "contractName": "ThunderLoan",
    "bountyPoolAddress": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0"
  }'
```

### GET /api/v1/protocols

List all protocols with optional filtering.

**Authentication**: Required

**Query Parameters**:

- `status` (optional): Filter by status (`PENDING`, `ACTIVE`, `INACTIVE`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
      "contractPath": "src/protocol/ThunderLoan.sol",
      "contractName": "ThunderLoan",
      "status": "ACTIVE",
      "riskScore": 85,
      "totalScans": 5,
      "totalFindings": 12,
      "createdAt": "2024-02-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Example**:

```bash
curl http://localhost:3000/api/v1/protocols?status=ACTIVE&page=1&limit=10 \
  -H "Authorization: Bearer <token>"
```

### GET /api/v1/protocols/:id

Get detailed information about a specific protocol.

**Authentication**: Required

**Response**: `200 OK`

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
    "contractPath": "src/protocol/ThunderLoan.sol",
    "contractName": "ThunderLoan",
    "status": "ACTIVE",
    "riskScore": 85,
    "onChainProtocolId": "0x8420...ead6",
    "bountyPoolAddress": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0",
    "totalScans": 5,
    "totalFindings": 12,
    "totalFunding": "500.00",
    "createdAt": "2024-02-01T12:00:00Z",
    "updatedAt": "2024-02-01T14:30:00Z"
  }
}
```

### POST /api/v1/protocols/:id/fund

Fund the protocol's bounty pool.

**Authentication**: Required

**Request Body**:

```json
{
  "amount": "100.00",
  "currency": "USDC",
  "txHash": "0xabc123..."
}
```

**Response**: `200 OK`

```json
{
  "data": {
    "id": "funding-123",
    "protocolId": "550e8400-e29b-41d4-a716-446655440000",
    "amount": "100.00",
    "currency": "USDC",
    "txHash": "0xabc123...",
    "createdAt": "2024-02-01T15:00:00Z"
  }
}
```

---

## Scans

Manage vulnerability scans and monitor progress.

### POST /api/v1/scans

Create a new vulnerability scan.

**Authentication**: Required

**Request Body**:

```json
{
  "protocolId": "550e8400-e29b-41d4-a716-446655440000",
  "branch": "main",
  "commitHash": "abc123def456" // optional
}
```

**Response**: `201 Created`

```json
{
  "scanId": "scan-550e8400",
  "state": "QUEUED"
}
```

**Example**:

```bash
curl -X POST http://localhost:3000/api/v1/scans \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "550e8400-e29b-41d4-a716-446655440000",
    "branch": "main"
  }'
```

### GET /api/v1/scans

List all scans with optional filtering.

**Query Parameters**:

- `protocolId` (optional): Filter by protocol
- `state` (optional): Filter by state (`QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELED`)
- `limit` (optional): Number of results (default: 10)

**Response**: `200 OK`

```json
{
  "scans": [
    {
      "id": "scan-550e8400",
      "protocolId": "550e8400-e29b-41d4-a716-446655440000",
      "state": "SUCCEEDED",
      "currentStep": "SUBMIT",
      "startedAt": "2024-02-01T12:00:00Z",
      "finishedAt": "2024-02-01T12:03:45Z",
      "findingsCount": 5,
      "protocol": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
        "contractName": "ThunderLoan"
      }
    }
  ],
  "total": 1
}
```

### GET /api/v1/scans/:id

Get scan status and summary.

**Response**: `200 OK`

```json
{
  "id": "scan-550e8400",
  "state": "SUCCEEDED",
  "currentStep": "SUBMIT",
  "startedAt": "2024-02-01T12:00:00Z",
  "finishedAt": "2024-02-01T12:03:45Z",
  "findingsSummary": {
    "total": 5,
    "bySeverity": {
      "CRITICAL": 1,
      "HIGH": 2,
      "MEDIUM": 1,
      "LOW": 1
    }
  },
  "errorCode": null,
  "errorMessage": null,
  "retryCount": 0
}
```

### GET /api/v1/scans/:id/findings

Get all findings for a scan.

**Query Parameters**:

- `analysisMethod` (optional): Filter by method (`AI`, `STATIC`, `HYBRID`)

**Response**: `200 OK`

```json
{
  "scanId": "scan-550e8400",
  "findings": [
    {
      "id": "finding-123",
      "vulnerabilityType": "REENTRANCY",
      "severity": "CRITICAL",
      "status": "VALIDATED",
      "filePath": "src/protocol/ThunderLoan.sol",
      "lineNumber": 245,
      "description": "Potential reentrancy vulnerability in flashloan function",
      "confidenceScore": 0.95,
      "analysisMethod": "HYBRID",
      "aiConfidenceScore": 0.92,
      "remediationSuggestion": "Add ReentrancyGuard modifier...",
      "codeSnippet": "function flashloan(...) external { ... }",
      "createdAt": "2024-02-01T12:02:30Z",
      "proofs": [
        {
          "id": "proof-456",
          "status": "VALIDATED",
          "submittedAt": "2024-02-01T12:03:00Z"
        }
      ]
    }
  ],
  "total": 5,
  "filteredBy": {
    "analysisMethod": "HYBRID"
  }
}
```

### GET /api/v1/scans/:id/progress

Server-Sent Events (SSE) stream for real-time scan progress.

**Response**: `text/event-stream`

```
data: {"scanId":"scan-550e8400","step":"CLONE","state":"RUNNING","timestamp":"2024-02-01T12:00:15Z"}

data: {"scanId":"scan-550e8400","step":"COMPILE","state":"RUNNING","timestamp":"2024-02-01T12:00:45Z"}

data: {"scanId":"scan-550e8400","step":"ANALYZE","state":"RUNNING","timestamp":"2024-02-01T12:01:30Z"}

data: {"scanId":"scan-550e8400","state":"SUCCEEDED","timestamp":"2024-02-01T12:03:45Z"}
```

**Example**:

```javascript
const eventSource = new EventSource('/api/v1/scans/scan-550e8400/progress');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
};
```

### DELETE /api/v1/scans/:id

Cancel a running or queued scan.

**Response**: `200 OK`

```json
{
  "id": "scan-550e8400",
  "state": "CANCELED"
}
```

---

## Findings

Access vulnerability findings from scans.

Findings are accessed through `/api/v1/scans/:id/findings` endpoint (see Scans section above).

---

## Validations

View validation status and results.

### GET /api/v1/validations

List all validations with optional filtering.

**Query Parameters**:

- `protocolId` (optional): Filter by protocol
- `status` (optional): Filter by status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**: `200 OK`

```json
{
  "validations": [
    {
      "id": "validation-789",
      "findingId": "finding-123",
      "findingTitle": "REENTRANCY in src/protocol/ThunderLoan.sol",
      "protocolName": "Thunder-Loan",
      "severity": "CRITICAL",
      "status": "VALIDATED",
      "confidence": 95,
      "validatedAt": "2024-02-01T12:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

**Example**:

```bash
curl http://localhost:3000/api/v1/validations?status=VALIDATED \
  -H "Authorization: Bearer <token>"
```

---

## Payments

Manage bounty payments and view payment history.

### GET /api/v1/payments/usdc/allowance

Check USDC allowance for owner and spender.

**Authentication**: Optional (higher rate limit when authenticated)

**Query Parameters**:

- `owner` (required): Owner address
- `spender` (required): Spender address

**Response**: `200 OK`

```json
{
  "data": {
    "owner": "0x123...",
    "spender": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0",
    "allowance": "1000000000",
    "allowanceFormatted": "1000.00"
  }
}
```

**Example**:

```bash
curl "http://localhost:3000/api/v1/payments/usdc/allowance?owner=0x123...&spender=0x6D0b..." \
  -H "Authorization: Bearer <token>"
```

### GET /api/v1/payments/usdc/balance

Check USDC balance for an address.

**Query Parameters**:

- `address` (required): Wallet address

**Response**: `200 OK`

```json
{
  "data": {
    "address": "0x123...",
    "balance": "50000000",
    "balanceFormatted": "50.00"
  }
}
```

### POST /api/v1/payments/approve

Generate unsigned USDC approval transaction.

**Request Body**:

```json
{
  "amount": "100.00",
  "spender": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0"
}
```

**Response**: `200 OK`

```json
{
  "data": {
    "to": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "data": "0x095ea7b3...",
    "value": "0"
  }
}
```

### GET /api/v1/payments

Get paginated payment list with filters.

**Query Parameters**:

- `status` (optional): Filter by status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
- `protocolId` (optional): Filter by protocol
- `researcherAddress` (optional): Filter by researcher
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "payment-123",
      "amount": "500.00",
      "currency": "USDC",
      "status": "COMPLETED",
      "researcherAddress": "0xResearcher123...",
      "protocolId": "550e8400-e29b-41d4-a716-446655440000",
      "severity": "CRITICAL",
      "txHash": "0xPaymentTx...",
      "queuedAt": "2024-02-01T12:05:30Z",
      "paidAt": "2024-02-01T12:06:15Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Example**:

```bash
curl "http://localhost:3000/api/v1/payments?status=COMPLETED&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### GET /api/v1/payments/:id

Get payment details by ID.

**Response**: `200 OK`

```json
{
  "data": {
    "id": "payment-123",
    "amount": "500.00",
    "currency": "USDC",
    "status": "COMPLETED",
    "researcherAddress": "0xResearcher123...",
    "protocolId": "550e8400-e29b-41d4-a716-446655440000",
    "severity": "CRITICAL",
    "txHash": "0xPaymentTx...",
    "onChainBountyId": "0x4815...bcb3",
    "queuedAt": "2024-02-01T12:05:30Z",
    "paidAt": "2024-02-01T12:06:15Z",
    "reconciled": true,
    "reconciledAt": "2024-02-01T12:06:30Z"
  }
}
```

### GET /api/v1/payments/researcher/:address

Get researcher earnings and payment history.

**Query Parameters**:

- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`

```json
{
  "data": {
    "totalEarnings": "1250.00",
    "totalPayments": 5,
    "payments": [
      {
        "id": "payment-123",
        "amount": "500.00",
        "status": "COMPLETED",
        "severity": "CRITICAL",
        "txHash": "0xPaymentTx...",
        "paidAt": "2024-02-01T12:06:15Z"
      }
    ]
  }
}
```

### GET /api/v1/payments/stats

Get payment statistics with optional grouping.

**Query Parameters**:

- `protocolId` (optional): Filter by protocol
- `groupBy` (optional): Group by period (`day`, `week`, `month`)
- `days` (optional): Number of days to include (default: 30)

**Response**: `200 OK`

```json
{
  "data": {
    "totalPaid": "5000.00",
    "totalPayments": 25,
    "averageAmount": "200.00",
    "bySeverity": {
      "CRITICAL": "2500.00",
      "HIGH": "1500.00",
      "MEDIUM": "750.00",
      "LOW": "250.00"
    },
    "byStatus": {
      "COMPLETED": 20,
      "PENDING": 3,
      "FAILED": 2
    }
  },
  "cached": false
}
```

### GET /api/v1/payments/leaderboard

Get earnings leaderboard.

**Query Parameters**:

- `limit` (optional): Number of results (default: 10)
- `startDate` (optional): Start date (ISO 8601)
- `endDate` (optional): End date (ISO 8601)

**Response**: `200 OK`

```json
{
  "data": [
    {
      "rank": 1,
      "researcherAddress": "0xResearcher123...",
      "totalEarnings": "2500.00",
      "paymentCount": 12,
      "lastPayment": "2024-02-01T12:06:15Z"
    },
    {
      "rank": 2,
      "researcherAddress": "0xResearcher456...",
      "totalEarnings": "1750.00",
      "paymentCount": 8,
      "lastPayment": "2024-01-28T10:15:30Z"
    }
  ],
  "cached": false
}
```

### GET /api/v1/payments/pool/:protocolId

Get bounty pool status for a protocol.

**Response**: `200 OK`

```json
{
  "data": {
    "protocolId": "550e8400-e29b-41d4-a716-446655440000",
    "poolAddress": "0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0",
    "balance": "450.00",
    "currency": "USDC",
    "totalDeposited": "500.00",
    "totalPaid": "50.00",
    "lastUpdated": "2024-02-01T12:00:00Z"
  }
}
```

---

## Dashboard

Dashboard statistics and protocol information.

### GET /api/v1/stats

Get dashboard statistics.

**Authentication**: Required

**Query Parameters**:

- `protocolId` (optional): Filter by protocol

**Response**: `200 OK`

```json
{
  "data": {
    "totalProtocols": 45,
    "activeScans": 3,
    "totalFindings": 234,
    "totalPayments": "12500.00",
    "recentActivity": [
      {
        "type": "SCAN_COMPLETED",
        "protocolId": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-02-01T12:03:45Z"
      }
    ]
  }
}
```

### GET /api/v1/agents

Get agent status (admin only).

**Authentication**: Required (Admin)

**Query Parameters**:

- `type` (optional): Filter by type (`PROTOCOL`, `RESEARCHER`, `VALIDATOR`)

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "protocol-agent",
      "type": "PROTOCOL",
      "status": "ACTIVE",
      "queue": {
        "waiting": 2,
        "active": 1,
        "completed": 145,
        "failed": 3
      }
    }
  ]
}
```

### GET /api/v1/protocols/:id/vulnerabilities

Get vulnerability list for a protocol with pagination.

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sort` (optional): Sort order (`createdAt`, `-createdAt`)
- `severity` (optional): Filter by severity
- `status` (optional): Filter by status

**Response**: `200 OK`

```json
{
  "data": {
    "vulnerabilities": [
      {
        "id": "finding-123",
        "type": "REENTRANCY",
        "severity": "CRITICAL",
        "status": "VALIDATED",
        "filePath": "src/protocol/ThunderLoan.sol",
        "lineNumber": 245,
        "createdAt": "2024-02-01T12:02:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1
    }
  }
}
```

---

## Agents

Agent control and monitoring (admin only).

### POST /api/v1/agents/:id/command

Send command to an agent.

**Authentication**: Required (Admin)

**Request Body**:

```json
{
  "command": "PAUSE",
  "reason": "Maintenance window"
}
```

**Commands**: `PAUSE`, `RESUME`, `STOP`

**Response**: `200 OK`

```json
{
  "data": {
    "success": true,
    "message": "Protocol agent paused: Maintenance window"
  }
}
```

### GET /api/v1/agents/:id/status

Get specific agent status with queue info.

**Authentication**: Required (Admin)

**Response**: `200 OK`

```json
{
  "data": {
    "id": "protocol-agent",
    "type": "PROTOCOL",
    "status": "ACTIVE",
    "queue": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3
    }
  }
}
```

---

## Reconciliation

Payment reconciliation dashboard (admin only).

### GET /api/v1/reconciliation/report

Get reconciliation summary metrics.

**Authentication**: Required (Admin)

**Query Parameters**:

- `since` (optional): Start date for report (ISO 8601)

**Response**: `200 OK`

```json
{
  "data": {
    "totalPayments": 100,
    "reconciledCount": 95,
    "pendingCount": 3,
    "discrepancyCount": 2,
    "lastReconciliation": "2024-02-01T12:00:00Z",
    "reconciliationRate": 0.95,
    "discrepanciesByStatus": {
      "PENDING": 1,
      "RESOLVED": 1
    }
  }
}
```

### GET /api/v1/reconciliation/discrepancies

Get list of payment discrepancies.

**Authentication**: Required (Admin)

**Query Parameters**:

- `status` (optional): Filter by status

**Response**: `200 OK`

```json
{
  "data": [
    {
      "id": "discrepancy-123",
      "paymentId": "payment-456",
      "onChainBountyId": "0x4815...bcb3",
      "txHash": "0xPaymentTx...",
      "amount": "500.00",
      "status": "PENDING",
      "discoveredAt": "2024-02-01T13:00:00Z",
      "resolvedAt": null,
      "notes": "Amount mismatch detected"
    }
  ]
}
```

### POST /api/v1/reconciliation/resolve/:id

Manually resolve a payment discrepancy.

**Authentication**: Required (Admin)

**Request Body**:

```json
{
  "notes": "Manual verification completed - amounts match"
}
```

**Response**: `200 OK`

```json
{
  "data": {
    "id": "discrepancy-123",
    "status": "RESOLVED",
    "notes": "Manual verification completed - amounts match",
    "resolvedAt": "2024-02-01T14:30:00Z"
  }
}
```

---

## Health & Monitoring

System health and metrics endpoints.

### GET /health

Basic health check.

**Response**: `200 OK` or `503 Service Unavailable`

```json
{
  "status": "ok",
  "timestamp": "2024-02-01T12:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "eventListener": "ok"
  }
}
```

### GET /health/detailed

Detailed health check with memory and queue info.

**Response**: `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2024-02-01T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "server": { "status": "ok" },
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "memory": {
      "status": "ok",
      "usedMB": 256,
      "totalMB": 512,
      "percentUsed": 50
    }
  }
}
```

### GET /health/services

Service-specific health check.

**Response**: `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2024-02-01T12:00:00Z",
  "services": {
    "validationListener": {
      "status": "active",
      "description": "Listening for ValidationRecorded events"
    },
    "bountyListener": {
      "status": "active",
      "description": "Listening for BountyReleased events"
    },
    "paymentWorker": {
      "status": "active",
      "description": "Processing payments"
    },
    "reconciliationService": {
      "status": "active",
      "description": "Running periodic reconciliation"
    }
  }
}
```

### GET /metrics

Application metrics.

**Response**: `200 OK`

```json
{
  "timestamp": "2024-02-01T12:00:00Z",
  "metrics": {
    "requests": {
      "total": 15234,
      "rate": 25.5
    },
    "scans": {
      "active": 3,
      "completed": 145,
      "failed": 2
    },
    "payments": {
      "pending": 5,
      "processing": 2,
      "completed": 95
    }
  }
}
```

---

## Error Responses

All errors follow a consistent format:

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "req-123-456"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate or conflicting resource |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `DUPLICATE_GITHUB_URL`: Protocol already registered
- `PROTOCOL_NOT_FOUND`: Protocol does not exist
- `SCAN_NOT_FOUND`: Scan does not exist
- `PAYMENT_NOT_FOUND`: Payment does not exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

### Example Error Responses

**Validation Error (400)**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "requestId": "req-123-456",
    "details": [
      {
        "field": "githubUrl",
        "message": "Must be a valid GitHub URL"
      }
    ]
  }
}
```

**Not Found (404)**:

```json
{
  "error": {
    "code": "PROTOCOL_NOT_FOUND",
    "message": "Protocol not found or access denied",
    "requestId": "req-123-456"
  }
}
```

**Rate Limit (429)**:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again after 45 seconds.",
    "requestId": "req-123-456"
  }
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All monetary amounts are strings to preserve precision
- Pagination uses 1-based indexing
- Rate limits are per-endpoint and reset every 60 seconds
- WebSocket events are available for real-time updates (see WEBSOCKET_EVENTS.md)
- Caching is applied to stats and leaderboard endpoints (60s TTL)
