// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyPool.sol";

/**
 * @title BountyPoolConfigurationTest
 * @notice Test contract for verifying BountyPool parameter updates for demo mode
 * @dev Tests the ability to update base bounty amounts and severity multipliers
 */
contract BountyPoolConfigurationTest is Test {
    BountyPool public bountyPool;
    address admin = address(1);
    address usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
    
    function setUp() public {
        vm.prank(admin);
        bountyPool = new BountyPool(usdcAddress);
    }
    
    /**
     * @notice Test updating base bounty amount from 100 USDC to 1 USDC
     */
    function testUpdateBaseBountyAmount() public {
        // Arrange
        uint256 newBase = 1_000_000; // 1 USDC (6 decimals)
        
        // Act
        vm.prank(admin);
        bountyPool.updateBaseBountyAmount(newBase);
        
        // Assert
        assertEq(bountyPool.baseBountyAmount(), newBase, "Base bounty amount not updated correctly");
    }
    
    /**
     * @notice Test updating severity multipliers for demo mode
     * @dev HIGH: 5x, MEDIUM: 3x, LOW: 1x
     */
    function testUpdateSeverityMultipliers() public {
        // Arrange & Act
        vm.startPrank(admin);
        
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.HIGH, 50000);
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.MEDIUM, 30000);
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.LOW, 10000);
        
        vm.stopPrank();
        
        // Assert
        assertEq(
            bountyPool.severityMultipliers(BountyPool.Severity.HIGH),
            50000,
            "HIGH multiplier not set correctly"
        );
        assertEq(
            bountyPool.severityMultipliers(BountyPool.Severity.MEDIUM),
            30000,
            "MEDIUM multiplier not set correctly"
        );
        assertEq(
            bountyPool.severityMultipliers(BountyPool.Severity.LOW),
            10000,
            "LOW multiplier not set correctly"
        );
    }
    
    /**
     * @notice Test that new parameters calculate correct bounty amounts
     * @dev Verifies HIGH=5 USDC, MEDIUM=3 USDC, LOW=1 USDC
     */
    function testCalculateNewBountyAmounts() public {
        // Arrange - Setup new parameters
        vm.startPrank(admin);
        bountyPool.updateBaseBountyAmount(1_000_000); // 1 USDC base
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.HIGH, 50000); // 5x
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.MEDIUM, 30000); // 3x
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.LOW, 10000); // 1x
        vm.stopPrank();
        
        // Act & Assert
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.HIGH),
            5_000_000,
            "HIGH should pay 5 USDC"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.MEDIUM),
            3_000_000,
            "MEDIUM should pay 3 USDC"
        );
        assertEq(
            bountyPool.calculateBountyAmount(BountyPool.Severity.LOW),
            1_000_000,
            "LOW should pay 1 USDC"
        );
    }
    
    /**
     * @notice Test that only admin can update base bounty amount
     */
    function testOnlyAdminCanUpdateBaseBountyAmount() public {
        address nonAdmin = address(2);
        uint256 newBase = 1_000_000;
        
        vm.prank(nonAdmin);
        vm.expectRevert();
        bountyPool.updateBaseBountyAmount(newBase);
    }
    
    /**
     * @notice Test that only admin can update severity multipliers
     */
    function testOnlyAdminCanUpdateSeverityMultipliers() public {
        address nonAdmin = address(2);
        
        vm.prank(nonAdmin);
        vm.expectRevert();
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.HIGH, 50000);
    }
    
    /**
     * @notice Test budget calculation with 50 USDC pool
     * @dev Verifies that 50 USDC allows for at least 10 HIGH severity payments
     */
    function testBudgetCalculationWith50USDC() public {
        // Arrange - Setup demo parameters
        vm.startPrank(admin);
        bountyPool.updateBaseBountyAmount(1_000_000);
        bountyPool.updateSeverityMultiplier(BountyPool.Severity.HIGH, 50000);
        vm.stopPrank();
        
        // Simulate 50 USDC in pool
        uint256 poolBalance = 50_000_000; // 50 USDC (6 decimals)
        uint256 highPayment = bountyPool.calculateBountyAmount(BountyPool.Severity.HIGH);
        
        // Calculate max payments
        uint256 maxPayments = poolBalance / highPayment;
        
        // Assert - Should allow at least 10 payments
        assertGe(maxPayments, 10, "50 USDC should allow at least 10 HIGH payments");
    }
}
