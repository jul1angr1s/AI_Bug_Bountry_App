## Why

Users are unable to register protocols after successfully signing in with SIWE (Sign-In with Ethereum). The frontend creates an anonymous Supabase session during SIWE authentication, but the backend's `authenticate` middleware rejects these tokens with "Invalid or expired token" errors (401). This blocks the core protocol registration workflow documented in `docs/DEMONSTRATION.md`. The current implementation stores SIWE signatures in user metadata but never verifies them server-side, creating both a broken authentication flow and a security vulnerability where anyone could create sessions with fake wallet addresses.

## What Changes

- **NEW**: Backend SIWE verification endpoint (`POST /api/v1/auth/siwe`) that cryptographically verifies wallet signatures using ethers.js `verifyMessage()`
- **NEW**: Supabase user creation/lookup logic based on verified wallet addresses (email format: `{wallet}@wallet.local`)
- **NEW**: Comprehensive test suite for SIWE signature verification edge cases
- **MODIFIED**: Frontend auth flow (`frontend/src/lib/auth.tsx`) to call backend verification instead of `signInAnonymously()`
- **MODIFIED**: Session token flow - backend generates magic link tokens that are validated by existing `authenticate` middleware
- **REMOVED**: Anonymous authentication workaround (replaced with proper SIWE verification)
- **SECURITY FIX**: Server-side cryptographic verification of wallet ownership (prevents impersonation)

## Capabilities

### New Capabilities
- `siwe-backend-verification`: Server-side Sign-In with Ethereum (SIWE) signature verification endpoint that validates wallet ownership cryptographically, creates/updates Supabase users, and issues session tokens

### Modified Capabilities
<!-- No existing specs are being modified - this is net new authentication capability -->

## Impact

### Backend
- **New Route**: `backend/src/routes/auth.routes.ts` - SIWE verification endpoint with Zod validation
- **Modified**: `backend/src/server.ts` - Mount `/api/v1/auth` routes
- **Existing Middleware**: `backend/src/middleware/auth.ts` - No changes needed (already validates Supabase tokens)
- **New Tests**: `backend/src/routes/__tests__/auth.routes.test.ts` - Comprehensive SIWE test suite

### Frontend
- **Modified**: `frontend/src/lib/auth.tsx` - Replace `signInAnonymously()` with backend `/auth/siwe` call
- **Modified**: Session flow - Use `setSession()` with backend-issued token instead of anonymous session
- **No Changes**: API client (`frontend/src/lib/api.ts`) - Already sends tokens in Authorization header
- **No Changes**: Cookie sync (`frontend/src/lib/auth-cookies.ts`) - Continues to work for SSE auth

### Dependencies
- **Existing**: `ethers` (already in backend/package.json) - For `verifyMessage()` function
- **Existing**: `zod` (already in backend/package.json) - For request schema validation
- **Existing**: `@supabase/supabase-js` (already in backend) - For admin user operations

### Database
- **Supabase Users**: New users created with `{wallet}@wallet.local` email format and `wallet_address` in user_metadata
- **No Prisma Changes**: Uses Supabase auth.users table (managed by Supabase)

### Security Considerations
- **Authentication Upgrade**: From unauthenticated anonymous sessions to cryptographic signature verification
- **Wallet Ownership Proof**: Ethers.js `verifyMessage()` ensures only wallet owner can create session
- **No Token Expiry Changes**: Uses Supabase magic link tokens with standard expiry (existing behavior)
- **User Uniqueness**: Wallet addresses mapped to unique Supabase user IDs (prevents duplicate accounts)
- **Signature Replay Protection**: Each SIWE message includes timestamp and nonce (frontend responsibility)

### Affected Workflows
- ✅ **Protocol Registration** (docs/DEMONSTRATION.md) - Currently broken, will be fixed
- ✅ **SIWE Sign-In** - Upgraded from anonymous to verified authentication
- ⚠️ **Existing Sessions** - Users with anonymous sessions will need to re-authenticate
- ✅ **SSE Connections** - No impact (uses separate `sseAuthenticate` middleware with cookies)

### Breaking Changes
- **BREAKING**: Anonymous Supabase sessions created before this change will no longer authenticate (users must re-sign with SIWE)
- **Non-Breaking**: Existing `authenticate` middleware unchanged (validates tokens the same way)
- **Non-Breaking**: SSE authentication unchanged (separate middleware, cookie-based)

### Chain Impact
- **None**: This is pure authentication infrastructure - no blockchain interactions affected
- **Indirect**: Enables protocol registration which triggers on-chain registration (if `SKIP_ONCHAIN_REGISTRATION=false`)
