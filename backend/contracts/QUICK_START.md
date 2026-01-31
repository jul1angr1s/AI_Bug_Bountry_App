# Quick Start Guide

## Installation

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Setup Project

```bash
cd backend/contracts
./setup.sh
```

This will:
- Install forge-std dependency
- Build all contracts
- Verify setup

## Development Workflow

### Build Contracts

```bash
forge build
```

### Run Tests

```bash
forge test
forge test -vv          # Verbose output
forge test -vvv         # Very verbose (with stack traces)
```

### Run Specific Test

```bash
forge test --match-test testReentrancyAttack -vvv
```

### Static Analysis with Slither

```bash
slither src/VulnerableVault.sol
slither src/MockDeFi.sol
```

## Local Deployment

### 1. Start Anvil

Terminal 1:
```bash
anvil
```

This starts a local Ethereum node at `http://localhost:8545` with 10 pre-funded accounts.

### 2. Deploy Contracts

Terminal 2:
```bash
# Set environment variable (use Anvil's default account)
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy
forge script script/DeployLocal.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 3. Interact with Deployed Contracts

```bash
# Get contract address from deployment output
VAULT_ADDRESS=0x...

# Deposit ETH
cast send $VAULT_ADDRESS \
  "deposit()" \
  --value 1ether \
  --rpc-url http://localhost:8545 \
  --private-key $PRIVATE_KEY

# Check balance
cast call $VAULT_ADDRESS \
  "getBalance()" \
  --rpc-url http://localhost:8545

# Withdraw
cast send $VAULT_ADDRESS \
  "withdraw(uint256)" 500000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key $PRIVATE_KEY
```

## Vulnerability Testing

### Manual Reentrancy Test

1. Deploy VulnerableVault
2. Deploy Attacker contract with vault address
3. Fund Attacker contract
4. Call `attack()` on Attacker contract
5. Observe balance changes

### Automated Testing

```bash
forge test --match-contract ReentrancyAttackTest -vvv
```

## Common Commands

```bash
# Clean build artifacts
forge clean

# Format code
forge fmt

# Check gas usage
forge test --gas-report

# Coverage
forge coverage

# Generate documentation
forge doc
```

## Troubleshooting

### "forge not found"

Run: `foundryup`

### "Error: No such file or directory"

Run: `./setup.sh` to install dependencies

### "Compilation failed"

Check Solidity version in foundry.toml matches contract pragma

### Deployment fails

Ensure:
1. Anvil is running
2. PRIVATE_KEY is set
3. RPC URL is correct

## Next Steps

After successful deployment and testing:
1. Integrate with Researcher Agent
2. Test Slither detection pipeline
3. Verify vulnerability reporting
4. Prepare for Phase 3 (Base Sepolia deployment)

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [Slither Documentation](https://github.com/crytic/slither)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
