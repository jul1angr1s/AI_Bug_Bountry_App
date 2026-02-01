// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

/**
 * @title ComplexVault
 * @dev Complex contract with multiple vulnerabilities for testing
 * Contains: Delegatecall issues, Integer overflow, Timestamp manipulation
 */
contract ComplexVault {
    address public owner;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastWithdrawal;
    address public implementation;

    uint256 public withdrawalDelay = 1 days;
    uint256 private totalDeposits;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // VULNERABILITY: No access control on critical function
    function setImplementation(address _implementation) public {
        implementation = _implementation;
    }

    // VULNERABILITY: Unsafe delegatecall to user-controlled address
    function execute(bytes memory _data) public returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(_data);
        require(success, "Execution failed");
        return result;
    }

    function deposit() public payable {
        require(msg.value > 0, "Invalid amount");

        // VULNERABILITY: Integer overflow (pre-0.8.0)
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    // VULNERABILITY: Timestamp dependence
    function withdraw(uint256 _amount) public {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(
            block.timestamp >= lastWithdrawal[msg.sender] + withdrawalDelay,
            "Withdrawal delay not met"
        );

        // VULNERABILITY: Reentrancy - external call before state update
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= _amount;
        totalDeposits -= _amount;
        lastWithdrawal[msg.sender] = block.timestamp;

        emit Withdrawal(msg.sender, _amount);
    }

    // VULNERABILITY: Unchecked arithmetic
    function calculateReward(uint256 _balance) public pure returns (uint256) {
        return _balance * 150 / 100; // Can overflow
    }
}
