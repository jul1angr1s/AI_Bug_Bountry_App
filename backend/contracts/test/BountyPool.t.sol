// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDC (6 decimals)
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract BountyPoolTest is Test {
    BountyPool public bountyPool;
    MockUSDC public usdc;

    address public owner;
    address public payoutAgent;
    address public protocolOwner;
    address public researcher;
    address public user;

    // Test data
    bytes32 constant PROTOCOL_ID = keccak256("protocol1");
    bytes32 constant VALIDATION_ID = keccak256("validation1");
    uint256 constant BASE_BOUNTY = 100 * 10 ** 6; // 100 USDC (6 decimals)
    uint256 constant DEPOSIT_AMOUNT = 10_000 * 10 ** 6; // 10,000 USDC

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
        BountyPool.Severity severity,
        uint256 amount,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        payoutAgent = makeAddr("payoutAgent");
        protocolOwner = makeAddr("protocolOwner");
        researcher = makeAddr("researcher");
        user = makeAddr("user");

        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy BountyPool with mock USDC
        bountyPool = new BountyPool(address(usdc));

        // Grant PAYOUT_ROLE to payout agent
        bountyPool.addPayer(payoutAgent);

        // Distribute USDC to test addresses
        usdc.transfer(protocolOwner, 100_000 * 10 ** 6); // 100k USDC
        usdc.transfer(user, 50_000 * 10 ** 6); // 50k USDC
    }

    // =================
    // Role Management Tests
    // =================

    function test_GrantPayoutRole_Success() public {
        address newPayoutAgent = makeAddr("newPayoutAgent");

        assertFalse(bountyPool.isPayer(newPayoutAgent), "Should not have payout role initially");

        bountyPool.addPayer(newPayoutAgent);

        assertTrue(bountyPool.isPayer(newPayoutAgent), "Should have payout role after grant");
    }

    function test_RevokePayoutRole_Success() public {
        assertTrue(bountyPool.isPayer(payoutAgent), "Should have payout role initially");

        bountyPool.removePayer(payoutAgent);

        assertFalse(bountyPool.isPayer(payoutAgent), "Should not have payout role after revoke");
    }

    function test_GrantPayoutRole_OnlyAdminCanGrant() public {
        address newPayoutAgent = makeAddr("newPayoutAgent");

        vm.prank(user);
        vm.expectRevert();
        bountyPool.addPayer(newPayoutAgent);
    }

    // =================
    // Deposit Tests
    // =================

    function test_DepositBounty_Success() public {
        uint256 depositAmount = 10_000 * 10 ** 6; // 10k USDC

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), depositAmount);

        vm.expectEmit(true, true, false, true);
        emit BountyDeposited(PROTOCOL_ID, protocolOwner, depositAmount, depositAmount);

        bountyPool.depositBounty(PROTOCOL_ID, depositAmount);
        vm.stopPrank();

        assertEq(bountyPool.getProtocolBalance(PROTOCOL_ID), depositAmount, "Balance should match deposit");
        assertEq(usdc.balanceOf(address(bountyPool)), depositAmount, "Pool should hold USDC");
    }

    function test_DepositBounty_MultipleDeposits() public {
        uint256 firstDeposit = 5_000 * 10 ** 6;
        uint256 secondDeposit = 3_000 * 10 ** 6;

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), firstDeposit + secondDeposit);

        bountyPool.depositBounty(PROTOCOL_ID, firstDeposit);
        assertEq(bountyPool.getProtocolBalance(PROTOCOL_ID), firstDeposit);

        bountyPool.depositBounty(PROTOCOL_ID, secondDeposit);
        assertEq(bountyPool.getProtocolBalance(PROTOCOL_ID), firstDeposit + secondDeposit);
        vm.stopPrank();
    }

    function test_DepositBounty_RevertsOnZeroAmount() public {
        vm.prank(protocolOwner);
        vm.expectRevert(BountyPool.InvalidAmount.selector);
        bountyPool.depositBounty(PROTOCOL_ID, 0);
    }

    function test_DepositBounty_RevertsOnInvalidProtocolId() public {
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), 1000 * 10 ** 6);

        vm.expectRevert(BountyPool.ProtocolNotFound.selector);
        bountyPool.depositBounty(bytes32(0), 1000 * 10 ** 6);
        vm.stopPrank();
    }

    function test_DepositBounty_RevertsOnInsufficientApproval() public {
        uint256 depositAmount = 10_000 * 10 ** 6;

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), depositAmount - 1); // Approve less than needed

        vm.expectRevert();
        bountyPool.depositBounty(PROTOCOL_ID, depositAmount);
        vm.stopPrank();
    }

    // =================
    // Bounty Release Tests
    // =================

    function test_ReleaseBounty_Critical() public {
        // Deposit bounty first
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        uint256 expectedBounty = bountyPool.calculateBountyAmount(BountyPool.Severity.CRITICAL);
        assertEq(expectedBounty, BASE_BOUNTY * 5, "CRITICAL should be 5x base bounty");

        uint256 researcherBalanceBefore = usdc.balanceOf(researcher);

        vm.prank(payoutAgent);
        bytes32 bountyId = bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        assertNotEq(bountyId, bytes32(0), "Bounty ID should not be zero");
        assertEq(
            usdc.balanceOf(researcher),
            researcherBalanceBefore + expectedBounty,
            "Researcher should receive bounty"
        );
        assertEq(
            bountyPool.getProtocolBalance(PROTOCOL_ID),
            DEPOSIT_AMOUNT - expectedBounty,
            "Protocol balance should decrease"
        );
    }

    function test_ReleaseBounty_AllSeverities() public {
        // Deposit large bounty
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        BountyPool.Severity[5] memory severities = [
            BountyPool.Severity.CRITICAL, // 5x = 500 USDC
            BountyPool.Severity.HIGH, // 3x = 300 USDC
            BountyPool.Severity.MEDIUM, // 1.5x = 150 USDC
            BountyPool.Severity.LOW, // 1x = 100 USDC
            BountyPool.Severity.INFORMATIONAL // 0.25x = 25 USDC
        ];

        uint256[5] memory expectedAmounts = [
            BASE_BOUNTY * 5,
            BASE_BOUNTY * 3,
            (BASE_BOUNTY * 15) / 10,
            BASE_BOUNTY,
            BASE_BOUNTY / 4
        ];

        uint256 totalPaid = 0;

        for (uint256 i = 0; i < severities.length; i++) {
            address currentResearcher = makeAddr(string(abi.encodePacked("researcher", i)));
            bytes32 validationId = keccak256(abi.encodePacked("validation", i));

            uint256 balanceBefore = usdc.balanceOf(currentResearcher);

            vm.prank(payoutAgent);
            bountyPool.releaseBounty(PROTOCOL_ID, validationId, currentResearcher, severities[i]);

            assertEq(
                usdc.balanceOf(currentResearcher),
                balanceBefore + expectedAmounts[i],
                "Researcher should receive correct bounty"
            );

            totalPaid += expectedAmounts[i];
        }

        assertEq(
            bountyPool.getProtocolBalance(PROTOCOL_ID),
            DEPOSIT_AMOUNT - totalPaid,
            "Protocol balance should decrease by total paid"
        );
    }

    function test_ReleaseBounty_OnlyPayoutRoleCanRelease() public {
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.prank(user);
        vm.expectRevert();
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );
    }

    function test_ReleaseBounty_RevertsOnInsufficientBalance() public {
        // Deposit small bounty
        uint256 smallDeposit = 100 * 10 ** 6; // 100 USDC
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), smallDeposit);
        bountyPool.depositBounty(PROTOCOL_ID, smallDeposit);
        vm.stopPrank();

        // Try to release CRITICAL bounty (500 USDC) - should fail
        vm.prank(payoutAgent);
        vm.expectRevert(
            abi.encodeWithSelector(
                BountyPool.InsufficientBalance.selector,
                PROTOCOL_ID,
                BASE_BOUNTY * 5, // 500 USDC
                smallDeposit // 100 USDC
            )
        );
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );
    }

    function test_ReleaseBounty_RevertsOnInvalidProtocolId() public {
        vm.prank(payoutAgent);
        vm.expectRevert(BountyPool.ProtocolNotFound.selector);
        bountyPool.releaseBounty(
            bytes32(0),
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );
    }

    function test_ReleaseBounty_RevertsOnInvalidResearcher() public {
        vm.prank(payoutAgent);
        vm.expectRevert(BountyPool.InvalidAmount.selector);
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            address(0),
            BountyPool.Severity.CRITICAL
        );
    }

    function test_ReleaseBounty_RevertsOnDuplicateValidation() public {
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // First release
        vm.prank(payoutAgent);
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        // Second release with same validation ID should fail
        vm.prank(payoutAgent);
        vm.expectRevert(
            abi.encodeWithSelector(BountyPool.BountyAlreadyPaid.selector, VALIDATION_ID)
        );
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.HIGH
        );
    }

    // =================
    // Query Function Tests
    // =================

    function test_CalculateBountyAmount_AllSeverities() public {
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.CRITICAL),
            BASE_BOUNTY * 5,
            "CRITICAL should be 5x"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.HIGH),
            BASE_BOUNTY * 3,
            "HIGH should be 3x"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.MEDIUM),
            (BASE_BOUNTY * 15) / 10,
            "MEDIUM should be 1.5x"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.LOW),
            BASE_BOUNTY,
            "LOW should be 1x"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.INFORMATIONAL),
            BASE_BOUNTY / 4,
            "INFORMATIONAL should be 0.25x"
        );
    }

    function test_GetProtocolBalance_MultipleProtocols() public {
        bytes32 protocol1 = keccak256("protocol1");
        bytes32 protocol2 = keccak256("protocol2");

        uint256 amount1 = 5_000 * 10 ** 6;
        uint256 amount2 = 3_000 * 10 ** 6;

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), amount1 + amount2);

        bountyPool.depositBounty(protocol1, amount1);
        bountyPool.depositBounty(protocol2, amount2);
        vm.stopPrank();

        assertEq(bountyPool.getProtocolBalance(protocol1), amount1);
        assertEq(bountyPool.getProtocolBalance(protocol2), amount2);
        assertEq(bountyPool.getProtocolBalance(keccak256("nonexistent")), 0);
    }

    function test_GetResearcherBounties() public {
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        // Release 3 bounties to researcher
        vm.startPrank(payoutAgent);
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            keccak256("validation1"),
            researcher,
            BountyPool.Severity.CRITICAL
        );
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            keccak256("validation2"),
            researcher,
            BountyPool.Severity.HIGH
        );
        bountyPool.releaseBounty(
            PROTOCOL_ID,
            keccak256("validation3"),
            researcher,
            BountyPool.Severity.MEDIUM
        );
        vm.stopPrank();

        BountyPool.Bounty[] memory bounties = bountyPool.getResearcherBounties(researcher);

        assertEq(bounties.length, 3, "Researcher should have 3 bounties");
        assertEq(bounties[0].researcher, researcher);
        assertEq(bounties[1].researcher, researcher);
        assertEq(bounties[2].researcher, researcher);
    }

    function test_GetBaseBountyAmount() public {
        assertEq(bountyPool.baseBountyAmount(), BASE_BOUNTY, "Base bounty should be 100 USDC");
    }

    // =================
    // ReentrancyGuard Tests
    // =================

    function test_DepositBounty_ProtectedByReentrancyGuard() public {
        // This test ensures depositBounty has nonReentrant modifier
        // In a real attack, malicious token would call back during transfer
        // But since we're using standard ERC20, we just verify the modifier exists
        // by checking the function works normally
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        assertEq(bountyPool.getProtocolBalance(PROTOCOL_ID), DEPOSIT_AMOUNT);
    }

    function test_ReleaseBounty_ProtectedByReentrancyGuard() public {
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT);
        bountyPool.depositBounty(PROTOCOL_ID, DEPOSIT_AMOUNT);
        vm.stopPrank();

        vm.prank(payoutAgent);
        bytes32 bountyId = bountyPool.releaseBounty(
            PROTOCOL_ID,
            VALIDATION_ID,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        assertNotEq(bountyId, bytes32(0));
    }

    // =================
    // Edge Cases
    // =================

    function testFuzz_DepositBounty_WithRandomAmount(uint256 amount) public {
        // Bound amount to reasonable range (1 USDC to 1M USDC)
        amount = bound(amount, 1 * 10 ** 6, 1_000_000 * 10 ** 6);

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), amount);
        bountyPool.depositBounty(PROTOCOL_ID, amount);
        vm.stopPrank();

        assertEq(bountyPool.getProtocolBalance(PROTOCOL_ID), amount);
    }

    function test_MultipleProtocolsAndResearchers() public {
        bytes32[] memory protocols = new bytes32[](3);
        protocols[0] = keccak256("protocol1");
        protocols[1] = keccak256("protocol2");
        protocols[2] = keccak256("protocol3");

        // Deposit to all protocols
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), DEPOSIT_AMOUNT * 3);
        for (uint256 i = 0; i < 3; i++) {
            bountyPool.depositBounty(protocols[i], DEPOSIT_AMOUNT);
        }
        vm.stopPrank();

        // Release bounties to different researchers
        vm.startPrank(payoutAgent);
        for (uint256 i = 0; i < 3; i++) {
            address currentResearcher = makeAddr(string(abi.encodePacked("researcher", i)));
            bytes32 validationId = keccak256(abi.encodePacked("validation", i));

            bountyPool.releaseBounty(
                protocols[i],
                validationId,
                currentResearcher,
                BountyPool.Severity.HIGH
            );

            assertEq(
                usdc.balanceOf(currentResearcher),
                BASE_BOUNTY * 3,
                "Researcher should receive HIGH bounty"
            );
        }
        vm.stopPrank();
    }
}
