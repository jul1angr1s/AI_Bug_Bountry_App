# API Specification

## Overview

RESTful API with WebSocket support. Node.js/Express backend with Zod validation.

## Source Documentation
- **Primary**: [project/APIRoutes.md](../../project/APIRoutes.md)
- **Supporting**: [project/Integration.md](../../project/Integration.md)

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
