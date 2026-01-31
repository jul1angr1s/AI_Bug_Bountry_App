# Intentional Vulnerabilities Documentation

This document details the intentional vulnerabilities in the test contracts for the AI Bug Bounty Platform.

## VulnerableVault.sol

### Vulnerability Type: Reentrancy Attack

**Severity**: Critical

**Location**: `withdraw()` function (lines 24-31)

**Description**:
The contract performs an external call to transfer ETH to the user BEFORE updating the user's balance. This violates the Checks-Effects-Interactions pattern and allows an attacker to recursively call the `withdraw()` function during the external call.

**Vulnerable Code**:
```solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // VULNERABILITY: External call before state update
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");

    balances[msg.sender] -= amount; // State updated too late
    emit Withdraw(msg.sender, amount);
}
```

**Attack Vector**:
1. Attacker deposits 1 ETH into the vault
2. Attacker calls `withdraw(1 ether)`
3. During the ETH transfer, the attacker's `receive()` function is triggered
4. Before the balance is updated, the attacker calls `withdraw(1 ether)` again
5. The check `balances[msg.sender] >= amount` still passes (balance not updated yet)
6. Attacker withdraws more than deposited

**Expected Detection**:
- Slither: "reentrancy-eth" detector
- Mythril: "SWC-107" (Reentrancy)
- Manual audit: CEI pattern violation

**Fix**:
Update state before external call (Checks-Effects-Interactions pattern):
```solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");

    balances[msg.sender] -= amount; // Update state first

    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");

    emit Withdraw(msg.sender, amount);
}
```

---

## MockDeFi.sol

### Vulnerability Type: Integer Overflow/Underflow

**Severity**: High

**Location**: `mint()` and `transfer()` functions

**Description**:
The contract uses Solidity 0.7.6, which does not have automatic overflow/underflow protection. This allows arithmetic operations to wrap around when exceeding type limits.

**Vulnerable Code**:
```solidity
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
```

**Attack Vectors**:

1. **Overflow Attack (mint)**:
   - User calls `mint(type(uint256).max)`
   - User calls `mint(1)`
   - Balance wraps around to 0 instead of erroring

2. **Underflow Attack (transfer)**:
   - While protected by `require`, unchecked arithmetic can be exploited in complex scenarios
   - In older patterns without require, could subtract from 0 and wrap to max uint256

**Expected Detection**:
- Slither: "incorrect-equality", "unprotected-upgrade"
- Mythril: "SWC-101" (Integer Overflow/Underflow)
- Manual audit: Use of Solidity < 0.8.0

**Fix**:
1. Upgrade to Solidity 0.8.0+ (automatic overflow checks)
2. Or use SafeMath library:
```solidity
using SafeMath for uint256;

function mint(uint256 amount) external {
    balances[msg.sender] = balances[msg.sender].add(amount);
    totalSupply = totalSupply.add(amount);
}
```

---

## Testing Vulnerabilities

### Slither Analysis

Run Slither on both contracts:
```bash
slither src/VulnerableVault.sol
slither src/MockDeFi.sol
```

Expected findings:
- VulnerableVault: Reentrancy vulnerability in `withdraw()`
- MockDeFi: Use of deprecated Solidity version

### Foundry Tests

Run the reentrancy attack test:
```bash
forge test -vv
```

The test suite includes:
- Basic functionality tests
- Reentrancy attack demonstration
- Balance verification tests

### Manual Verification

1. Deploy to local Anvil
2. Interact via cast CLI
3. Monitor state changes during attack

---

## Security Best Practices Violated

1. **Checks-Effects-Interactions Pattern**: VulnerableVault violates CEI by calling external contracts before updating state
2. **Modern Solidity Version**: MockDeFi uses outdated compiler without overflow protection
3. **Reentrancy Guards**: No ReentrancyGuard modifier used
4. **Pull Over Push**: Withdrawal pattern could use pull-based approach instead of pushing funds

---

## References

- [SWC-107: Reentrancy](https://swcregistry.io/docs/SWC-107)
- [SWC-101: Integer Overflow and Underflow](https://swcregistry.io/docs/SWC-101)
- [Consensys Smart Contract Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [OpenZeppelin Security Guidelines](https://docs.openzeppelin.com/contracts/4.x/security)
