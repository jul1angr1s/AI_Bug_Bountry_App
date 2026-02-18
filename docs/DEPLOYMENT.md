# Deployment Guide

Complete step-by-step guide for deploying the AI Bug Bounty Platform to development, staging, and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Verification Steps](#verification-steps)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Backend runtime |
| npm | 9+ | Package management |
| PostgreSQL | 14+ | Database |
| Redis | 7+ | Cache and queues |
| Docker | 24+ | Containerization |
| Docker Compose | 2.0+ | Multi-container orchestration |
| Foundry | Latest | Smart contract deployment |
| Git | 2.30+ | Version control |

### Installation Commands

**macOS (Homebrew)**:

```bash
# Install Node.js
brew install node@20

# Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Install Redis
brew install redis
brew services start redis

# Install Docker Desktop
brew install --cask docker

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**Ubuntu/Debian**:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql-14 postgresql-contrib
sudo systemctl start postgresql

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl start redis

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Required Accounts

- **Base Sepolia Wallet**: For smart contract deployment
- **Basescan API Key**: For contract verification ([Get here](https://basescan.org/apis))
- **Anthropic API Key**: For AI analysis (optional, [Get here](https://console.anthropic.com/))
- **Sentry Account**: For error tracking (optional, [Get here](https://sentry.io/))

---

## Environment Variables

### Backend Environment (.env)

Create `backend/.env` with the following configuration:

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# ============================================
# DATABASE CONFIGURATION
# ============================================
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/bugbounty"

# OR Production PostgreSQL (Railway/Supabase)
# DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# Optional: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# ============================================
# REDIS CONFIGURATION
# ============================================
# Local Redis
REDIS_URL=redis://localhost:6379

# OR Production Redis (Railway/Upstash)
# REDIS_URL=redis://username:password@host:port

# ============================================
# BLOCKCHAIN CONFIGURATION (Base Sepolia)
# ============================================
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...  # Your deployer wallet private key

# Deployed Contract Addresses
PROTOCOL_REGISTRY_ADDRESS=0xc7DF730cf661a306a9aEC93D7180da6f6Da23235
VALIDATION_REGISTRY_ADDRESS=0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d
BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0

# Base Sepolia USDC (testnet)
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Basescan API Key (for verification)
BASESCAN_API_KEY=your_basescan_api_key

# ============================================
# AI/LLM CONFIGURATION
# ============================================
# Claude Sonnet (Anthropic)
AI_ANALYSIS_ENABLED=true
ANTHROPIC_API_KEY=sk-ant-...

# AI Configuration
AI_CONCURRENCY_LIMIT=3
AI_RATE_LIMIT_RPM=100
KNOWLEDGE_BASE_TOP_K=5

# ============================================
# ERROR TRACKING (OPTIONAL)
# ============================================
SENTRY_DSN=https://...@sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=0.1

# ============================================
# AUTHENTICATION (OPTIONAL)
# ============================================
JWT_SECRET=your-secret-key-min-32-chars
SESSION_SECRET=another-secret-key

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment (.env)

Create `frontend/.env`:

```bash
# ============================================
# API CONFIGURATION
# ============================================
# Development
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000

# Production
# VITE_API_URL=https://your-api.railway.app/api/v1
# VITE_WS_URL=wss://your-api.railway.app

# ============================================
# BLOCKCHAIN CONFIGURATION
# ============================================
VITE_CHAIN_ID=84532
VITE_CHAIN_NAME=Base Sepolia

# Contract Addresses (should match backend)
VITE_PROTOCOL_REGISTRY_ADDRESS=0xc7DF730cf661a306a9aEC93D7180da6f6Da23235
VITE_VALIDATION_REGISTRY_ADDRESS=0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d
VITE_BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
```

---

## Local Development

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/jul1angr1s/AI_Bug_Bountry_App.git
cd AI_Bug_Bountry_App

# 2. Install dependencies
cd backend
npm install
cd ../frontend
npm install
cd ..

# 3. Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 4. Set up database
cd backend
npx prisma generate
npx prisma migrate deploy

# 5. Start backend
npm run dev
# Backend runs on http://localhost:3000

# 6. In new terminal, start frontend
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

### Development Services

After running `docker-compose up -d postgres redis`:

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | localhost:5432 | postgres/password |
| Redis | localhost:6379 | (no password) |
| Backend API | http://localhost:3000 | N/A |
| Frontend | http://localhost:5173 | N/A |
| Prisma Studio | http://localhost:5555 | `npm run prisma:studio` |

---

## Database Setup

### Initial Setup

```bash
cd backend

# 1. Generate Prisma Client
npx prisma generate

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify database connection
npx prisma db push
```

### Create Database Manually

If you need to create the database manually:

```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE bugbounty;"

# Or using Docker
docker exec -it postgres psql -U postgres -c "CREATE DATABASE bugbounty;"
```

### Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
# Opens browser at http://localhost:5555
```

### Reset Database (Development Only)

```bash
cd backend

# WARNING: This deletes all data
npx prisma migrate reset

# Or drop and recreate
npx prisma db push --force-reset
```

### Initialize Agent Records (Optional)

```bash
cd backend
npx tsx scripts/init-agents.ts
```

---

## Docker Deployment

### Full Stack with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Clean up (removes volumes)
docker-compose down -v
```

### Docker Compose Configuration

The `docker-compose.yml` includes:

- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend (port 3000)
- Frontend (port 5173)

```yaml
services:
  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: bugbounty
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/bugbounty
      REDIS_URL: redis://redis:6379

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

### Individual Service Builds

**Backend**:

```bash
cd backend
docker build -t bug-bounty-backend .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  bug-bounty-backend
```

**Frontend**:

```bash
cd frontend
docker build -t bug-bounty-frontend .
docker run -p 5173:5173 bug-bounty-frontend
```

---

## Production Deployment

### Railway Deployment

#### Backend Deployment

1. **Install Railway CLI**:

```bash
npm install -g @railway/cli
railway login
```

2. **Initialize Project**:

```bash
cd backend
railway init
```

3. **Add PostgreSQL**:

```bash
railway add
# Select "PostgreSQL"
```

4. **Add Redis**:

```bash
railway add
# Select "Redis"
```

5. **Configure Environment Variables**:

```bash
# Railway automatically sets DATABASE_URL and REDIS_URL
# Add other variables manually
railway variables set NODE_ENV=production
railway variables set PRIVATE_KEY=0x...
railway variables set PROTOCOL_REGISTRY_ADDRESS=0x...
railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

6. **Deploy**:

```bash
railway up
```

7. **Run Migrations**:

```bash
railway run npx prisma migrate deploy
```

#### Frontend Deployment

1. **Build Frontend**:

```bash
cd frontend
npm run build
```

2. **Deploy to Vercel/Netlify**:

**Vercel**:

```bash
npm install -g vercel
vercel --prod
```

**Netlify**:

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

3. **Configure Environment**:

Set environment variables in Vercel/Netlify dashboard:

```
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_WS_URL=wss://your-backend.railway.app
```

### Alternative: Docker Production Build

```bash
# Backend production build
cd backend
docker build --target production -t bug-bounty-backend:prod .
docker run -d -p 3000:3000 \
  --env-file .env.production \
  bug-bounty-backend:prod

# Frontend production build
cd frontend
docker build -t bug-bounty-frontend:prod .
docker run -d -p 80:80 bug-bounty-frontend:prod
```

---

## Smart Contract Deployment

### Prerequisites

```bash
# Ensure Foundry is installed
forge --version

# Navigate to contracts directory
cd backend/contracts
```

### Deploy to Base Sepolia

1. **Configure Environment**:

Create `backend/contracts/.env`:

```bash
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...
BASESCAN_API_KEY=your_basescan_api_key
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

2. **Compile Contracts**:

```bash
forge build
```

3. **Deploy Contracts**:

```bash
# Deploy all contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --legacy

# Or deploy individually
forge create src/ProtocolRegistry.sol:ProtocolRegistry \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --legacy
```

4. **Verify Contracts**:

```bash
forge verify-contract \
  --chain-id 84532 \
  --compiler-version 0.8.20 \
  CONTRACT_ADDRESS \
  src/ProtocolRegistry.sol:ProtocolRegistry \
  --etherscan-api-key $BASESCAN_API_KEY
```

5. **Update Configuration**:

Update `backend/.env` and `frontend/.env` with deployed addresses.

### Fund BountyPool Contract

```bash
# Get testnet USDC from faucet
# https://faucet.circle.com/

# Approve USDC for BountyPool
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $BOUNTY_POOL_ADDRESS \
  1000000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY

# Deposit to BountyPool
cast send $BOUNTY_POOL_ADDRESS \
  "depositBounty(bytes32,uint256)" \
  $PROTOCOL_ID \
  100000000 \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## Verification Steps

### Backend Health Check

```bash
# Basic health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2024-02-01T12:00:00Z","services":{"database":"ok","redis":"ok","eventListener":"ok"}}

# Detailed health
curl http://localhost:3000/health/detailed

# Service health
curl http://localhost:3000/health/services

# Metrics
curl http://localhost:3000/metrics
```

### Database Verification

```bash
cd backend

# Check Prisma connection
npx prisma db pull

# Verify migrations
npx prisma migrate status

# Check tables
npx prisma studio
```

### Smart Contract Verification

```bash
# Check deployment
cast call $PROTOCOL_REGISTRY_ADDRESS \
  "protocolCount()" \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check USDC balance
cast call $USDC_ADDRESS \
  "balanceOf(address)" \
  $BOUNTY_POOL_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

### End-to-End Test

```bash
# Run E2E tests
cd backend
npm run test:e2e

# Or manually test workflow:
# 1. Register protocol via UI
# 2. Monitor scan progress
# 3. Verify findings
# 4. Check payment completion
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: `Error: Can't reach database server`

**Solution**:

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Or with Docker
docker ps | grep postgres

# Restart PostgreSQL
brew services restart postgresql@14
# or
docker-compose restart postgres

# Verify connection string
echo $DATABASE_URL
```

#### Redis Connection Errors

**Problem**: `Error: Redis connection refused`

**Solution**:

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Or with Docker
docker exec redis redis-cli ping

# Restart Redis
brew services restart redis
# or
docker-compose restart redis
```

#### Prisma Migration Issues

**Problem**: `Migration failed to apply`

**Solution**:

```bash
# Reset database (development only)
npx prisma migrate reset

# Or manually drop and recreate
dropdb bugbounty
createdb bugbounty
npx prisma migrate deploy
```

#### Smart Contract Deployment Fails

**Problem**: `Transaction reverted` or `Insufficient funds`

**Solution**:

```bash
# Check wallet balance
cast balance $YOUR_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL

# Get testnet ETH
# Visit: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

# Verify gas price
cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL

# Use legacy transactions (no EIP-1559)
forge script ... --legacy
```

#### Frontend Not Connecting to Backend

**Problem**: CORS errors or connection refused

**Solution**:

```bash
# Check FRONTEND_URL in backend/.env
FRONTEND_URL=http://localhost:5173

# Check VITE_API_URL in frontend/.env
VITE_API_URL=http://localhost:3000/api/v1

# Verify backend is running
curl http://localhost:3000/health

# Check CORS headers in response
curl -I http://localhost:3000/health
```

#### WebSocket Connection Issues

**Problem**: WebSocket handshake failed

**Solution**:

```bash
# Check WS_URL in frontend
VITE_WS_URL=ws://localhost:3000

# For production (SSL required)
VITE_WS_URL=wss://your-api.railway.app

# Test WebSocket connection
wscat -c ws://localhost:3000
```

#### Docker Build Failures

**Problem**: `npm install` fails or build hangs

**Solution**:

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Docker resources (increase if needed)
# Docker Desktop → Settings → Resources
```

### Log Locations

**Development**:
- Backend: Console output
- Frontend: Browser console
- Database: `pg_log` directory
- Redis: Console output

**Production (Railway)**:
```bash
# View backend logs
railway logs

# View specific service
railway logs --service backend

# Stream logs
railway logs --follow
```

**Docker**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Performance Issues

**Slow API Responses**:

```bash
# Check database query performance
cd backend
npx prisma studio
# Enable query logging in prisma.client.ts

# Check Redis latency
redis-cli --latency

# Monitor memory usage
docker stats
```

**High Memory Usage**:

```bash
# Check Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run dev

# Monitor process
top -p $(pgrep node)
```

---

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured and validated
- [ ] Database migrations applied successfully
- [ ] Smart contracts deployed and verified on Base Sepolia
- [ ] BountyPool funded with USDC
- [ ] Health endpoints return 200 OK
- [ ] End-to-end test passes
- [ ] HTTPS/WSS configured for frontend
- [ ] Rate limiting enabled
- [ ] Sentry error tracking configured
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Private keys secured (never committed)
- [ ] CORS configured correctly
- [ ] API documentation updated
- [ ] Load testing completed

---

## Support

For deployment issues:

- **GitHub Issues**: https://github.com/jul1angr1s/AI_Bug_Bountry_App/issues
- **Documentation**: /docs
- **Community**: GitHub Discussions

---

**Last Updated**: 2024-02-01
