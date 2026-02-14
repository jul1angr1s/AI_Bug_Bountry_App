# Fix: Payment Workflow Demo and Instrumentation Removal

## Summary

Align payment workflow with the data model (Finding → Vulnerability → Payment), use on-chain protocol ID for BountyPool, add demo modes for off-chain validation and optional skip of on-chain payment, remove debug instrumentation, and add demo scripts.

## Problem

- Payment records were created with `vulnerabilityId` set to finding ID, causing foreign key errors (Payment references Vulnerability, not Finding).
- BountyPool.releaseBounty() was called with database UUID instead of bytes32 on-chain protocol ID, causing contract revert.
- On-chain validation check failed in demo when ValidationRegistry had no corresponding validation.
- Debug instrumentation (external ingest, internal record logging) was present across payment, validation, and agent code.

## Solution

- **ValidationService**: On trigger payment, create or find a Vulnerability record from the Finding (vulnerabilityHash = ethers.id(scanId:findingId)), then create Payment with vulnerabilityId = vulnerability.id. Use demo bounty amount (e.g. $0.50 for HIGH).
- **Payment worker**: Resolve on-chain protocol ID from Protocol.onChainProtocolId (or ethers.id(protocolId)); pass it to BountyPool.releaseBounty(). Support PAYMENT_OFFCHAIN_VALIDATION (skip on-chain validation check) and SKIP_ONCHAIN_PAYMENT (simulate payment completion without on-chain call).
- **Scripts**: Add `fund-bounty-pool.ts` and `force-validate-finding.ts` for demo.
- **Env**: Document PAYMENT_OFFCHAIN_VALIDATION and SKIP_ONCHAIN_PAYMENT in .env.example.
- **Cleanup**: Remove all agent-log instrumentation from payment.worker, validation.service, validator llm-worker, researcher submit step and worker.

## Outcome

- PR #72 merged to main.
- Payment workflow runs end-to-end in demo (with optional on-chain skip). No debug instrumentation or internal record logging in production paths.
