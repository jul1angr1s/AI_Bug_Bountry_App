# Smart Contracts Specification

## Status: ✅ Implemented

## Overview

Production smart contracts for the AI Bug Bounty Platform deployed to Base Sepolia testnet.

## Contracts

### ProtocolRegistry.sol

**Purpose**: Register protocols for bug bounty scanning with duplicate detection

**Deployment**: `0xc7DF730cf661a306a9aEC93D7180da6f6Da23235`

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

**Deployment**: `0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d`

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

**Deployment**: `0x6D0bA6dA342c4ce75281Ea90c71017BC94A397b0`

**USDC Address**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)

**Key Features**:
- USDC integration with SafeERC20
- Severity-based payment multipliers
- AccessControl with PAYOUT_ROLE
- ReentrancyGuard on all payment functions
- Protocol-specific bounty pools

**Payment Multipliers**:
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

- OpenZeppelin Contracts v5.0.0 (latest audited version)
- ReentrancyGuard on all state-changing functions
- SafeERC20 for secure token transfers
- AccessControl for role-based permissions
- Custom errors for gas optimization
- Immutable validation records (cannot be modified)

## Gas Optimization

- Custom errors instead of require strings
- Efficient storage packing
- Minimal on-chain data storage
- Event-driven architecture for off-chain indexing

## Testing

**Deployment Test**: ✅ All contracts deployed and verified
**Integration Test**: ✅ Can read/write contract data
**Manual Testing**: Pending protocol registration flow

## Deployment Info

**Chain**: Base Sepolia (84532)
**Gas Used**: ~10M gas units
**Cost**: ~0.014 ETH (~$50 USD)
**Verification**: All contracts verified on Basescan
**Roles Granted**: Deployer has all admin/validator/payout roles

## Next Steps

1. Grant VALIDATOR_ROLE to Validator Agent wallet (Phase 4)
2. Grant PAYOUT_ROLE to Validator Agent wallet (Phase 4)
3. Implement automatic bounty release (Phase 4A)
4. Add USDC approval flow (Phase 4A)
5. Security audit before mainnet (Post-MVP)
