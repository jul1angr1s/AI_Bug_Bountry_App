# Researcher Agent Scanning Steps

This directory contains the implementation of all 6 scanning steps for the Researcher Agent pipeline.

## Overview

The researcher agent executes a complete vulnerability scanning workflow:

1. **CLONE** - Clone repository from GitHub
2. **COMPILE** - Compile Solidity contracts using Foundry
3. **DEPLOY** - Deploy contracts to local Anvil instance
4. **ANALYZE** - Run static analysis tools (Slither)
5. **PROOF_GENERATION** - Generate proofs for discovered vulnerabilities
6. **SUBMIT** - Submit proofs to Validator Agent

## Step Details

### 1. Clone (`clone.ts`)

Clones the target repository to a sandboxed directory.

**Features:**
- Input sanitization to prevent directory traversal
- GitHub URL validation
- Support for branch/commit checkout
- Shallow cloning for performance
- Automatic cleanup on failure

**Directory Structure:**
```
/tmp/thunder-repos/{protocolId}/{scanId}/
```

### 2. Compile (`compile.ts`)

Compiles Solidity contracts using Foundry's `forge build`.

**Features:**
- Automatic Foundry project initialization
- Dependency installation
- ABI and bytecode extraction
- Error and warning parsing
- Fallback artifact search

**Requirements:**
- Foundry (forge) must be installed

### 3. Deploy (`deploy.ts`)

Deploys compiled contract to a local Anvil instance.

**Features:**
- Dynamic port allocation
- Automatic Anvil startup
- Contract deployment via ethers.js
- Process handle for cleanup
- Graceful/forceful shutdown

**Requirements:**
- Anvil (part of Foundry) must be installed

### 4. Analyze (`analyze.ts`)

Runs static analysis tools to find vulnerabilities.

**Features:**
- Slither integration
- JSON output parsing
- Severity mapping (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- False positive filtering
- Confidence scoring

**Requirements:**
- Slither must be installed (optional - gracefully degrades)

### 5. Proof Generation (`proof-generation.ts`)

Generates proofs for each discovered vulnerability.

**Features:**
- Unique proof IDs
- Reproduction step generation
- Expected outcome description
- Database persistence
- Base64 encoding (encryption placeholder for MVP)

**Future Enhancements:**
- Actual encryption (Task 4.1)
- Digital signatures (Task 4.1)
- IPFS storage

### 6. Submit (`submit.ts`)

Submits proofs to the Validator Agent via Redis.

**Features:**
- Redis pub/sub messaging
- Proof status updates
- Anvil cleanup
- WebSocket event emission

## Dependencies

### Required System Tools
- Git
- Foundry (forge, anvil)
- Node.js 20+

### Optional Tools
- Slither (for static analysis)

### NPM Packages
- `simple-git` - Git operations
- `ethers` - Contract deployment
- `find-free-port` - Port allocation
- `@prisma/client` - Database
- `ioredis` - Redis

## Error Handling

Each step includes comprehensive error handling:
- Graceful degradation (e.g., if Slither not installed)
- Resource cleanup on failure
- Structured error codes
- Detailed error messages

## Testing

To test the complete pipeline:

```bash
# Start required services
cd backend
docker-compose up -d postgres redis

# Run the researcher worker
npm run researcher:worker

# Trigger a scan via API
curl -X POST http://localhost:3000/api/scans \\
  -H "Content-Type: application/json" \\
  -d '{
    "protocolId": "test-protocol-id",
    "targetBranch": "main"
  }'
```

## Security Considerations

1. **Input Sanitization**: All user inputs are sanitized to prevent injection
2. **Sandboxing**: Repos cloned to isolated /tmp directory
3. **Resource Limits**: Timeouts on all operations
4. **Process Cleanup**: Anvil processes terminated on completion/failure
5. **Validation**: GitHub URLs validated before cloning

## Performance

Typical scan times:
- CLONE: 10-60 seconds (depends on repo size)
- COMPILE: 30-120 seconds (depends on contract complexity)
- DEPLOY: 5-10 seconds
- ANALYZE: 60-300 seconds (depends on contract size)
- PROOF_GENERATION: 1-5 seconds
- SUBMIT: 1-2 seconds

**Total: ~2-8 minutes per scan**

## Future Improvements

1. **Parallel Analysis**: Run multiple tools concurrently
2. **Caching**: Cache compilation artifacts
3. **Dynamic Analysis**: Add runtime testing with Echidna/Foundry fuzzing
4. **ML Models**: Integrate ML-based vulnerability detection
5. **Incremental Scanning**: Only scan changed files
