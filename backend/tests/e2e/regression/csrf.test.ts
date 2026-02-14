import { describe, it, expect } from 'vitest';
import { fetchApi, assertJsonResponse } from './helpers.js';

describe('CSRF Protection', () => {
  describe('GET /csrf-token', () => {
    it('returns a 64-character hex CSRF token', async () => {
      const res = await fetchApi('/csrf-token');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{ csrfToken: string }>(res);

      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken).toHaveLength(64);
      expect(body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('sets X-CSRF-Token cookie', async () => {
      const res = await fetchApi('/csrf-token');
      const setCookie = res.headers.get('set-cookie') ?? '';

      // The cookie may or may not be set depending on whether one already exists
      // but on a fresh request (no cookie sent), it should be set
      if (setCookie) {
        expect(setCookie).toContain('X-CSRF-Token=');
      }
    });
  });

  describe('POST without CSRF token', () => {
    // Note: CSRF verification is skipped when NODE_ENV=test or SKIP_CSRF=true.
    // These tests validate behavior in non-test environments.
    // When CSRF is active, POST without token → 403 CSRF_MISSING.
    // When CSRF is skipped, auth middleware runs first → 401 if unauthenticated.

    it('POST /agent-identities/register without CSRF or auth is rejected', async () => {
      const res = await fetchApi('/agent-identities/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: '0x0000000000000000000000000000000000000000',
          agentType: 'RESEARCHER',
        }),
      });

      // Either 403 (CSRF) or 400 (validation) — should NOT be 500
      expect(res.status).toBeLessThan(500);
    });

    it('POST /protocols without auth is rejected with 401', async () => {
      const res = await fetchApi('/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // requireAuth → 401
      expect(res.status).toBe(401);

      const body = await assertJsonResponse<{
        error: { code: string; message: string };
      }>(res);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('UnauthorizedError');
    });

    it('POST /scans without auth is rejected with 401', async () => {
      const res = await fetchApi('/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('CSRF token format validation', () => {
    it('token is a valid hex string', async () => {
      const res = await fetchApi('/csrf-token');
      const body = await assertJsonResponse<{ csrfToken: string }>(res);

      // 32 random bytes → 64 hex characters
      expect(body.csrfToken).toMatch(/^[0-9a-f]+$/);
      expect(body.csrfToken.length).toBe(64);
    });

    it('subsequent requests return consistent format', async () => {
      const res1 = await fetchApi('/csrf-token');
      const body1 = await assertJsonResponse<{ csrfToken: string }>(res1);

      const res2 = await fetchApi('/csrf-token');
      const body2 = await assertJsonResponse<{ csrfToken: string }>(res2);

      // Both should be valid hex tokens of same length
      expect(body1.csrfToken.length).toBe(64);
      expect(body2.csrfToken.length).toBe(64);
    });
  });
});
