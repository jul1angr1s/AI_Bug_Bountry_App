// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProtocolRegistry
 * @notice Protocol registration contract for bug bounty platform
 * @dev Stub contract - to be implemented in Phase 3
 */
contract ProtocolRegistry {
    // Placeholder for Phase 3 implementation
    struct Protocol {
        address owner;
        string name;
        string contractAddress;
        bool active;
    }

    mapping(uint256 => Protocol) public protocols;
    uint256 public protocolCount;

    event ProtocolRegistered(uint256 indexed protocolId, address indexed owner, string name);

    // Stub functions to be implemented
    function registerProtocol(string memory name, string memory contractAddress) external returns (uint256) {
        // TODO: Implement in Phase 3
        revert("Not implemented");
    }

    function getProtocol(uint256 protocolId) external view returns (Protocol memory) {
        // TODO: Implement in Phase 3
        return protocols[protocolId];
    }
}
