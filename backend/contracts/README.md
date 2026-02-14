# Smart Contracts

This directory contains the Foundry-based smart contract project for the AI Bug Bounty Platform.

## Structure

```
contracts/
├── src/                    # Contract source files
│   ├── VulnerableVault.sol      # Test contract with reentrancy vulnerability
│   ├── MockDeFi.sol             # Test contract with overflow vulnerability
│   ├── ProtocolRegistry.sol     # [Stub] Protocol registration (Phase 3)
│   ├── ValidationRegistry.sol   # [Stub] ERC-8004 validation (Phase 3)
│   └── BountyPool.sol           # [Stub] Bounty management (Phase 3)
├── script/                 # Deployment scripts
│   └── DeployLocal.s.sol        # Local Anvil deployment
├── test/                   # Test files
└── lib/                    # Dependencies (forge-std, etc.)
```

## Prerequisites

Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

1. Install dependencies:
```bash
forge install foundry-rs/forge-std --no-commit
```

2. Build contracts:
```bash
forge build
```

## Vulnerable Test Contracts

### VulnerableVault.sol
Contains an intentional **reentrancy vulnerability** for testing the bug bounty scanning pipeline.

**Vulnerability**: The `withdraw()` function sends ETH before updating the user's balance, allowing reentrancy attacks.

### MockDeFi.sol
Contains an intentional **integer overflow/underflow vulnerability** using Solidity 0.7.6.

**Vulnerability**: No automatic overflow checks in older Solidity versions allow potential balance manipulation.

## Local Deployment

1. Start Anvil (local Ethereum node):
```bash
anvil
```

2. Deploy contracts:
```bash
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Testing with Slither

Run static analysis to detect vulnerabilities:
```bash
slither src/VulnerableVault.sol
slither src/MockDeFi.sol
```

## Phase 3 Contracts (Stubs Only)

The following contracts are placeholders for Phase 3 implementation:
- `ProtocolRegistry.sol` - Protocol registration system
- `ValidationRegistry.sol` - ERC-8004 attestation system
- `BountyPool.sol` - Payment and bounty management

These will be implemented when deploying to Base Sepolia testnet.

## Security Notice

The vulnerable contracts (`VulnerableVault.sol` and `MockDeFi.sol`) are intentionally insecure for testing purposes. **DO NOT USE IN PRODUCTION**.
