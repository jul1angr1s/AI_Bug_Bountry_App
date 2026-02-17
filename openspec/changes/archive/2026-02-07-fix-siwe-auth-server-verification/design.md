## Context

Users cannot register protocols after SIWE sign-in because the frontend creates anonymous Supabase sessions, which the backend's `authenticate` middleware rejects with "Invalid or expired token" errors (401). Currently, the system stores SIWE signatures in metadata but never verifies them server-side, leaving the authentication flow broken and creating a security vulnerability where wallet addresses are unverified. The existing `authenticate` middleware already validates Supabase tokens correctly, so the solution must integrate with that middleware without changes. SSE authentication uses a separate cookie-based middleware (`sseAuthenticate`) that remains unaffected. Stakeholders include frontend developers (auth.tsx changes), backend team (new SIWE endpoint), and security (wallet ownership verification).

## Goals / Non-Goals

**Goals:**
- Enable protocol registration workflow by establishing verified user sessions after SIWE sign-in
- Implement cryptographic wallet ownership verification to ensure only the wallet owner can authenticate
- Create proper Supabase users with wallet addresses and metadata during SIWE verification
- Maintain backward compatibility with existing `authenticate` middleware and SSE authentication

**Non-Goals:**
- Implement OAuth or social authentication mechanisms
- Modify the existing `authenticate` middleware or its token validation logic
- Change SSE authentication behavior or cookie management
- Modify blockchain contracts or on-chain registration logic
- Alter the Prisma schema or database structure

## Decisions

**Server-side SIWE signature verification:** The design moves signature verification from the frontend (untrustworthy) to the backend (trusted). This cryptographically proves wallet ownership before creating sessions and prevents attackers from creating sessions with arbitrary wallet addresses.

**Use ethers.js `verifyMessage()` for signature validation:** This function is the industry standard, battle-tested across millions of transactions, and readily available in the existing backend dependencies. It uses standard ECDSA recovery to ensure only the wallet owner could have signed the message.

**Generate Supabase magic link tokens as session tokens:** Magic link tokens are already understood by the existing `authenticate` middleware, which validates them without code changes. This leverages existing security infrastructure and token refresh logic rather than creating a custom token scheme.

**Wallet email format `{wallet}@wallet.local`:** This creates unique, consistent email addresses per wallet (ENS names differ by network, but addresses don't). The format is memorable, prevents duplicate accounts, and integrates seamlessly with Supabase's user model. The `.local` TLD signals these are synthetic addresses, not real emails.

**Separate `/api/v1/auth/siwe` endpoint:** A dedicated endpoint cleanly separates SIWE verification concerns from other authentication flows. It allows the frontend to target verification explicitly and makes the protocol clear in logs and monitoring.

**Alternative considered: Keep anonymous auth but fix token validation:** This was rejected because it would allow users to register anonymous sessions without proving wallet ownership. The security goal is ownership verification, not just a working session. A breaking authentication change (users re-sign) is acceptable to gain this security property.

## Risks / Trade-offs

**[Risk]** Magic link tokens have limited lifetime (Supabase default ~1 hour): Users on slow connections or with long sign-in flows might encounter expired tokens. **[Mitigation]** The existing `authenticate` middleware transparently refreshes tokens via Supabase's SDK refresh mechanism, so users won't typically notice expiry.

**[Risk]** Ethereum addresses are case-sensitive in cryptography but checksummed (EIP-55) in display: Mismatched case could break lookups or ownership proofs. **[Mitigation]** All wallet address comparisons use lowercase conversion, ensuring consistency across verification and storage.

**[Risk]** Existing users with anonymous sessions can no longer authenticate: Anonymous sessions created before this change become invalid. **[Mitigation]** This is acceptable because it forces fresh authentication. Users simply re-sign with SIWE, which provides better UX (clear wallet confirmation) and better security (verified ownership).

**[Risk]** SIWE message structure is frontend responsibility: The frontend generates messages with timestamp and nonce, which the backend only verifies syntactically. **[Mitigation]** Standard SIWE libraries (wagmi, ethers.js) handle this correctly. The backend validates the signature, which implicitly validates the message contents. Adding strict timestamp validation is deferred to future security hardening.
