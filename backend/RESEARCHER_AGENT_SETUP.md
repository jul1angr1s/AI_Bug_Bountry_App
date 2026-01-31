# Researcher Agent Setup Guide

## Quick Start

This guide will help you set up and test the Researcher Agent scanning pipeline.

## Prerequisites

### 1. Install Foundry

Foundry is **REQUIRED** for the scanning pipeline to work.

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Update PATH and install
foundryup

# Verify installation
forge --version
anvil --version
```

### 2. Install Slither (Optional but Recommended)

Slither provides static analysis capabilities.

```bash
# Install Python pip if needed
# macOS:
brew install python3

# Install Slither
pip3 install slither-analyzer

# Verify installation
slither --version
```

### 3. Install Node Dependencies

```bash
cd backend
npm install
```

## Configuration

### Environment Variables

Create or update `.env` in the `backend/` directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/thunder_db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3000
NODE_ENV=development
```

## Starting the Services

### 1. Start PostgreSQL and Redis

```bash
cd backend
docker-compose up -d postgres redis
```

### 2. Run Database Migrations

```bash
npm run prisma:migrate
```

### 3. Seed Test Data (Optional)

Create a test protocol and agent in the database:

```bash
npm run prisma:studio
# Manually create:
# 1. An Agent with type=RESEARCHER, status=ONLINE
# 2. A Protocol with githubUrl, contractPath, contractName
```

## Running the Researcher Agent

### Start the Worker

In one terminal:

```bash
cd backend
npm run researcher:worker
```

You should see:
```
[Researcher Worker] Worker started, waiting for jobs...
```

### Start the API Server

In another terminal:

```bash
cd backend
npm run dev
```

## Testing the Pipeline

### Option 1: Quick Test (Individual Steps)

Test individual steps without the full pipeline:

```bash
cd backend
npx tsx src/agents/researcher/steps/test-helper.ts
```

This will:
- Clone a test repository (OpenZeppelin contracts)
- Attempt to compile with Foundry
- Run Slither analysis if available

### Option 2: Full Integration Test

Trigger a complete scan via the API:

```bash
# Trigger a scan
curl -X POST http://localhost:3000/api/scans \
  -H "Content-Type: application/json" \
  -d '{
    "protocolId": "YOUR_PROTOCOL_ID",
    "targetBranch": "main"
  }'
```

## Monitoring the Scan

### 1. Check Worker Logs

The worker logs will show progress through each step:

```
[Clone] Cloning https://github.com/... to /tmp/thunder-repos/...
[Compile] Compiling contracts in /tmp/thunder-repos/...
[Deploy] Starting Anvil on port 8547...
[Deploy] Contract deployed at 0x5FbDB2315678afecb367f032d93F642f64180aa3
[Analyze] Running static analysis on MyContract...
[ProofGen] Generating proofs for 3 findings...
[Submit] Submitting 3 proofs for scan scan-123...
```

### 2. Check Database

```bash
npm run prisma:studio
```

Navigate to:
- `Scan` table - See scan status
- `ScanStepRecord` table - See step details
- `Finding` table - See vulnerabilities found
- `Proof` table - See generated proofs

### 3. Monitor WebSocket Events

Connect to WebSocket at `ws://localhost:3000` to receive real-time updates:

```javascript
const socket = io('http://localhost:3000');
socket.emit('join_room', 'scans');

socket.on('scan:started', (event) => {
  console.log('Scan started:', event);
});

socket.on('scan:progress', (event) => {
  console.log('Progress:', event.data.progress + '%', event.data.message);
});

socket.on('scan:completed', (event) => {
  console.log('Scan completed:', event.data);
});
```

## Troubleshooting

### Error: "forge: command not found"

**Solution:** Install Foundry (see Prerequisites)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Error: "slither: command not found"

**Solution:** Either install Slither or ignore (analysis will skip):

```bash
pip3 install slither-analyzer
```

### Error: "No available Researcher Agent found"

**Solution:** Create an agent in the database:

```sql
INSERT INTO "Agent" (id, type, status)
VALUES ('agent-researcher-001', 'RESEARCHER', 'ONLINE');
```

### Error: "Scan not found"

**Solution:** Ensure the protocol exists in the database:

```sql
INSERT INTO "Protocol" (
  id,
  "authUserId",
  "ownerAddress",
  "githubUrl",
  branch,
  "contractPath",
  "contractName",
  "bountyTerms"
) VALUES (
  'protocol-001',
  'user-001',
  '0x1234567890123456789012345678901234567890',
  'https://github.com/OpenZeppelin/openzeppelin-contracts.git',
  'master',
  'contracts/token/ERC20',
  'ERC20',
  'Standard bug bounty terms'
);
```

### Anvil Process Not Cleaned Up

**Solution:** Manually kill orphaned Anvil processes:

```bash
# Find Anvil processes
ps aux | grep anvil

# Kill them
pkill -9 anvil
```

### Port Already in Use

The deploy step will automatically find a free port between 8545-8645. If you see port conflicts:

```bash
# Find what's using the port
lsof -i :8545

# Kill the process
kill -9 <PID>
```

## Test Contracts

### Minimal Test Contract

Create a simple vulnerable contract for testing:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // Vulnerable to reentrancy
    function withdraw() public {
        uint256 balance = balances[msg.sender];
        (bool sent, ) = msg.sender.call{value: balance}("");
        require(sent, "Failed to send Ether");
        balances[msg.sender] = 0;
    }
}
```

### Using OpenZeppelin Contracts

The test helper uses OpenZeppelin contracts which are well-tested but may still have findings from Slither.

## Performance Optimization

### Speed Up Cloning

Use shallow clones (already implemented):
- `--depth 1` flag reduces clone time
- Only downloads latest commit

### Speed Up Compilation

Cache Foundry artifacts:
```bash
# Artifacts are already cached in out/ directory
# Future enhancement: reuse artifacts for unchanged contracts
```

### Parallel Scanning

Run multiple worker instances:

```bash
# Terminal 1
npm run researcher:worker

# Terminal 2
npm run researcher:worker

# Both workers will process scans concurrently
```

## Production Deployment

### Docker Deployment

```bash
# Build production image
npm run docker:build:prod

# Start all services
docker-compose up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Monitoring

- Use PM2 for process management
- Set up log aggregation (e.g., Datadog, LogRocket)
- Monitor resource usage (Anvil can be memory-intensive)

## Next Steps

1. ✅ Install prerequisites (Foundry, Slither)
2. ✅ Start services (PostgreSQL, Redis)
3. ✅ Seed test data
4. ✅ Run test scan
5. ✅ Monitor results
6. 🔄 Implement encryption (Task 4.1)
7. 🔄 Add more analysis tools (Mythril, etc.)
8. 🔄 Implement fuzzing (Echidna, Foundry)

## Support

For issues or questions:
- Check the logs in the worker terminal
- Review the database state in Prisma Studio
- Examine scan step records for detailed error messages

## File Locations

- **Worker:** `backend/src/agents/researcher/worker.ts`
- **Steps:** `backend/src/agents/researcher/steps/`
- **Tests:** `backend/src/agents/researcher/steps/test-helper.ts`
- **Logs:** Worker terminal output
- **Artifacts:** `/tmp/thunder-repos/{protocolId}/{scanId}/`

---

**Last Updated:** 2026-01-31
