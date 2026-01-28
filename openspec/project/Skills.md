# Required Skills: Autonomous Bug Bounty Orchestrator

## Overview

This project requires specialized AI agent skills for both frontend development and smart contract security. We leverage two primary skill repositories:

| Domain | Source | Purpose |
|--------|--------|---------|
| Frontend | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | React/Next.js optimization, UI patterns |
| Security | [Trail of Bits Skills](https://github.com/trailofbits/skills) | Smart contract vulnerability analysis |

---

## Vercel Agent Skills (Frontend)

### Source
```
https://github.com/vercel-labs/agent-skills
```

### Required Skills

#### 1. react-best-practices

**Purpose**: React and Next.js optimization guidance with 40+ rules across 8 categories

**Usage Context**:
- Dashboard component development
- Real-time WebSocket updates
- Data fetching with TanStack Query
- Performance optimization for agent status displays

**Key Patterns to Apply**:
```
- Eliminate render waterfalls in dashboard components
- Optimize bundle size for blockchain libraries (viem, wagmi)
- Implement proper React Suspense boundaries for async data
- Use server components where appropriate
- Avoid prop drilling with Zustand stores
```

**When to Trigger**:
- Creating new React components
- Reviewing dashboard performance
- Implementing data fetching logic
- Optimizing bundle size

---

#### 2. web-design-guidelines

**Purpose**: UI code auditing tool with 100+ rules covering accessibility, forms, animations, and more

**Usage Context**:
- Protocol registration forms
- Bounty funding interfaces
- Vulnerability alert displays
- Agent status cards
- Payment history tables

**Key Categories**:
```
- Accessibility: Screen reader support for vulnerability alerts
- Focus States: Keyboard navigation for dashboard
- Forms: Protocol registration, bounty configuration
- Animations: Real-time scan progress indicators
- Typography: Vulnerability severity badges
- Dark Mode: System preference detection
- Touch Interactions: Mobile-responsive agent controls
```

**When to Trigger**:
- Building form components
- Creating interactive elements
- Implementing accessibility features
- Adding animations/transitions

---

#### 3. composition-patterns

**Purpose**: Architectural guidance for scaling React components

**Usage Context**:
- Reusable dashboard widgets
- Agent status card components
- Vulnerability list patterns
- Payment display components

**Key Patterns**:
```
- Compound Components: AgentCard with status, logs, controls
- Render Props: Flexible vulnerability display
- State Lifting: Shared dashboard state
- Context Composition: Web3 provider hierarchy
```

**When to Trigger**:
- Components exceeding 5 props
- Repeated UI patterns
- Complex nested state
- Component refactoring

---

#### 4. vercel-deploy-claimable

**Purpose**: Deployment automation for preview and production

**Usage Context**:
- Preview deployments for PR reviews
- Production deployment to Vercel
- Environment variable management

**When to Trigger**:
- Ready to deploy frontend
- Creating preview links for review
- Setting up CI/CD

---

## Trail of Bits Skills (Security)

### Source
```
https://github.com/trailofbits/skills
```

### Required Skills

#### 1. building-secure-contracts

**Purpose**: Smart contract security toolkit with vulnerability scanners for 6 blockchains

**Usage Context**:
- Writing BountyPool, ValidationRegistry, ProtocolRegistry contracts
- Implementing secure USDC transfers
- Access control patterns
- Reentrancy protection

**Security Patterns to Apply**:
```solidity
// Checks-Effects-Interactions Pattern
function releaseBounty(...) external {
    // 1. CHECKS
    require(!_paidValidations[validationId], "Already paid");
    require(pool.availableBalance >= amount, "Insufficient funds");

    // 2. EFFECTS
    _paidValidations[validationId] = true;
    pool.availableBalance -= amount;
    pool.totalPaidOut += amount;

    // 3. INTERACTIONS
    usdc.safeTransfer(researcher, amount);
}

// Use ReentrancyGuard
contract BountyPool is ReentrancyGuard {
    function releaseBounty(...) external nonReentrant { ... }
}

// Proper access control
bytes32 public constant PAYOUT_ROLE = keccak256("PAYOUT_ROLE");
function releaseBounty(...) external onlyRole(PAYOUT_ROLE) { ... }
```

**When to Trigger**:
- Writing any smart contract code
- Reviewing contract security
- Before deploying contracts

---

#### 2. entry-point-analyzer

**Purpose**: Identifies state-changing entry points in smart contracts for security auditing

**Usage Context**:
- Analyzing target protocols being scanned
- Understanding attack surface
- Mapping state mutations

**Entry Points for Our Contracts**:
```
ProtocolRegistry:
  - registerProtocol() [STATE CHANGE: adds protocol]
  - updateStatus() [STATE CHANGE: modifies status]
  - updateBountyTerms() [STATE CHANGE: modifies terms]

ValidationRegistry:
  - submitValidation() [STATE CHANGE: creates validation]
  - recordResult() [STATE CHANGE: updates result, triggers payment]

BountyPool:
  - depositBounty() [STATE CHANGE: adds funds]
  - releaseBounty() [STATE CHANGE: transfers funds]
  - withdrawBounty() [STATE CHANGE: removes funds]
```

**When to Trigger**:
- Analyzing contract attack surface
- Identifying privilege escalation paths
- Security review before deployment

---

#### 3. static-analysis

**Purpose**: Toolkit with CodeQL, Semgrep, and SARIF parsing capabilities

**Usage Context**:
- Researcher Agent scanning logic
- Automated vulnerability detection
- Pattern matching for known vulnerabilities

**Integration with Researcher Agent**:
```typescript
// MCP Tool for static analysis
const staticAnalysisTool = {
  name: 'run_static_analysis',
  description: 'Run Slither/Semgrep on target contract',
  parameters: {
    contractAddress: 'string',
    analysisType: ['slither', 'semgrep', 'mythril']
  },
  execute: async (params) => {
    // Fetch contract source from Basescan
    // Run selected analyzer
    // Parse SARIF output
    // Return vulnerability findings
  }
};
```

**When to Trigger**:
- Implementing Researcher Agent scan logic
- Processing vulnerability findings
- Building detection rules

---

#### 4. semgrep-rule-creator

**Purpose**: Creates and refines Semgrep rules for custom vulnerability detection

**Usage Context**:
- Custom vulnerability patterns
- Protocol-specific security rules
- False positive refinement

**Example Custom Rules**:
```yaml
# rules/solidity/reentrancy.yaml
rules:
  - id: reentrancy-external-call-before-state-update
    patterns:
      - pattern: |
          function $FUNC(...) {
            ...
            $ADDR.call{...}(...);
            ...
            $STATE = ...;
          }
      - pattern-not: |
          function $FUNC(...) nonReentrant {
            ...
          }
    message: "External call before state update - potential reentrancy"
    severity: ERROR
    languages: [solidity]

  - id: unchecked-usdc-transfer
    pattern: |
      usdc.transfer($TO, $AMOUNT)
    fix: |
      usdc.safeTransfer($TO, $AMOUNT)
    message: "Use safeTransfer for ERC-20 tokens"
    severity: WARNING
    languages: [solidity]
```

**When to Trigger**:
- Adding new vulnerability detection patterns
- Refining detection accuracy
- Reducing false positives

---

#### 5. spec-to-code-compliance

**Purpose**: Specification-to-code compliance checker for blockchain audits

**Usage Context**:
- Verifying contracts match specifications
- Ensuring bounty calculations are correct
- Validating access control implementation

**Compliance Checks**:
```
SPEC: "Critical vulnerabilities receive 10x base reward"
CODE: criticalMultiplier = 1000 // (1000/100 = 10x) ✓

SPEC: "Only validator agents can record results"
CODE: onlyRole(VALIDATOR_ROLE) ✓

SPEC: "Proofs cannot be submitted twice"
CODE: require(!_usedProofs[proofHash], "Proof already submitted") ✓
```

**When to Trigger**:
- Before deployment
- After specification changes
- During security reviews

---

#### 6. property-based-testing

**Purpose**: Property-based testing guidance for smart contracts

**Usage Context**:
- Foundry fuzzing tests
- Invariant testing
- Edge case discovery

**Property Tests for BountyPool**:
```solidity
// Invariant: Total deposited >= available + paid out
function invariant_balanceConsistency() public {
    PoolInfo memory info = bountyPool.getPoolInfo(protocolId);
    assertGe(
        info.totalDeposited,
        info.availableBalance + info.totalPaidOut
    );
}

// Invariant: No double payments
function invariant_noDoublePay() public {
    // Track all validation IDs
    // Assert each is paid at most once
}

// Fuzz: Random bounty amounts always work
function testFuzz_depositBounty(uint256 amount) public {
    amount = bound(amount, 1, type(uint128).max);
    // ... test deposit
}
```

**When to Trigger**:
- Writing Foundry tests
- Testing edge cases
- Ensuring invariants hold

---

## Skill Usage Matrix

| Phase | Vercel Skills | Trail of Bits Skills |
|-------|---------------|---------------------|
| **Planning** | composition-patterns | entry-point-analyzer |
| **Frontend Dev** | react-best-practices, web-design-guidelines | - |
| **Contract Dev** | - | building-secure-contracts |
| **Testing** | - | property-based-testing, static-analysis |
| **Security Review** | - | semgrep-rule-creator, spec-to-code-compliance |
| **Deployment** | vercel-deploy-claimable | - |

---

## Skill Integration with MCP Agents

### Researcher Agent Skills

```typescript
// MCP server for Researcher Agent
const researcherAgentSkills = {
  // Trail of Bits integration
  staticAnalysis: {
    tools: ['slither', 'mythril', 'semgrep'],
    customRules: './rules/solidity/',
    outputFormat: 'sarif'
  },

  // Vulnerability patterns
  detectionPatterns: [
    'reentrancy',
    'access-control',
    'integer-overflow',
    'oracle-manipulation',
    'flash-loan-attack'
  ],

  // Entry point analysis
  entryPointMapping: true,

  // Property violation detection
  invariantChecks: [
    'balance-consistency',
    'access-restrictions',
    'state-transitions'
  ]
};
```

### Dashboard Skills

```typescript
// Frontend skill configuration
const dashboardSkills = {
  // Vercel skills integration
  reactPatterns: {
    avoidWaterfalls: true,
    useSuspense: true,
    optimizeBundles: ['viem', 'wagmi']
  },

  // UI guidelines
  accessibility: {
    ariaLabels: true,
    keyboardNav: true,
    screenReaderAlerts: true  // For vulnerability notifications
  },

  // Component patterns
  composition: {
    useCompoundComponents: true,
    avoidPropDrilling: true,
    useContextComposition: true
  }
};
```

---

## Skill Activation Triggers

### Frontend Development

```
When creating React components:
→ Activate: react-best-practices

When building forms (registration, funding):
→ Activate: web-design-guidelines (forms, accessibility)

When component has > 5 props:
→ Activate: composition-patterns

When implementing animations (scan progress):
→ Activate: web-design-guidelines (animations)

When ready to deploy:
→ Activate: vercel-deploy-claimable
```

### Smart Contract Development

```
When writing any Solidity:
→ Activate: building-secure-contracts

When analyzing target contracts:
→ Activate: entry-point-analyzer, static-analysis

When adding detection patterns:
→ Activate: semgrep-rule-creator

When writing tests:
→ Activate: property-based-testing

Before deployment:
→ Activate: spec-to-code-compliance
```

---

## Skill Installation

### Vercel Agent Skills

```bash
# Clone skills repository
git clone https://github.com/vercel-labs/agent-skills.git ~/.claude/skills/vercel

# Or use Claude Code skill system
# Skills auto-activate based on context
```

### Trail of Bits Skills

```bash
# Clone skills repository
git clone https://github.com/trailofbits/skills.git ~/.claude/skills/tob

# Install required security tools
pip install slither-analyzer
pip install mythril
pip install semgrep

# Configure for Foundry integration
forge install trailofbits/properties
```

---

## Skill Documentation Links

### Vercel Skills
- [react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/react-best-practices)
- [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/web-design-guidelines)
- [composition-patterns](https://github.com/vercel-labs/agent-skills/tree/main/composition-patterns)
- [vercel-deploy-claimable](https://github.com/vercel-labs/agent-skills/tree/main/vercel-deploy-claimable)

### Trail of Bits Skills
- [building-secure-contracts](https://github.com/trailofbits/skills/tree/main/building-secure-contracts)
- [entry-point-analyzer](https://github.com/trailofbits/skills/tree/main/entry-point-analyzer)
- [static-analysis](https://github.com/trailofbits/skills/tree/main/static-analysis)
- [semgrep-rule-creator](https://github.com/trailofbits/skills/tree/main/semgrep-rule-creator)
- [property-based-testing](https://github.com/trailofbits/skills/tree/main/property-based-testing)
