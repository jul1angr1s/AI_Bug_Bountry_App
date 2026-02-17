# SIWE Backend Verification - Specification

## Overview

Formal requirements and GIVEN-WHEN-THEN scenarios for server-side Sign-In with Ethereum (SIWE) signature verification. These scenarios describe the complete system behavior for the new cryptographic wallet verification endpoint that validates wallet ownership, creates authenticated Supabase users, and issues session tokens.

---

## Requirement: SIWE Signature Verification SHALL Validate Wallet Ownership

System SHALL verify wallet signatures using ethers.js `verifyMessage()` function. Signature MUST match the wallet address provided in the request, ensuring only the wallet owner can create a session.

### Scenario 1.1: Valid Signature Verification
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/auth/siwe`
  ```json
  {
    "message": "Welcome to Bug Bounty Platform\nTimestamp: 2026-02-07T10:00:00Z\nNonce: abc123def456",
    "signature": "0x...",
    "walletAddress": "0xABCD1234567890ABCD1234567890ABCD12345678"
  }
  ```
  where signature is correctly signed by the provided wallet
- **THEN** Response HTTP 200 OK
- **THEN** Signature verification succeeds (verifyMessage returns matching wallet)
- **THEN** Session token is generated and returned

### Scenario 1.2: Invalid Signature (Different Signer)
- **WHEN** Tester sends request with valid wallet address but signature signed by different private key
- **WHEN** Signature does not recover to the provided walletAddress
- **THEN** Response HTTP 401 Unauthorized
- **THEN** Response body includes error message: `"Invalid signature: signer does not match wallet address"`
- **THEN** No user created or session issued

### Scenario 1.3: Mismatched Wallet Address
- **WHEN** Tester sends request with signature from wallet A but claims to be wallet B
- **WHEN** verifyMessage(message, signature) returns wallet A address
- **THEN** Response HTTP 401 Unauthorized
- **THEN** Response body includes error message: `"Invalid signature: signer does not match wallet address"`
- **THEN** No user created or session issued

---

## Requirement: User Creation from Verified Wallet SHALL Store Wallet Identity

System SHALL create or update Supabase user with wallet-based identity. User email SHALL follow `{wallet}@wallet.local` format (lowercase), wallet_address SHALL be stored in user_metadata, and siwe_verified flag SHALL be set to true for future reference.

### Scenario 2.1: New Wallet Creates User
- **GIVEN** Signature verified (Scenario 1.1)
- **GIVEN** Wallet address `0xABCD1234567890ABCD1234567890ABCD12345678` not in Supabase database
- **WHEN** Backend processes verified signature
- **THEN** Supabase admin API creates user with:
  ```json
  {
    "email": "0xabcd1234567890abcd1234567890abcd12345678@wallet.local",
    "password": "[random_secure_password]",
    "user_metadata": {
      "wallet_address": "0xABCD1234567890ABCD1234567890ABCD12345678",
      "siwe_verified": true,
      "verified_at": "2026-02-07T10:00:00Z"
    }
  }
  ```
- **THEN** User created with status = "confirmed"
- **THEN** user_id returned in response
- **THEN** User appears in Supabase auth.users table

### Scenario 2.2: Existing Wallet Updates Verification
- **GIVEN** Wallet address already has Supabase user (from previous SIWE login)
- **GIVEN** User metadata exists with wallet_address
- **WHEN** Backend verifies new signature from same wallet
- **THEN** User retrieved from database (not created)
- **THEN** user_metadata updated with:
  ```json
  {
    "wallet_address": "0xABCD1234567890ABCD1234567890ABCD12345678",
    "siwe_verified": true,
    "verified_at": "[new_timestamp]"
  }
  ```
- **THEN** User ID remains unchanged
- **THEN** Existing session data preserved

---

## Requirement: Session Token Generation SHALL Provide Access to API

System SHALL generate session token from Supabase admin API. Token SHALL be returned in response with `access_token` field and be valid for authenticating subsequent API requests via existing authenticate middleware.

### Scenario 3.1: Token Generation Succeeds
- **GIVEN** User created or verified (Scenario 2.1 or 2.2)
- **GIVEN** User ID obtained from Supabase
- **WHEN** Backend calls Supabase admin API to generate magic link token
- **WHEN** Backend extracts access_token from response
- **THEN** Response HTTP 200 OK
- **THEN** Response body includes:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "user-uuid",
      "email": "0xabcd...@wallet.local",
      "user_metadata": {
        "wallet_address": "0xABCD1234567890ABCD1234567890ABCD12345678",
        "siwe_verified": true
      }
    }
  }
  ```
- **THEN** Token is valid JWT with user claims

### Scenario 3.2: Token Generation Fails (Supabase Error)
- **WHEN** Supabase admin API returns error during token generation
- **WHEN** Error could be: network timeout, service unavailable, rate limit, or auth error
- **THEN** Response HTTP 500 Internal Server Error
- **THEN** Response body includes:
  ```json
  {
    "error": "Failed to generate session token",
    "message": "[Supabase error details]"
  }
  ```
- **THEN** No partial session created
- **THEN** User metadata NOT updated with failed attempt

---

## Requirement: Request Validation SHALL Enforce Format and Structure

System SHALL validate POST request body contains all required fields: `message`, `signature`, and `walletAddress`. Field `walletAddress` MUST be valid Ethereum address format (0x prefix followed by 40 hexadecimal characters, case-insensitive).

### Scenario 4.1: Valid Request Format
- **WHEN** Tester sends `POST http://localhost:3000/api/v1/auth/siwe`
  ```json
  {
    "message": "Welcome to Bug Bounty Platform\nTimestamp: 2026-02-07T10:00:00Z\nNonce: abc123def456",
    "signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    "walletAddress": "0xABCD1234567890ABCD1234567890ABCD12345678"
  }
  ```
- **THEN** Request passes validation
- **THEN** Signature verification proceeds

### Scenario 4.2: Missing Required Fields
- **WHEN** Tester sends request missing `signature` field:
  ```json
  {
    "message": "...",
    "walletAddress": "0xABCD1234567890ABCD1234567890ABCD12345678"
  }
  ```
- **THEN** Response HTTP 400 Bad Request
- **THEN** Response body includes: `"error": "Missing required field: signature"`
- **WHEN** Tester sends request missing `walletAddress` field
- **THEN** Response HTTP 400 Bad Request
- **THEN** Response body includes: `"error": "Missing required field: walletAddress"`

### Scenario 4.3: Invalid Wallet Address Format
- **WHEN** Tester sends request with wallet address `"ABCD1234567890ABCD1234567890ABCD12345678"` (missing 0x prefix)
- **THEN** Response HTTP 400 Bad Request
- **THEN** Response body includes: `"error": "Invalid wallet address format"`
- **WHEN** Tester sends request with wallet address `"0xABCD1234567890ABCD1234567890ABCD123456"` (39 chars instead of 40)
- **THEN** Response HTTP 400 Bad Request
- **THEN** Response body includes: `"error": "Invalid wallet address format"`
- **WHEN** Tester sends request with wallet address `"0xGGGG1234567890ABCD1234567890ABCD12345678"` (invalid hex char)
- **THEN** Response HTTP 400 Bad Request
- **THEN** Response body includes: `"error": "Invalid wallet address format"`

---

## Requirement: Error Handling SHALL Return Appropriate HTTP Status Codes

System SHALL return specific HTTP status codes and error messages for distinct failure modes. Invalid signatures return 401, malformed requests return 400, and Supabase errors return 500. Response body SHALL include descriptive error message and context.

### Scenario 5.1: Invalid Signature Error Response
- **GIVEN** Signature does not verify against wallet address (Scenario 1.2)
- **WHEN** Tester receives response
- **THEN** HTTP 401 Unauthorized
- **THEN** Response headers include: `"Content-Type": "application/json"`
- **THEN** Response body structure:
  ```json
  {
    "error": "Unauthorized",
    "message": "Invalid signature: signer does not match wallet address",
    "code": "INVALID_SIGNATURE"
  }
  ```
- **THEN** No sensitive data leaked in error message

### Scenario 5.2: Malformed Request Error Response
- **GIVEN** Request missing required field or invalid format (Scenario 4.2 or 4.3)
- **WHEN** Tester receives response
- **THEN** HTTP 400 Bad Request
- **THEN** Response body includes specific field name and validation rule:
  ```json
  {
    "error": "Bad Request",
    "message": "Invalid wallet address format: must be 0x followed by 40 hex characters",
    "field": "walletAddress",
    "code": "VALIDATION_ERROR"
  }
  ```

### Scenario 5.3: Supabase Connection Error Response
- **GIVEN** Supabase unavailable or returns unexpected error
- **WHEN** Signature verification succeeds but user creation fails
- **THEN** HTTP 500 Internal Server Error
- **THEN** Response body:
  ```json
  {
    "error": "Internal Server Error",
    "message": "Failed to create user session",
    "code": "SUPABASE_ERROR"
  }
  ```
- **THEN** Error logged with full Supabase error details (not exposed to client)
- **THEN** User can retry request

---

## Requirement: Integration with Authenticate Middleware SHALL Enable API Access

Token generated by `/auth/siwe` endpoint SHALL be valid for authenticating subsequent API requests through existing `authenticate` middleware. Token includes wallet_address in user_metadata, which can be used to authorize resource access in downstream endpoints.

### Scenario 6.1: Token from /auth/siwe Authenticates Successfully
- **GIVEN** Token obtained from `/auth/siwe` endpoint (Scenario 3.1)
- **WHEN** Tester sends `GET http://localhost:3000/api/v1/protocols`
  ```
  Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- **THEN** Existing `authenticate` middleware validates token
- **THEN** Middleware verifies token signature and expiry
- **THEN** Middleware extracts user ID and metadata from token claims
- **THEN** Request proceeds to controller
- **THEN** Response HTTP 200 OK with protocol list
- **THEN** No 401 "Invalid or expired token" error

### Scenario 6.2: Session Set Correctly in Frontend
- **GIVEN** Frontend receives access_token from `/auth/siwe` endpoint
- **WHEN** Frontend calls `setSession()` with token from response:
  ```json
  {
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "Bearer",
      "user": {
        "id": "user-uuid",
        "email": "0xabcd...@wallet.local",
        "user_metadata": {
          "wallet_address": "0xABCD1234567890ABCD1234567890ABCD12345678"
        }
      }
    }
  }
  ```
- **THEN** Frontend Supabase client stores token
- **THEN** Token included automatically in all subsequent API requests via Authorization header
- **THEN** User can access authenticated endpoints (register protocol, submit findings, etc.)
- **THEN** Session persists across page refreshes
- **THEN** User displayed as authenticated in frontend UI

---

## Success Criteria Summary

The SIWE backend verification capability is successful when:

✅ **Signature Verification**
- Valid signatures authenticate user
- Invalid signatures rejected with 401
- Mismatched wallet addresses rejected

✅ **User Management**
- New wallets create Supabase user with {wallet}@wallet.local email
- Existing wallets update verification timestamp
- Wallet address stored in user_metadata

✅ **Token Generation**
- Access tokens generated from Supabase admin API
- Tokens included in response
- Tokens expire after standard duration

✅ **Request Validation**
- All required fields validated
- Wallet address format validated (0x + 40 hex)
- Invalid requests rejected with 400

✅ **Error Handling**
- Invalid signatures return 401 with descriptive message
- Malformed requests return 400 with field details
- Supabase errors return 500 without exposing sensitive info

✅ **Middleware Integration**
- Tokens authenticate successfully via existing authenticate middleware
- Frontend session management works correctly
- Users can access protected endpoints with token

---

## Related Specifications

- [SIWE Authentication Proposal](../../proposal.md) - Business case and impact analysis
- [Backend Authentication Middleware](../../design.md) - Token validation design
- [Frontend Auth Flow](../../frontend-auth.md) - Client-side integration (if exists)
