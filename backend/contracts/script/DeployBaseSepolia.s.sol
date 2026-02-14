// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ProtocolRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/BountyPool.sol";

/**
 * @title DeployBaseSepolia
 * @notice Deployment script for Base Sepolia testnet
 * @dev Run with: forge script script/DeployBaseSepolia.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployBaseSepolia is Script {
    // Base Sepolia USDC address
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        // Load deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("Deploying to Base Sepolia");
        console.log("========================================");
        console.log("Deployer address:", deployer);
        console.log("USDC address:", USDC_BASE_SEPOLIA);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ProtocolRegistry
        console.log("1. Deploying ProtocolRegistry...");
        ProtocolRegistry protocolRegistry = new ProtocolRegistry();
        console.log("   ProtocolRegistry deployed at:", address(protocolRegistry));
        console.log("");

        // 2. Deploy ValidationRegistry
        console.log("2. Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry();
        console.log("   ValidationRegistry deployed at:", address(validationRegistry));
        console.log("");

        // 3. Grant VALIDATOR_ROLE to deployer (temporary - will be granted to Validator Agent later)
        console.log("3. Granting VALIDATOR_ROLE to deployer...");
        bytes32 validatorRole = validationRegistry.VALIDATOR_ROLE();
        validationRegistry.grantRole(validatorRole, deployer);
        console.log("   VALIDATOR_ROLE granted to:", deployer);
        console.log("");

        // 4. Deploy BountyPool
        console.log("4. Deploying BountyPool...");
        BountyPool bountyPool = new BountyPool(USDC_BASE_SEPOLIA);
        console.log("   BountyPool deployed at:", address(bountyPool));
        console.log("");

        // 5. Grant PAYOUT_ROLE to deployer (temporary - will be granted to Validator Agent later)
        console.log("5. Granting PAYOUT_ROLE to deployer...");
        bytes32 payoutRole = bountyPool.PAYOUT_ROLE();
        bountyPool.grantRole(payoutRole, deployer);
        console.log("   PAYOUT_ROLE granted to:", deployer);
        console.log("");

        vm.stopBroadcast();

        // Print summary
        console.log("========================================");
        console.log("Deployment Summary");
        console.log("========================================");
        console.log("");
        console.log("Contract Addresses:");
        console.log("-------------------");
        console.log("ProtocolRegistry:   ", address(protocolRegistry));
        console.log("ValidationRegistry: ", address(validationRegistry));
        console.log("BountyPool:         ", address(bountyPool));
        console.log("");
        console.log("Configuration:");
        console.log("-------------------");
        console.log("USDC Address:       ", USDC_BASE_SEPOLIA);
        console.log("Deployer:           ", deployer);
        console.log("Base Bounty Amount: ", bountyPool.baseBountyAmount(), "USDC (6 decimals)");
        console.log("");
        console.log("Role Assignments:");
        console.log("-------------------");
        console.log("ProtocolRegistry Owner:", protocolRegistry.owner());
        console.log("ValidationRegistry Admin:", deployer);
        console.log("BountyPool Admin:", deployer);
        console.log("");
        console.log("========================================");
        console.log("Add these to backend/.env:");
        console.log("========================================");
        console.log("");
        console.log("PROTOCOL_REGISTRY_ADDRESS=", address(protocolRegistry));
        console.log("VALIDATION_REGISTRY_ADDRESS=", address(validationRegistry));
        console.log("BOUNTY_POOL_ADDRESS=", address(bountyPool));
        console.log("");
        console.log("========================================");
        console.log("Verification Commands:");
        console.log("========================================");
        console.log("");
        console.log("Visit Basescan:");
        console.log("ProtocolRegistry:   https://sepolia.basescan.org/address/", address(protocolRegistry));
        console.log("ValidationRegistry: https://sepolia.basescan.org/address/", address(validationRegistry));
        console.log("BountyPool:         https://sepolia.basescan.org/address/", address(bountyPool));
        console.log("");
        console.log("========================================");
        console.log("Next Steps:");
        console.log("========================================");
        console.log("");
        console.log("1. Copy contract addresses to backend/.env");
        console.log("2. Verify contracts are verified on Basescan");
        console.log("3. Test contract interactions:");
        console.log("   - Register a test protocol");
        console.log("   - Record a validation");
        console.log("   - Check roles are properly configured");
        console.log("");
        console.log("========================================");
    }

    /**
     * @notice Helper function to test local deployment on Anvil
     * @dev Run with: forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia --sig "testLocal()" --fork-url http://localhost:8545 --broadcast
     */
    function testLocal() external {
        // For testing on Anvil, use a mock USDC address or deploy a mock
        // For now, using the Base Sepolia address as placeholder
        address mockUSDC = USDC_BASE_SEPOLIA;

        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // Anvil default key
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Testing deployment on local Anvil");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        ProtocolRegistry protocolRegistry = new ProtocolRegistry();
        ValidationRegistry validationRegistry = new ValidationRegistry();
        BountyPool bountyPool = new BountyPool(mockUSDC);

        // Grant roles
        validationRegistry.grantRole(validationRegistry.VALIDATOR_ROLE(), deployer);
        bountyPool.grantRole(bountyPool.PAYOUT_ROLE(), deployer);

        vm.stopBroadcast();

        console.log("ProtocolRegistry:   ", address(protocolRegistry));
        console.log("ValidationRegistry: ", address(validationRegistry));
        console.log("BountyPool:         ", address(bountyPool));
    }
}
