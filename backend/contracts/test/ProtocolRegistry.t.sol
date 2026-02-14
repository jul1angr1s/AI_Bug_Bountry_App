// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProtocolRegistry.sol";

contract ProtocolRegistryTest is Test {
    ProtocolRegistry public registry;

    address public owner;
    address public user1;
    address public user2;

    // Test data
    string constant GITHUB_URL = "https://github.com/test/protocol";
    string constant CONTRACT_PATH = "src/contracts";
    string constant CONTRACT_NAME = "TestProtocol.sol";
    string constant BOUNTY_TERMS = "Standard bounty terms";

    event ProtocolRegistered(
        bytes32 indexed protocolId,
        address indexed owner,
        string githubUrl,
        string contractPath,
        string contractName,
        uint256 registeredAt,
        uint256 version
    );

    event ProtocolStatusUpdated(
        bytes32 indexed protocolId,
        ProtocolRegistry.ProtocolStatus oldStatus,
        ProtocolRegistry.ProtocolStatus newStatus
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        registry = new ProtocolRegistry();
    }

    // =================
    // Registration Tests
    // =================

    function test_RegisterProtocol_Success() public {
        vm.prank(user1);

        vm.expectEmit(false, true, false, false);
        emit ProtocolRegistered(
            bytes32(0), // We don't know the exact ID
            user1,
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            block.timestamp,
            1
        );

        bytes32 protocolId = registry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Verify protocol was registered
        assertNotEq(protocolId, bytes32(0), "Protocol ID should not be zero");

        ProtocolRegistry.Protocol memory protocol = registry.getProtocol(protocolId);
        assertEq(protocol.owner, user1);
        assertEq(protocol.githubUrl, GITHUB_URL);
        assertEq(protocol.contractPath, CONTRACT_PATH);
        assertEq(protocol.contractName, CONTRACT_NAME);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.PENDING));
        assertEq(protocol.registeredAt, block.timestamp);
        assertEq(protocol.version, 1, "First registration should be version 1");
    }

    function test_RegisterProtocol_RevertsOnEmptyGithubUrl() public {
        vm.prank(user1);
        vm.expectRevert(ProtocolRegistry.InvalidGithubUrl.selector);
        registry.registerProtocol("", CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);
    }

    function test_RegisterProtocol_SameUrlDifferentVersionsSucceed() public {
        // First registration
        vm.prank(user1);
        bytes32 protocolId1 = registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);

        // Second registration with same GitHub URL should succeed (version 2)
        vm.prank(user2);
        bytes32 protocolId2 = registry.registerProtocol(GITHUB_URL, "src/other", "Other.sol", "Other terms");

        // Both should succeed with distinct protocol IDs
        assertNotEq(protocolId1, bytes32(0), "First protocol ID should not be zero");
        assertNotEq(protocolId2, bytes32(0), "Second protocol ID should not be zero");
        assertNotEq(protocolId1, protocolId2, "Protocol IDs should be different");

        // Verify versions
        ProtocolRegistry.Protocol memory protocol1 = registry.getProtocol(protocolId1);
        ProtocolRegistry.Protocol memory protocol2 = registry.getProtocol(protocolId2);
        assertEq(protocol1.version, 1, "First registration should be version 1");
        assertEq(protocol2.version, 2, "Second registration should be version 2");
    }

    function test_RegisterProtocol_VersionCounterIncrements() public {
        vm.startPrank(user1);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, "Terms v2");
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, "Terms v3");
        vm.stopPrank();

        assertEq(registry.getVersionCount(GITHUB_URL), 3, "Version count should be 3");
    }

    function test_GetProtocolIdsByGithubUrl_ReturnsArray() public {
        vm.startPrank(user1);
        bytes32 id1 = registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);
        bytes32 id2 = registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, "Terms v2");
        vm.stopPrank();

        bytes32[] memory ids = registry.getProtocolIdsByGithubUrl(GITHUB_URL);
        assertEq(ids.length, 2, "Should return 2 protocol IDs");
        assertEq(ids[0], id1, "First ID should match");
        assertEq(ids[1], id2, "Second ID should match");
    }

    function test_RegisterProtocol_EmitsVersionInEvent() public {
        vm.startPrank(user1);

        // First registration - version 1
        vm.expectEmit(false, true, false, false);
        emit ProtocolRegistered(bytes32(0), user1, GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, block.timestamp, 1);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);

        // Second registration - version 2
        vm.expectEmit(false, true, false, false);
        emit ProtocolRegistered(bytes32(0), user1, GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, block.timestamp, 2);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, "Terms v2");

        vm.stopPrank();
    }

    function test_GetVersionCount_ZeroForUnregistered() public view {
        assertEq(registry.getVersionCount("https://github.com/unregistered/repo"), 0, "Unregistered URL should have 0 versions");
    }

    function test_RegisterProtocol_DifferentUsersCanRegisterDifferentUrls() public {
        string memory githubUrl1 = "https://github.com/test/protocol1";
        string memory githubUrl2 = "https://github.com/test/protocol2";

        vm.prank(user1);
        bytes32 protocolId1 = registry.registerProtocol(
            githubUrl1,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        vm.prank(user2);
        bytes32 protocolId2 = registry.registerProtocol(
            githubUrl2,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        assertNotEq(protocolId1, protocolId2, "Protocol IDs should be different");

        ProtocolRegistry.Protocol memory protocol1 = registry.getProtocol(protocolId1);
        ProtocolRegistry.Protocol memory protocol2 = registry.getProtocol(protocolId2);

        assertEq(protocol1.owner, user1);
        assertEq(protocol2.owner, user2);
    }

    // =================
    // Status Management Tests
    // =================

    function test_UpdateProtocolStatus_Success() public {
        vm.prank(user1);
        bytes32 protocolId = registry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Update status to ACTIVE
        vm.expectEmit(true, false, false, true);
        emit ProtocolStatusUpdated(
            protocolId,
            ProtocolRegistry.ProtocolStatus.PENDING,
            ProtocolRegistry.ProtocolStatus.ACTIVE
        );

        registry.updateProtocolStatus(protocolId, ProtocolRegistry.ProtocolStatus.ACTIVE);

        ProtocolRegistry.Protocol memory protocol = registry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.ACTIVE));
    }

    function test_UpdateProtocolStatus_RevertsOnNonexistentProtocol() public {
        bytes32 fakeId = keccak256("fake");

        vm.expectRevert(
            abi.encodeWithSelector(ProtocolRegistry.ProtocolNotFound.selector, fakeId)
        );
        registry.updateProtocolStatus(fakeId, ProtocolRegistry.ProtocolStatus.ACTIVE);
    }

    function test_UpdateProtocolStatus_OnlyOwnerCanUpdate() public {
        vm.prank(user1);
        bytes32 protocolId = registry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Non-owner cannot update
        vm.prank(user2);
        vm.expectRevert();
        registry.updateProtocolStatus(protocolId, ProtocolRegistry.ProtocolStatus.ACTIVE);

        // Owner can update
        registry.updateProtocolStatus(protocolId, ProtocolRegistry.ProtocolStatus.ACTIVE);

        ProtocolRegistry.Protocol memory protocol = registry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.ACTIVE));
    }

    // =================
    // Query Function Tests
    // =================

    function test_GetProtocol_RevertsOnNonexistentProtocol() public {
        bytes32 fakeId = keccak256("fake");

        vm.expectRevert(
            abi.encodeWithSelector(ProtocolRegistry.ProtocolNotFound.selector, fakeId)
        );
        registry.getProtocol(fakeId);
    }

    function test_IsGithubUrlRegistered() public {
        assertFalse(registry.isGithubUrlRegistered(GITHUB_URL), "Should not be registered initially");

        vm.prank(user1);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);

        assertTrue(registry.isGithubUrlRegistered(GITHUB_URL), "Should be registered after registration");
        assertFalse(
            registry.isGithubUrlRegistered("https://github.com/other/repo"),
            "Different URL should not be registered"
        );
    }

    function test_GetProtocolsByOwner() public {
        // User1 registers 2 protocols
        vm.startPrank(user1);
        bytes32 id1 = registry.registerProtocol(
            "https://github.com/test/protocol1",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );
        bytes32 id2 = registry.registerProtocol(
            "https://github.com/test/protocol2",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );
        vm.stopPrank();

        // User2 registers 1 protocol
        vm.prank(user2);
        bytes32 id3 = registry.registerProtocol(
            "https://github.com/test/protocol3",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Check user1's protocols
        bytes32[] memory user1Protocols = registry.getProtocolsByOwner(user1);
        assertEq(user1Protocols.length, 2, "User1 should have 2 protocols");
        assertEq(user1Protocols[0], id1);
        assertEq(user1Protocols[1], id2);

        // Check user2's protocols
        bytes32[] memory user2Protocols = registry.getProtocolsByOwner(user2);
        assertEq(user2Protocols.length, 1, "User2 should have 1 protocol");
        assertEq(user2Protocols[0], id3);

        // Check address with no protocols
        bytes32[] memory noProtocols = registry.getProtocolsByOwner(makeAddr("nobody"));
        assertEq(noProtocols.length, 0, "Should have no protocols");
    }

    function test_GetProtocolCount() public {
        assertEq(registry.getProtocolCount(), 0, "Should start with 0 protocols");

        vm.prank(user1);
        registry.registerProtocol(GITHUB_URL, CONTRACT_PATH, CONTRACT_NAME, BOUNTY_TERMS);
        assertEq(registry.getProtocolCount(), 1, "Should have 1 protocol");

        vm.prank(user2);
        registry.registerProtocol(
            "https://github.com/test/protocol2",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );
        assertEq(registry.getProtocolCount(), 2, "Should have 2 protocols");
    }

    // =================
    // Edge Cases
    // =================

    function testFuzz_RegisterProtocol_WithRandomData(
        string memory githubUrl,
        string memory contractPath,
        string memory contractName,
        string memory bountyTerms
    ) public {
        // Skip empty strings (they should revert)
        vm.assume(bytes(githubUrl).length > 0);
        vm.assume(bytes(contractPath).length > 0);
        vm.assume(bytes(contractName).length > 0);

        vm.prank(user1);
        bytes32 protocolId = registry.registerProtocol(
            githubUrl,
            contractPath,
            contractName,
            bountyTerms
        );

        assertNotEq(protocolId, bytes32(0));

        ProtocolRegistry.Protocol memory protocol = registry.getProtocol(protocolId);
        assertEq(protocol.githubUrl, githubUrl);
        assertEq(protocol.contractPath, contractPath);
        assertEq(protocol.contractName, contractName);
    }
}
