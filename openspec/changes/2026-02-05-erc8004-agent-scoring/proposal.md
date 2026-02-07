# Proposal: ERC-8004 Agent Identity & Reputation Scoring

## Summary

Implement ERC-8004 compliant agent identity and reputation scoring to enable transparent qualification of researcher agents by validator agents based on vulnerability submission accuracy.

## Problem

Currently the platform lacks:
1. **Agent Identity**: No portable, censorship-resistant identifiers for researchers/validators
2. **Reputation Scoring**: No mechanism for validators to qualify researchers based on submission accuracy
3. **Trust Discovery**: No way for protocols to assess researcher reliability before engaging

Without reputation scoring, protocols cannot make informed decisions about which researchers to trust, and researchers have no incentive to maintain high-quality submissions.

## Solution

Implement two new contracts that integrate with existing ValidationRegistry:

### 1. AgentIdentityRegistry.sol (ERC-721)
- Mint NFT identity for each agent (RESEARCHER or VALIDATOR type)
- Portable identifiers per ERC-8004 specification
- Integrates with Coinbase Bazaar for agent discovery

### 2. AgentReputationRegistry.sol
- Reads validation outcomes from existing ValidationRegistry (0x8fBE5E9B...)
- Computes aggregate scores: `score = (confirmed * 100) / total`
- Hybrid storage: aggregate on-chain, detailed history in database

### Backend Services
- **AgentService.ts**: Agent registration, NFT minting
- **ReputationService.ts**: Score computation, caching, sync

### Scoring Formula
```
Researcher submits 3 findings:
- Finding 1: CONFIRMED (HIGH) → +1 confirmed
- Finding 2: REJECTED → +1 rejected  
- Finding 3: CONFIRMED (CRITICAL) → +1 confirmed

Score = (2 confirmed * 100) / 3 total = 66%
```

## Affected Components

| Layer | Component | Change |
|-------|-----------|--------|
| Contracts | AgentIdentityRegistry.sol | NEW |
| Contracts | AgentReputationRegistry.sol | NEW |
| Backend | AgentService.ts | NEW |
| Backend | ReputationService.ts | NEW |
| Backend | Prisma schema | ADD Agent model |
| Frontend | Agent profiles | NEW |
| Frontend | Leaderboard | NEW |

## Security Considerations

- AgentIdentityRegistry uses OpenZeppelin ERC-721 (audited)
- Only registered validators can submit validation outcomes
- Reputation scores are read-only aggregations (no manipulation)
- NFT identity is non-transferable (soulbound option available)

## Dependencies

- Existing ValidationRegistry (0x8fBE5E9B0C17Cb606091e5050529CE99baB7744d)
- OpenZeppelin Contracts v5.0.0 (already installed)
- @coinbase/x402-sdk (for Bazaar integration)

## Outcome

- Researchers have portable ERC-721 identities
- Validators can rate researchers based on submission accuracy
- Protocols can filter researchers by reputation score
- Transparent, on-chain qualification system per ERC-8004
