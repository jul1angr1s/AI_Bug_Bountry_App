# SIWE Backend Verification Implementation - Tasks Checklist

## 1. Backend Setup & Tests

- [x] 1.1 Create backend/src/routes/auth.routes.ts with SIWE verification endpoint implementing POST /auth/siwe with ethers.js signature verification, Zod validation, Supabase user creation/lookup, and magic link token generation per specs/siwe-backend-verification/spec.md and design.md
- [x] 1.2 Create backend/src/routes/__tests__/auth.routes.test.ts with comprehensive test suite covering valid/invalid signatures, new user creation with {wallet}@wallet.local, existing user re-authentication, mismatched wallets, missing fields, and Supabase errors (6+ test cases minimum)
- [x] 1.3 Update backend/src/server.ts to import and mount auth routes at /api/v1/auth before other middleware to ensure proper request handling
- [x] 1.4 Run backend tests with `npm test backend/src/routes/__tests__/auth.routes.test.ts` to verify all 6+ SIWE scenarios pass including error paths and edge cases

## 2. Frontend Authentication Updates

- [x] 2.1 Update frontend/src/lib/auth.tsx SIWE sign-in flow replacing signInAnonymously() call (lines 137-146) with POST to {API_BASE_URL}/api/v1/auth/siwe, destructure access_token from response, call supabase.auth.setSession(), and update logging per design.md magic link token decision
- [x] 2.2 Verify frontend/src/lib/auth-cookies.ts continues unchanged by confirming syncAuthCookie() still called post sign-in and cookie is set correctly in browser DevTools
- [x] 2.3 Verify frontend/src/lib/api.ts continues unchanged by confirming Authorization header with Bearer token is still sent and existing authenticate middleware validates session tokens

## 3. Manual Testing

- [ ] 3.1 Manual E2E test: Protocol registration with fresh wallet by signing in, connecting wallet, signing SIWE message, verifying backend logs show "SIWE signature verified for wallet: 0x...", registering protocol, confirming 201 response, and checking database for protocol with correct wallet_address
- [ ] 3.2 Manual E2E test: Session persistence and re-authentication by closing/reopening browser to verify localStorage persistence, signing out and back in with same wallet, confirming same Supabase user ID (no duplicates), and verifying database shows single user entry

## 4. Integration Testing

- [x] 4.1 Update/verify backend integration tests (backend/src/__tests__/integration/sse-protocol-progress.test.ts) replacing signInAnonymously() with /auth/siwe endpoint if needed, then run `npm test backend/src/__tests__/integration/` and confirm all tests pass
- [x] 4.2 Run full backend test suite with `npm test backend/src/` to ensure no regressions in middleware tests (sse-auth.test.ts, etc.), new auth tests pass, and no connection/auth breakage detected

## 5. Documentation & Verification

- [ ] 5.1 Document changes in git commit by creating feature branch fix-siwe-auth-server-verification from main and committing with message explaining: why (token validation failures blocked registration), what (server-side SIWE verification via /auth/siwe), how (ethers.js verifyMessage, Supabase user creation, magic link tokens) per proposal.md and design.md
- [ ] 5.2 Final verification: Protocol registration end-to-end by following docs/DEMONSTRATION.md, confirming no 401 errors, successful SIWE verification logs, protocol created with correct wallet address in database, and scan job created and visible in UI
