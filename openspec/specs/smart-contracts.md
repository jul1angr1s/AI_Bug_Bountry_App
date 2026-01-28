# Smart Contracts Specification

## Overview

Solidity 0.8.24 contracts using Foundry toolchain. Payment infrastructure deployed on Base Sepolia/Mainnet.

## Source Documentation
- **Primary**: [project/SmartContracts.md](../../project/SmartContracts.md)
- **Supporting**: [project/Security.md](../../project/Security.md)

## Contract Architecture

### Local Anvil (Chain 31337) - Target Contracts
| Contract | Purpose |
|----------|---------|
| VulnerableVault | Sample contract with reentrancy bug (for testing) |
| MockDeFiProtocol | Test protocol with access control issues |
| TestToken | Mock ERC20 |

### Base Sepolia (Chain 84532) - Payment Infrastructure
| Contract | Purpose |
|----------|---------|
| ProtocolRegistry | Register GitHub repos + bounty terms |
| ValidationRegistry | ERC-8004 validation states |
| BountyPool | USDC escrow & x402 payments |
| OpsTreasury | Gas management for validator agents |

## Key Interfaces

### IProtocolRegistry
```solidity
function registerProtocol(address, string, string, BountyTerms) returns (bytes32)
function updateStatus(bytes32, ProtocolStatus) external
function calculateBounty(bytes32, uint8) returns (uint256)
```

### IValidationRegistry (ERC-8004)
```solidity
function submitValidation(bytes32, bytes32, address, uint8, string) returns (bytes32)
function recordResult(bytes32, ValidationResult) external
```

### IBountyPool
```solidity
function depositBounty(bytes32, uint256) external
function releaseBounty(bytes32, address, uint8, bytes32) external
function withdrawBounty(bytes32, uint256) external
```

## Security Patterns
- AccessControl (OpenZeppelin) with REGISTRAR_ROLE, VALIDATOR_ROLE, PAYOUT_ROLE
- ReentrancyGuard on all payment functions
- Checks-Effects-Interactions pattern
- Pausable for emergency stops
- TimeLock for critical parameter changes

## USDC Addresses
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Testing Requirements
- Fuzz tests for all public functions (`testFuzz_`)
- Invariant tests for critical properties
- Fork tests against Base Sepolia for payment flows
