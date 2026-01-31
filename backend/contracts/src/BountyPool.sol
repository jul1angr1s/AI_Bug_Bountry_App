// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BountyPool
 * @notice USDC bounty pool and payment management contract
 * @dev Manages protocol bounty pools with severity-based payouts
 */
contract BountyPool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAYOUT_ROLE = keccak256("PAYOUT_ROLE");

    // Base Sepolia USDC address
    IERC20 public immutable USDC;

    enum Severity {
        CRITICAL,
        HIGH,
        MEDIUM,
        LOW,
        INFORMATIONAL
    }

    struct Bounty {
        bytes32 bountyId;
        bytes32 protocolId;
        bytes32 validationId;
        address researcher;
        Severity severity;
        uint256 amount;
        uint256 timestamp;
        bool paid;
    }

    // Bounty ID counter
    uint256 private _bountyCounter;

    // Severity multipliers (basis points, 10000 = 100%)
    mapping(Severity => uint256) public severityMultipliers;

    // Base bounty amount (in USDC, 6 decimals)
    uint256 public baseBountyAmount;

    // Mapping from protocol ID to bounty balance
    mapping(bytes32 => uint256) public protocolBalances;

    // Mapping from bounty ID to Bounty
    mapping(bytes32 => Bounty) public bounties;

    // Mapping from protocol ID to array of bounty IDs
    mapping(bytes32 => bytes32[]) private _protocolBounties;

    // Mapping from researcher address to array of bounty IDs
    mapping(address => bytes32[]) private _researcherBounties;

    // Array of all bounty IDs
    bytes32[] public allBountyIds;

    // Events
    event BountyDeposited(
        bytes32 indexed protocolId,
        address indexed depositor,
        uint256 amount,
        uint256 newBalance
    );

    event BountyReleased(
        bytes32 indexed bountyId,
        bytes32 indexed protocolId,
        bytes32 indexed validationId,
        address researcher,
        Severity severity,
        uint256 amount,
        uint256 timestamp
    );

    event BountyWithdrawn(
        bytes32 indexed protocolId,
        address indexed owner,
        uint256 amount
    );

    event SeverityMultiplierUpdated(
        Severity severity,
        uint256 oldMultiplier,
        uint256 newMultiplier
    );

    event BaseBountyAmountUpdated(
        uint256 oldAmount,
        uint256 newAmount
    );

    // Errors
    error InsufficientBalance(bytes32 protocolId, uint256 required, uint256 available);
    error InvalidAmount();
    error ProtocolNotFound(bytes32 protocolId);
    error BountyAlreadyPaid(bytes32 bountyId);
    error InvalidSeverityMultiplier();
    error TransferFailed();

    /**
     * @notice Constructor
     * @param usdcAddress Address of USDC token on Base Sepolia
     */
    constructor(address usdcAddress) {
        require(usdcAddress != address(0), "Invalid USDC address");

        USDC = IERC20(usdcAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAYOUT_ROLE, msg.sender);

        // Set base bounty amount (100 USDC = 100 * 10^6)
        baseBountyAmount = 100 * 10**6;

        // Initialize severity multipliers (basis points)
        severityMultipliers[Severity.CRITICAL] = 50000;      // 5x (500%)
        severityMultipliers[Severity.HIGH] = 30000;          // 3x (300%)
        severityMultipliers[Severity.MEDIUM] = 15000;        // 1.5x (150%)
        severityMultipliers[Severity.LOW] = 10000;           // 1x (100%)
        severityMultipliers[Severity.INFORMATIONAL] = 2500;  // 0.25x (25%)
    }

    /**
     * @notice Deposit USDC to protocol bounty pool
     * @param protocolId Protocol identifier
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function depositBounty(
        bytes32 protocolId,
        uint256 amount
    ) external nonReentrant {
        if (protocolId == bytes32(0)) {
            revert ProtocolNotFound(protocolId);
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        // Transfer USDC from sender to contract
        USDC.safeTransferFrom(msg.sender, address(this), amount);

        // Update protocol balance
        protocolBalances[protocolId] += amount;

        emit BountyDeposited(
            protocolId,
            msg.sender,
            amount,
            protocolBalances[protocolId]
        );
    }

    /**
     * @notice Release bounty payment to researcher
     * @param protocolId Protocol identifier
     * @param validationId Validation identifier
     * @param researcher Address of researcher to pay
     * @param severity Severity of the validated vulnerability
     * @return bountyId Unique identifier for the bounty payment
     */
    function releaseBounty(
        bytes32 protocolId,
        bytes32 validationId,
        address researcher,
        Severity severity
    ) external onlyRole(PAYOUT_ROLE) nonReentrant returns (bytes32 bountyId) {
        if (protocolId == bytes32(0)) {
            revert ProtocolNotFound(protocolId);
        }

        if (researcher == address(0)) {
            revert InvalidAmount();
        }

        // Calculate bounty amount based on severity
        uint256 amount = calculateBountyAmount(severity);

        // Check protocol has sufficient balance
        uint256 balance = protocolBalances[protocolId];
        if (balance < amount) {
            revert InsufficientBalance(protocolId, amount, balance);
        }

        // Generate bounty ID
        _bountyCounter++;
        bountyId = keccak256(abi.encodePacked(
            protocolId,
            validationId,
            researcher,
            block.timestamp,
            _bountyCounter
        ));

        // Create bounty record
        Bounty memory newBounty = Bounty({
            bountyId: bountyId,
            protocolId: protocolId,
            validationId: validationId,
            researcher: researcher,
            severity: severity,
            amount: amount,
            timestamp: block.timestamp,
            paid: true
        });

        // Store bounty
        bounties[bountyId] = newBounty;
        _protocolBounties[protocolId].push(bountyId);
        _researcherBounties[researcher].push(bountyId);
        allBountyIds.push(bountyId);

        // Update protocol balance
        protocolBalances[protocolId] -= amount;

        // Transfer USDC to researcher
        USDC.safeTransfer(researcher, amount);

        emit BountyReleased(
            bountyId,
            protocolId,
            validationId,
            researcher,
            severity,
            amount,
            block.timestamp
        );

        return bountyId;
    }

    /**
     * @notice Calculate bounty amount based on severity
     * @param severity Vulnerability severity
     * @return uint256 Bounty amount in USDC (6 decimals)
     */
    function calculateBountyAmount(Severity severity) public view returns (uint256) {
        uint256 multiplier = severityMultipliers[severity];
        return (baseBountyAmount * multiplier) / 10000;
    }

    /**
     * @notice Get protocol bounty balance
     * @param protocolId Protocol identifier
     * @return uint256 Balance in USDC (6 decimals)
     */
    function getProtocolBalance(bytes32 protocolId) external view returns (uint256) {
        return protocolBalances[protocolId];
    }

    /**
     * @notice Get bounty details
     * @param bountyId Bounty identifier
     * @return Bounty struct with all details
     */
    function getBounty(bytes32 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    /**
     * @notice Get all bounties for a protocol
     * @param protocolId Protocol identifier
     * @return Bounty[] Array of bounties
     */
    function getProtocolBounties(bytes32 protocolId) external view returns (Bounty[] memory) {
        bytes32[] memory bountyIds = _protocolBounties[protocolId];
        Bounty[] memory results = new Bounty[](bountyIds.length);

        for (uint256 i = 0; i < bountyIds.length; i++) {
            results[i] = bounties[bountyIds[i]];
        }

        return results;
    }

    /**
     * @notice Get all bounties for a researcher
     * @param researcher Researcher address
     * @return Bounty[] Array of bounties
     */
    function getResearcherBounties(address researcher) external view returns (Bounty[] memory) {
        bytes32[] memory bountyIds = _researcherBounties[researcher];
        Bounty[] memory results = new Bounty[](bountyIds.length);

        for (uint256 i = 0; i < bountyIds.length; i++) {
            results[i] = bounties[bountyIds[i]];
        }

        return results;
    }

    /**
     * @notice Get total bounties paid for a protocol
     * @param protocolId Protocol identifier
     * @return uint256 Total amount paid in USDC
     */
    function getTotalBountiesPaid(bytes32 protocolId) external view returns (uint256) {
        bytes32[] memory bountyIds = _protocolBounties[protocolId];
        uint256 total = 0;

        for (uint256 i = 0; i < bountyIds.length; i++) {
            total += bounties[bountyIds[i]].amount;
        }

        return total;
    }

    /**
     * @notice Get total earnings for a researcher
     * @param researcher Researcher address
     * @return uint256 Total amount earned in USDC
     */
    function getResearcherEarnings(address researcher) external view returns (uint256) {
        bytes32[] memory bountyIds = _researcherBounties[researcher];
        uint256 total = 0;

        for (uint256 i = 0; i < bountyIds.length; i++) {
            total += bounties[bountyIds[i]].amount;
        }

        return total;
    }

    /**
     * @notice Get total bounty count
     * @return uint256 Total number of bounties paid
     */
    function getTotalBountyCount() external view returns (uint256) {
        return allBountyIds.length;
    }

    /**
     * @notice Update severity multiplier
     * @param severity Severity level
     * @param newMultiplier New multiplier in basis points (10000 = 100%)
     */
    function updateSeverityMultiplier(
        Severity severity,
        uint256 newMultiplier
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMultiplier == 0 || newMultiplier > 100000) {
            revert InvalidSeverityMultiplier();
        }

        uint256 oldMultiplier = severityMultipliers[severity];
        severityMultipliers[severity] = newMultiplier;

        emit SeverityMultiplierUpdated(severity, oldMultiplier, newMultiplier);
    }

    /**
     * @notice Update base bounty amount
     * @param newAmount New base amount in USDC (6 decimals)
     */
    function updateBaseBountyAmount(
        uint256 newAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newAmount == 0) {
            revert InvalidAmount();
        }

        uint256 oldAmount = baseBountyAmount;
        baseBountyAmount = newAmount;

        emit BaseBountyAmountUpdated(oldAmount, newAmount);
    }

    /**
     * @notice Grant payout role to an address
     * @param payer Address to grant payout role
     */
    function addPayer(address payer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PAYOUT_ROLE, payer);
    }

    /**
     * @notice Revoke payout role from an address
     * @param payer Address to revoke payout role from
     */
    function removePayer(address payer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PAYOUT_ROLE, payer);
    }

    /**
     * @notice Check if an address has payout role
     * @param account Address to check
     * @return bool True if address has payout role
     */
    function isPayer(address account) external view returns (bool) {
        return hasRole(PAYOUT_ROLE, account);
    }

    /**
     * @notice Emergency withdraw function (admin only)
     * @param protocolId Protocol identifier
     * @param to Address to send funds to
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        bytes32 protocolId,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) {
            revert InvalidAmount();
        }

        uint256 balance = protocolBalances[protocolId];
        if (balance < amount) {
            revert InsufficientBalance(protocolId, amount, balance);
        }

        protocolBalances[protocolId] -= amount;
        USDC.safeTransfer(to, amount);

        emit BountyWithdrawn(protocolId, to, amount);
    }
}
