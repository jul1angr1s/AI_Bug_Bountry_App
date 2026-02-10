/**
 * Reusable authentication helpers for Playwright E2E tests.
 *
 * - authenticateSIWE: performs SIWE sign-in via the backend API
 * - injectAuthSession: injects the session into browser localStorage
 *   so ProtectedRoute sees an authenticated user
 * - Ported serialization validators (pure functions, no Vitest dependency)
 */

import type { APIRequestContext, Page } from '@playwright/test';
import { Wallet } from 'ethers';

const API_BASE_URL = 'http://localhost:3000';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: { id: string; wallet_address: string };
  wallet: Wallet;
  walletAddress: string;
}

// ──────────────────────────────────────────────
// SIWE Authentication
// ──────────────────────────────────────────────

/**
 * Authenticates via SIWE against the running backend.
 * Creates a random ethers Wallet, signs a SIWE message, and POSTs
 * to /api/v1/auth/siwe.  Returns the full session payload.
 */
export async function authenticateSIWE(
  request: APIRequestContext,
): Promise<AuthSession> {
  const wallet = Wallet.createRandom();
  const walletAddress = wallet.address;

  const message = `Sign in to Thunder Security Bug Bounty Platform\n\nWallet: ${walletAddress}\nNonce: test-nonce-${Date.now()}`;
  const signature = await wallet.signMessage(message);

  const response = await request.post(`${API_BASE_URL}/api/v1/auth/siwe`, {
    data: { message, signature, walletAddress },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `SIWE auth failed (${response.status()}): ${body}`,
    );
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
    wallet,
    walletAddress,
  };
}

// ──────────────────────────────────────────────
// Browser Session Injection
// ──────────────────────────────────────────────

/**
 * Injects a SIWE auth session into the browser's localStorage so that
 * the Supabase client (`getSession()`) and `AuthProvider.initAuth()`
 * find a valid session on mount.
 *
 * Must be called AFTER page.goto('/login') (or any same-origin URL)
 * so that localStorage is accessible for localhost:5173.
 */
export async function injectAuthSession(
  page: Page,
  session: AuthSession,
): Promise<void> {
  // Navigate to /login first to establish same-origin context
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const sessionPayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: session.user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${session.walletAddress.toLowerCase()}@wallet.local`,
      user_metadata: { wallet_address: session.walletAddress },
      app_metadata: { provider: 'siwe' },
      created_at: new Date().toISOString(),
    },
  };

  await page.evaluate((payload) => {
    const json = JSON.stringify(payload);
    // Primary key used by supabase client (storageKey: 'thunder-security-auth')
    localStorage.setItem('thunder-security-auth', json);
    // Fallback key (default Supabase naming convention)
    localStorage.setItem('sb-ekxbtdlnbellyhovgoxw-auth-token', json);
  }, sessionPayload);
}

// ──────────────────────────────────────────────
// Serialization Validators (ported from backend/tests/e2e/regression/helpers.ts)
// ──────────────────────────────────────────────

/**
 * Validates that a value is a proper ISO 8601 date string.
 * Catches the common Date serialization bug where dates become `{}`.
 */
export function assertDateField(value: unknown, fieldName: string): void {
  if (value === null || value === undefined) return;

  if (typeof value !== 'string') {
    throw new Error(
      `${fieldName}: expected ISO date string, got ${typeof value} (${JSON.stringify(value)})`,
    );
  }

  if (!value.includes('T')) {
    throw new Error(
      `${fieldName}: expected ISO date string with 'T' separator, got "${value}"`,
    );
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    throw new Error(`${fieldName}: "${value}" is not a valid date`);
  }
}

/**
 * Validates that a BigInt field was serialized as a string (not a number, not an error).
 */
export function assertBigIntField(value: unknown, fieldName: string): void {
  if (value === null || value === undefined) return;

  if (typeof value !== 'string') {
    throw new Error(
      `${fieldName}: expected BigInt as string, got ${typeof value} (${JSON.stringify(value)})`,
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(
      `${fieldName}: expected numeric string for BigInt, got "${value}"`,
    );
  }
}

/**
 * Asserts that no string field in the object contains "[object Object]",
 * which indicates a serialization bug.
 */
export function assertNoObjectStrings(obj: unknown, path = 'root'): void {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'string') {
    if (obj.includes('[object Object]')) {
      throw new Error(
        `${path}: contains "[object Object]" — likely a serialization bug`,
      );
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => assertNoObjectStrings(item, `${path}[${i}]`));
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoObjectStrings(value, `${path}.${key}`);
    }
  }
}
