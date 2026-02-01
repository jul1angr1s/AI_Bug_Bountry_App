# AI Bug Bounty Platform - Demonstration Guide

## Overview

This guide walks you through the complete demonstration workflow using the Thunder Loan protocol as a reference implementation. The demonstration showcases the end-to-end flow from protocol registration through automated payment processing.

## Prerequisites

- Node.js >= 20
- PostgreSQL database
- Redis server
- Kimi 2.5 API key (Moonshot AI)
- Base Sepolia testnet access
- BountyPool contract deployed on Base Sepolia

## Environment Setup

### Backend Configuration

Create `backend/.env` with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bugbounty

# Supabase (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Server
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development

# Blockchain (Base Sepolia)
PRIVATE_KEY=0x...your_private_key
BOUNTY_POOL_ADDRESS=0x...deployed_contract_address
BASESCAN_API_KEY=your_basescan_key

# AI/LLM (Kimi 2.5)
MOONSHOT_API_KEY=your_moonshot_api_key
KIMI_API_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-32k

# Error Tracking (Optional)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Frontend Configuration

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000/api/v1
```

## Starting the Application

### 1. Start Backend

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run prisma:migrate

# Start the server
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## Demonstration Workflow

### Step 1: Register Thunder Loan Protocol

1. Navigate to `http://localhost:5173/protocols/register`
2. Fill in the registration form:
   - **Protocol Name**: Thunder Loan Protocol
   - **GitHub URL**: https://github.com/Cyfrin/2023-11-Thunder-Loan
   - **Branch**: main
   - **Contract Path**: src/protocol/ThunderLoan.sol
   - **Contract Name**: ThunderLoan
   - **Bounty Pool Address**: (your deployed contract address)
   - **Network**: Base Sepolia

3. Click "Register Protocol"
4. You'll be redirected to `/protocols` with a success toast

**Expected Duration**: < 30 seconds

### Step 2: Protocol Analysis (Automated)

The Protocol Agent automatically:

1. Clones the GitHub repository
2. Verifies the contract path exists
3. Compiles the contracts with Foundry
4. Calculates risk score based on complexity
5. Updates protocol status to ACTIVE

**Monitor Progress**:
- Dashboard shows "Protocol Analysis In Progress" badge
- Navigate to `/protocols` to see the protocol card
- Status changes from PENDING → ACTIVE

**Expected Duration**: < 60 seconds

### Step 3: Vulnerability Scanning (Automated)

The Researcher Agent automatically:

1. Deploys ThunderLoan to a local Anvil fork
2. Analyzes the contract with Slither static analysis
3. Runs AI deep analysis (if configured)
4. Generates exploit proof-of-concept code
5. Creates Finding records
6. Stores encrypted proofs in the database

**Monitor Progress**:
- Navigate to `/scans` to see scan progress
- Real-time progress bar updates
- Findings appear as they're discovered

**Expected Duration**: < 60 seconds

### Step 4: Proof Validation (Automated)

The Validator Agent automatically:

1. Fetches proof from Finding record
2. Analyzes proof with Kimi 2.5 LLM
3. Evaluates:
   - Technical correctness of exploit logic
   - Validity of attack vector
   - Severity assessment
4. Calculates confidence score (0-100%)
5. Updates Finding status (VALIDATED/REJECTED)
6. Triggers payment queue if VALIDATED

**Monitor Progress**:
- Navigate to `/validations` to see validation status
- Confidence scores displayed for each finding
- Status badges: PENDING → VALIDATED/REJECTED

**Expected Duration**: < 60 seconds

### Step 5: Payment Processing (Automated)

The Payment Worker automatically:

1. Validates payment eligibility
2. Checks bounty pool balance
3. Submits transaction to BountyPool contract on Base Sepolia
4. Monitors transaction confirmation
5. Updates Payment record with txHash
6. Reconciles payment with on-chain events

**Monitor Progress**:
- Navigate to `/payments` to see payment status
- Status changes: PENDING → PROCESSING → COMPLETED
- Transaction hash links to Basescan

**Expected Duration**: < 30 seconds (blockchain confirmation time)

### Step 6: View Results

#### Dashboard
Navigate to `http://localhost:5173/` to see:
- Total protocols registered
- Vulnerabilities found
- Total payments made
- Agent status (online/scanning)
- Recent activity timeline

#### Protocol Detail
Navigate to `/protocols/:id` to see:
- Protocol information
- Scan history
- Findings list
- Payment history

#### Payments
Navigate to `/payments` to see:
- All payments with status
- Researcher addresses
- Transaction hashes (click to view on Basescan)
- Amount and currency

## API Endpoints

### Protocols
- `POST /api/v1/protocols` - Register new protocol
- `GET /api/v1/protocols` - List all protocols
- `GET /api/v1/protocols/:id` - Protocol details

### Scans
- `GET /api/v1/scans` - List all scans
- `GET /api/v1/scans/:id` - Scan details
- `GET /api/v1/scans/:id/progress` - Real-time progress (SSE)

### Validations
- `GET /api/v1/validations` - List all validations

### Payments
- `GET /api/v1/payments` - List all payments
- `GET /api/v1/payments/:id` - Payment details
- `GET /api/v1/payments/researcher/:address` - Payments by researcher
- `POST /api/v1/payments/:id/retry` - Retry failed payment (admin)
- `GET /api/v1/payments/stats` - Payment statistics

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with memory stats
- `GET /metrics` - Application metrics

## Troubleshooting

### Protocol Agent Fails to Clone
- Verify GitHub URL is accessible
- Check network connectivity
- Ensure sufficient disk space

### Researcher Agent Fails to Scan
- Verify Foundry is installed (`forge --version`)
- Check Anvil is available
- Ensure contract compiles successfully

### Validator Agent Fails to Validate
- Verify MOONSHOT_API_KEY is set correctly
- Check Kimi API quota and rate limits
- Review error logs in console

### Payment Worker Fails to Process
- Verify BOUNTY_POOL_ADDRESS is correct
- Check wallet has sufficient ETH for gas
- Ensure BountyPool contract has USDC balance
- Verify PAYOUT_ROLE permissions

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL connection string
- Run migrations: `npm run prisma:migrate`

### Redis Connection Issues
- Verify Redis server is running
- Check Redis connection in logs
- Default Redis: `redis://localhost:6379`

## Performance Benchmarks

Expected performance for demonstration workflow:

| Step | Duration | Status |
|------|----------|--------|
| Protocol Registration | < 30s | ✅ |
| Protocol Analysis | < 60s | ✅ |
| Vulnerability Scan | < 60s | ✅ |
| Proof Validation | < 60s | ✅ |
| Payment Processing | < 30s | ✅ |
| **Total End-to-End** | **< 4 minutes** | ✅ |

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **API Keys**: Use environment variables for all sensitive keys
3. **Database**: Use strong passwords and restrict access
4. **Sentry**: Configure DSN carefully to avoid leaking sensitive data
5. **BountyPool**: Ensure proper access controls and role management

## Next Steps

After successful demonstration:

1. Deploy to production environment
2. Configure production blockchain (Base Mainnet)
3. Set up monitoring and alerting
4. Configure Sentry for error tracking
5. Set up CI/CD pipeline
6. Enable HTTPS for production
7. Configure rate limiting
8. Set up backup and recovery

## Support

For issues or questions:
- GitHub Issues: https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues
- Documentation: /docs
- API Docs: /api/v1/docs (coming soon)
