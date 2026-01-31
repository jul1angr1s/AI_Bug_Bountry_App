# Smart Contracts Specification

## Status: ✅ Implemented (Phase 3B)

## Overview

Solidity 0.8.24 contracts using Foundry toolchain. Production payment infrastructure deployed on Base Sepolia testnet with comprehensive test coverage (1,681 lines of tests across 4 test files).

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
| Contract | Address | Purpose |
|----------|---------|---------|
| ProtocolRegistry | `0xc7DF730cf661a306a9aEC93D7180da6f6Da23235` | Register GitHub repos + bounty terms |
| ValidationRegistry | `0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d` | ERC-8004 validation states |
| BountyPool | `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0` | USDC escrow & severity-based payments |

**Verification**: All contracts verified on [Basescan](https://sepolia.basescan.org/)

## Production Contracts

### ProtocolRegistry.sol

**Purpose**: Register protocols for bug bounty scanning with duplicate detection

**Key Features**:
- Protocol registration with unique GitHub URL enforcement
- Protocol status management (PENDING, ACTIVE, PAUSED, DEACTIVATED)
- OpenZeppelin Ownable for admin control
- Event emission for backend tracking
- Query functions (by ID, GitHub URL, owner)

**Functions**:
```solidity
function registerProtocol(
    string memory githubUrl,
    string memory contractPath,
    string memory contractName,
    string memory bountyTerms
) external returns (bytes32 protocolId)

function updateProtocolStatus(bytes32 protocolId, ProtocolStatus newStatus) external
function getProtocol(bytes32 protocolId) external view returns (Protocol memory)
function isGithubUrlRegistered(string memory githubUrl) external view returns (bool)
function getProtocolsByOwner(address ownerAddress) external view returns (bytes32[] memory)
```

**Events**:
```solidity
event ProtocolRegistered(
    bytes32 indexed protocolId,
    address indexed owner,
    string githubUrl,
    string contractPath,
    string contractName,
    uint256 registeredAt
)
```

### ValidationRegistry.sol

**Purpose**: ERC-8004 compliant validation attestation registry

**Key Features**:
- Immutable validation records
- AccessControl with VALIDATOR_ROLE
- Severity-based validation (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL)
- Validation outcome tracking (CONFIRMED, REJECTED, INCONCLUSIVE)
- Query functions for protocol validations

**Functions**:
```solidity
function recordValidation(
    bytes32 protocolId,
    bytes32 findingId,
    string memory vulnerabilityType,
    Severity severity,
    ValidationOutcome outcome,
    string memory executionLog,
    bytes32 proofHash
) external onlyRole(VALIDATOR_ROLE) returns (bytes32 validationId)

function getValidation(bytes32 validationId) external returns (ValidationResult memory)
function getProtocolValidations(bytes32 protocolId) external view returns (ValidationResult[] memory)
function getConfirmedValidations(bytes32 protocolId) external view returns (ValidationResult[] memory)
```

**Events**:
```solidity
event ValidationRecorded(
    bytes32 indexed validationId,
    bytes32 indexed protocolId,
    bytes32 indexed findingId,
    address validatorAgent,
    ValidationOutcome outcome,
    Severity severity,
    uint256 timestamp
)
```

### BountyPool.sol

**Purpose**: USDC bounty pool and payment management

**Key Features**:
- USDC integration with SafeERC20
- Severity-based payment multipliers
- AccessControl with PAYOUT_ROLE
- ReentrancyGuard on all payment functions
- Protocol-specific bounty pools

**Payment Multipliers** (Base: 100 USDC):
- CRITICAL: 5x (500 USDC)
- HIGH: 3x (300 USDC)
- MEDIUM: 1.5x (150 USDC)
- LOW: 1x (100 USDC)
- INFORMATIONAL: 0.25x (25 USDC)

**Functions**:
```solidity
function depositBounty(bytes32 protocolId, uint256 amount) external nonReentrant
function releaseBounty(
    bytes32 protocolId,
    bytes32 validationId,
    address researcher,
    Severity severity
) external onlyRole(PAYOUT_ROLE) nonReentrant returns (bytes32 bountyId)

function getProtocolBalance(bytes32 protocolId) external view returns (uint256)
function calculateBountyAmount(Severity severity) public view returns (uint256)
function getResearcherBounties(address researcher) external view returns (Bounty[] memory)
```

**Events**:
```solidity
event BountyDeposited(
    bytes32 indexed protocolId,
    address indexed depositor,
    uint256 amount,
    uint256 newBalance
)

event BountyReleased(
    bytes32 indexed bountyId,
    bytes32 indexed protocolId,
    bytes32 indexed validationId,
    address researcher,
    Severity severity,
    uint256 amount,
    uint256 timestamp
)
```

## Security

**Dependencies**:
- OpenZeppelin Contracts v5.0.0 (latest audited version)

**Security Patterns**:
- AccessControl (OpenZeppelin) with VALIDATOR_ROLE, PAYOUT_ROLE
- ReentrancyGuard on all state-changing payment functions
- SafeERC20 for secure token transfers
- Checks-Effects-Interactions pattern
- Custom errors for gas optimization
- Immutable validation records (cannot be modified after creation)

**Gas Optimization**:
- Custom errors instead of require strings
- Efficient storage packing
- Minimal on-chain data storage
- Event-driven architecture for off-chain indexing

## USDC Addresses
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Testing

**Test Coverage**: 1,681 lines across 4 comprehensive test files
- `ProtocolRegistry.t.sol` (314 lines): Registration, duplicates, status, access control
- `ValidationRegistry.t.sol` (385 lines): Validation recording, roles, ERC-8004, immutability
- `BountyPool.t.sol` (513 lines): USDC deposits, bounty releases, severity multipliers
- `Integration.t.sol` (469 lines): Full end-to-end workflow testing

**Test Requirements**:
- Fuzz tests for all public functions (`testFuzz_`)
- Invariant tests for critical properties
- Fork tests against Base Sepolia for payment flows
- Edge case coverage for all security patterns

**E2E Verification** (Base Sepolia):
- ✅ Protocol registration: [0x842099...](https://sepolia.basescan.org/tx/0x842099f45159f489d7e36b6f4085d9908f36ce2b7a610f604228ea7dac71ead6)
- ✅ Validation recording: [0x4815f5...](https://sepolia.basescan.org/tx/0x4815f5b8cdbd24e291ca35b9511ae9c694d3531a9ae24cfaf8294b81f565bcb3)
- ✅ Bounty release: [0x6dada5...](https://sepolia.basescan.org/tx/0x6dada5c52d531e255309f05f8ae3086fa588e7591c86b2d33028b741ac3abb78)

## Deployment Info

**Chain**: Base Sepolia (84532)
**Gas Used**: ~10M gas units
**Cost**: ~0.014 ETH
**Roles Granted**: Deployer has all admin/validator/payout roles

## Next Steps

1. Grant VALIDATOR_ROLE to Validator Agent wallet (Phase 4)
2. Grant PAYOUT_ROLE to Validator Agent wallet (Phase 4)
3. Implement automatic bounty release (Phase 4A)
4. Add USDC approval flow for protocol owners (Phase 4A)
5. Security audit before mainnet deployment (Post-MVP)
