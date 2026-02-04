# Tasks - Fix Payment Workflow Demo

## Validation & Payment Data Model

- [x] Create/find Vulnerability from Finding in ValidationService.triggerPayment
- [x] Create Payment with vulnerabilityId = vulnerability.id (not finding.id)
- [x] Use demo bounty amount (e.g. $0.50 for HIGH) in calculateBountyAmount

## Payment Worker

- [x] Resolve on-chain protocol ID (Protocol.onChainProtocolId or ethers.id(protocolId))
- [x] Pass on-chain protocol ID to BountyPool.releaseBounty()
- [x] Support PAYMENT_OFFCHAIN_VALIDATION (skip on-chain validation check)
- [x] Support SKIP_ONCHAIN_PAYMENT (simulate completion without on-chain call)
- [x] Remove debug instrumentation from payment.worker.ts

## Cleanup

- [x] Remove instrumentation from validation.service.ts
- [x] Remove instrumentation from validator llm-worker.ts
- [x] Remove instrumentation from researcher submit.ts and worker.ts

## Demo Tooling

- [x] Add script fund-bounty-pool.ts (approve USDC, deposit to BountyPool for protocol)
- [x] Add script force-validate-finding.ts (validate a finding and trigger payment for demo)
- [x] Document PAYMENT_OFFCHAIN_VALIDATION and SKIP_ONCHAIN_PAYMENT in .env.example

## Archive

- [x] OpenSpec change documented and archived (2026-02-04-fix-payment-workflow-demo)
- [x] Main specs updated (workflows) with payment demo requirements

## PR

- [x] Merge to main (PR #72)
