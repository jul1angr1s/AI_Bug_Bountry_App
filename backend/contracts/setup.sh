#!/bin/bash

# Smart Contract Setup Script for AI Bug Bounty Platform

set -e

echo "========================================="
echo "Smart Contract Setup"
echo "========================================="

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo ""
    echo "Foundry is not installed."
    echo "Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash

    echo ""
    echo "Please run 'foundryup' to complete Foundry installation, then run this script again."
    exit 1
fi

echo "✓ Foundry is installed"

# Install dependencies
echo ""
echo "Installing forge-std dependency..."
forge install foundry-rs/forge-std --no-commit

# Build contracts
echo ""
echo "Building contracts..."
forge build

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Available contracts:"
echo "  - VulnerableVault.sol (reentrancy vulnerability)"
echo "  - MockDeFi.sol (overflow vulnerability)"
echo "  - ProtocolRegistry.sol (Phase 3 stub)"
echo "  - ValidationRegistry.sol (Phase 3 stub)"
echo "  - BountyPool.sol (Phase 3 stub)"
echo ""
echo "Next steps:"
echo "  1. Start Anvil: anvil"
echo "  2. Deploy: forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast"
echo "  3. Run Slither: slither src/VulnerableVault.sol"
echo ""
