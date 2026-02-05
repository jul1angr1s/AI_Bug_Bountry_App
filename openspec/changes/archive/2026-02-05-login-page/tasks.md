# Tasks: Login Page Implementation

## 1. Project Setup

### 1.1 Create OpenSpec Documentation
- [x] Create `/openspec/changes/2026-02-05-login-page/` directory
- [x] Write `.openspec.yaml` metadata file
- [x] Write `proposal.md` with problem/solution/outcome
- [x] Write `design.md` with technical decisions and architecture
- [x] Write `tasks.md` (this file)

**Files:** `openspec/changes/2026-02-05-login-page/*`
**Refs:** `openspec/config.yaml` (documentation standards)

### 1.2 Git Workflow Setup
- [ ] Ensure clean state on main branch
- [ ] Pull latest changes from remote
- [ ] Create feature branch `feature/login-page`
- [ ] Verify frontend builds and runs

**Commands:**
```bash
git checkout main
git pull origin main
git checkout -b feature/login-page
cd frontend && npm install && npm run dev
```

## 2. Wagmi Configuration

### 2.1 Create Wagmi Config File
- [ ] Create `/frontend/src/lib/wagmi.ts`
- [ ] Import wagmi dependencies (createConfig, http, chains, connectors)
- [ ] Configure Base Sepolia chain (84532)
- [ ] Add connectors: injected (MetaMask), walletConnect, coinbaseWallet
- [ ] Set up HTTP transport
- [ ] Export config for WagmiProvider

**Files:** `frontend/src/lib/wagmi.ts`
**Refs:** `openspec/specs/frontend.md` (Web3 stack: Viem 2.x, Wagmi 2.x)

### 2.2 Check Dependencies
- [ ] Run `npm list @wagmi/connectors` to verify installation
- [ ] If missing, run `npm install @wagmi/connectors`
- [ ] Verify `wagmi` package is v2.x or v3.x

**Files:** `frontend/package.json`

### 2.3 Integrate WagmiProvider
- [ ] Open `/frontend/src/main.tsx`
- [ ] Import WagmiProvider and wagmi config
- [ ] Add WagmiProvider ABOVE BrowserRouter
- [ ] Position BELOW QueryClientProvider
- [ ] Verify provider hierarchy: QueryClientProvider > WagmiProvider > BrowserRouter > AuthProvider > App

**Files:** `frontend/src/main.tsx`
**Refs:** `design.md` (Provider Hierarchy section)

### 2.4 Test Wagmi Integration
- [ ] Start dev server (`npm run dev`)
- [ ] Navigate to `/protocols/:id/payments` (if accessible)
- [ ] Verify BountyPoolStatus renders without provider errors
- [ ] Check console for wagmi-related errors
- [ ] Verify payment components use wagmi hooks successfully

### 2.5 Commit Wagmi Configuration
- [ ] Stage changes: `git add frontend/src/lib/wagmi.ts frontend/src/main.tsx frontend/package*.json`
- [ ] Commit with message:
```
feat(frontend): add wagmi provider configuration for wallet UI

- Configure Base Sepolia chain (84532)
- Add MetaMask, WalletConnect, Coinbase connectors
- Integrate WagmiProvider into component tree
- Enables payment components to access wallet context

Refs: openspec/changes/2026-02-05-login-page
```

## 3. Login Page Component

### 3.1 Create Login Page File
- [ ] Create `/frontend/src/pages/Login.tsx`
- [ ] Add imports: React, useAuth, useNavigate, useLocation, lucide-react, sonner
- [ ] Set up component state: connecting, error
- [ ] Extract returnUrl from query params

**Files:** `frontend/src/pages/Login.tsx`
**Refs:** `design.md` (Login Page Design section)

### 3.2 Implement Authentication Logic
- [ ] Use `useAuth()` hook to access user, loading, signIn
- [ ] Create `handleConnect` async function
- [ ] Call `signIn()` from AuthProvider (no changes to auth logic)
- [ ] Handle errors by type: user rejection, no wallet, network error
- [ ] Show toast notification on success
- [ ] Navigate to returnUrl after successful auth

### 3.3 Implement Auto-Redirect Logic
- [ ] Add useEffect to check if user is already authenticated
- [ ] If user exists and not loading, redirect to returnUrl
- [ ] Use `replace: true` to avoid back button issues

### 3.4 Create Login UI
- [ ] Gradient background: `linear-gradient(135deg, #0A0E1A 0%, #0F1421 50%, #1a1f2e 100%)`
- [ ] Centered card: `max-w-md`, `bg-[#1a1f2e]`, `border-gray-800`, `rounded-lg`, `p-12`
- [ ] Thunder Security branding with logo/text
- [ ] Subtitle: "Connect your wallet to continue"
- [ ] "Connect Wallet" button with gradient: `from-blue-500 to-blue-600`
- [ ] Wallet icon from lucide-react
- [ ] Loading state: Loader2 with `animate-spin` + "Connecting..." text
- [ ] Error state: Red text with error message + "Try Again" button

**Refs:** `design.md` (Visual Specifications), `frontend/tailwind.config.js` (colors)

### 3.5 Test Login Page
- [ ] Start dev server and navigate to `/login` (manually type URL)
- [ ] Verify Thunder Security branding displays
- [ ] Verify gradient background renders
- [ ] Click "Connect Wallet" button
- [ ] Verify loading state shows
- [ ] Test error handling: reject connection, reject signature
- [ ] Verify error messages display correctly
- [ ] Verify "Try Again" button works

### 3.6 Commit Login Page
- [ ] Stage changes: `git add frontend/src/pages/Login.tsx`
- [ ] Commit with message:
```
feat(frontend): create dedicated login page with SIWE auth

- Thunder Security branded login interface
- Wallet connection flow using existing AuthProvider
- ReturnUrl redirect after authentication
- Comprehensive error handling (no wallet, rejection, network)
- Loading and success states

Refs: openspec/changes/2026-02-05-login-page
```

## 4. Protected Route Enhancement

### 4.1 Update ProtectedRoute Component
- [ ] Open `/frontend/src/components/ProtectedRoute.tsx`
- [ ] Import useLocation from react-router-dom
- [ ] Capture full path: `location.pathname + location.search`
- [ ] URL-encode returnUrl: `encodeURIComponent(returnUrl)`
- [ ] Construct redirect: `/login?returnUrl=${encodedUrl}`
- [ ] Improve loading state UI: add Loader2 icon and "Authenticating..." text

**Files:** `frontend/src/components/ProtectedRoute.tsx`
**Refs:** `design.md` (ReturnUrl Implementation section)

### 4.2 Test ReturnUrl Preservation
- [ ] Log out (disconnect wallet in MetaMask)
- [ ] Try to access `/protocols` → redirect to `/login?returnUrl=/protocols`
- [ ] Try to access `/scans?tab=recent` → verify query params preserved
- [ ] Check URL encoding handles special characters

### 4.3 Commit ProtectedRoute Changes
- [ ] Stage changes: `git add frontend/src/components/ProtectedRoute.tsx`
- [ ] Commit with message:
```
feat(frontend): preserve returnUrl in protected route redirects

- Capture full path + query params for post-auth redirect
- URL-encode returnUrl to handle special characters
- Improve loading state UI with icon and message

Refs: openspec/changes/2026-02-05-login-page
```

## 5. Routing Configuration

### 5.1 Update App.tsx Imports
- [ ] Open `/frontend/src/App.tsx`
- [ ] Add import for Login page: `import Login from './pages/Login'`
- [ ] Add import for Outlet: `import { Routes, Route, Navigate, Outlet } from 'react-router-dom'`

**Files:** `frontend/src/App.tsx`

### 5.2 Restructure Routes
- [ ] Create public `/login` route without DashboardLayout
- [ ] Create parent protected route with ProtectedRoute + DashboardLayout + Outlet
- [ ] Nest all protected routes under parent: `/`, `/protocols`, `/protocols/register`, `/protocols/:id`, `/scans`, `/scans/:id`, `/validations`, `/protocols/:id/payments`
- [ ] Remove individual ProtectedRoute wrapper from `/protocols/:id/payments`
- [ ] Keep redirect routes: `/payments` → `/protocols`, `*` → `/`

**Refs:** `design.md` (Route Protection Strategy section)

### 5.3 Test Route Protection
- [ ] Ensure logged out state (disconnect wallet)
- [ ] Visit `/` → redirect to `/login?returnUrl=/`
- [ ] Visit `/protocols` → redirect to `/login?returnUrl=/protocols`
- [ ] Visit `/scans` → redirect
- [ ] Visit `/validations` → redirect
- [ ] Visit `/protocols/:id/payments` → redirect
- [ ] Login successfully
- [ ] Verify all routes now accessible
- [ ] Verify sidebar shows on all protected routes
- [ ] Verify `/login` page has NO sidebar

### 5.4 Commit Routing Changes
- [ ] Stage changes: `git add frontend/src/App.tsx`
- [ ] Commit with message:
```
feat(frontend): protect all routes and isolate login page

- Separate /login route without DashboardLayout
- Nest all protected routes under ProtectedRoute + Layout
- Use Outlet pattern for cleaner nested route structure
- Remove redundant ProtectedRoute from individual routes

Refs: openspec/changes/2026-02-05-login-page
```

## 6. Comprehensive Manual Testing

### 6.1 Route Protection Tests
- [ ] Test unauthenticated access to `/` → `/login?returnUrl=/`
- [ ] Test unauthenticated access to `/protocols` → `/login?returnUrl=/protocols`
- [ ] Test unauthenticated access to `/scans` → redirect
- [ ] Test unauthenticated access to `/validations` → redirect
- [ ] Test unauthenticated access to `/protocols/:id/payments` → redirect
- [ ] Verify returnUrl preserved in all cases

### 6.2 Login Flow Tests
- [ ] Login page renders with Thunder Security branding
- [ ] Click "Connect Wallet" → MetaMask opens
- [ ] Approve connection → SIWE message signing prompt
- [ ] Sign message → Authentication succeeds
- [ ] Redirect to returnUrl or dashboard
- [ ] Toast notification shows "Successfully authenticated"

### 6.3 Error Handling Tests
- [ ] Test with MetaMask not installed → "No Web3 wallet" error
- [ ] Reject wallet connection → "Connection rejected" error + retry button
- [ ] Reject signature → "Authentication cancelled" error + retry button
- [ ] Click retry button → reattempt authentication

### 6.4 Edge Case Tests
- [ ] Already authenticated user visits `/login` → auto-redirect to dashboard
- [ ] Change MetaMask account during session → auto logout → redirect to `/login`
- [ ] Disconnect wallet in MetaMask → auto logout → redirect to `/login`
- [ ] ReturnUrl with special characters → properly encoded/decoded
- [ ] ReturnUrl with query params → preserved after login

### 6.5 Payment Component Regression Tests
- [ ] Login and navigate to `/protocols/:id/payments`
- [ ] Verify BountyPoolStatus renders without errors
- [ ] Verify USDCApprovalFlow wagmi hooks work
- [ ] Verify EarningsLeaderboard displays correctly
- [ ] Check console for wagmi provider errors (should be none)

### 6.6 Browser Compatibility Tests
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Verify mobile responsive (320px - 1920px)

### 6.7 Document Test Results
- [ ] Create checklist in this file with results
- [ ] Note any issues discovered
- [ ] Verify all tests pass before creating PR

## 7. Documentation Updates

### 7.1 Update Frontend README
- [ ] Open `/frontend/README.md`
- [ ] Add section: "Authentication Flow"
- [ ] Document wagmi configuration
- [ ] Explain login flow with returnUrl redirect
- [ ] Update "Getting Started" with login instructions

**Files:** `frontend/README.md`

### 7.2 Update Frontend Spec
- [ ] Open `/openspec/specs/frontend.md`
- [ ] Add Login page to component inventory
- [ ] Document route protection strategy
- [ ] Update authentication section with login page reference

**Files:** `openspec/specs/frontend.md`

### 7.3 Commit Documentation
- [ ] Stage changes: `git add frontend/README.md openspec/specs/frontend.md`
- [ ] Commit with message:
```
docs(frontend): document login page and wagmi configuration

- Add login flow to frontend README
- Update authentication section in specs
- Document route protection strategy

Refs: openspec/changes/2026-02-05-login-page
```

## 8. Pull Request

### 8.1 Push Feature Branch
- [ ] Verify all commits are clean
- [ ] Review git log for commit messages
- [ ] Push branch: `git push -u origin feature/login-page`

### 8.2 Create PR
- [ ] Run `gh pr create` with comprehensive description
- [ ] Include summary of changes
- [ ] List what changed (bullets)
- [ ] Explain authentication flow
- [ ] Reference testing checklist
- [ ] Note security considerations
- [ ] Link to OpenSpec change documentation
- [ ] Add Co-Authored-By: Claude Sonnet 4.5

**PR Title:** "Add dedicated login page with route protection"

**PR Body Template:**
```markdown
## Summary

Adds a dedicated login page to the AI Bug Bounty Platform with comprehensive route protection.

### What Changed
- ✅ Created /login route with Thunder Security branded UI
- ✅ Protected all application routes
- ✅ Configured Wagmi provider for wallet UI
- ✅ Implemented returnUrl redirect flow

### Authentication Flow
Unauthenticated user → /login → MetaMask → SIWE → Redirect to original destination

### Testing
- Manual testing completed (checklist in openspec/changes/2026-02-05-login-page/tasks.md)
- All routes protected
- Payment components work with wagmi provider
- Error handling comprehensive

### Security
- No changes to SIWE authentication
- ReturnUrl validated to prevent open redirects
- Session handling unchanged

### OpenSpec Change
See: openspec/changes/2026-02-05-login-page/

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 8.3 PR Review and Merge
- [ ] Request review from team
- [ ] Address review comments
- [ ] Ensure CI/CD passes
- [ ] Merge to main after approval

## 9. Post-Merge Cleanup

### 9.1 Update Local Main Branch
- [ ] Checkout main: `git checkout main`
- [ ] Pull latest: `git pull origin main`
- [ ] Verify changes merged correctly

### 9.2 Archive OpenSpec Change
- [ ] Move directory to archive: `mv openspec/changes/2026-02-05-login-page openspec/changes/archive/`
- [ ] Update `.openspec.yaml`: set `status: completed`, `completed: 2026-02-05`
- [ ] Commit: `git add openspec/changes/archive/2026-02-05-login-page`
- [ ] Message: "docs: archive login page implementation change"
- [ ] Push: `git push origin main`

### 9.3 Delete Feature Branch
- [ ] Delete local branch: `git branch -d feature/login-page`
- [ ] Delete remote branch: `git push origin --delete feature/login-page`

## 10. Verification Checklist

**Post-implementation verification:**
- [ ] All routes except /login require authentication
- [ ] Login page renders beautifully with Thunder Security branding
- [ ] Wallet connection flow works (MetaMask)
- [ ] SIWE signing completes successfully
- [ ] Post-auth redirect to intended page works
- [ ] Error states display with actionable messages
- [ ] Account change triggers logout
- [ ] Wallet disconnect triggers logout
- [ ] Payment components work without provider errors
- [ ] No console errors or warnings
- [ ] Mobile responsive (320px - 1920px)
- [ ] Browser compatibility: Chrome, Firefox, Safari

## Success Criteria

✅ **Security:** All routes protected, only authenticated users can access dashboard
✅ **UX:** Seamless login flow with clear feedback and error handling
✅ **Technical:** Wagmi properly configured, payment components enhanced
✅ **Code Quality:** TypeScript strict mode, consistent with codebase patterns
✅ **Documentation:** OpenSpec change complete, README updated
✅ **GitOps:** Feature branch, PR review, merge to main, change archived
