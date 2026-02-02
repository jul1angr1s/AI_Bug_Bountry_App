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

### Common Issues

#### Protocol Agent Fails to Clone

**Symptoms**: Protocol status stuck at PENDING, error in logs about Git clone failure

**Solutions**:

```bash
# Check network connectivity
ping github.com

# Verify GitHub URL is accessible
curl -I https://github.com/Cyfrin/2023-11-Thunder-Loan

# Check disk space
df -h

# Verify Git is installed
git --version

# Check backend logs
cd backend
npm run dev  # Look for detailed error messages
```

#### Researcher Agent Fails to Scan

**Symptoms**: Scan state shows FAILED, compilation errors in logs

**Solutions**:

```bash
# Verify Foundry is installed
forge --version
# Expected: forge 0.2.0 or higher

# Check if Anvil is available
anvil --version

# Test contract compilation manually
cd /tmp
git clone https://github.com/Cyfrin/2023-11-Thunder-Loan
cd 2023-11-Thunder-Loan
forge build
# If this fails, check Solidity version compatibility

# Verify Slither is installed (optional for AI-only mode)
slither --version

# Check backend logs for specific error
grep -i "error" backend/logs/app.log
```

#### Validator Agent Fails to Validate

**Symptoms**: Validation stuck at PENDING, AI API errors

**Solutions**:

```bash
# Verify ANTHROPIC_API_KEY is set
echo $ANTHROPIC_API_KEY
# or check backend/.env

# Test API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'

# Check API rate limits
# Visit https://console.anthropic.com/settings/limits

# Disable AI validation temporarily
# Set in backend/.env:
AI_ANALYSIS_ENABLED=false

# Restart backend
cd backend
npm run dev
```

#### Payment Worker Fails to Process

**Symptoms**: Payment status shows FAILED, transaction reverts

**Solutions**:

```bash
# Check wallet balance (Base Sepolia ETH)
cast balance $YOUR_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL
# Need at least 0.01 ETH for gas

# Get testnet ETH
# Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

# Check USDC balance in BountyPool
cast call $BOUNTY_POOL_ADDRESS \
  "getPoolBalance(bytes32)" \
  $PROTOCOL_ID \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Verify contract addresses match
grep "BOUNTY_POOL_ADDRESS" backend/.env
grep "BOUNTY_POOL_ADDRESS" frontend/.env

# Check PAYOUT_ROLE is granted
cast call $BOUNTY_POOL_ADDRESS \
  "hasRole(bytes32,address)" \
  0x... \  # PAYOUT_ROLE hash
  $YOUR_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# View contract ABI to debug
cast abi-encode "releaseBounty(address,bytes32,uint8,uint256)" ...
```

#### Database Connection Issues

**Symptoms**: "Can't reach database server" errors

**Solutions**:

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432
# Expected: localhost:5432 - accepting connections

# If using Docker
docker ps | grep postgres
docker logs postgres

# Start PostgreSQL
# macOS:
brew services start postgresql@14
# Linux:
sudo systemctl start postgresql
# Docker:
docker-compose up -d postgres

# Verify connection string
echo $DATABASE_URL
# Should be: postgresql://postgres:password@localhost:5432/bugbounty

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# Check for port conflicts
lsof -i :5432

# Reset database (development only - DELETES DATA)
cd backend
npx prisma migrate reset
```

#### Redis Connection Issues

**Symptoms**: Queue jobs not processing, WebSocket not working

**Solutions**:

```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# If using Docker
docker ps | grep redis
docker logs redis

# Start Redis
# macOS:
brew services start redis
# Linux:
sudo systemctl start redis
# Docker:
docker-compose up -d redis

# Test connection
redis-cli
> SET test "value"
> GET test
> DEL test
> QUIT

# Check Redis URL
echo $REDIS_URL
# Should be: redis://localhost:6379

# Check for port conflicts
lsof -i :6379

# Clear Redis cache (if needed)
redis-cli FLUSHALL
```

### Error Messages

#### "Duplicate GitHub URL"

**Cause**: Protocol already registered with this GitHub URL

**Solution**: Use a different protocol or delete existing registration

```bash
# Find existing protocol
psql $DATABASE_URL -c "SELECT id, \"githubUrl\" FROM \"Protocol\" WHERE \"githubUrl\" = 'https://github.com/Cyfrin/2023-11-Thunder-Loan';"

# Delete protocol (development only)
psql $DATABASE_URL -c "DELETE FROM \"Protocol\" WHERE \"githubUrl\" = 'https://github.com/Cyfrin/2023-11-Thunder-Loan';"
```

#### "Compilation Failed"

**Cause**: Contract doesn't compile with current Foundry version

**Solutions**:

```bash
# Update Foundry
foundryup

# Check Solidity version in contract
grep "pragma solidity" src/**/*.sol

# Try different Foundry version
foundryup --version nightly-...
```

#### "Insufficient USDC balance"

**Cause**: BountyPool doesn't have enough USDC

**Solutions**:

```bash
# Get testnet USDC from faucet
# Visit: https://faucet.circle.com/

# Or mint directly (if minter role available)
cast send $USDC_ADDRESS \
  "mint(address,uint256)" \
  $BOUNTY_POOL_ADDRESS \
  100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Approve and deposit
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $BOUNTY_POOL_ADDRESS \
  100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

cast send $BOUNTY_POOL_ADDRESS \
  "depositBounty(bytes32,uint256)" \
  $PROTOCOL_ID \
  100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

#### "WebSocket connection failed"

**Cause**: CORS issue or incorrect WebSocket URL

**Solutions**:

```bash
# Check WebSocket URL in frontend/.env
grep "VITE_WS_URL" frontend/.env
# Development: ws://localhost:3000
# Production: wss://your-api.railway.app

# Test WebSocket connection
npm install -g wscat
wscat -c ws://localhost:3000

# Check CORS configuration in backend
grep "FRONTEND_URL" backend/.env
# Should match frontend URL: http://localhost:5173

# Check backend logs for CORS errors
cd backend
npm run dev | grep -i cors
```

### Tips for Successful Demonstration

1. **Pre-flight Checklist**:
   - [ ] PostgreSQL running
   - [ ] Redis running
   - [ ] Database migrations applied
   - [ ] Environment variables set
   - [ ] Contracts deployed and funded
   - [ ] Testnet ETH in wallet (>0.01 ETH)
   - [ ] Backend health check passes

2. **Run Health Check**:

```bash
# Check all services
curl http://localhost:3000/health/detailed

# Expected response:
# {
#   "status": "ok",
#   "checks": {
#     "database": {"status": "ok"},
#     "redis": {"status": "ok"},
#     "memory": {"status": "ok"}
#   }
# }
```

3. **Monitor Logs**:

```bash
# Terminal 1: Backend logs
cd backend
npm run dev

# Terminal 2: Frontend logs
cd frontend
npm run dev

# Terminal 3: Database queries (optional)
npx prisma studio

# Terminal 4: Redis monitor (optional)
redis-cli monitor
```

4. **Common Gotchas**:
   - Thunder Loan requires specific Foundry version
   - AI analysis requires valid Anthropic API key
   - Payment requires USDC in BountyPool AND ETH for gas
   - WebSocket requires CORS configuration
   - Scan timeout is 10 minutes by default

5. **Optimal Demo Flow**:
   - Start with a known-good protocol (Thunder Loan)
   - Monitor backend console for progress
   - Keep browser console open for errors
   - Use separate terminal for health checks
   - Have Basescan open to monitor transactions

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
