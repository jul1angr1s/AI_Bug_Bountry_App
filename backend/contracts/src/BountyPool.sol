// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BountyPool
 * @notice Payment and bounty management contract
 * @dev Stub contract - to be implemented in Phase 3
 */
contract BountyPool {
    // Placeholder for Phase 3 implementation
    struct Bounty {
        uint256 protocolId;
        uint256 amount;
        address hunter;
        bool paid;
        uint256 timestamp;
    }

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => uint256) public protocolBalances;
    uint256 public bountyCount;

    event BountyDeposited(uint256 indexed protocolId, uint256 amount);
    event BountyPaid(uint256 indexed bountyId, address indexed hunter, uint256 amount);

    // Stub functions to be implemented
    function depositBounty(uint256 protocolId) external payable {
        // TODO: Implement in Phase 3
        revert("Not implemented");
    }

    function payBounty(uint256 protocolId, address hunter, uint256 amount) external returns (uint256) {
        // TODO: Implement in Phase 3
        revert("Not implemented");
    }

    function getProtocolBalance(uint256 protocolId) external view returns (uint256) {
        // TODO: Implement in Phase 3
        return protocolBalances[protocolId];
    }

    function withdrawBalance(uint256 protocolId) external {
        // TODO: Implement in Phase 3
        revert("Not implemented");
    }
}
