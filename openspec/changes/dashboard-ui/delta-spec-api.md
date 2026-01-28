# Delta Spec: API Extensions for Dashboard

## Overview

This delta spec extends `openspec/specs/api.md` with additional endpoints and WebSocket events required for the dashboard UI.

## New Endpoints

### GET /api/v1/protocols/:id/overview

**Purpose**: Fetch consolidated protocol data for dashboard overview card

**Response**:
```json
{
  "id": "0x7a3f...9c2d",
  "name": "Thunder Loan Protocol",
  "contractAddress": "0x5FbD...0aa3",
  "contractName": "ThunderLoan",
  "githubUrl": "https://github.com/Cyfrin/2023-11-Thunder-Loan",
  "status": "ACTIVE",
  "monitoringStatus": "MONITORING_ACTIVE",
  "lastScanAt": "2026-01-28T15:30:00Z",
  "nextScanScheduled": "2026-01-28T16:00:00Z",
  "owner": {
    "address": "0xOwner...",
    "name": "Thunder Team"
  }
}
```

**Rationale**: Single endpoint to populate protocol overview card without multiple API calls.

---

### GET /api/v1/dashboard/stats/:protocolId

**Purpose**: Get dashboard statistics for a specific protocol

**Response**:
```json
{
  "bountyPool": {
    "total": "10000.00",
    "available": "5000.00",
    "reserved": "0.00",
    "paid": "5000.00",
    "currency": "USDC",
    "percentage": 50
  },
  "vulnerabilities": {
    "total": 1,
    "critical": 1,
    "high": 0,
    "medium": 0,
    "low": 0,
    "pending": 1,
    "confirmed": 0
  },
  "payments": {
    "total": "5000.00",
    "count": 1,
    "lastPayment": {
      "amount": "5000.00",
      "timestamp": "2026-01-28T15:00:00Z",
      "researcher": "0x7099...79C8"
    }
  },
  "scans": {
    "total": 12,
    "lastScan": "2026-01-28T15:30:00Z",
    "avgDuration": 45
  }
}
```

**Rationale**: Optimized endpoint for dashboard metrics panel, reduces separate API calls.

---

### GET /api/v1/agents/status

**Purpose**: Get real-time status of all agents

**Response**:
```json
{
  "agents": [
    {
      "id": "protocol-agent-1",
      "name": "Protocol Agent",
      "type": "PROTOCOL",
      "status": "ONLINE",
      "currentTask": "Scanning Blocks",
      "taskProgress": 65,
      "lastHeartbeat": "2026-01-28T15:30:45Z",
      "uptime": 86400,
      "icon": "shield-check"
    },
    {
      "id": "researcher-agent-1",
      "name": "Researcher Agent",
      "type": "RESEARCHER",
      "status": "ONLINE",
      "currentTask": "Exploit Synthesis",
      "taskProgress": 32,
      "lastHeartbeat": "2026-01-28T15:30:50Z",
      "uptime": 86400,
      "icon": "brain-circuit"
    },
    {
      "id": "validator-agent-1",
      "name": "Validator Agent",
      "type": "VALIDATOR",
      "status": "ONLINE",
      "currentTask": "PoC Verification",
      "taskProgress": 80,
      "lastHeartbeat": "2026-01-28T15:30:48Z",
      "uptime": 86400,
      "icon": "shield"
    }
  ],
  "overall": {
    "online": 3,
    "busy": 0,
    "offline": 0,
    "systemStatus": "OPERATIONAL"
  }
}
```

**Rationale**: Dedicated endpoint for agent status grid with enriched data (icons, task names).

---

### GET /api/v1/protocols/:id/alerts

**Purpose**: Get active critical alerts for a protocol

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert-abc123",
      "type": "CRITICAL_VULNERABILITY",
      "severity": "CRITICAL",
      "title": "Oracle Manipulation Confirmed",
      "message": "A critical severity vulnerability involving oracle price manipulation has been validated by the autonomous cluster. Immediate attention required on the Thunder Loan Protocol.",
      "vulnerabilityId": "vuln-xyz789",
      "timestamp": "2026-01-28T15:00:00Z",
      "dismissed": false,
      "actionUrl": "/vulnerabilities/vuln-xyz789"
    }
  ]
}
```

**Rationale**: Separate endpoint for critical alerts, enables banner dismissal persistence.

---

## Extended WebSocket Events

### `agent:task_update`

**Emitted When**: Agent task progress changes

**Payload**:
```json
{
  "agentId": "researcher-agent-1",
  "task": "Exploit Synthesis",
  "progress": 45,
  "estimatedCompletion": "2026-01-28T15:35:00Z"
}
```

**Dashboard Action**: Update agent card progress indicator

---

### `bounty_pool:updated`

**Emitted When**: Bounty pool balance changes (deposit/withdrawal/payment)

**Payload**:
```json
{
  "protocolId": "0x7a3f...9c2d",
  "pool": {
    "total": "9500.00",
    "available": "4500.00",
    "paid": "5500.00"
  },
  "change": {
    "type": "PAYMENT_RELEASED",
    "amount": "-500.00",
    "timestamp": "2026-01-28T15:30:00Z"
  }
}
```

**Dashboard Action**: Update bounty pool card + progress bar

---

### `vuln:status_changed`

**Emitted When**: Vulnerability status transitions (PENDING → CONFIRMED → PAID)

**Payload**:
```json
{
  "vulnerabilityId": "vuln-xyz789",
  "protocolId": "0x7a3f...9c2d",
  "oldStatus": "PENDING_VALIDATION",
  "newStatus": "CONFIRMED",
  "severity": "CRITICAL",
  "timestamp": "2026-01-28T15:00:00Z"
}
```

**Dashboard Action**: Update vulnerabilities table row, show toast notification

---

## Rate Limit Adjustments

The dashboard makes frequent API calls. Adjust rate limits:

| Endpoint | Current Limit | Proposed Limit |
|----------|---------------|----------------|
| `GET /protocols/:id/overview` | - | 60/minute |
| `GET /dashboard/stats/:id` | - | 60/minute |
| `GET /agents/status` | - | 120/minute |
| `GET /protocols/:id/alerts` | - | 60/minute |

**Rationale**: Dashboard auto-refreshes every 30s + WebSocket updates require higher limits.

---

## Caching Strategy

**Redis Caching** for expensive queries:

```
Cache Key: dashboard:stats:{protocolId}
TTL: 30 seconds

Cache Key: agent:status
TTL: 10 seconds

Cache Key: protocol:alerts:{protocolId}
TTL: 60 seconds
```

**Invalidation**: On relevant WebSocket events, purge corresponding cache keys.

---

## Error Codes

New error codes for dashboard-specific failures:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PROTOCOL_NOT_MONITORED` | 400 | Protocol exists but monitoring not active |
| `AGENT_UNREACHABLE` | 503 | Agent status check timeout |
| `STATS_UNAVAILABLE` | 503 | Stats service temporarily unavailable |

---

## Changes from Main Spec

**Added Endpoints**: 4 new GET endpoints for optimized dashboard data
**Extended Events**: 3 new WebSocket events for granular updates
**Rate Limits**: Increased limits for dashboard-specific endpoints
**Caching**: New Redis caching strategy

## Dependencies

- Redis cache for stats/agent status
- WebSocket server support for new event types
- Agent heartbeat mechanism for status endpoint
