// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProtocolRegistry
 * @notice Protocol registration contract for bug bounty platform
 * @dev Manages protocol registration with duplicate detection and status management
 */
contract ProtocolRegistry is Ownable {

    enum ProtocolStatus {
        PENDING,
        ACTIVE,
        PAUSED,
        DEACTIVATED
    }

    struct Protocol {
        bytes32 protocolId;
        address owner;
        string githubUrl;
        string contractPath;
        string contractName;
        bytes32 bountyTermsHash;
        ProtocolStatus status;
        uint256 registeredAt;
        uint256 totalBountyPool;
    }

    // Protocol ID counter
    uint256 private _protocolCounter;

    // Mapping from protocol ID to Protocol
    mapping(bytes32 => Protocol) public protocols;

    // Mapping from GitHub URL hash to protocol ID (for duplicate detection)
    mapping(bytes32 => bytes32) private _githubUrlToProtocolId;

    // Array of all protocol IDs
    bytes32[] public allProtocolIds;

    // Events
    event ProtocolRegistered(
        bytes32 indexed protocolId,
        address indexed owner,
        string githubUrl,
        string contractPath,
        string contractName,
        uint256 registeredAt
    );

    event ProtocolStatusUpdated(
        bytes32 indexed protocolId,
        ProtocolStatus oldStatus,
        ProtocolStatus newStatus
    );

    event BountyPoolUpdated(
        bytes32 indexed protocolId,
        uint256 oldAmount,
        uint256 newAmount
    );

    // Errors
    error ProtocolAlreadyRegistered(string githubUrl);
    error ProtocolNotFound(bytes32 protocolId);
    error InvalidGithubUrl();
    error UnauthorizedAccess();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Register a new protocol
     * @param githubUrl GitHub repository URL
     * @param contractPath Path to contract in repository
     * @param contractName Name of the contract
     * @param bountyTerms JSON string of bounty terms (will be hashed)
     * @return protocolId Unique identifier for the registered protocol
     */
    function registerProtocol(
        string memory githubUrl,
        string memory contractPath,
        string memory contractName,
        string memory bountyTerms
    ) external returns (bytes32 protocolId) {
        // Validate inputs
        if (bytes(githubUrl).length == 0) {
            revert InvalidGithubUrl();
        }

        // Check for duplicate GitHub URL
        bytes32 githubUrlHash = keccak256(abi.encodePacked(githubUrl));
        if (_githubUrlToProtocolId[githubUrlHash] != bytes32(0)) {
            revert ProtocolAlreadyRegistered(githubUrl);
        }

        // Generate protocol ID
        _protocolCounter++;
        protocolId = keccak256(abi.encodePacked(
            msg.sender,
            githubUrl,
            block.timestamp,
            _protocolCounter
        ));

        // Hash bounty terms
        bytes32 bountyTermsHash = keccak256(abi.encodePacked(bountyTerms));

        // Create protocol
        Protocol memory newProtocol = Protocol({
            protocolId: protocolId,
            owner: msg.sender,
            githubUrl: githubUrl,
            contractPath: contractPath,
            contractName: contractName,
            bountyTermsHash: bountyTermsHash,
            status: ProtocolStatus.PENDING,
            registeredAt: block.timestamp,
            totalBountyPool: 0
        });

        // Store protocol
        protocols[protocolId] = newProtocol;
        _githubUrlToProtocolId[githubUrlHash] = protocolId;
        allProtocolIds.push(protocolId);

        emit ProtocolRegistered(
            protocolId,
            msg.sender,
            githubUrl,
            contractPath,
            contractName,
            block.timestamp
        );

        return protocolId;
    }

    /**
     * @notice Update protocol status
     * @param protocolId Protocol identifier
     * @param newStatus New status for the protocol
     */
    function updateProtocolStatus(
        bytes32 protocolId,
        ProtocolStatus newStatus
    ) external {
        Protocol storage protocol = protocols[protocolId];

        if (protocol.registeredAt == 0) {
            revert ProtocolNotFound(protocolId);
        }

        // Only protocol owner or contract owner can update status
        if (msg.sender != protocol.owner && msg.sender != owner()) {
            revert UnauthorizedAccess();
        }

        ProtocolStatus oldStatus = protocol.status;
        protocol.status = newStatus;

        emit ProtocolStatusUpdated(protocolId, oldStatus, newStatus);
    }

    /**
     * @notice Update total bounty pool for a protocol
     * @param protocolId Protocol identifier
     * @param amount New total bounty pool amount
     */
    function updateBountyPool(
        bytes32 protocolId,
        uint256 amount
    ) external onlyOwner {
        Protocol storage protocol = protocols[protocolId];

        if (protocol.registeredAt == 0) {
            revert ProtocolNotFound(protocolId);
        }

        uint256 oldAmount = protocol.totalBountyPool;
        protocol.totalBountyPool = amount;

        emit BountyPoolUpdated(protocolId, oldAmount, amount);
    }

    /**
     * @notice Get protocol details
     * @param protocolId Protocol identifier
     * @return Protocol struct with all details
     */
    function getProtocol(bytes32 protocolId) external view returns (Protocol memory) {
        Protocol memory protocol = protocols[protocolId];

        if (protocol.registeredAt == 0) {
            revert ProtocolNotFound(protocolId);
        }

        return protocol;
    }

    /**
     * @notice Check if a GitHub URL is already registered
     * @param githubUrl GitHub repository URL
     * @return bool True if URL is registered
     */
    function isGithubUrlRegistered(string memory githubUrl) external view returns (bool) {
        bytes32 githubUrlHash = keccak256(abi.encodePacked(githubUrl));
        return _githubUrlToProtocolId[githubUrlHash] != bytes32(0);
    }

    /**
     * @notice Get protocol ID by GitHub URL
     * @param githubUrl GitHub repository URL
     * @return protocolId Protocol identifier (bytes32(0) if not found)
     */
    function getProtocolIdByGithubUrl(string memory githubUrl) external view returns (bytes32) {
        bytes32 githubUrlHash = keccak256(abi.encodePacked(githubUrl));
        return _githubUrlToProtocolId[githubUrlHash];
    }

    /**
     * @notice Get total number of registered protocols
     * @return uint256 Total protocol count
     */
    function getProtocolCount() external view returns (uint256) {
        return allProtocolIds.length;
    }

    /**
     * @notice Get all protocol IDs
     * @return bytes32[] Array of all protocol IDs
     */
    function getAllProtocolIds() external view returns (bytes32[] memory) {
        return allProtocolIds;
    }

    /**
     * @notice Get protocols by owner
     * @param ownerAddress Address to query
     * @return bytes32[] Array of protocol IDs owned by the address
     */
    function getProtocolsByOwner(address ownerAddress) external view returns (bytes32[] memory) {
        uint256 count = 0;

        // First pass: count protocols owned by address
        for (uint256 i = 0; i < allProtocolIds.length; i++) {
            if (protocols[allProtocolIds[i]].owner == ownerAddress) {
                count++;
            }
        }

        // Second pass: collect protocol IDs
        bytes32[] memory ownerProtocols = new bytes32[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < allProtocolIds.length; i++) {
            if (protocols[allProtocolIds[i]].owner == ownerAddress) {
                ownerProtocols[index] = allProtocolIds[i];
                index++;
            }
        }

        return ownerProtocols;
    }
}
