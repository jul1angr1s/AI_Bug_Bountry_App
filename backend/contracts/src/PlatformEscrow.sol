// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PlatformEscrow
 * @notice Manages researcher submission fee escrow for x.402 payment gating
 * @dev Researchers pre-fund escrow, fees deducted per finding submission
 */
contract PlatformEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    IERC20 public immutable USDC;

    uint256 public submissionFee;
    uint256 public protocolRegistrationFee;

    address public platformTreasury;

    mapping(address => uint256) public escrowBalances;
    mapping(address => uint256) public totalDeposited;
    mapping(address => uint256) public totalDeducted;

    uint256 public totalPlatformFees;

    event EscrowDeposited(
        address indexed agent,
        uint256 amount,
        uint256 newBalance
    );

    event SubmissionFeeDeducted(
        address indexed agent,
        bytes32 indexed findingId,
        uint256 feeAmount,
        uint256 remainingBalance
    );

    event ProtocolFeeCollected(
        address indexed protocol,
        bytes32 indexed protocolId,
        uint256 feeAmount
    );

    event EscrowWithdrawn(
        address indexed agent,
        uint256 amount,
        uint256 remainingBalance
    );

    event SubmissionFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event ProtocolRegistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event TreasuryUpdated(
        address oldTreasury,
        address newTreasury
    );

    event FeesWithdrawnToTreasury(
        address indexed treasury,
        uint256 amount
    );

    error InsufficientEscrowBalance(address agent, uint256 required, uint256 available);
    error InvalidAmount();
    error InvalidAddress();
    error TransferFailed();

    /**
     * @notice Constructor
     * @param usdcAddress USDC token address
     * @param treasury Platform treasury address
     */
    constructor(address usdcAddress, address treasury) {
        require(usdcAddress != address(0), "Invalid USDC address");
        require(treasury != address(0), "Invalid treasury address");

        USDC = IERC20(usdcAddress);
        platformTreasury = treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);

        submissionFee = 500000;
        protocolRegistrationFee = 1000000;
    }

    /**
     * @notice Deposit USDC to escrow
     * @param amount Amount to deposit (6 decimals)
     */
    function depositEscrow(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        escrowBalances[msg.sender] += amount;
        totalDeposited[msg.sender] += amount;

        emit EscrowDeposited(msg.sender, amount, escrowBalances[msg.sender]);
    }

    /**
     * @notice Deposit USDC to escrow for a specific agent
     * @param agent Agent address
     * @param amount Amount to deposit (6 decimals)
     */
    function depositEscrowFor(address agent, uint256 amount) external nonReentrant {
        if (agent == address(0)) {
            revert InvalidAddress();
        }

        if (amount == 0) {
            revert InvalidAmount();
        }

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        escrowBalances[agent] += amount;
        totalDeposited[agent] += amount;

        emit EscrowDeposited(agent, amount, escrowBalances[agent]);
    }

    /**
     * @notice Deduct submission fee from researcher escrow
     * @param agent Researcher address
     * @param findingId Finding identifier for tracking
     */
    function deductSubmissionFee(
        address agent,
        bytes32 findingId
    ) external onlyRole(PLATFORM_ROLE) nonReentrant {
        uint256 balance = escrowBalances[agent];

        if (balance < submissionFee) {
            revert InsufficientEscrowBalance(agent, submissionFee, balance);
        }

        escrowBalances[agent] -= submissionFee;
        totalDeducted[agent] += submissionFee;
        totalPlatformFees += submissionFee;

        emit SubmissionFeeDeducted(
            agent,
            findingId,
            submissionFee,
            escrowBalances[agent]
        );
    }

    /**
     * @notice Collect protocol registration fee (for x.402 flow)
     * @param protocol Protocol owner address
     * @param protocolId Protocol identifier
     */
    function collectProtocolFee(
        address protocol,
        bytes32 protocolId
    ) external onlyRole(PLATFORM_ROLE) nonReentrant {
        USDC.safeTransferFrom(protocol, address(this), protocolRegistrationFee);

        totalPlatformFees += protocolRegistrationFee;

        emit ProtocolFeeCollected(protocol, protocolId, protocolRegistrationFee);
    }

    /**
     * @notice Withdraw from escrow
     * @param amount Amount to withdraw
     */
    function withdrawEscrow(uint256 amount) external nonReentrant {
        uint256 balance = escrowBalances[msg.sender];

        if (amount == 0 || amount > balance) {
            revert InvalidAmount();
        }

        escrowBalances[msg.sender] -= amount;

        USDC.safeTransfer(msg.sender, amount);

        emit EscrowWithdrawn(msg.sender, amount, escrowBalances[msg.sender]);
    }

    /**
     * @notice Get escrow balance for an agent
     * @param agent Agent address
     * @return uint256 Balance in USDC (6 decimals)
     */
    function getEscrowBalance(address agent) external view returns (uint256) {
        return escrowBalances[agent];
    }

    /**
     * @notice Check if agent has sufficient balance for submission
     * @param agent Agent address
     * @return bool True if balance >= submissionFee
     */
    function canSubmitFinding(address agent) external view returns (bool) {
        return escrowBalances[agent] >= submissionFee;
    }

    /**
     * @notice Get number of submissions agent can afford
     * @param agent Agent address
     * @return uint256 Number of submissions
     */
    function getRemainingSubmissions(address agent) external view returns (uint256) {
        if (submissionFee == 0) return type(uint256).max;
        return escrowBalances[agent] / submissionFee;
    }

    /**
     * @notice Withdraw collected fees to treasury
     */
    function withdrawFeesToTreasury() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 amount = totalPlatformFees;

        if (amount == 0) {
            revert InvalidAmount();
        }

        totalPlatformFees = 0;

        USDC.safeTransfer(platformTreasury, amount);

        emit FeesWithdrawnToTreasury(platformTreasury, amount);
    }

    /**
     * @notice Update submission fee
     * @param newFee New fee amount (6 decimals)
     */
    function updateSubmissionFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = submissionFee;
        submissionFee = newFee;

        emit SubmissionFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update protocol registration fee
     * @param newFee New fee amount (6 decimals)
     */
    function updateProtocolRegistrationFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = protocolRegistrationFee;
        protocolRegistrationFee = newFee;

        emit ProtocolRegistrationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) {
            revert InvalidAddress();
        }

        address oldTreasury = platformTreasury;
        platformTreasury = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Add platform role
     * @param platform Address to grant role
     */
    function addPlatformRole(address platform) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PLATFORM_ROLE, platform);
    }

    /**
     * @notice Remove platform role
     * @param platform Address to revoke role
     */
    function removePlatformRole(address platform) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PLATFORM_ROLE, platform);
    }
}
