# Funding Gate Implementation Tasks

## Phase 1: Database & Backend Core

- [x] 1. Add Prisma migration for funding fields
- [x] 2. Implement funding.service.ts
- [x] 3. Add WebSocket events for funding state changes
- [x] 4. Modify protocol worker to remove auto-scan and set AWAITING_FUNDING

## Phase 2: API Routes

- [x] 5. Create funding.routes.ts with verify-funding, request-scan, record-funding, funding-status
- [x] 6. Register routes in server.ts
- [x] 7. Update protocol schema to accept bountyPoolAmount

## Phase 3: Frontend Components

- [x] 8. Add API functions to frontend api.ts
- [x] 9. Implement FundingGate.tsx (3-step wizard: approve, fund, verify)
- [x] 10. Implement ScanConfirmationModal.tsx
- [x] 11. Update ProtocolForm.tsx with bountyPoolAmount field
- [x] 12. Update ProtocolDetail.tsx to integrate FundingGate and ScanConfirmationModal
- [x] 13. Update useProtocol hook for funding state WebSocket events

## Phase 4: End-to-End (Manual Testing)

- [ ] 14. Test: Register protocol with bounty pool amount
- [ ] 15. Test: Approve USDC for BountyPool
- [ ] 16. Test: Deposit USDC via depositBounty()
- [ ] 17. Test: Verify funding on-chain
- [ ] 18. Test: Request scan via confirmation modal
- [ ] 19. Test error cases (insufficient balance, rejected tx, modal cancel)

## Critical Files to Modify

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add 5 new Protocol fields |
| `backend/src/agents/protocol/worker.ts` | Remove Step 7 auto-scan, set AWAITING_FUNDING |
| `backend/src/services/funding.service.ts` | New file |
| `backend/src/routes/funding.routes.ts` | New file |
| `frontend/src/components/protocols/ProtocolForm.tsx` | Add bountyPoolAmount field |
| `frontend/src/components/protocols/FundingGate.tsx` | New file |
| `frontend/src/components/protocols/ScanConfirmationModal.tsx` | New file |
| `frontend/src/pages/ProtocolDetail.tsx` | Integrate FundingGate + modal |
| `frontend/src/lib/api.ts` | Add verifyProtocolFunding, requestProtocolScan |
