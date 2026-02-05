// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentIdentityRegistry.sol";
import "../src/AgentReputationRegistry.sol";
import "../src/PlatformEscrow.sol";

/**
 * @title DeployAgentContracts
 * @notice Deploys ERC-8004 agent contracts and x.402 escrow to Base Sepolia
 */
contract DeployAgentContracts is Script {
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying agent contracts to Base Sepolia");
        console.log("Deployer:", deployer);
        console.log("USDC:", BASE_SEPOLIA_USDC);

        vm.startBroadcast(deployerPrivateKey);

        AgentIdentityRegistry agentIdentity = new AgentIdentityRegistry();
        console.log("AgentIdentityRegistry deployed to:", address(agentIdentity));

        AgentReputationRegistry agentReputation = new AgentReputationRegistry();
        console.log("AgentReputationRegistry deployed to:", address(agentReputation));

        PlatformEscrow platformEscrow = new PlatformEscrow(
            BASE_SEPOLIA_USDC,
            deployer
        );
        console.log("PlatformEscrow deployed to:", address(platformEscrow));

        agentReputation.addScorer(address(agentIdentity));
        console.log("Granted SCORER_ROLE to AgentIdentityRegistry");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("AgentIdentityRegistry:", address(agentIdentity));
        console.log("AgentReputationRegistry:", address(agentReputation));
        console.log("PlatformEscrow:", address(platformEscrow));
        console.log("\nFees configured:");
        console.log("- Submission fee: 0.5 USDC (500000)");
        console.log("- Protocol registration fee: 1 USDC (1000000)");
    }
}
