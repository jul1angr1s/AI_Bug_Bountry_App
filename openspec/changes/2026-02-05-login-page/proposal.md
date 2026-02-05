# Proposal: Dedicated Login Page with Route Protection

## Summary

Add a dedicated login page to the AI Bug Bounty Platform and protect all application routes to ensure only authenticated users can access the dashboard, protocols, scans, validations, and payment features.

## Problem

**Current State:**
- All routes except `/protocols/:id/payments` are publicly accessible
- No dedicated login page exists (ProtectedRoute redirects to non-existent `/login`)
- Wagmi is installed but not configured as a provider
- Payment components use wagmi hooks via fallback to window.ethereum (not best practice)

**Security Issues:**
- Dashboard, protocols, scans, and validations pages accessible without authentication
- No entry point for users to authenticate
- Broken user flow when unauthenticated users try to access protected content

**User Experience Issues:**
- No clear authentication entry point
- Confusing redirect behavior
- No returnUrl preservation after login

## Solution

**1. Create Dedicated Login Page (`/login`)**
- Thunder Security branded interface
- MetaMask wallet connection flow
- Uses existing SIWE + Supabase authentication (no changes to AuthProvider)
- ReturnUrl redirect after successful authentication
- Comprehensive error handling (no wallet, rejection, network errors)

**2. Protect All Routes**
- Restructure routing to protect dashboard, protocols, scans, validations, payments
- Keep login page public and isolated from DashboardLayout
- Use nested route pattern with `<Outlet />` for cleaner code

**3. Configure Wagmi Provider**
- Proper provider setup for Base Sepolia chain
- Configure MetaMask, WalletConnect, Coinbase connectors
- Integrate into component hierarchy above BrowserRouter
- Enables payment components to use wagmi hooks properly

**4. Enhance ProtectedRoute Component**
- Preserve returnUrl with full path and query params
- URL-encode special characters
- Improve loading state UI

## Outcome

**Security:**
- All application routes protected
- Only authenticated users can access dashboard features
- Consistent authentication enforcement

**User Experience:**
- Clear authentication entry point with beautiful UI
- Seamless post-login redirect to intended destination
- Comprehensive error feedback
- Professional loading states

**Technical Quality:**
- Wagmi properly configured for wallet interactions
- Payment components follow best practices
- TypeScript strict mode compliance
- Consistent with existing codebase patterns

**Maintainability:**
- Clean nested route structure
- Reusable authentication patterns
- Comprehensive documentation
- OpenSpec change tracking
