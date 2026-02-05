# Funding Gate: Protocol Registration → Funding → Scanning

## Problem Statement

When BountyPool is not funded, payments fail after the Validator Agent validates vulnerabilities. Currently, scans auto-start after protocol registration without ensuring funds are available, leading to:

1. **Payment failures**: Validator finds vulnerabilities but cannot pay researchers
2. **Poor user experience**: Protocol owners don't realize they need to fund the pool
3. **Wasted compute**: Scans run even when no bounty can be paid

## Proposed Solution

Add a "funding gate" between protocol registration and scanning:

1. Add `bountyPoolAmount` field to registration form
2. After registration completes → set state to `AWAITING_FUNDING` (no auto-scan)
3. Show "Fund Protocol" button → MetaMask → `depositBounty()` on BountyPool contract
4. Add "Verify Funding" button → checks on-chain balance
5. Only enable "Request Researchers Scanning" after funding verified

## Benefits

- **No more payment failures**: Scans only start when funds exist
- **Clear user flow**: Protocol owners understand the funding requirement
- **On-chain verification**: Funding state verified directly from blockchain

## Success Criteria

- [ ] Protocol registration no longer auto-triggers scans
- [ ] Frontend shows FundingGate component for unfunded protocols
- [ ] depositBounty() transaction can be signed via MetaMask
- [ ] On-chain balance verification works correctly
- [ ] Scan request is gated behind funding verification
