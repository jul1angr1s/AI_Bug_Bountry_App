# Integration Test Guide - Base Sepolia

## Overview

This guide explains how to run the integration test on Base Sepolia testnet with real USDC (using minimal amounts).

## Prerequisites

### 1. USDC Balance Required

The test requires **150 USDC** on Base Sepolia testnet:
- **Deposit**: 150 USDC to protocol pool
- **Bounty Payout**: 100 USDC (LOW severity bounty)
- **Net Cost**: ~0 USDC (bounty paid back to deployer wallet) + gas fees

### 2. Get Base Sepolia USDC

If you don't have enough USDC, get testnet USDC from Circle's faucet:

**Option A: Circle Faucet** (Recommended)
1. Visit: https://faucet.circle.com/
2. Select "Base Sepolia" network
3. Enter your wallet address
4. Request USDC (usually gives 10-100 USDC per request)

**Option B: Base Sepolia Faucet + Swap**
1. Get Base Sepolia ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Use Uniswap or other DEX on Base Sepolia to swap ETH → USDC

### 3. Environment Variables

Ensure your `.env` file has:

```bash
# Backend/.env and backend/contracts/.env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x... # Your private key (must have 150+ USDC)

# Deployed contract addresses
PROTOCOL_REGISTRY_ADDRESS=0xc7DF730cf661a306a9aEC93D7180da6f6Da23235
VALIDATION_REGISTRY_ADDRESS=0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d
BOUNTY_POOL_ADDRESS=0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
```

## Running the Integration Test

### Step 1: Check Your USDC Balance

```bash
cd backend/contracts

# Load environment
source .env

# Check USDC balance (6 decimals)
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  "balanceOf(address)(uint256)" \
  $(cast wallet address $PRIVATE_KEY) \
  --rpc-url $BASE_SEPOLIA_RPC_URL
```

**Expected Output**: Should return ≥ 150000000 (150 USDC with 6 decimals)

### Step 2: Run the Integration Test

```bash
forge script script/TestIntegration.s.sol:TestIntegration \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --legacy \
  -vvv
```

**What This Does**:
1. Registers a test protocol (Thunder Loan)
2. Deposits 150 USDC to the bounty pool
3. Records a CRITICAL validation
4. Releases a LOW severity bounty (100 USDC)
5. Queries all contract states

### Step 3: Verify on Basescan

After the test completes, verify transactions:

**ProtocolRegistry**:
- https://sepolia.basescan.org/address/0xc7DF730cf661a306a9aEC93D7180da6f6Da23235
- Check for `ProtocolRegistered` event

**ValidationRegistry**:
- https://sepolia.basescan.org/address/0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d
- Check for `ValidationRecorded` event

**BountyPool**:
- https://sepolia.basescan.org/address/0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0
- Check for `BountyDeposited` and `BountyReleased` events

## Expected Output

```
===========================================
Integration Test - Base Sepolia
===========================================
Deployer: 0x...
USDC Balance: 150 USDC

TEST 1: Protocol Registration
-------------------------------------------
Protocol registered!
Protocol ID: 0x...
Owner: 0x...
Status: 0

TEST 2: Deposit Bounty
-------------------------------------------
Current USDC Balance: 150 USDC
Approved 150 USDC to BountyPool
Deposited 150 USDC
Protocol Pool Balance: 150 USDC

TEST 3: Record Validation
-------------------------------------------
Validation recorded!
Validation ID: 0x...
Validator: 0x...
Outcome: 0 (CONFIRMED)
Severity: 0 (CRITICAL)

TEST 4: Release Bounty
-------------------------------------------
Researcher Balance Before: 0 USDC
Expected Bounty (LOW): 100 USDC
Bounty released (LOW)!
Bounty ID: 0x...
Researcher Balance After: 100 USDC
Bounty Received: 100 USDC
Protocol Pool Balance After: 50 USDC

TEST 5: Query Functions
-------------------------------------------
Total Protocols: 1
Total Validations: 1
Validations for Protocol: 1
Confirmed Validations: 1
Researcher Total Bounties: 1

===========================================
Integration Test Complete!
===========================================
All contract interactions successful!
Total USDC deposited: 150 USDC
Total USDC paid out: 100 USDC
Net cost: 100 USDC (bounty paid back to deployer)

Next Steps:
1. Verify transactions on Basescan
2. Check contract events
3. Run backend E2E test
===========================================
```

## Bounty Amounts Reference

Based on 100 USDC base bounty:

| Severity | Multiplier | Amount |
|----------|-----------|---------|
| CRITICAL | 5x | 500 USDC |
| HIGH | 3x | 300 USDC |
| MEDIUM | 1.5x | 150 USDC |
| LOW | 1x | **100 USDC** ← Used in test |
| INFORMATIONAL | 0.25x | 25 USDC |

The test uses **LOW severity** to minimize USDC requirements while still testing the full workflow.

## Troubleshooting

### Error: "Insufficient USDC balance"

**Solution**: Get more testnet USDC from Circle faucet or reduce test deposit amount in the script.

### Error: "Insufficient protocol balance"

**Cause**: Protocol pool doesn't have enough USDC for the bounty.

**Solution**: The script deposits 150 USDC, which is enough for 1 LOW bounty (100 USDC). If you modified severity, ensure deposit ≥ bounty amount.

### Error: "Transaction reverted"

**Common causes**:
1. Not enough ETH for gas fees
2. USDC approval not granted
3. Role permissions not set (VALIDATOR_ROLE, PAYOUT_ROLE)

**Solution**: Check transaction revert reason on Basescan.

### Gas Estimation Failed

**Solution**: Add `--legacy` flag to use legacy transaction type:
```bash
forge script ... --legacy
```

## Next Steps

After successful integration test:

1. ✅ **Verify on Basescan**: All 3 contracts show proper events
2. ✅ **Unit Tests**: Run Foundry tests locally (optional)
3. ✅ **Backend E2E Test**: Test with real agents (Protocol + Validator + Researcher)

## Cost Summary

- **USDC Deposit**: 150 USDC (returned to deployer wallet as bounty)
- **USDC Cost**: ~0 USDC (self-payment in test)
- **Gas Fees**: ~0.0001 ETH (~$0.30 USD)
- **Total Cost**: Gas fees only

Since the test pays the bounty back to the deployer address, you only pay gas fees!
