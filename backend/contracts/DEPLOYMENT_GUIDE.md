# Smart Contract Deployment Guide

## Quick Start

### Prerequisites

1. **Base Sepolia ETH**: At least 0.05 ETH
   - Get from: https://www.alchemy.com/faucets/base-sepolia

2. **Basescan API Key**:
   - Get from: https://basescan.org/myapikey

3. **Environment Variables**:
   Create `backend/.env`:
   ```bash
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   BASESCAN_API_KEY=your_api_key_here
   PRIVATE_KEY=your_private_key_here
   ```

### Deploy

```bash
cd backend/contracts

forge script script/DeployBaseSepolia.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### After Deployment

1. Copy contract addresses from output
2. Add to `backend/.env`:
   ```bash
   PROTOCOL_REGISTRY_ADDRESS=0x...
   VALIDATION_REGISTRY_ADDRESS=0x...
   BOUNTY_POOL_ADDRESS=0x...
   ```

3. Verify on Basescan:
   - https://sepolia.basescan.org/address/{CONTRACT_ADDRESS}

## Deployed Contracts

### ProtocolRegistry
- **Purpose**: Register protocols for bug bounty scanning
- **Key Functions**:
  - `registerProtocol()` - Register a new protocol
  - `getProtocol()` - Get protocol details
  - `isGithubUrlRegistered()` - Check for duplicates

### ValidationRegistry
- **Purpose**: Record vulnerability validation results (ERC-8004 compliant)
- **Key Functions**:
  - `recordValidation()` - Record validation result
  - `getValidation()` - Get validation details
  - `getProtocolValidations()` - Get all validations for protocol

### BountyPool
- **Purpose**: Manage USDC bounty pools and payments
- **USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **Key Functions**:
  - `depositBounty()` - Deposit USDC to protocol pool
  - `releaseBounty()` - Pay researcher after validation
  - `getProtocolBalance()` - Check available funds

## Bounty Amounts

Base: 100 USDC

Multipliers:
- CRITICAL: 5x (500 USDC)
- HIGH: 3x (300 USDC)
- MEDIUM: 1.5x (150 USDC)
- LOW: 1x (100 USDC)
- INFORMATIONAL: 0.25x (25 USDC)

## Roles

### ProtocolRegistry
- **Owner**: Deployer address
- Can update protocol status and bounty pools

### ValidationRegistry
- **Admin**: Deployer address
- **Validator**: Deployer address (initially)
- Grant validator role to Validator Agent later

### BountyPool
- **Admin**: Deployer address
- **Payout**: Deployer address (initially)
- Grant payout role to Validator Agent later

## Testing

### Local Testing (Anvil)

```bash
# Start Anvil
anvil

# In another terminal
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --sig "testLocal()" \
  --fork-url http://localhost:8545 \
  --broadcast
```

### Verify Deployment

```bash
# Check contract code
cast code $PROTOCOL_REGISTRY_ADDRESS --rpc-url $BASE_SEPOLIA_RPC_URL

# Read protocol count
cast call $PROTOCOL_REGISTRY_ADDRESS \
  "getProtocolCount()(uint256)" \
  --rpc-url $BASE_SEPOLIA_RPC_URL

# Check validator role
cast call $VALIDATION_REGISTRY_ADDRESS \
  "isValidator(address)(bool)" \
  $YOUR_ADDRESS \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

## Troubleshooting

### Deployment Fails

**Error**: "Insufficient funds"
- **Solution**: Get more Base Sepolia ETH from faucet

**Error**: "Invalid API key"
- **Solution**: Check BASESCAN_API_KEY in .env

**Error**: "Nonce too low"
- **Solution**: Wait a few seconds and retry

### Verification Fails

**Error**: "Contract not found"
- **Solution**: Wait 30 seconds after deployment, then verify manually:
  ```bash
  forge verify-contract \
    $CONTRACT_ADDRESS \
    src/ProtocolRegistry.sol:ProtocolRegistry \
    --chain base-sepolia \
    --etherscan-api-key $BASESCAN_API_KEY
  ```

## Gas Costs

Approximate costs on Base Sepolia:

- ProtocolRegistry: 0.002 ETH
- ValidationRegistry: 0.003 ETH
- BountyPool: 0.004 ETH
- **Total**: ~0.01 ETH

## Security

⚠️ **Important**:
- Never commit `.env` file
- Use dedicated wallet for deployment (not your main wallet)
- This wallet will have admin permissions - secure it
- Testnet only - audit required before mainnet

## Next Steps

After deployment:
1. Implement blockchain integration layer (`backend/src/blockchain/`)
2. Update Protocol Agent to call `registerProtocol()`
3. Update Validator Agent to call `recordValidation()`
4. Test end-to-end flow

See `PHASE_3B_IMPLEMENTATION_SUMMARY.md` for full implementation guide.
