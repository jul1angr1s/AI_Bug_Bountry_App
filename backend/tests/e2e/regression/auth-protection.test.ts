import { describe, it, expect } from 'vitest';
import { fetchApi, assertJsonResponse } from './helpers.js';

/**
 * Validates that protected endpoints reject unauthenticated requests.
 *
 * Routes using requireAuth should return 401.
 * These are all read-only checks — we never send valid credentials.
 */
describe('Auth Protection Guards', () => {
  describe('Protocol routes (requireAuth)', () => {
    it('GET /protocols without auth returns 401', async () => {
      const res = await fetchApi('/protocols');
      expect(res.status).toBe(401);

      const body = await assertJsonResponse<{
        error: { code: string; message: string };
      }>(res);
      expect(body.error.code).toBe('UnauthorizedError');
    });

    it('POST /protocols without auth returns 401', async () => {
      const res = await fetchApi('/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: 'https://github.com/test/test' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Scan routes (requireAuth)', () => {
    it('GET /scans without auth returns 401', async () => {
      const res = await fetchApi('/scans');
      expect(res.status).toBe(401);
    });

    it('POST /scans without auth returns 401', async () => {
      const res = await fetchApi('/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Payment routes (requireAuth)', () => {
    it('GET /payments/history without auth returns 401', async () => {
      const res = await fetchApi('/payments/history');
      expect(res.status).toBe(401);
    });
  });

  describe('Dashboard routes (requireAuth)', () => {
    it('GET /stats without auth returns 401', async () => {
      const res = await fetchApi('/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('Agent identity routes (public — no requireAuth)', () => {
    // Agent identity endpoints do NOT use requireAuth, so they should be accessible
    it('GET /agent-identities without auth returns 200', async () => {
      const res = await fetchApi('/agent-identities');
      expect(res.status).toBe(200);
    });

    it('GET /agent-identities/leaderboard without auth returns 200', async () => {
      const res = await fetchApi('/agent-identities/leaderboard');
      expect(res.status).toBe(200);
    });
  });

  describe('Error response format', () => {
    it('401 responses follow standard error shape', async () => {
      const res = await fetchApi('/protocols');
      expect(res.status).toBe(401);

      const body = await assertJsonResponse<{
        error: { code: string; message: string; requestId: string };
      }>(res);

      expect(body.error).toBeDefined();
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
      expect(typeof body.error.requestId).toBe('string');
    });
  });
});
