// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AgentIdentityRegistry.sol";
import "../src/AgentReputationRegistry.sol";
import "../src/PlatformEscrow.sol";

/**
 * @title DeployAgentContracts
 * @notice Deploys ERC-8004 agent contracts and x.402 escrow to Base Sepolia
 *
 * Deploy with verification:
 *   cd backend/contracts
 *   source ../.env
 *   forge script script/DeployAgentContracts.s.sol \
 *     --rpc-url $BASE_SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $BASESCAN_API_KEY
 *
 * After deployment, update backend/.env with new contract addresses.
 */
contract DeployAgentContracts is Script {
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        string memory metadataBaseURI = vm.envOr("METADATA_BASE_URI", string("http://localhost:3000/api/v1/agent-identities/metadata/"));

        console.log("Deploying agent contracts to Base Sepolia");
        console.log("Deployer:", deployer);
        console.log("USDC:", BASE_SEPOLIA_USDC);
        console.log("Metadata Base URI:", metadataBaseURI);

        vm.startBroadcast(deployerPrivateKey);

        AgentIdentityRegistry agentIdentity = new AgentIdentityRegistry();
        console.log("AgentIdentityRegistry deployed to:", address(agentIdentity));

        // Set metadata base URI for ERC-721 tokenURI resolution
        // Trailing slash is critical: OZ concatenates baseURI + tokenId with no separator
        agentIdentity.setBaseURI(metadataBaseURI);
        console.log("Set metadata base URI");

        AgentReputationRegistry agentReputation = new AgentReputationRegistry();
        console.log("AgentReputationRegistry deployed to:", address(agentReputation));

        PlatformEscrow platformEscrow = new PlatformEscrow(
            BASE_SEPOLIA_USDC,
            deployer
        );
        console.log("PlatformEscrow deployed to:", address(platformEscrow));

        // Grant SCORER_ROLE on reputation registry to deployer (for seed scripts)
        agentReputation.addScorer(deployer);
        console.log("Granted SCORER_ROLE to deployer");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("AgentIdentityRegistry:", address(agentIdentity));
        console.log("AgentReputationRegistry:", address(agentReputation));
        console.log("PlatformEscrow:", address(platformEscrow));
        console.log("\nMetadata URI:", metadataBaseURI);
        console.log("\nFees configured:");
        console.log("- Submission fee: 0.5 USDC (500000)");
        console.log("- Protocol registration fee: 1 USDC (1000000)");
        console.log("\nUpdate backend/.env with:");
        console.log("AGENT_IDENTITY_REGISTRY_ADDRESS=<address above>");
        console.log("AGENT_REPUTATION_REGISTRY_ADDRESS=<address above>");
        console.log("PLATFORM_ESCROW_ADDRESS=<address above>");
    }
}
