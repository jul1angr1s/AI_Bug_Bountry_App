# AI Component Test Fixtures

This directory contains test fixtures for AI-enhanced vulnerability research testing.

## Directory Structure

```
fixtures/
├── contracts/              # Sample Solidity contracts for testing
│   ├── VulnerableToken.sol    # ERC20 with multiple vulnerabilities
│   ├── SafeToken.sol          # Secure ERC20 implementation
│   └── ComplexVault.sol       # Complex contract with various issues
└── llm-responses.json     # Mock LLM responses for different scenarios
```

## Contract Fixtures

### VulnerableToken.sol (53 lines)
Intentionally vulnerable ERC20 token containing:
- **Reentrancy vulnerability**: External call before state update in `transfer()`
- **Missing access control**: Anyone can call `mint()`
- **Unchecked external call**: Low-level call without proper validation

### SafeToken.sol (46 lines)
Secure ERC20 implementation demonstrating:
- **Reentrancy protection**: Custom nonReentrant modifier
- **Access control**: onlyOwner modifier on privileged functions
- **Secure patterns**: Proper state management

### ComplexVault.sol (70 lines)
Complex vault contract with multiple vulnerabilities:
- **Unsafe delegatecall**: User-controlled implementation address
- **Missing access control**: `setImplementation()` has no restrictions
- **Reentrancy**: External call before state update in `withdraw()`
- **Integer overflow**: Unchecked arithmetic (Solidity 0.7.6)
- **Timestamp dependence**: Withdrawal delay based on `block.timestamp`

## LLM Response Fixtures

The `llm-responses.json` file contains 10 mock LLM responses covering:

1. **Reentrancy detection** - Critical vulnerability in VulnerableToken
2. **Access control issues** - Missing modifiers on mint function
3. **Unsafe external calls** - Delegatecall vulnerabilities
4. **Integer overflow** - Unchecked arithmetic in pre-0.8.0 Solidity
5. **Timestamp manipulation** - Time-based access control risks
6. **Comprehensive audit** - Security assessment of SafeToken
7. **Unchecked return values** - Low-level call patterns
8. **Front-running vulnerabilities** - MEV opportunities
9. **Multi-vulnerability analysis** - Complex contract assessment
10. **Security comparison** - Contrasting vulnerable vs secure patterns

Each response includes:
- `query`: The analysis request
- `contractType`: Which fixture it applies to
- `response`: Detailed explanation
- `findings`: Array of structured vulnerability data with type, severity, location, description, and recommendations

## Usage in Tests

```typescript
import VulnerableToken from './fixtures/contracts/VulnerableToken.sol';
import SafeToken from './fixtures/contracts/SafeToken.sol';
import ComplexVault from './fixtures/contracts/ComplexVault.sol';
import llmResponses from './fixtures/llm-responses.json';

// Use contract source for analysis
const vulnerableSource = fs.readFileSync('./fixtures/contracts/VulnerableToken.sol', 'utf8');

// Use mock LLM responses for testing without API calls
const mockReentrancyResponse = llmResponses.find(r => r.findings[0].type === 'reentrancy');
```

## Notes

- All contracts are for testing purposes only and should never be deployed to production
- Vulnerabilities are intentional and documented for educational testing
- LLM responses are realistic mocks based on actual AI vulnerability analysis patterns
- Use these fixtures to test AI integration without making real API calls
