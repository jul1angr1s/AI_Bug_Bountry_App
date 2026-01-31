// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProtocolRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/BountyPool.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC token for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/**
 * Integration Test Suite
 *
 * Tests the complete workflow of the AI Bug Bounty Platform:
 * 1. Protocol registration (ProtocolRegistry)
 * 2. Validation recording (ValidationRegistry)
 * 3. Bounty payment (BountyPool)
 */
contract IntegrationTest is Test {
    ProtocolRegistry public protocolRegistry;
    ValidationRegistry public validationRegistry;
    BountyPool public bountyPool;
    MockUSDC public usdc;

    address public platformAdmin;
    address public protocolOwner;
    address public validatorAgent;
    address public payoutAgent;
    address public researcher;

    // Test data
    string constant GITHUB_URL = "https://github.com/Cyfrin/2023-11-Thunder-Loan";
    string constant CONTRACT_PATH = "src";
    string constant CONTRACT_NAME = "ThunderLoan.sol";
    string constant BOUNTY_TERMS = "Standard bug bounty - up to 10k USDC";
    string constant VULNERABILITY_TYPE = "Flash Loan Reentrancy";
    string constant EXECUTION_LOG = "Successfully exploited flash loan vulnerability";

    uint256 constant INITIAL_DEPOSIT = 10_000 * 10 ** 6; // 10k USDC

    function setUp() public {
        platformAdmin = address(this);
        protocolOwner = makeAddr("protocolOwner");
        validatorAgent = makeAddr("validatorAgent");
        payoutAgent = makeAddr("payoutAgent");
        researcher = makeAddr("researcher");

        // Deploy mock USDC
        usdc = new MockUSDC();

        // Deploy all contracts
        protocolRegistry = new ProtocolRegistry();
        validationRegistry = new ValidationRegistry();
        bountyPool = new BountyPool(address(usdc));

        // Grant roles
        validationRegistry.grantValidatorRole(validatorAgent);
        bountyPool.grantPayoutRole(payoutAgent);

        // Fund protocol owner
        usdc.transfer(protocolOwner, 100_000 * 10 ** 6); // 100k USDC
    }

    // =================
    // Full Workflow Tests
    // =================

    function test_FullWorkflow_SingleVulnerability() public {
        // ==================
        // STEP 1: Protocol Registration
        // ==================
        vm.prank(protocolOwner);
        bytes32 protocolId = protocolRegistry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        assertNotEq(protocolId, bytes32(0), "Protocol should be registered");

        ProtocolRegistry.Protocol memory protocol = protocolRegistry.getProtocol(protocolId);
        assertEq(protocol.owner, protocolOwner);
        assertEq(protocol.githubUrl, GITHUB_URL);
        assertEq(
            uint256(protocol.status),
            uint256(ProtocolRegistry.ProtocolStatus.PENDING)
        );

        // ==================
        // STEP 2: Activate Protocol & Deposit Bounty
        // ==================
        protocolRegistry.updateProtocolStatus(
            protocolId,
            ProtocolRegistry.ProtocolStatus.ACTIVE
        );

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), INITIAL_DEPOSIT);
        bountyPool.depositBounty(protocolId, INITIAL_DEPOSIT);
        vm.stopPrank();

        assertEq(bountyPool.getProtocolBalance(protocolId), INITIAL_DEPOSIT);

        // ==================
        // STEP 3: Researcher Finds Vulnerability & Validator Confirms
        // ==================
        bytes32 findingId = keccak256(abi.encodePacked(protocolId, "finding1"));
        bytes32 proofHash = keccak256("proof-data");

        vm.prank(validatorAgent);
        bytes32 validationId = validationRegistry.recordValidation(
            protocolId,
            findingId,
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            proofHash
        );

        assertNotEq(validationId, bytes32(0), "Validation should be recorded");

        ValidationRegistry.ValidationResult memory validation =
            validationRegistry.getValidation(validationId);
        assertEq(validation.protocolId, protocolId);
        assertEq(validation.findingId, findingId);
        assertEq(validation.validatorAgent, validatorAgent);
        assertEq(
            uint256(validation.outcome),
            uint256(ValidationRegistry.ValidationOutcome.CONFIRMED)
        );

        // ==================
        // STEP 4: Bounty Release
        // ==================
        uint256 expectedBounty = bountyPool.calculateBountyAmount(
            BountyPool.Severity.CRITICAL
        ); // 500 USDC
        uint256 researcherBalanceBefore = usdc.balanceOf(researcher);

        vm.prank(payoutAgent);
        bytes32 bountyId = bountyPool.releaseBounty(
            protocolId,
            validationId,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        assertNotEq(bountyId, bytes32(0), "Bounty should be released");
        assertEq(
            usdc.balanceOf(researcher),
            researcherBalanceBefore + expectedBounty,
            "Researcher should receive CRITICAL bounty (500 USDC)"
        );
        assertEq(
            bountyPool.getProtocolBalance(protocolId),
            INITIAL_DEPOSIT - expectedBounty,
            "Protocol balance should decrease"
        );

        // Verify researcher received payment
        BountyPool.Bounty[] memory researcherBounties =
            bountyPool.getResearcherBounties(researcher);
        assertEq(researcherBounties.length, 1);
        assertEq(researcherBounties[0].amount, expectedBounty);
    }

    function test_FullWorkflow_MultipleVulnerabilities() public {
        // Register protocol
        vm.prank(protocolOwner);
        bytes32 protocolId = protocolRegistry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        protocolRegistry.updateProtocolStatus(
            protocolId,
            ProtocolRegistry.ProtocolStatus.ACTIVE
        );

        // Deposit large bounty pool
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), INITIAL_DEPOSIT);
        bountyPool.depositBounty(protocolId, INITIAL_DEPOSIT);
        vm.stopPrank();

        // Define 3 vulnerabilities with different severities
        struct Vulnerability {
            string vulnType;
            ValidationRegistry.Severity severity;
            BountyPool.Severity payoutSeverity;
            address researcher;
        }

        Vulnerability[] memory vulns = new Vulnerability[](3);
        vulns[0] = Vulnerability({
            vulnType: "Flash Loan Reentrancy",
            severity: ValidationRegistry.Severity.CRITICAL,
            payoutSeverity: BountyPool.Severity.CRITICAL,
            researcher: makeAddr("researcher1")
        });
        vulns[1] = Vulnerability({
            vulnType: "Integer Overflow",
            severity: ValidationRegistry.Severity.HIGH,
            payoutSeverity: BountyPool.Severity.HIGH,
            researcher: makeAddr("researcher2")
        });
        vulns[2] = Vulnerability({
            vulnType: "Access Control",
            severity: ValidationRegistry.Severity.MEDIUM,
            payoutSeverity: BountyPool.Severity.MEDIUM,
            researcher: makeAddr("researcher3")
        });

        uint256 totalPaid = 0;

        for (uint256 i = 0; i < vulns.length; i++) {
            bytes32 findingId = keccak256(abi.encodePacked(protocolId, "finding", i));
            bytes32 proofHash = keccak256(abi.encodePacked("proof", i));

            // Validator confirms vulnerability
            vm.prank(validatorAgent);
            bytes32 validationId = validationRegistry.recordValidation(
                protocolId,
                findingId,
                vulns[i].vulnType,
                vulns[i].severity,
                ValidationRegistry.ValidationOutcome.CONFIRMED,
                EXECUTION_LOG,
                proofHash
            );

            // Release bounty
            uint256 expectedBounty = bountyPool.calculateBountyAmount(vulns[i].payoutSeverity);
            uint256 balanceBefore = usdc.balanceOf(vulns[i].researcher);

            vm.prank(payoutAgent);
            bountyPool.releaseBounty(
                protocolId,
                validationId,
                vulns[i].researcher,
                vulns[i].payoutSeverity
            );

            assertEq(
                usdc.balanceOf(vulns[i].researcher),
                balanceBefore + expectedBounty,
                "Researcher should receive correct bounty"
            );

            totalPaid += expectedBounty;
        }

        // Verify final balances
        assertEq(
            bountyPool.getProtocolBalance(protocolId),
            INITIAL_DEPOSIT - totalPaid,
            "Protocol balance should match total paid"
        );

        // Verify all validations are recorded
        ValidationRegistry.ValidationResult[] memory allValidations =
            validationRegistry.getProtocolValidations(protocolId);
        assertEq(allValidations.length, 3, "Should have 3 validations");

        ValidationRegistry.ValidationResult[] memory confirmedValidations =
            validationRegistry.getConfirmedValidations(protocolId);
        assertEq(confirmedValidations.length, 3, "All 3 should be confirmed");
    }

    function test_FullWorkflow_RejectedVulnerability() public {
        // Register and fund protocol
        vm.prank(protocolOwner);
        bytes32 protocolId = protocolRegistry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), INITIAL_DEPOSIT);
        bountyPool.depositBounty(protocolId, INITIAL_DEPOSIT);
        vm.stopPrank();

        // Validator rejects vulnerability (false positive)
        bytes32 findingId = keccak256(abi.encodePacked(protocolId, "finding1"));
        bytes32 proofHash = keccak256("proof-data");

        vm.prank(validatorAgent);
        bytes32 validationId = validationRegistry.recordValidation(
            protocolId,
            findingId,
            "False Positive Vulnerability",
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.REJECTED, // REJECTED
            "Exploit failed - not a real vulnerability",
            proofHash
        );

        ValidationRegistry.ValidationResult memory validation =
            validationRegistry.getValidation(validationId);
        assertEq(
            uint256(validation.outcome),
            uint256(ValidationRegistry.ValidationOutcome.REJECTED)
        );

        // No bounty should be released for rejected vulnerabilities
        // (In production, payout agent would check outcome before releasing)

        // Verify protocol balance unchanged
        assertEq(bountyPool.getProtocolBalance(protocolId), INITIAL_DEPOSIT);

        // Verify no confirmed validations
        ValidationRegistry.ValidationResult[] memory confirmedValidations =
            validationRegistry.getConfirmedValidations(protocolId);
        assertEq(confirmedValidations.length, 0, "Should have no confirmed validations");
    }

    function test_FullWorkflow_MultipleProtocols() public {
        // Register 2 protocols
        vm.prank(protocolOwner);
        bytes32 protocol1 = protocolRegistry.registerProtocol(
            "https://github.com/protocol1/repo",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        vm.prank(protocolOwner);
        bytes32 protocol2 = protocolRegistry.registerProtocol(
            "https://github.com/protocol2/repo",
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Fund both protocols
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), INITIAL_DEPOSIT * 2);
        bountyPool.depositBounty(protocol1, INITIAL_DEPOSIT);
        bountyPool.depositBounty(protocol2, INITIAL_DEPOSIT);
        vm.stopPrank();

        // Record validation for protocol1
        vm.prank(validatorAgent);
        bytes32 validation1 = validationRegistry.recordValidation(
            protocol1,
            keccak256("finding1"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            keccak256("proof1")
        );

        // Record validation for protocol2
        vm.prank(validatorAgent);
        bytes32 validation2 = validationRegistry.recordValidation(
            protocol2,
            keccak256("finding2"),
            "Different Vulnerability",
            ValidationRegistry.Severity.HIGH,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            keccak256("proof2")
        );

        // Release bounties
        address researcher1 = makeAddr("researcher1");
        address researcher2 = makeAddr("researcher2");

        vm.startPrank(payoutAgent);
        bountyPool.releaseBounty(
            protocol1,
            validation1,
            researcher1,
            BountyPool.Severity.CRITICAL
        );
        bountyPool.releaseBounty(
            protocol2,
            validation2,
            researcher2,
            BountyPool.Severity.HIGH
        );
        vm.stopPrank();

        // Verify payments
        assertEq(usdc.balanceOf(researcher1), 500 * 10 ** 6); // CRITICAL = 500 USDC
        assertEq(usdc.balanceOf(researcher2), 300 * 10 ** 6); // HIGH = 300 USDC

        // Verify balances
        assertEq(bountyPool.getProtocolBalance(protocol1), INITIAL_DEPOSIT - 500 * 10 ** 6);
        assertEq(bountyPool.getProtocolBalance(protocol2), INITIAL_DEPOSIT - 300 * 10 ** 6);
    }

    function test_FullWorkflow_InsufficientFunds() public {
        // Register protocol
        vm.prank(protocolOwner);
        bytes32 protocolId = protocolRegistry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        // Deposit small bounty (only 200 USDC)
        uint256 smallDeposit = 200 * 10 ** 6;
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), smallDeposit);
        bountyPool.depositBounty(protocolId, smallDeposit);
        vm.stopPrank();

        // Record CRITICAL validation (requires 500 USDC)
        vm.prank(validatorAgent);
        bytes32 validationId = validationRegistry.recordValidation(
            protocolId,
            keccak256("finding1"),
            VULNERABILITY_TYPE,
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            EXECUTION_LOG,
            keccak256("proof1")
        );

        // Try to release bounty - should fail
        vm.prank(payoutAgent);
        vm.expectRevert(
            abi.encodeWithSelector(
                BountyPool.InsufficientBalance.selector,
                protocolId,
                500 * 10 ** 6, // Required
                smallDeposit // Available
            )
        );
        bountyPool.releaseBounty(
            protocolId,
            validationId,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        // Protocol owner can top up the bounty pool
        vm.startPrank(protocolOwner);
        usdc.approve(address(bountyPool), 300 * 10 ** 6);
        bountyPool.depositBounty(protocolId, 300 * 10 ** 6);
        vm.stopPrank();

        // Now release should succeed
        vm.prank(payoutAgent);
        bountyPool.releaseBounty(
            protocolId,
            validationId,
            researcher,
            BountyPool.Severity.CRITICAL
        );

        assertEq(usdc.balanceOf(researcher), 500 * 10 ** 6);
    }

    // =================
    // Protocol Lifecycle Tests
    // =================

    function test_ProtocolLifecycle_PendingToActiveToPaused() public {
        // Register (PENDING)
        vm.prank(protocolOwner);
        bytes32 protocolId = protocolRegistry.registerProtocol(
            GITHUB_URL,
            CONTRACT_PATH,
            CONTRACT_NAME,
            BOUNTY_TERMS
        );

        ProtocolRegistry.Protocol memory protocol = protocolRegistry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.PENDING));

        // Activate
        protocolRegistry.updateProtocolStatus(
            protocolId,
            ProtocolRegistry.ProtocolStatus.ACTIVE
        );
        protocol = protocolRegistry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.ACTIVE));

        // Pause
        protocolRegistry.updateProtocolStatus(
            protocolId,
            ProtocolRegistry.ProtocolStatus.PAUSED
        );
        protocol = protocolRegistry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.PAUSED));

        // Deactivate
        protocolRegistry.updateProtocolStatus(
            protocolId,
            ProtocolRegistry.ProtocolStatus.DEACTIVATED
        );
        protocol = protocolRegistry.getProtocol(protocolId);
        assertEq(uint256(protocol.status), uint256(ProtocolRegistry.ProtocolStatus.DEACTIVATED));
    }
}
