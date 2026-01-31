// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6; // Using older version without automatic overflow checks

/**
 * @title MockDeFi
 * @notice Intentionally vulnerable contract for testing - DO NOT USE IN PRODUCTION
 * @dev Contains integer overflow vulnerability for bug bounty testing
 */
contract MockDeFi {
    mapping(address => uint256) public balances;
    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function mint(uint256 amount) external {
        // VULNERABLE: No overflow check in Solidity 0.7.6
        balances[msg.sender] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // VULNERABLE: Potential underflow
        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
    }

    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }
}
