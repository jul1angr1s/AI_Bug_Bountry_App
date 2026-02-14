# Tasks

## PR 1: useSmartAccountBatching Hook (feat/eip7702-hook)
- [x] Write failing tests for hook behavior
- [x] Implement useSmartAccountBatching hook
- [x] Verify all tests pass

## PR 2: OpenSpec Documentation (feat/eip7702-openspec)
- [x] Create .openspec.yaml
- [x] Write proposal.md
- [x] Write design.md
- [x] Write tasks.md
- [x] Write GIVEN-WHEN-THEN spec

## PR 3: PaymentRequiredModal Integration (feat/eip7702-payment-modal)
- [x] Write failing tests for batching integration
- [x] Modify PaymentRequiredModal to use hook
- [x] Verify all tests pass (including existing ones)

## Manual Verification
- [ ] Test with MetaMask 7702-delegated wallet on Base Sepolia
- [ ] Test with non-delegated wallet (fallback path)
- [ ] Test with existing USDC allowance (direct pay)
