// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ProtocolRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/BountyPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Integration Test Script for Base Sepolia
 *
 * Tests the full workflow with real USDC using minimal amounts (pennies)
 * to conserve testnet funds.
 *
 * Usage:
 * forge script script/TestIntegration.s.sol:TestIntegration \
 *   --rpc-url $BASE_SEPOLIA_RPC_URL \
 *   --broadcast \
 *   --legacy
 */
contract TestIntegration is Script {
    // Base Sepolia USDC
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Deployed contract addresses (from .env)
    ProtocolRegistry protocolRegistry;
    ValidationRegistry validationRegistry;
    BountyPool bountyPool;
    IERC20 usdc;

    // Test amounts (ultra-minimal to work with limited testnet USDC)
    // Base bounty in BountyPool is 100 USDC, so:
    // - INFORMATIONAL = 25 USDC (0.25x) ← Using this for test
    // - LOW = 100 USDC (1x)
    // - MEDIUM = 150 USDC (1.5x)
    // - HIGH = 300 USDC (3x)
    // - CRITICAL = 500 USDC (5x)
    uint256 constant TEST_DEPOSIT = 50 * 10 ** 6; // 50 USDC (enough for 2 INFORMATIONAL bounties)

    function run() public {
        // Load environment variables
        address protocolRegistryAddr = vm.envAddress("PROTOCOL_REGISTRY_ADDRESS");
        address validationRegistryAddr = vm.envAddress("VALIDATION_REGISTRY_ADDRESS");
        address bountyPoolAddr = vm.envAddress("BOUNTY_POOL_ADDRESS");

        protocolRegistry = ProtocolRegistry(protocolRegistryAddr);
        validationRegistry = ValidationRegistry(validationRegistryAddr);
        bountyPool = BountyPool(bountyPoolAddr);
        usdc = IERC20(USDC_ADDRESS);

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("Integration Test - Base Sepolia");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("USDC Balance:", usdc.balanceOf(deployer) / 10 ** 6, "USDC");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ===================
        // TEST 1: Protocol Registration
        // ===================
        console.log("TEST 1: Protocol Registration");
        console.log("-------------------------------------------");

        bytes32 protocolId = protocolRegistry.registerProtocol(
            "https://github.com/Cyfrin/2023-11-Thunder-Loan",
            "src",
            "ThunderLoan.sol",
            "Test bounty - minimal amounts"
        );

        console.log("Protocol registered!");
        console.log("Protocol ID:", vm.toString(protocolId));

        ProtocolRegistry.Protocol memory protocol = protocolRegistry.getProtocol(protocolId);
        console.log("Owner:", protocol.owner);
        console.log("Status:", uint256(protocol.status));
        console.log("");

        // ===================
        // TEST 2: Deposit Bounty (50 USDC - ultra-minimal)
        // ===================
        console.log("TEST 2: Deposit Bounty");
        console.log("-------------------------------------------");

        uint256 currentBalance = usdc.balanceOf(deployer);
        console.log("Current USDC Balance:", currentBalance / 10 ** 6, "USDC");

        if (currentBalance < TEST_DEPOSIT) {
            console.log("ERROR: Insufficient USDC balance");
            console.log("Required:", TEST_DEPOSIT / 10 ** 6, "USDC");
            console.log("");
            console.log("Please fund your wallet with Base Sepolia USDC:");
            console.log("https://faucet.circle.com/");
            vm.stopBroadcast();
            return;
        }

        // Approve USDC
        usdc.approve(address(bountyPool), TEST_DEPOSIT);
        console.log("Approved", TEST_DEPOSIT / 10 ** 6, "USDC to BountyPool");

        // Deposit
        bountyPool.depositBounty(protocolId, TEST_DEPOSIT);
        console.log("Deposited", TEST_DEPOSIT / 10 ** 6, "USDC");

        uint256 protocolBalance = bountyPool.getProtocolBalance(protocolId);
        console.log("Protocol Pool Balance:", protocolBalance / 10 ** 6, "USDC");
        console.log("");

        // ===================
        // TEST 3: Record Validation
        // ===================
        console.log("TEST 3: Record Validation");
        console.log("-------------------------------------------");

        bytes32 findingId = keccak256(abi.encodePacked(protocolId, block.timestamp));
        bytes32 proofHash = keccak256("test-proof-data");

        bytes32 validationId = validationRegistry.recordValidation(
            protocolId,
            findingId,
            "Test Vulnerability - Flash Loan Reentrancy",
            ValidationRegistry.Severity.CRITICAL,
            ValidationRegistry.ValidationOutcome.CONFIRMED,
            "Test execution log - vulnerability confirmed",
            proofHash
        );

        console.log("Validation recorded!");
        console.log("Validation ID:", vm.toString(validationId));

        ValidationRegistry.ValidationResult memory validation =
            validationRegistry.getValidation(validationId);
        console.log("Validator:", validation.validatorAgent);
        console.log("Outcome:", uint256(validation.outcome));
        console.log("Severity:", uint256(validation.severity));
        console.log("");

        // ===================
        // TEST 4: Release Bounty (INFORMATIONAL = 25 USDC, ultra-conservative)
        // ===================
        console.log("TEST 4: Release Bounty");
        console.log("-------------------------------------------");

        // For testing, we'll send bounty back to deployer
        // In production, this would be a different researcher address
        address testResearcher = deployer;

        uint256 researcherBalanceBefore = usdc.balanceOf(testResearcher);
        console.log("Researcher Balance Before:", researcherBalanceBefore / 10 ** 6, "USDC");

        // Use INFORMATIONAL severity (0.25x base = 25 USDC) to conserve testnet funds
        // We deposited 50 USDC, so we can afford two INFORMATIONAL bounties
        uint256 expectedBounty = bountyPool.calculateBountyAmount(BountyPool.Severity.INFORMATIONAL);
        console.log("Expected Bounty (INFORMATIONAL):", expectedBounty / 10 ** 6, "USDC");

        if (protocolBalance < expectedBounty) {
            console.log("ERROR: Insufficient protocol balance");
            console.log("Available:", protocolBalance / 10 ** 6, "USDC");
            console.log("Required:", expectedBounty / 10 ** 6, "USDC");
            vm.stopBroadcast();
            return;
        }

        bytes32 bountyId = bountyPool.releaseBounty(
            protocolId,
            validationId,
            testResearcher,
            BountyPool.Severity.INFORMATIONAL
        );

        console.log("Bounty released (INFORMATIONAL)!");
        console.log("Bounty ID:", vm.toString(bountyId));

        uint256 researcherBalanceAfter = usdc.balanceOf(testResearcher);
        console.log("Researcher Balance After:", researcherBalanceAfter / 10 ** 6, "USDC");
        console.log("Bounty Received:", (researcherBalanceAfter - researcherBalanceBefore) / 10 ** 6, "USDC");

        uint256 finalProtocolBalance = bountyPool.getProtocolBalance(protocolId);
        console.log("Protocol Pool Balance After:", finalProtocolBalance / 10 ** 6, "USDC");
        console.log("");

        // ===================
        // TEST 5: Query Functions
        // ===================
        console.log("TEST 5: Query Functions");
        console.log("-------------------------------------------");

        ValidationRegistry.ValidationResult[] memory protocolValidations =
            validationRegistry.getProtocolValidations(protocolId);
        console.log("Validations for Protocol:", protocolValidations.length);

        ValidationRegistry.ValidationResult[] memory confirmedValidations =
            validationRegistry.getConfirmedValidations(protocolId);
        console.log("Confirmed Validations:", confirmedValidations.length);

        BountyPool.Bounty[] memory researcherBounties =
            bountyPool.getResearcherBounties(testResearcher);
        console.log("Researcher Total Bounties:", researcherBounties.length);
        console.log("");

        vm.stopBroadcast();

        // ===================
        // Summary
        // ===================
        console.log("===========================================");
        console.log("Integration Test Complete!");
        console.log("===========================================");
        console.log("All contract interactions successful!");
        console.log("Total USDC deposited:", TEST_DEPOSIT / 10 ** 6, "USDC");
        console.log("Total USDC paid out:", expectedBounty / 10 ** 6, "USDC");
        console.log("Net cost:", (TEST_DEPOSIT - finalProtocolBalance) / 10 ** 6, "USDC (bounty paid back to deployer)");
        console.log("");
        console.log("Contract Addresses:");
        console.log("- ProtocolRegistry:", address(protocolRegistry));
        console.log("- ValidationRegistry:", address(validationRegistry));
        console.log("- BountyPool:", address(bountyPool));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify transactions on Basescan:");
        console.log("   https://sepolia.basescan.org/address/", address(protocolRegistry));
        console.log("2. Check contract events for ProtocolRegistered, ValidationRecorded, BountyReleased");
        console.log("3. Run backend E2E test with Protocol and Validator agents");
        console.log("===========================================");
    }
}
