# AI Bug Bounty Platform - Backend

The backend system powers the AI Bug Bounty Platform, orchestrating AI agents for automated vulnerability discovery, validation, and reward distribution.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)](https://www.prisma.io/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [AI Analysis Features](#ai-analysis-features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Agent System](#agent-system)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Overview

The backend implements a multi-agent system that automates the vulnerability discovery and validation pipeline:

1. **Protocol Agent** - Validates smart contracts and registers them on-chain
2. **Researcher Agent** - Discovers vulnerabilities using Slither + AI analysis
3. **Validator Agent** - Verifies findings in isolated sandboxes
4. **Payment Automation** - Releases USDC bounties based on severity

### Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Blockchain**: ethers.js v6 (Base Sepolia)
- **Analysis Tools**: Slither, Foundry, Anvil
- **AI**: Claude Sonnet 4.5 (Anthropic)
- **Testing**: Vitest, Supertest

---

## Architecture

### System Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────────────────────────────┐
│          Express API Server             │
│  ┌──────────────┐   ┌────────────────┐ │
│  │ REST Routes  │   │ WebSocket Hub  │ │
│  └──────┬───────┘   └────────┬───────┘ │
└─────────┼──────────────────────┼─────────┘
          │                      │
          ▼                      ▼
    ┌──────────┐         ┌──────────────┐
    │ BullMQ   │         │ Event Stream │
    │ Queues   │         │ (Real-time)  │
    └────┬─────┘         └──────────────┘
         │
         ├─► Protocol Queue ──► Protocol Agent
         ├─► Scan Queue     ──► Researcher Agent (7 steps)
         └─► Validation Queue ─► Validator Agent
                │
                ▼
        ┌────────────────────────┐
        │  Blockchain Contracts  │
        │  - Protocol Registry   │
        │  - Validation Registry │
        │  - Bounty Pool         │
        │  - USDC Token          │
        └────────────────────────┘
```

### Database Schema

#### Migration Strategy

This project uses **focused, independent migrations** to support parallel feature development:

**Current Migrations:**

1. `20260201120000_payment_automation_schema` - Payment System
   - Adds Phase 4 payment automation fields to `Payment` model
   - Creates `PaymentReconciliation` table for payment verification
   - Creates `EventListenerState` table for blockchain event tracking

2. `20260201120001_ai_analysis_schema` - AI Analysis System
   - Adds `AI_DEEP_ANALYSIS` to `ScanStep` enum
   - Creates `AnalysisMethod` enum (STATIC, AI, HYBRID)
   - Adds AI analysis fields to `Finding` model
   - Creates `KnowledgeDocument` table for RAG knowledge base

**Why Split Migrations?**
- ✅ **Parallel Development**: Features can merge independently
- ✅ **Clear Ownership**: Each migration represents one feature domain
- ✅ **Easy Rollback**: Roll back individual features without affecting others
- ✅ **Better Reviews**: Smaller, focused PRs are easier to review
- ✅ **Reduced Conflicts**: Eliminates merge conflicts in migration files

**Running Migrations:**
```bash
npm run prisma:migrate dev      # Development
npm run prisma:migrate deploy   # Production
npm run prisma:generate         # Generate Prisma Client
```

#### Key Models

Key models (Prisma):

```prisma
model Protocol {
  id          String   @id
  name        String
  githubUrl   String
  contractPath String
  bountyAddress String
  scans       Scan[]
}

model Scan {
  id          String   @id
  protocolId  String
  state       ScanState
  currentStep ScanStep?
  findings    Finding[]
  steps       ScanStepRecord[]
}

model Finding {
  id                   String   @id
  scanId               String
  vulnerabilityType    String
  severity             Severity
  description          String
  confidenceScore      Float

  // AI-enhanced fields (Phase 4)
  analysisMethod       AnalysisMethod?  // STATIC, AI, HYBRID
  aiConfidenceScore    Float?
  remediationSuggestion String?
  codeSnippet          String?
}

model KnowledgeDocument {
  id        String   @id
  source    String
  title     String
  content   String   @db.Text
  embedding Json             // Vector embedding
  severity  Severity?
  tags      String[]
  version   Int
}
```

---

## AI Analysis Features

### Overview

Phase 4 introduces AI-enhanced vulnerability analysis using **Claude Sonnet 4.5** from Anthropic. The AI system augments traditional static analysis tools with semantic understanding and context-aware detection.

### 7-Step Research Pipeline

```
┌────────────────────────────────────────────────────┐
│              Researcher Agent Pipeline              │
└────────────────────────────────────────────────────┘

1. CLONE              → Clone repository from GitHub
2. COMPILE            → Compile Solidity with Foundry
3. DEPLOY             → Deploy to local Anvil testnet
4. ANALYZE            → Run Slither static analysis
5. AI_DEEP_ANALYSIS   → AI-powered enhancement ⭐ NEW
6. PROOF_GENERATION   → Generate exploit proofs
7. SUBMIT             → Submit to Validator Agent
```

### AI Enhancement Process

```
Slither Findings
      │
      ▼
┌─────────────────┐
│ Function Parser │  ← Extract function code
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│ Knowledge Base   │  ← Search similar exploits
│ Semantic Search  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   LLM Analyzer   │  ← Claude API analysis
│ (Claude Sonnet)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Report Generator │  ← Enhanced findings
└──────────────────┘
```

### AI-Enhanced Finding Fields

Standard Slither findings are enhanced with:

```typescript
interface VulnerabilityFinding {
  // Standard fields
  vulnerabilityType: string;
  severity: Severity;
  description: string;
  confidenceScore: number;

  // AI-enhanced fields
  analysisMethod: 'STATIC' | 'AI' | 'HYBRID';
  aiConfidenceScore: number;        // 0.0 - 1.0
  remediationSuggestion: string;    // Actionable fix
  codeSnippet: string;              // Vulnerable code
}
```

### Feature Flag Control

AI analysis is controlled via environment variable:

```bash
# Enable AI analysis
AI_ANALYSIS_ENABLED=true

# Disable AI analysis (fallback to Slither only)
AI_ANALYSIS_ENABLED=false
```

**Graceful Degradation**: When disabled or on API failure, the system automatically falls back to standard Slither findings without interruption.

### Knowledge Base

The system maintains a curated knowledge base of historical exploits for RAG (Retrieval Augmented Generation):

- **Location**: `/backend/knowledge_base/exploits/`
- **Format**: Markdown documents with vulnerability details
- **Storage**: PostgreSQL with vector embeddings
- **Search**: Semantic similarity using embeddings

Example document structure:
```markdown
# Reentrancy: DAO Hack (2016)

## Metadata
- Severity: CRITICAL
- Category: Reentrancy
- Tags: #reentrancy #dao #ethereum

## Vulnerability Details
[Detailed exploit analysis...]

## Remediation
[Fix recommendations...]
```

### Configuration

```bash
# AI Feature Flag
AI_ANALYSIS_ENABLED=true

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.1

# Rate Limiting
AI_MAX_REQUESTS_PER_MINUTE=50
AI_TIMEOUT_MS=30000

# Knowledge Base
KB_VERSION=v1
KB_REBUILD_ON_STARTUP=false

# Caching
AI_CACHE_TTL=3600
AI_CACHE_ENABLED=true
```

### Usage Example

```typescript
import { executeAIDeepAnalysisStep } from './steps/ai-deep-analysis.js';

const result = await executeAIDeepAnalysisStep({
  clonedPath: '/tmp/repo-clone',
  contractPath: 'contracts/Token.sol',
  contractName: 'Token',
  slitherFindings: [...],
});

console.log(`AI enhanced ${result.metrics.enhancedFindings} findings`);
console.log(`AI discovered ${result.metrics.newFindings} new findings`);

result.findings.forEach(finding => {
  if (finding.analysisMethod === 'AI') {
    console.log(`🤖 ${finding.vulnerabilityType}`);
    console.log(`   Confidence: ${finding.aiConfidenceScore}`);
    console.log(`   Fix: ${finding.remediationSuggestion}`);
  }
});
```

### Admin API

#### Rebuild Knowledge Base

```bash
POST /api/admin/knowledge-base/rebuild
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "success": true,
  "version": 2,
  "documentCount": 150,
  "message": "Knowledge base rebuilt successfully",
  "rebuiltAt": "2025-02-01T12:00:00.000Z"
}
```

### Query AI Findings

```bash
# Get all findings for a scan
GET /api/v1/scans/:scanId/findings

# Filter by analysis method
GET /api/v1/scans/:scanId/findings?analysisMethod=AI

# Filter by severity and AI-enhanced
GET /api/v1/scans/:scanId/findings?severity=CRITICAL&analysisMethod=AI
```

Response includes AI fields:
```json
{
  "scanId": "scan-123",
  "findings": [
    {
      "id": "finding-456",
      "vulnerabilityType": "REENTRANCY",
      "severity": "CRITICAL",
      "analysisMethod": "AI",
      "aiConfidenceScore": 0.95,
      "remediationSuggestion": "Use ReentrancyGuard from OpenZeppelin...",
      "codeSnippet": "function withdraw(uint amount) public { ... }"
    }
  ],
  "total": 5,
  "filteredBy": {
    "analysisMethod": "AI"
  }
}
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Foundry (for Solidity compilation)
- Python 3.8+ (for Slither)

### Installation

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run prisma:migrate
npm run prisma:generate

# Build TypeScript
npm run build
```

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/thunder

# Supabase (Authentication)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Redis
REDIS_URL=redis://localhost:6379

# Blockchain (Base Sepolia)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...
PROTOCOL_REGISTRY_ADDRESS=0xc7DF...3235
VALIDATION_REGISTRY_ADDRESS=0x8fBE...44d
BOUNTY_POOL_ADDRESS=0x6D0b...7b0
USDC_ADDRESS=0x036C...CF7e

# AI Analysis (Optional)
AI_ANALYSIS_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-...
```

### Run Development Server

```bash
# Start Redis
redis-server

# Start server with hot reload
npm run dev

# Or start in production mode
npm start
```

### Verify Installation

```bash
# Check health
curl http://localhost:3000/api/health

# Response:
# {
#   "status": "healthy",
#   "timestamp": "2025-02-01T12:00:00.000Z",
#   "uptime": 123.45,
#   "database": "connected",
#   "redis": "connected"
# }
```

---

## API Reference

### Protocol Management

```bash
# Register new protocol
POST /api/v1/protocols
Content-Type: application/json

{
  "name": "MyDeFiProtocol",
  "githubUrl": "https://github.com/user/repo",
  "contractPath": "contracts/Token.sol",
  "contractName": "Token",
  "bountyAddress": "0x..."
}

# Get protocol details
GET /api/v1/protocols/:id

# List all protocols
GET /api/v1/protocols
```

### Scan Management

```bash
# Trigger vulnerability scan
POST /api/v1/protocols/:id/scan
Content-Type: application/json

{
  "targetBranch": "main"
}

# Get scan status
GET /api/v1/scans/:scanId

# Get scan findings
GET /api/v1/scans/:scanId/findings

# Get scan steps
GET /api/v1/scans/:scanId/steps
```

### Admin Endpoints

```bash
# Rebuild knowledge base
POST /api/admin/knowledge-base/rebuild
Authorization: Bearer <admin-token>

# Get KB statistics
GET /api/admin/knowledge-base/stats
Authorization: Bearer <admin-token>
```

### WebSocket Events

Connect to real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000');

// Subscribe to scan events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'scan:scan-123'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
  // { type: 'scan:step:completed', step: 'ANALYZE', ... }
};
```

---

## Agent System

### Protocol Agent

Validates and registers smart contracts on-chain.

**Steps**:
1. Clone repository
2. Verify contract exists
3. Compile with Foundry
4. Register on Protocol Registry

### Researcher Agent

Discovers vulnerabilities through 7-step pipeline.

**Steps**:
1. **CLONE** - Clone GitHub repository
2. **COMPILE** - Compile Solidity contracts
3. **DEPLOY** - Deploy to local Anvil
4. **ANALYZE** - Run Slither static analysis
5. **AI_DEEP_ANALYSIS** - AI-powered enhancement
6. **PROOF_GENERATION** - Generate exploit proofs
7. **SUBMIT** - Submit to Validator Agent

### Validator Agent

Verifies vulnerability findings in isolated sandboxes.

**Steps**:
1. Decrypt proof
2. Setup isolated Anvil sandbox
3. Execute exploit
4. Validate success criteria
5. Submit on-chain attestation
6. Trigger payment

---

## Testing

### Test Suites

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run AI pipeline tests
npm run test:ai

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
backend/
├── src/
│   └── agents/
│       └── researcher/
│           ├── ai/
│           │   └── __tests__/
│           │       ├── embeddings.test.ts
│           │       ├── knowledge-base.test.ts
│           │       ├── llm-analyzer.test.ts
│           │       └── fixtures/
│           │           ├── contracts/
│           │           └── llm-responses.json
│           └── __tests__/
│               ├── integration/
│               │   └── ai-pipeline.ai.test.ts
│               └── setup.ts
└── tests/
    └── helpers/
        └── mock-anthropic.ts
```

### Test Coverage

Current coverage targets:

| Component | Lines | Functions |
|-----------|-------|-----------|
| AI Deep Analysis | 90% | 90% |
| Embeddings | 90% | 90% |
| Knowledge Base | 85% | 85% |
| LLM Analyzer | 80% | 80% |

### Mocking Strategy

AI tests use mocked responses by default:

```bash
# Run with mocked LLM (default)
MOCK_EXTERNAL_SERVICES=true npm test

# Run with real API (requires key)
ANTHROPIC_API_KEY=sk-ant-... \
MOCK_EXTERNAL_SERVICES=false \
npm run test:ai-real
```

See [docs/AI_TESTING.md](./docs/AI_TESTING.md) for detailed testing patterns.

---

## Documentation

### Core Documentation

- **[AI_ANALYSIS.md](./docs/AI_ANALYSIS.md)** - AI analysis architecture and usage
- **[KNOWLEDGE_BASE.md](./docs/KNOWLEDGE_BASE.md)** - Knowledge base management guide
- **[AI_TESTING.md](./docs/AI_TESTING.md)** - AI testing patterns and strategies
- **[TESTING.md](./TESTING.md)** - General testing guide

### Additional Docs

- **[RESEARCHER_AGENT_SETUP.md](./RESEARCHER_AGENT_SETUP.md)** - Researcher agent setup
- **[DOCKER_SECURITY.md](./DOCKER_SECURITY.md)** - Docker security practices
- **[CI_CD_TESTING_STRATEGY.md](./CI_CD_TESTING_STRATEGY.md)** - CI/CD integration

### External Resources

- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [Slither Documentation](https://github.com/crytic/slither)
- [Foundry Book](https://book.getfoundry.sh/)
- [Prisma Docs](https://www.prisma.io/docs)

---

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Implement changes with tests
3. Run test suite: `npm test`
4. Build: `npm run build`
5. Submit PR with description

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint + Prettier
- **Commits**: Conventional Commits format

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

### Testing Requirements

- All new features must include tests
- Maintain >80% code coverage
- AI features must include both mocked and real API tests
- Integration tests for pipeline changes

---

## Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Run migrations
npm run prisma:migrate:prod

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```bash
# Build image
docker build -t ai-bug-bounty-backend .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  ai-bug-bounty-backend
```

### Environment Checklist

Production environment must have:

- [ ] `DATABASE_URL` configured
- [ ] `REDIS_URL` configured
- [ ] `SUPABASE_*` credentials set
- [ ] `BASE_SEPOLIA_RPC_URL` set
- [ ] `PRIVATE_KEY` for blockchain transactions
- [ ] `ANTHROPIC_API_KEY` (if AI enabled)
- [ ] All contract addresses configured

---

## Monitoring

### Health Checks

```bash
# System health
GET /api/health

# Database health
GET /api/health/db

# Redis health
GET /api/health/redis
```

### Metrics

Track these key metrics:

- **Scan Success Rate**: % of successful scans
- **AI Enhancement Rate**: % of findings enhanced by AI
- **Average Processing Time**: Per scan step
- **Token Usage**: API costs per scan
- **Cache Hit Rate**: AI response caching efficiency

### Logging

Logs are structured JSON:

```json
{
  "level": "info",
  "timestamp": "2025-02-01T12:00:00.000Z",
  "component": "researcher-agent",
  "step": "AI_DEEP_ANALYSIS",
  "scanId": "scan-123",
  "message": "AI analysis completed",
  "metrics": {
    "enhancedFindings": 2,
    "newFindings": 1,
    "tokensUsed": 3500
  }
}
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Run migrations
npm run prisma:migrate
```

#### Redis Connection Timeout

```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_URL
echo $REDIS_URL
```

#### AI Analysis Not Running

```bash
# Check feature flag
echo $AI_ANALYSIS_ENABLED  # Should be 'true'

# Verify API key
echo $ANTHROPIC_API_KEY | head -c 20  # Should start with 'sk-ant-'

# Test API connection
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

#### Slither Not Found

```bash
# Install Slither
pip3 install slither-analyzer

# Verify installation
slither --version
```

---

## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

## Support

For issues or questions:

1. Check [documentation](./docs/)
2. Review [test examples](./src/agents/researcher/__tests__/)
3. Open an issue on GitHub
4. Contact the development team

---

**Built with** ❤️ **by the AI Bug Bounty Team**
