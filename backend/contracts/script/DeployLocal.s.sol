// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VulnerableVault.sol";

/**
 * @title DeployLocal
 * @notice Deployment script for local Anvil testing
 */
contract DeployLocal is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        VulnerableVault vault = new VulnerableVault();
        console.log("VulnerableVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
