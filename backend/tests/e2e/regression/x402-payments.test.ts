import { describe, it, expect } from 'vitest';
import {
  fetchApi,
  assertJsonResponse,
  assertDateField,
  assertBigIntField,
  assertNoObjectStrings,
} from './helpers.js';

interface X402Payment {
  id: string;
  amount: string;
  status: string;
  txHash: string | null;
  createdAt?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

interface AgentIdentity {
  id: string;
  walletAddress: string;
}

async function findAnyAgent(): Promise<string | undefined> {
  const res = await fetchApi('/agent-identities');
  const body = (await res.json()) as { data: AgentIdentity[] };
  return body.data[0]?.id;
}

const VALID_STATUSES = ['PENDING', 'COMPLETED', 'EXPIRED', 'FAILED'];

describe('X.402 Payment Endpoints', () => {
  describe('GET /agent-identities/x402-payments', () => {
    it('returns array with success:true', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('serializes payment amounts as strings (BigInt)', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      for (const payment of body.data) {
        assertBigIntField(payment.amount, `payment[${payment.id}].amount`);
      }
    });

    it('has valid status enum values', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      for (const payment of body.data) {
        expect(VALID_STATUSES).toContain(payment.status);
      }
    });

    it('completed payments have txHash, pending have txHash null', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      for (const payment of body.data) {
        if (payment.status === 'COMPLETED') {
          expect(payment.txHash).toBeTruthy();
          expect(typeof payment.txHash).toBe('string');
        }
        if (payment.status === 'PENDING') {
          expect(payment.txHash).toBeNull();
        }
      }
    });

    it('serializes Date fields as ISO strings', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      for (const payment of body.data) {
        if (payment.createdAt !== undefined) {
          assertDateField(payment.createdAt, 'payment.createdAt');
        }
        if (payment.expiresAt !== undefined) {
          assertDateField(payment.expiresAt, 'payment.expiresAt');
        }
      }
    });

    it('contains no [object Object] in any field', async () => {
      const res = await fetchApi('/agent-identities/x402-payments');
      const body = await assertJsonResponse<{
        success: boolean;
        data: unknown[];
      }>(res);
      assertNoObjectStrings(body.data);
    });
  });

  describe('GET /agent-identities/:id/x402-payments', () => {
    it('returns payments for a specific agent', async () => {
      const agentId = await findAnyAgent();
      if (!agentId) return;

      const res = await fetchApi(
        `/agent-identities/${agentId}/x402-payments`,
      );
      expect(res.status).toBe(200);

      const body = await assertJsonResponse<{
        success: boolean;
        data: X402Payment[];
      }>(res);

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // Validate serialization on per-agent results too
      for (const payment of body.data) {
        assertBigIntField(payment.amount, 'payment.amount');
      }
    });

    it('returns 404 for non-existent agent', async () => {
      const res = await fetchApi(
        '/agent-identities/00000000-0000-0000-0000-000000000000/x402-payments',
      );
      expect(res.status).toBe(404);
    });
  });
});
